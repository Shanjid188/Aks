import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission, currentAdmin } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';

const router = Router();

/** Admin: packaging queue — orders that need packing/shipping. */
router.get(
  '/admin/packaging',
  requirePermission(PERM.PACKAGING_VIEW),
  asyncHandler(async (_req, res) => {
    const q = _req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (q.status && q.status !== 'all') where.packedStatus = q.status;
    if (q.source) where.source = q.source;

    const orders = await prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' as const },
      take: 300,
    });

    res.json({
      packaging: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        trackingCode: o.trackingCode,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        status: o.status,
        packedStatus: o.packedStatus,
        packedAt: o.packedAt,
        packedBy: o.packedBy,
        source: o.source,
        itemsCount: o.items.length,
        createdAt: o.createdAt,
        customerAddress: safeParse(o.customerAddress),
        items: o.items,
      })),
      count: orders.length,
    });
  })
);

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Admin: mark orders as packed and/or shipped. */
router.patch(
  '/admin/packaging/:id',
  requirePermission(PERM.PACKAGING_PACK),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = (req.body || {}) as { packedStatus?: string; dispatched?: boolean; note?: string };
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const packedStatus = String(body.packedStatus || existing.packedStatus || 'packed');
    if (!['not_packed', 'packing', 'packed', 'shipped'].includes(packedStatus)) {
      return res.status(400).json({ error: 'Invalid packedStatus' });
    }

    const admin = currentAdmin(req);
    // Shipping from the Packaging queue also advances the order lifecycle status
    // (processing/packed → shipped) so the Orders list stays in sync.
    const advanceStatus = packedStatus === 'shipped'
      && !['shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'returned', 'refunded'].includes(existing.status)
      ? 'shipped'
      : undefined;

    const data: Record<string, unknown> = {
      packedStatus,
      ...(packedStatus !== 'not_packed' && !existing.packedAt ? { packedAt: new Date() } : {}),
      ...(packedStatus !== 'not_packed' ? { packedBy: admin.name || admin.email } : {}),
      ...(body.dispatched && !existing.dispatchedAt ? { dispatchedAt: new Date() } : {}),
      ...(advanceStatus ? { status: advanceStatus } : {}),
    };

    const order = await prisma.order.update({
      where: { id },
      data,
      include: { items: true },
    });

    await logAudit({
      admin,
      action: 'packaging.updated',
      entity: 'order',
      entityId: id,
      details: `${existing.orderNumber}: packedStatus → ${packedStatus}${body.dispatched ? ', dispatched' : ''}${advanceStatus ? `, status → ${advanceStatus}` : ''}`,
    });

    res.json({ order });
  })
);

export default router;
