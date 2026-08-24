import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { parseJsonSafe } from '../utils/json.ts';
import { asyncHandler, requireAuth } from '../lib/auth.ts';

const router = Router();

/** Admin dashboard metrics. */
router.get(
  '/admin/stats',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const [
      orderAgg,
      productsCount,
      reviewsCount,
      pendingOrders,
      deliveredOrders,
      recentOrders,
      couponsActive,
    ] = await Promise.all([
      prisma.order.aggregate({ _sum: { total: true }, _count: true }),
      prisma.product.count(),
      prisma.review.count(),
      prisma.order.count({ where: { status: { in: ['confirmed', 'processing', 'shipped', 'out_for_delivery'] } } }),
      prisma.order.count({ where: { status: 'delivered' } }),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { items: true } }),
      prisma.coupon.count({ where: { active: true } }),
    ]);

    // Low-stock: any product with at least one size below the reorder level.
    const allProducts = await prisma.product.findMany({ select: { id: true, name: true, sku: true, sizes: true, images: true } });
    const lowStockProducts = allProducts
      .map((p) => ({ ...p, sizes: parseJsonSafe<{ size: string; stockCount: number; inStock: boolean }[]>(p.sizes, []) }))
      .filter((p) => p.sizes.some((s) => s.inStock && s.stockCount <= 10))
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        image: parseJsonSafe<string[]>(p.images, [])[0] ?? null,
        lowestStock: Math.min(
          ...(p.sizes.length > 0 ? p.sizes.map((s) => (s.inStock ? s.stockCount : Infinity)) : [Infinity])
        ),
      }))
      .sort((a, b) => a.lowestStock - b.lowestStock)
      .slice(0, 8);

    res.json({
      revenue: orderAgg._sum.total ?? 0,
      ordersCount: orderAgg._count,
      pendingOrdersCount: pendingOrders,
      deliveredOrdersCount: deliveredOrders,
      productsCount,
      reviewsCount,
      couponsActive,
      lowStockProducts,
      recentOrders,
    });
  })
);

export default router;