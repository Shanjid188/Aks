import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { parseJsonSafe } from '../utils/json.ts';
import { asyncHandler, requirePermission } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';

const router = Router();

const LOW_STOCK_LEVEL = 10;

/** Internal aggregation shape for the customers report. */
interface CustomerRow {
  name: string;
  phone: string;
  email: string;
  division: string;
  district: string;
  totalSpent: number;
  ordersCount: number;
  lastOrderAt: Date;
  firstOrderAt: Date;
  lastOrderNumber: string;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

/** Parse a product images TEXT column into a string[]. */
function parseImages(raw: unknown): string[] {
  return parseJsonSafe<string[]>(String(raw ?? ''), []);
}

/**
 * Admin dashboard metrics — all computed from real database data.
 * revenue intentionally excludes cancelled orders.
 */
router.get(
  '/admin/stats',
  requirePermission(PERM.DASHBOARD_VIEW),
  asyncHandler(async (_req, res) => {
    const current30 = daysAgo(30);
    const previous60 = daysAgo(60);

    const [
      revenueAgg,
      ordersCount,
      deliveredOrdersCount,
      pendingOrdersCount,
      confirmedOrdersCount,
      activeOrdersCount,
      shippedOrdersCount,
      cancelledOrdersCount,
      productsCount,
      reviewsCount,
      couponsActive,
      revenueWindow,
      revenuePrevious,
      customerPhones,
      recentOrders,
      recentlyCancelled,
      itemRows,
      allProducts,
    ] = await Promise.all([
      prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: 'cancelled' } } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'delivered' } }),
      prisma.order.count({ where: { status: 'pending' } }),
      prisma.order.count({ where: { status: 'confirmed' } }),
      prisma.order.count({
        where: { status: { in: ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery'] } },
      }),
      prisma.order.count({ where: { status: 'shipped' } }),
      prisma.order.count({ where: { status: 'cancelled' } }),
      prisma.product.count(),
      prisma.review.count(),
      prisma.coupon.count({ where: { active: true } }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: 'cancelled' }, createdAt: { gte: current30 } },
      }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: 'cancelled' }, createdAt: { gte: previous60, lt: current30 } },
      }),
      prisma.order.findMany({ select: { customerPhone: true } }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          items: { include: { product: { select: { id: true, name: true, images: true, colors: true } } } },
        },
      }),
      prisma.order.findMany({
        where: { status: 'cancelled' },
        orderBy: { createdAt: 'desc' },
        take: 4,
        include: { items: true },
      }),
      prisma.orderItem.findMany({
        where: { order: { status: { not: 'cancelled' } } },
        select: {
          id: true,
          orderId: true,
          productId: true,
          productName: true,
          quantity: true,
          price: true,
          product: { select: { id: true, name: true, category: true, images: true } },
        },
      }),
      prisma.product.findMany({ select: { id: true, name: true, sku: true, sizes: true, images: true } }),
    ]);

    // Customers (distinct phone numbers) & revenue trend
    const customersCount = new Set(customerPhones.map((r) => r.customerPhone)).size;
    const revenue = revenueAgg._sum.total ?? 0;
    const revenueLast30 = revenueWindow._sum.total ?? 0;
    const revenuePrev30 = revenuePrevious._sum.total ?? 0;
    let revenueDeltaPercent: number | null = null;
    if (revenuePrev30 > 0) {
      revenueDeltaPercent = Math.round(((revenueLast30 - revenuePrev30) / revenuePrev30) * 100);
    }

    // Low stock (any size below the reorder level)
    const lowStockProducts = allProducts
      .map((p) => ({
        ...p,
        sizes: parseJsonSafe<{ size: string; stockCount: number; inStock: boolean }[]>(p.sizes, []),
      }))
      .filter((p) => p.sizes.some((s) => s.inStock && s.stockCount <= LOW_STOCK_LEVEL))
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        image: parseImages(p.images)[0] ?? null,
        lowestStock:
          p.sizes.length > 0
            ? Math.min(...p.sizes.map((s) => (s.inStock ? s.stockCount : Infinity)))
            : 0,
      }))
      .sort((a, b) => a.lowestStock - b.lowestStock)
      .slice(0, 8);

    // Top selling products & category performance (from real order items)
    const productTotals = new Map<string, { name: string; category: string; image: string | null; qty: number; revenue: number }>();
    const categoryStats = new Map<string, { orders: Set<string>; qty: number; revenue: number }>();

    for (const it of itemRows) {
      const key = it.productId ?? it.productName;
      const catKey = it.product?.category ?? 'unknown';
      const image = it.product ? parseImages(it.product.images)[0] ?? null : null;

      if (!productTotals.has(key)) {
        productTotals.set(key, {
          name: it.product?.name ?? it.productName,
          category: it.product?.category ?? '',
          image,
          qty: 0,
          revenue: 0,
        });
      }
      const entry = productTotals.get(key)!;
      entry.qty += it.quantity;
      entry.revenue += it.price * it.quantity;

      if (!categoryStats.has(catKey)) {
        categoryStats.set(catKey, { orders: new Set(), qty: 0, revenue: 0 });
      }
      const cat = categoryStats.get(catKey)!;
      cat.orders.add(it.orderId);
      cat.qty += it.quantity;
      cat.revenue += it.price * it.quantity;
    }

    const topProducts = [...productTotals.values()]
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
      .map((p) => ({ name: p.name, category: p.category, image: p.image, qty: p.qty, revenue: p.revenue }));

    const categoryPerformance = [...categoryStats.entries()]
      .map(([category, v]) => ({
        category,
        categoryLabel: category,
        ordersCount: v.orders.size,
        qty: v.qty,
        revenue: v.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Normalize recent orders (images parsed) for the dashboard lists.
    const recent = recentOrders.map((o) => ({
      ...o,
      customerAddress: parseJsonSafe<Record<string, unknown>>(String(o.customerAddress), {}),
      items: o.items.map((it) => ({
        ...it,
        product: it.product ? { ...it.product, images: parseImages(it.product.images) } : it.product,
      })),
    }));

    res.json({
      revenue,
      revenueDeltaPercent,
      ordersCount,
      pendingOrdersCount,
      confirmedOrdersCount,
      activeOrdersCount,
      deliveredOrdersCount,
      shippedOrdersCount,
      cancelledOrdersCount,
      productsCount,
      customersCount,
      reviewsCount,
      couponsActive,
      lowStockProducts,
      topProducts,
      categoryPerformance,
      recentlyCancelledOrders: recentlyCancelled,
      recentOrders: recent,
      lowStockLevel: LOW_STOCK_LEVEL,
    });
  })
);

