import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, hasPermission, requirePermission } from '../lib/auth.ts';
import { spendTotals } from '../lib/adSpend.ts';
import { PERM } from '../lib/permissions.ts';
import { parseBasis, parseSource, refundsByOrder, netOrderValue, revenueOrderWhere } from '../lib/revenue.ts';
import { isoDay, storeDay } from '../lib/adSpend.ts';
import { parseModel } from '../lib/performance.ts';
import { productPerformance, productTrend } from '../lib/productPerformance.ts';
import { Ga4Error, ga4DataStatus, itemFunnelReport } from '../lib/ga4Data.ts';

const router = Router();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function parseDate(v?: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Admin: reports summary with real numbers. */
router.get(
  '/admin/reports',
  requirePermission(PERM.REPORTS_VIEW),
  asyncHandler(async (_req, res) => {
    const q = _req.query as Record<string, string | undefined>;
    const range = String(q.range || '7d');

    // A custom From/To window (dates AND times) overrides the preset range.
    const customFrom = parseDate(q.from);
    const customTo = parseDate(q.to);
    const isCustom = customFrom !== null || customTo !== null;

    let since: Date;
    let until: Date | null = null;
    if (isCustom) {
      since = customFrom ?? daysAgo(3650);
      until = customTo;
    } else {
      const days = range === 'today' ? 1 : range === '30d' ? 30 : range === '3m' ? 90 : range === '1y' ? 365 : 7;
      since = daysAgo(days);
    }
    const dateWindow = until ? { gte: since, lte: until } : { gte: since };

    // Optional filters; defaults keep the historical behaviour (all sources, booked).
    const filter = { basis: parseBasis(q.basis), source: parseSource(q.source), createdAt: dateWindow };
    const orderWhere = revenueOrderWhere(filter);

    const [orders, orderItems, expenses, refunds] = await Promise.all([
      prisma.order.findMany({
        where: orderWhere,
        select: { id: true, total: true, source: true, paymentMethod: true, status: true, createdAt: true },
      }),
      prisma.orderItem.findMany({
        where: { order: orderWhere },
        select: { productId: true, productName: true, quantity: true, price: true },
      }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { expenseDate: dateWindow } }),
      prisma.refund.aggregate({ _sum: { amount: true }, where: { createdAt: dateWindow } }),
    ]);

    const revenue = orders.reduce((s, o) => s + o.total, 0);
    const totalExpenses = expenses._sum.amount ?? 0;
    // Cash refunded in the window (informational — includes refunds on orders
    // that are already excluded from revenue as returned/refunded).
    const totalRefunds = refunds._sum.amount ?? 0;
    // Net revenue subtracts only refunds on orders still counted above, so a
    // fully refunded order is never removed twice.
    const orderRefunds = await refundsByOrder(orders.map((o) => o.id));
    const netRevenue = orders.reduce((s, o) => s + netOrderValue(o.total, orderRefunds.get(o.id)), 0);

    // Ad spend in the same window (BDT via the admin exchange-rate table), only
    // for admins allowed to see spend. Unconverted foreign-currency rows are
    // reported, never guessed.
    const adSpend = (await hasPermission(_req, PERM.ADVERTISING_SPEND_VIEW))
      ? await spendTotals({ from: since, to: until ?? new Date() })
      : null;

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
      basis: filter.basis,
      sourceFilter: filter.source,
      from: since,
      to: until,
      revenue,
      ordersCount: orders.length,
      totalExpenses,
      totalRefunds,
      netRevenue,
      refundsOnCountedOrders: revenue - netRevenue,
      adSpend,
      profit: null, // cost-price profit is computed when product cost prices exist
      paymentMethod,
      source,
      orderStatus: status,
      topProducts: [...productSales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    });
  })
);

/**
 * Admin: revenue and profit by product (uses costPrice when present).
 * GET /api/admin/reports/profit?from&to&source&basis — aggregated in the
 * database, so there is no row cap. Without from/to it covers all time.
 */
