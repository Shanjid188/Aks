import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission, currentAdmin } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';
import { applyStockDelta } from '../lib/stock.ts';

const router = Router();

const LOW_STOCK_DEFAULT = 10;

/** Admin: inventory list — product row plus live stock, reserved and flags. */
router.get(
  '/admin/inventory',
  requirePermission(PERM.INVENTORY_VIEW),
  asyncHandler(async (_req, res) => {
    const q = _req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (q.search) {
      const term = String(q.search).trim();
      where.OR = [
        { name: { contains: term } },
        { sku: { contains: term } },
        { barcode: { contains: term } },
        { subcategory: { contains: term } },
      ];
    }
    if (q.status === 'low') where.stockQuantity = { lte: where.lowStockThreshold ?? LOW_STOCK_DEFAULT, gt: 0 } as { lte: number; gt: number };
    if (q.status === 'out') where.stockQuantity = 0;

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' as const }],
    });

    // Reserved = quantity sold in active (non-cancelled) orders for tracked products.
    const reservedRows = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where: { productId: { not: null }, order: { status: { notIn: ['cancelled', 'returned', 'refunded'] } } },
    });
    const reserved = new Map<string, number>();
    for (const r of reservedRows) {
      if (r.productId) reserved.set(r.productId, r._sum.quantity ?? 0);
    }

    const threshold = LOW_STOCK_DEFAULT;
    const items = products.map((p) => {
      const reservedQty = reserved.get(p.id) || 0;
      const available = Math.max(0, p.stockQuantity - reservedQty);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        category: p.category,
        subcategory: p.subcategory,
        trackStock: p.trackStock,
        stockQuantity: p.stockQuantity,
        reserved: reservedQty,
        available,
        lowStockThreshold: p.lowStockThreshold || threshold,
        isLow: p.trackStock && p.stockQuantity > 0 && p.stockQuantity <= (p.lowStockThreshold || threshold),
        isOut: p.trackStock && p.stockQuantity <= 0,
        updatedAt: p.updatedAt,
      };
    });

    res.json({
      items,
      count: items.length,
      lowStockCount: items.filter((i) => i.isLow).length,
      outOfStockCount: items.filter((i) => i.isOut).length,
    });
  })
);

/** Admin: stock adjustment — mutate a product's stock and log the movement. */
router.post(
  '/admin/inventory/adjust',
  requirePermission(PERM.INVENTORY_ADJUST_STOCK),
  asyncHandler(async (req, res) => {
    const { productId, change, reason, type, note } = (req.body || {}) as Record<string, unknown>;
    if (!productId) return res.status(400).json({ error: 'productId is required' });
    const delta = Math.trunc(Number(change));
    if (!Number.isFinite(delta) || delta === 0) {
      return res.status(400).json({ error: 'change must be a non-zero whole number' });
    }

    const product = await prisma.product.findUnique({ where: { id: String(productId) } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const reasonLabel = String(reason || type || 'manual.correction').trim() || 'manual.correction';
    const before = product.stockQuantity;
    const after = Math.max(0, before + delta);

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: product.id },
        data: { stockQuantity: after, trackStock: true },
      });
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          change: after - before,
          reason: reasonLabel,
          referenceType: 'adjustment',
          referenceId: null,
          createdBy: currentAdmin(req)?.email ?? null,
          createdAt: new Date(),
        },
      });
      // Store the note by extending the reason so history stays readable.
      if (note) {
        const last = await tx.stockMovement.findFirst({
          where: { productId: product.id },
          orderBy: { createdAt: 'desc' },
        });
        if (last) await tx.stockMovement.update({ where: { id: last.id }, data: { reason: `${reasonLabel} — ${String(note)}` } });
      }
    });

    await logAudit({
      admin: currentAdmin(req),
      action: 'inventory.adjusted',
      entity: 'product',
      entityId: product.id,
      details: `${product.name} (${product.sku}): ${before} → ${after}`,
    });

    res.json({ product: { id: product.id, sku: product.sku, name: product.name, before, after } });
  })
);

/** Admin: stock movement history. */
router.get(
  '/admin/inventory/history',
  requirePermission(PERM.INVENTORY_VIEW),
  asyncHandler(async (_req, res) => {
    const movements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' as const },
      take: 200,
      include: { product: { select: { id: true, name: true, sku: true, images: true } } },
    });
    res.json({
      movements: movements.map((m) => {
        const images = m.product
          ? (Array.isArray(m.product.images)
              ? m.product.images
              : (() => {
                  try {
                    return JSON.parse(String(m.product.images || '[]'));
                  } catch {
                    return [];
                  }
                })())
          : [];
        return {
          id: m.id,
          productId: m.productId,
          productName: m.product?.name ?? 'Unknown',
          sku: m.product?.sku ?? '',
          image: Array.isArray(images) ? String(images[0] ?? '') : '',
          change: m.change,
          reason: m.reason,
          referenceType: m.referenceType,
          referenceId: m.referenceId,
          createdBy: m.createdBy,
          createdAt: m.createdAt,
        };
      }),
    });
  })
);

export default router;