/**
 * Sales Overview — revenue/order trend for the dashboard chart.
 * GET /api/admin/sales-overview?range=today|7d|30d|3m|1y
 * Buckets adapt to the requested range (hourly → daily → weekly → monthly).
 */
router.get(
  '/admin/sales-overview',
  requirePermission(PERM.DASHBOARD_ANALYTICS),
  asyncHandler(async (req, res) => {
    const range = String(req.query.range || '30d');
    const now = new Date();
    let since: Date;
    let bucketMs: number;
    let bucketCount: number;
    let labelFn: (d: Date) => string;

    switch (range) {
      case 'today': {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        since = start;
        bucketMs = 60 * 60 * 1000;
        bucketCount = 24;
        labelFn = (d) => `${d.getHours()}:00`;
        break;
      }
      case '7d': {
        since = daysAgo(7);
        bucketMs = 24 * 60 * 60 * 1000;
        bucketCount = 7;
        labelFn = (d) => d.toLocaleDateString('en-GB', { weekday: 'short' });
        break;
      }
      case '3m': {
        since = daysAgo(90);
        bucketMs = 7 * 24 * 60 * 60 * 1000;
        bucketCount = 13;
        labelFn = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        break;
      }
      case '1y': {
        since = daysAgo(365);
        bucketMs = 30 * 24 * 60 * 60 * 1000;
        bucketCount = 12;
        labelFn = (d) => d.toLocaleDateString('en-GB', { month: 'short' });
        break;
      }
      default: {
        since = daysAgo(30);
        bucketMs = 24 * 60 * 60 * 1000;
        bucketCount = 30;
        labelFn = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      }
    }

    const orders = await prisma.order.findMany({
      where: { status: { not: 'cancelled' }, createdAt: { gte: since } },
      select: { createdAt: true, total: true },
    });

    // Anchor buckets at the range start (day boundaries for day+ ranges, hour for 'today').
    let anchor = since.getTime();
    if (range === 'today') {
      anchor = since.getTime();
    } else {
      // align to local midnight
      const dayStart = new Date(since);
      dayStart.setHours(0, 0, 0, 0);
      anchor = dayStart.getTime();
    }

    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      label: labelFn(new Date(anchor + i * bucketMs)),
      revenue: 0,
      orders: 0,
    }));

    for (const o of orders) {
      const t = o.createdAt.getTime();
      if (t < anchor) continue;
      const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((t - anchor) / bucketMs)));
      buckets[idx].revenue += o.total;
      buckets[idx].orders += 1;
    }

    res.json({
      range,
      points: buckets,
      totalRevenue: buckets.reduce((s, b) => s + b.revenue, 0),
      totalOrders: buckets.reduce((s, b) => s + b.orders, 0),
    });
  })
);

