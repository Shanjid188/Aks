import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission, currentAdmin } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';
import { applyStockDelta } from '../lib/stock.ts';

const router = Router();

/** Admin: list return requests. */
router.get(
  '/admin/returns',
  requirePermission(PERM.REFUNDS_VIEW),
  asyncHandler(async (_req, res) => {
    const q = _req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (q.status && q.status !== 'all') where.status = q.status;

    const returns = await prisma.returnRequest.findMany({
      where,
      include: { order: { select: { id: true, orderNumber: true } } },
      orderBy: { createdAt: 'desc' as const },
      take: 300,
    });
    res.json({ returns, count: returns.length });
  })
);

/** Admin: create a return request. */
router.post(
  '/admin/returns',
  requirePermission(PERM.REFUNDS_CREATE),
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    if (!body.orderId || !body.reason) {
      return res.status(400).json({ error: 'orderId and reason are required' });
    }
    const order = await prisma.order.findUnique({ where: { id: String(body.orderId) } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const ret = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        customerName: String(body.customerName ?? order.customerName),
        customerPhone: String(body.customerPhone ?? order.customerPhone),
        productId: body.productId ? String(body.productId) : null,
        productName: body.productName ? String(body.productName) : null,
        variant: body.variant ? String(body.variant) : null,
        quantity: Math.max(1, Math.trunc(Number(body.quantity) || 1)),
        reason: String(body.reason),
        customerNote: body.customerNote ? String(body.customerNote) : null,
        adminNote: body.adminNote ? String(body.adminNote) : null,
        refundAmount: Math.max(0, Number(body.refundAmount) || 0),
        refundMethod: String(body.refundMethod || 'store_credit'),
      },
    });

    await logAudit({
      admin: currentAdmin(req),
      action: 'return.requested',
      entity: 'return',
      entityId: ret.id,
      details: `${order.orderNumber}: ${String(body.reason)}`,
    });

    res.status(201).json({ returnRequest: ret });
  })
);

/** Admin: approve / reject / cancel a return. */
router.patch(
  '/admin/returns/:id',
  requirePermission(PERM.REFUNDS_APPROVE),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const { status, adminNote } = (req.body || {}) as { status?: string; adminNote?: string };
    const existing = await prisma.returnRequest.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Return not found' });

    const next = String(status || '');
    if (!['requested', 'approved', 'rejected', 'received', 'refunded', 'cancelled'].includes(next)) {
      return res.status(400).json({ error: 'Invalid return status' });
    }

    const data: Record<string, unknown> = { status: next };
    if (adminNote !== undefined) data.adminNote = String(adminNote);
    if (next === 'approved' && !existing.approvedAt) data.approvedAt = new Date();
    if (next === 'received' && !existing.receivedAt) data.receivedAt = new Date();
    if (next === 'refunded' && !existing.refundedAt) data.refundedAt = new Date();

    const ret = await prisma.returnRequest.update({ where: { id }, data });

    // When a return is RECEIVED, add the returned stock back for the product.
    if (next === 'received' && existing.productId && existing.status !== 'received') {
      await applyStockDelta({
        productId: existing.productId,
        change: existing.quantity,
        reason: 'return.received',
        referenceType: 'return',
        referenceId: id,
        createdBy: currentAdmin(req)?.email,
      });
    }

    await logAudit({
      admin: currentAdmin(req),
      action: `return.${next}`,
      entity: 'return',
      entityId: id,
      details: `${existing.returnNumber || id}: status → ${next}`,
    });

    res.json({ returnRequest: ret });
  })
);

/** Admin: record an actual refund against a return. */
router.post(
  '/admin/returns/:id/refund',
  requirePermission(PERM.REFUNDS_REFUND),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = (req.body || {}) as Record<string, unknown>;
    const ret = await prisma.returnRequest.findUnique({ where: { id } });
    if (!ret) return res.status(404).json({ error: 'Return not found' });

    const amount = Math.max(0, Number(body.amount) ?? ret.refundAmount);
    const refund = await prisma.refund.create({
      data: {
        returnId: ret.id,
        orderId: ret.orderId,
        amount,
        method: String(body.method ?? ret.refundMethod ?? 'store_credit'),
        note: body.note ? String(body.note) : null,
        refundedBy: currentAdmin(req)?.email ?? null,
      },
    });

    await prisma.returnRequest.update({
      where: { id },
      data: { status: 'refunded', refundAmount: amount, refundedAt: new Date() },
    });

    // If the linked order is being fully refunded, flip its payment ledger.
    if (ret.orderId) {
      await prisma.order.update({
        where: { id: ret.orderId },
        data: { status: 'refunded', paymentStatus: 'refunded', dueAmount: 0 },
      });
    }

    await logAudit({
      admin: currentAdmin(req),
      action: 'refund.processed',
      entity: 'return',
      entityId: id,
      details: `${ret.returnNumber || id}: refund ${amount} via ${refund.method}`,
    });

    res.status(201).json({ refund, returnRequest: { ...ret, status: 'refunded', refundAmount: amount } });
  })
);

export default router;
