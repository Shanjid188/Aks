import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission, currentAdmin } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';
import { applyStockDelta } from '../lib/stock.ts';

const router = Router();

/** Admin: list purchases. */
router.get(
  '/admin/purchases',
  requirePermission(PERM.PURCHASES_VIEW),
  asyncHandler(async (_req, res) => {
    const purchases = await prisma.purchase.findMany({
      include: { supplier: true, items: true },
      orderBy: { createdAt: 'desc' as const },
      take: 300,
    });
    res.json({ purchases });
  })
);

/** Admin: create a purchase (with items). When status = received, stock increases. */
router.post(
  '/admin/purchases',
  requirePermission(PERM.PURCHASES_CREATE),
  asyncHandler(async (req, res) => {
    const b = (req.body || {}) as Record<string, unknown>;
    const itemsRaw = Array.isArray(b.items) ? (b.items as { productId?: string; name?: string; sku?: string; quantity: number; costPrice: number }[]) : [];
    if (itemsRaw.length === 0) return res.status(400).json({ error: 'Purchase requires at least one item' });

    const totalCost = itemsRaw.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.costPrice) || 0), 0);
    const paidAmount = Math.min(totalCost, Math.max(0, Number(b.paidAmount) || 0));
    const dueAmount = Math.max(0, totalCost - paidAmount);
    const status = b.status === 'received' ? 'received' : 'pending';

    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber: `PR-${Date.now()}`,
        supplierId: b.supplierId ? String(b.supplierId) : null,
        status,
        totalCost,
        paidAmount,
        dueAmount,
        purchaseDate: b.purchaseDate ? new Date(String(b.purchaseDate)) : new Date(),
        notes: b.notes ? String(b.notes) : null,
        createdBy: currentAdmin(req)?.email ?? null,
        items: {
          create: itemsRaw.map((it) => ({
            productId: it.productId ? String(it.productId) : null,
            productName: String(it.name || 'Unknown'),
            sku: it.sku ? String(it.sku) : null,
            quantity: Math.max(0, Math.trunc(Number(it.quantity) || 0)),
            costPrice: Number(it.costPrice) || 0,
            total: (Number(it.quantity) || 0) * (Number(it.costPrice) || 0),
          })),
        },
      },
      include: { items: true, supplier: true },
    });

    // Receiving the purchase increases inventory for tracked products.
    if (status === 'received') {
      for (const it of itemsRaw) {
        if (!it.productId) continue;
        await applyStockDelta({
          productId: String(it.productId),
          change: Math.trunc(Number(it.quantity) || 0),
          reason: 'purchase.received',
          referenceType: 'purchase',
          referenceId: purchase.id,
          createdBy: currentAdmin(req)?.email,
        });
      }
    }

    await logAudit({
      admin: currentAdmin(req),
      action: `purchase.${status}`,
      entity: 'purchase',
      entityId: purchase.id,
      details: `${purchase.purchaseNumber} — ${totalCost} (paid ${paidAmount})`,
    });

    res.status(201).json({ purchase });
  })
);

/** Admin: receive a purchase (stock in) or update its status/notes. */
router.patch(
  '/admin/purchases/:id',
  requirePermission(PERM.PURCHASES_RECEIVE),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const b = (req.body || {}) as Record<string, unknown>;
    const existing = await prisma.purchase.findUnique({ where: { id }, include: { items: true } });
    if (!existing) return res.status(404).json({ error: 'Purchase not found' });

    const status = String(b.status || existing.status);
    const purchase = await prisma.purchase.update({
      where: { id },
      data: {
        status,
        notes: b.notes !== undefined ? String(b.notes) : existing.notes,
        paidAmount: b.paidAmount !== undefined ? Math.min(existing.totalCost, Number(b.paidAmount) || 0) : existing.paidAmount,
      },
      include: { items: true, supplier: true },
    });

    // On the receive transition, add stock (and update cost price) for each item.
    if (status === 'received' && existing.status !== 'received') {
      for (const it of existing.items) {
        if (!it.productId) continue;
        await applyStockDelta({
          productId: it.productId,
          change: it.quantity,
          reason: 'purchase.received',
          referenceType: 'purchase',
          referenceId: id,
          createdBy: currentAdmin(req)?.email,
        });
        await prisma.product.update({
          where: { id: it.productId },
          data: { costPrice: it.costPrice },
        });
      }
      await logAudit({
        admin: currentAdmin(req),
        action: 'purchase.received',
        entity: 'purchase',
        entityId: id,
        details: existing.purchaseNumber,
      });
    }

    res.json({ purchase });
  })
);

export default router;