/**
 * All customers — one row per unique phone number, computed from real order data.
 * GET /api/admin/customers
 * Returns name, phone, email, total orders, total spend (excl. cancelled),
 * first/last order date and location, sorted by total spend descending.
 */
router.get(
  '/admin/customers',
  requirePermission(PERM.CUSTOMERS_VIEW),
  asyncHandler(async (_req, res) => {
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        customerAddress: true,
        status: true,
        total: true,
        createdAt: true,
      },
    });

    // Group by normalized phone number (fallback for phone-less orders).
    const byPhone = new Map<string, CustomerRow>();
    for (const o of orders) {
      const phone = String(o.customerPhone || '').trim() || 'Unknown';
      const addr = parseJsonSafe<Record<string, string>>(String(o.customerAddress || ''), {});

      let c = byPhone.get(phone);
      if (!c) {
        c = {
          name: o.customerName || '—',
          phone,
          email: o.customerEmail || '',
          division: addr.division || '',
          district: addr.district || '',
          totalSpent: 0,
          ordersCount: 0,
          lastOrderAt: o.createdAt,
          firstOrderAt: o.createdAt,
          lastOrderNumber: o.orderNumber,
        };
        byPhone.set(phone, c);
      }
      c.ordersCount += 1;
      if (o.status !== 'cancelled') c.totalSpent += o.total;
      if (o.createdAt > c.lastOrderAt) {
        c.lastOrderAt = o.createdAt;
        c.lastOrderNumber = o.orderNumber;
      }
      if (o.createdAt < c.firstOrderAt) c.firstOrderAt = o.createdAt;
      // Prefer the most recent order's identity fields.
      if (o.customerName && o.createdAt.getTime() === c.lastOrderAt.getTime()) c.name = o.customerName;
      if (o.customerEmail) c.email = o.customerEmail || c.email;
      if (addr.division) c.division = addr.division;
      if (addr.district) c.district = addr.district;
    }

    const customers = [...byPhone.values()]
      .sort((a, b) => b.totalSpent - a.totalSpent || b.ordersCount - a.ordersCount)
      .map((c) => ({
        ...c,
        totalSpent: Math.round(c.totalSpent),
        firstOrderAt: c.firstOrderAt.toISOString(),
        lastOrderAt: c.lastOrderAt.toISOString(),
      }));

    res.json({ customers, count: customers.length });
  })
);

export default router;