router.get(
  '/admin/reports/profit',
  requirePermission(PERM.REPORTS_VIEW),
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const from = parseDate(q.from);
    const to = parseDate(q.to);
    const createdAt = from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined;
    const orderWhere = revenueOrderWhere({ basis: parseBasis(q.basis), source: parseSource(q.source), createdAt });

    // Group by product + unit price so revenue = Σ price × qty stays exact.
    const grouped = await prisma.orderItem.groupBy({
      by: ['productId', 'productName', 'price'],
      where: { order: orderWhere },
      _sum: { quantity: true },
    });
    const products = await prisma.product.findMany({ select: { id: true, costPrice: true } });
    const costMap = new Map(products.map((p) => [p.id, p.costPrice ?? null]));

    const byProduct = new Map<string, { productId: string | null; productName: string; quantity: number; revenue: number; cost: number | null }>();
    for (const g of grouped) {
      const key = g.productId ?? `name:${g.productName}`;
      const qty = g._sum.quantity ?? 0;
      const row = byProduct.get(key) ?? { productId: g.productId, productName: g.productName, quantity: 0, revenue: 0, cost: 0 };
      const unitCost = g.productId ? (costMap.get(g.productId) ?? null) : null;
      row.quantity += qty;
      row.revenue += g.price * qty;
      // Any line without a known cost makes the product's cost unknown.
      row.cost = row.cost == null || unitCost == null ? null : row.cost + unitCost * qty;
      byProduct.set(key, row);
    }

    let totalRevenue = 0;
    let totalCost = 0;
    let costedRevenue = 0;
    const rows = [...byProduct.values()]
      .map((r) => {
        totalRevenue += r.revenue;
        if (r.cost != null) {
          totalCost += r.cost;
          costedRevenue += r.revenue;
        }
        return { ...r, profit: r.cost == null ? null : r.revenue - r.cost };
      })
      .sort((a, b) => b.revenue - a.revenue);

    res.json({
      from,
      to,
      rows,
      totalRevenue,
      totalCost,
      // Profit only over products whose cost is known; null when none are.
      totalProfit: costedRevenue === 0 ? null : costedRevenue - totalCost,
      costCoverage: totalRevenue === 0 ? null : costedRevenue / totalRevenue,
    });
  })
);

/** Shared window parsing for the Products tab: ISO from/to, default last 30 days, max 2 years. */
function productWindow(q: Record<string, string | undefined>): { from: Date; to: Date } | { error: string } {
  const to = parseDate(q.to) ?? new Date();
  const from = parseDate(q.from) ?? new Date(to.getTime() - 30 * 86_400_000);
  if (from > to) return { error: 'The start date is after the end date' };
  if (to.getTime() - from.getTime() > 731 * 86_400_000) return { error: 'Choose a range of at most 2 years' };
  return { from, to };
}

/**
 * Admin: Reports → Products. Units, revenue, refunds, net revenue, profit and
 * margin (where cost is known), return rate — plus, for admins who may see
 * them, net revenue by marketing channel and the GA4 item funnel.
 * GET /api/admin/reports/products?from&to&basis=booked|delivered&source=all|online|pos&model=last|first&refresh=1
 */
router.get(
  '/admin/reports/products',
  requirePermission(PERM.REPORTS_VIEW),
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const w = productWindow(q);
    if ('error' in w) return res.status(400).json({ error: w.error });
    const filter = { ...w, basis: parseBasis(q.basis), source: parseSource(q.source), model: parseModel(q.model) };
    const [canChannels, canTraffic] = await Promise.all([
      hasPermission(req, PERM.ADVERTISING_CAMPAIGNS_VIEW),
      hasPermission(req, PERM.ADVERTISING_TRAFFIC_VIEW),
    ]);
    const report = await productPerformance(filter, { includeChannels: canChannels });

    // GA4 item funnel (consented shoppers only), joined on SKU = GA4 item_id.
    let ga4: { connected: boolean; fetchedAt?: string; error?: string; unmatchedItems?: number } | null = null;
    if (canTraffic) {
      if (!ga4DataStatus().connected) ga4 = { connected: false };
      else {
        try {
          const today = isoDay(storeDay(new Date()));
          const funnel = await itemFunnelReport(isoDay(storeDay(w.from)), isoDay(storeDay(w.to)), today, q.refresh === '1');
          const seen = new Set<string>();
          for (const r of report.rows) {
            const f = funnel.items.get(r.sku);
            if (!f) continue;
            seen.add(r.sku);
            Object.assign(r, {
              ga4: {
                viewed: f.viewed,
                addedToCart: f.addedToCart,
                purchased: f.purchased,
                addToCartRate: f.viewed ? f.addedToCart / f.viewed : null,
                viewToPurchaseRate: f.viewed ? f.purchased / f.viewed : null,
              },
            });
          }
          ga4 = { connected: true, fetchedAt: funnel.fetchedAt, unmatchedItems: [...funnel.items.keys()].filter((k) => !seen.has(k)).length };
        } catch (err) {
          if (!(err instanceof Ga4Error)) throw err;
          ga4 = { connected: true, error: err.message };
        }
      }
    }

    res.json({
      filter: { from: w.from, to: w.to, basis: filter.basis, source: filter.source, model: filter.model },
      ...report,
      channelsIncluded: canChannels,
      ga4,
    });
  })
);

/** Admin: one product's daily units and net revenue. GET /api/admin/reports/products/:productId/trend?from&to&basis&source */
router.get(
  '/admin/reports/products/:productId/trend',
  requirePermission(PERM.REPORTS_VIEW),
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const w = productWindow(q);
    if ('error' in w) return res.status(400).json({ error: w.error });
    const product = await prisma.product.findUnique({ where: { id: String(req.params.productId) }, select: { id: true, name: true, sku: true } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const daily = await productTrend(product.id, { ...w, basis: parseBasis(q.basis), source: parseSource(q.source) });
    res.json({ product, daily });
  })
);

export default router;
