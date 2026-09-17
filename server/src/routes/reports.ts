import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { parseJsonSafe } from '../utils/json.ts';

const router = Router();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

/** Admin: reports summary with real numbers. */
router.get(
  '/admin/reports',
  requirePermission(PERM.REPORTS_VIEW),
  asyncHandler(async (_req, res) => {
    const q = _req.query as Record<string, string | undefined>;
    const range = String(q.range || '7d');
    const days = range === 'today' ? 1 : range === '30d' ? 30 : range === '3m' ? 90 : range === '1y' ? 365 : 7;
    const since = daysAgo(days);

    const [orders, orderItems, expenses, refunds] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: since }, status: { notIn: ['cancelled', 'returned', 'refunded'] } },
        select: { total: true, source: true, paymentMethod: true, status: true, createdAt: true },
      }),
      prisma.orderItem.findMany({
        where: { order: { createdAt: { gte: since }, status: { notIn: ['cancelled', 'returned', 'refunded'] } } },
        select: { productId: true, productName: true, quantity: true, price: true },
      }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { expenseDate: { gte: since } } }),
      prisma.refund.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: since } } }),
    ]);

    const revenue = orders.reduce((s, o) => s + o.total, 0);
    const totalExpenses = expenses._sum.amount ?? 0;
    const totalRefunds = refunds._sum.amount ?? 0;

    const paymentMethod: Record<string, { count: number; revenue: number }> = {};
    const source: Record<string, { count: number; revenue: number }> = {};
    const status: Record<string, number> = {};
    for (const o of orders) {
      paymentMethod[o.paymentMethod] = paymentMethod[o.paymentMethod] || { count: 0, revenue: 0 };
      paymentMethod[o.paymentMethod].count += 1;
      paymentMethod[o.paymentMethod].revenue += o.total;
      source[o.source] = source[o.source] || { count: 0, revenue: 0 };
      source[o.source].count += 1;
      source[o.source].revenue += o.total;
      status[o.status] = (status[o.status] || 0) + 1;
    }

    const productSales = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const it of orderItems) {
      const key = it.productId || it.productName;
      const row = productSales.get(key) || { name: it.productName, qty: 0, revenue: 0 };
      row.qty += it.quantity;
      row.revenue += it.price * it.quantity;
      productSales.set(key, row);
    }

    res.json({
      range,
      from: since,
      revenue,
      ordersCount: orders.length,
      totalExpenses,
      totalRefunds,
      netRevenue: Math.max(0, revenue - totalRefunds),
      profit: null, // cost-price profit is computed when product cost prices exist
      paymentMethod,
      source,
      orderStatus: status,
      topProducts: [...productSales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    });
  })
);

/** Admin: revenue profit by product (uses costPrice when present). */
router.get(
  '/admin/reports/profit',
  requirePermission(PERM.REPORTS_VIEW),
  asyncHandler(async (_req, res) => {
    const items = await prisma.orderItem.findMany({
      where: { order: { status: { notIn: ['cancelled', 'returned', 'refunded'] } } },
      select: { productId: true, productName: true, quantity: true, price: true },
      take: 5000,
    });
    const products = await prisma.product.findMany({ select: { id: true, costPrice: true, name: true } });
    const costMap = new Map(products.map((p) => [p.id, p.costPrice ?? null]));

    let totalRevenue = 0;
    let totalCost = 0;
    const rows = items.map((it) => {
      const cost = it.productId ? (costMap.get(it.productId) ?? null) : null;
      const lineRevenue = it.price * it.quantity;
      const lineCost = cost == null ? null : cost * it.quantity;
      totalRevenue += lineRevenue;
      if (lineCost != null) totalCost += lineCost;
      return {
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        revenue: lineRevenue,
        cost: lineCost,
        profit: lineCost == null ? null : lineRevenue - lineCost,
      };
    });
    res.json({ rows, totalRevenue, totalCost, totalProfit: totalCost === 0 ? null : totalRevenue - totalCost });
  })
);

export default router;
