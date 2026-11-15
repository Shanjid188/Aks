// Product performance for Reports → Products. Builds on lib/revenue.ts (which
// orders count, refunds per order) — there is no second revenue definition.
//
// Product revenue is item value (unit price × quantity) on counted orders,
// i.e. before order-level discount, shipping and tax, so the column total is
// the merchandise subtotal, not order revenue.
//
// Refunds on counted orders are allocated to products:
//   1. a refund tied to a return request for a product in that order goes to
//      that product;
//   2. any other refund is spread over the order's lines by item value.
// A product's net revenue never goes below zero.
//
// Return rate = returned units ÷ units ordered, where "ordered" covers every
// placed order except cancelled ones and parked POS carts. Orders whose status
// is returned/refunded count all their units as returned; on other orders the
// approved/received/refunded return requests count.
import { prisma } from './prisma.ts';
import { revenueOrderWhere, type OrderSourceFilter, type RevenueBasis } from './revenue.ts';
import { isoDay, storeDay } from './adSpend.ts';
import type { AttributionModel } from './performance.ts';

const RETURNED_ORDER_STATUSES = ['returned', 'refunded'];
const COUNTED_RETURN_STATUSES = ['approved', 'received', 'refunded'];
const CHUNK = 500;

export interface ProductPerfFilter {
  from: Date;
  to: Date;
  basis: RevenueBasis;
  source: OrderSourceFilter;
  model: AttributionModel;
}

export interface ProductRow {
  /** productId, or `name:<productName>` for lines whose product was deleted. */
  key: string;
  productId: string | null;
  name: string;
  sku: string;
  unitsSold: number;
  orders: number;
  revenue: number;
  refunds: number;
  netRevenue: number;
  /** null when any sold unit has no known cost. */
  cost: number | null;
  profit: number | null;
  margin: number | null;
  unitsOrdered: number;
  unitsReturned: number;
  returnRate: number | null;
  /** Net revenue by marketing channel (`direct` = online with no touch, `pos` = counter sale). Only when requested. */
  channels?: Record<string, number>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const ratio = (a: number, b: number) => (b === 0 ? null : a / b);

interface Line {
  orderId: string;
  key: string;
  productId: string | null;
  productName: string;
  productSku: string;
  quantity: number;
  value: number;
  unitCost: number | null;
}

async function inChunks<T, R>(ids: T[], fn: (chunk: T[]) => Promise<R[]>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) out.push(...(await fn(ids.slice(i, i + CHUNK))));
  return out;
}

/** Allocate each order's refunds to its lines. Returns refund per line index. */
function allocateRefunds(
  lines: Line[],
  refunds: { orderId: string; amount: number; productId: string | null }[]
): number[] {
  const alloc = new Array<number>(lines.length).fill(0);
  const byOrder = new Map<string, number[]>();
  lines.forEach((l, i) => {
    const a = byOrder.get(l.orderId);
    if (a) a.push(i);
    else byOrder.set(l.orderId, [i]);
  });
  for (const r of refunds) {
    const idx = byOrder.get(r.orderId);
    if (!idx || r.amount <= 0) continue;
    const targeted = r.productId ? idx.filter((i) => lines[i].productId === r.productId) : [];
    const pool = targeted.length ? targeted : idx;
    const base = pool.reduce((s, i) => s + lines[i].value, 0);
    for (const i of pool) alloc[i] += base === 0 ? r.amount / pool.length : (r.amount * lines[i].value) / base;
  }
  return alloc;
}

export async function productPerformance(
  f: ProductPerfFilter,
  opts: { includeChannels: boolean }
): Promise<{ rows: ProductRow[]; totals: Omit<ProductRow, 'key' | 'productId' | 'name' | 'sku' | 'channels'> & { costCoverage: number | null } }> {
  const window = { gte: f.from, lte: f.to };
  const counted = revenueOrderWhere({ basis: f.basis, source: f.source, createdAt: window });

  const orders = await prisma.order.findMany({
    where: counted,
    select: {
      id: true,
      source: true,
      items: { select: { productId: true, productName: true, productSku: true, quantity: true, price: true, unitCost: true } },
      ...(opts.includeChannels ? { attributions: { where: { touch: f.model }, select: { channel: true } } } : {}),
    },
  });

  const lines: Line[] = [];
  const orderChannel = new Map<string, string>();
  for (const o of orders) {
    if (opts.includeChannels) {
      const touch = (o as { attributions?: { channel: string }[] }).attributions?.[0];
      // POS sales never come from a site visit: their own bucket, not "direct".
      orderChannel.set(o.id, o.source === 'pos' ? 'pos' : touch?.channel ?? 'direct');
    }
    for (const it of o.items) {
      lines.push({
        orderId: o.id,
        key: it.productId ?? `name:${it.productName}`,
        productId: it.productId,
        productName: it.productName,
        productSku: it.productSku,
        quantity: it.quantity,
        value: it.price * it.quantity,
        unitCost: it.unitCost,
      });
    }
  }

  const orderIds = orders.map((o) => o.id);
  const refundRows = await inChunks(orderIds, (chunk) =>
    prisma.refund.findMany({
      where: { orderId: { in: chunk } },
      select: { orderId: true, amount: true, returnRequest: { select: { productId: true } } },
    })
  );
  const allocated = allocateRefunds(
    lines,
    refundRows.map((r) => ({ orderId: r.orderId!, amount: r.amount, productId: r.returnRequest?.productId ?? null }))
  );

  // Cost: the line's own cost snapshot, else the product's current cost price.
  const productIds = [...new Set(lines.map((l) => l.productId).filter((x): x is string => !!x))];
  const products = await inChunks(productIds, (chunk) =>
    prisma.product.findMany({ where: { id: { in: chunk } }, select: { id: true, costPrice: true, sku: true, name: true } })
  );
  const productMap = new Map(products.map((p) => [p.id, p]));

  type Acc = ProductRow & { orderSet: Set<string> };
  const rows = new Map<string, Acc>();
  const row = (l: Line): Acc => {
    let r = rows.get(l.key);
    if (!r) {
      const p = l.productId ? productMap.get(l.productId) : undefined;
      r = {
        key: l.key,
        productId: l.productId,
        name: p?.name ?? l.productName,
        sku: p?.sku ?? l.productSku,
        unitsSold: 0,
        orders: 0,
        revenue: 0,
        refunds: 0,
        netRevenue: 0,
        cost: 0,
        profit: null,
        margin: null,
        unitsOrdered: 0,
        unitsReturned: 0,
        returnRate: null,
        ...(opts.includeChannels ? { channels: {} } : {}),
        orderSet: new Set(),
      };
      rows.set(l.key, r);
    }
    return r;
  };

  lines.forEach((l, i) => {
    const r = row(l);
    const refund = Math.min(l.value, allocated[i]);
    const net = l.value - refund;
    r.unitsSold += l.quantity;
    r.orderSet.add(l.orderId);
    r.revenue += l.value;
    r.refunds += refund;
    r.netRevenue += net;
    const unitCost = l.unitCost ?? (l.productId ? productMap.get(l.productId)?.costPrice ?? null : null);
    r.cost = r.cost === null || unitCost === null ? null : r.cost + unitCost * l.quantity;
    if (r.channels) {
      const ch = orderChannel.get(l.orderId) ?? 'direct';
      r.channels[ch] = (r.channels[ch] ?? 0) + net;
    }
  });

  // Return rate over all placed orders in the window (not just counted ones).
  const placedWhere = {
    heldAt: null,
    status: { not: 'cancelled' },
    createdAt: window,
    ...(f.source !== 'all' ? { source: f.source } : {}),
  };
  const [ordered, wholeReturned, returnReqs] = await Promise.all([
    prisma.orderItem.groupBy({ by: ['productId', 'productName'], where: { order: placedWhere }, _sum: { quantity: true } }),
    prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: { order: { ...placedWhere, status: { in: RETURNED_ORDER_STATUSES } } },
      _sum: { quantity: true },
    }),
    prisma.returnRequest.groupBy({
      by: ['productId', 'productName'],
      where: { status: { in: COUNTED_RETURN_STATUSES }, order: { ...placedWhere, status: { notIn: ['cancelled', ...RETURNED_ORDER_STATUSES] } } },
      _sum: { quantity: true },
    }),
  ]);
  const ensure = (productId: string | null, productName: string | null): Acc => {
    const key = productId ?? `name:${productName ?? ''}`;
    return (
      rows.get(key) ??
      row({ orderId: '', key, productId, productName: productName ?? '(unknown product)', productSku: productMap.get(productId ?? '')?.sku ?? '', quantity: 0, value: 0, unitCost: null })
    );
  };
  for (const g of ordered) ensure(g.productId, g.productName).unitsOrdered += g._sum.quantity ?? 0;
  for (const g of wholeReturned) ensure(g.productId, g.productName).unitsReturned += g._sum.quantity ?? 0;
  for (const g of returnReqs) ensure(g.productId, g.productName).unitsReturned += g._sum.quantity ?? 0;

  // Rows created only for return stats may lack a SKU/name from the catalog.
  const missing = [...rows.values()].filter((r) => r.productId && !productMap.has(r.productId)).map((r) => r.productId!);
  if (missing.length) {
    for (const p of await prisma.product.findMany({ where: { id: { in: missing } }, select: { id: true, sku: true, name: true } })) {
      const r = rows.get(p.id);
      if (r) Object.assign(r, { sku: p.sku, name: p.name });
    }
  }

  const totals = { unitsSold: 0, orders: orderIds.length, revenue: 0, refunds: 0, netRevenue: 0, cost: 0, profit: null as number | null, margin: null as number | null, unitsOrdered: 0, unitsReturned: 0, returnRate: null as number | null, costCoverage: null as number | null };
  let costedNet = 0;
  const out: ProductRow[] = [...rows.values()].map(({ orderSet, ...r }) => {
    // No sales in the window → cost/profit unknown rather than 0.
    const cost = r.unitsSold === 0 ? null : r.cost;
    const profit = cost === null ? null : r.netRevenue - cost;
    totals.unitsSold += r.unitsSold;
    totals.revenue += r.revenue;
    totals.refunds += r.refunds;
    totals.netRevenue += r.netRevenue;
    totals.unitsOrdered += r.unitsOrdered;
    totals.unitsReturned += r.unitsReturned;
    if (cost !== null) {
      totals.cost += cost;
      costedNet += r.netRevenue;
    }
    return {
      ...r,
      orders: orderSet.size,
      revenue: round2(r.revenue),
      refunds: round2(r.refunds),
      netRevenue: round2(r.netRevenue),
      cost: cost === null ? null : round2(cost),
      profit: profit === null ? null : round2(profit),
      margin: profit === null ? null : ratio(profit, r.netRevenue),
      returnRate: ratio(r.unitsReturned, r.unitsOrdered),
      ...(r.channels ? { channels: Object.fromEntries(Object.entries(r.channels).map(([k, v]) => [k, round2(v)])) } : {}),
    };
  });
  out.sort((a, b) => b.netRevenue - a.netRevenue || b.unitsSold - a.unitsSold);

  totals.profit = costedNet === 0 ? null : round2(costedNet - totals.cost);
  totals.margin = totals.profit === null ? null : ratio(totals.profit, costedNet);
  totals.costCoverage = ratio(costedNet, totals.netRevenue);
  totals.returnRate = ratio(totals.unitsReturned, totals.unitsOrdered);
  totals.revenue = round2(totals.revenue);
  totals.refunds = round2(totals.refunds);
  totals.netRevenue = round2(totals.netRevenue);
  totals.cost = round2(totals.cost);
  return { rows: out, totals };
}

/** Daily units and net revenue for one product (store-local days). */
export async function productTrend(
  productId: string,
  f: Omit<ProductPerfFilter, 'model'>
): Promise<{ day: string; units: number; revenue: number; netRevenue: number }[]> {
  const orders = await prisma.order.findMany({
    where: { ...revenueOrderWhere({ basis: f.basis, source: f.source, createdAt: { gte: f.from, lte: f.to } }), items: { some: { productId } } },
    select: { id: true, createdAt: true, items: { select: { productId: true, productName: true, productSku: true, quantity: true, price: true, unitCost: true } } },
  });
  const lines: (Line & { day: string })[] = [];
  for (const o of orders) {
    const day = isoDay(storeDay(o.createdAt));
    for (const it of o.items) {
      lines.push({ orderId: o.id, day, key: it.productId ?? '', productId: it.productId, productName: it.productName, productSku: it.productSku, quantity: it.quantity, value: it.price * it.quantity, unitCost: it.unitCost });
    }
  }
  const refunds = await inChunks(orders.map((o) => o.id), (chunk) =>
    prisma.refund.findMany({ where: { orderId: { in: chunk } }, select: { orderId: true, amount: true, returnRequest: { select: { productId: true } } } })
  );
  const alloc = allocateRefunds(lines, refunds.map((r) => ({ orderId: r.orderId!, amount: r.amount, productId: r.returnRequest?.productId ?? null })));

  const byDay = new Map<string, { units: number; revenue: number; netRevenue: number }>();
  lines.forEach((l, i) => {
    if (l.productId !== productId) return;
    const d = byDay.get(l.day) ?? { units: 0, revenue: 0, netRevenue: 0 };
    d.units += l.quantity;
    d.revenue += l.value;
    d.netRevenue += l.value - Math.min(l.value, alloc[i]);
    byDay.set(l.day, d);
  });
  const out: { day: string; units: number; revenue: number; netRevenue: number }[] = [];
  for (let d = storeDay(f.from); d <= storeDay(f.to); d = new Date(d.getTime() + 86_400_000)) {
    const k = isoDay(d);
    const r = byDay.get(k);
    out.push({ day: k, units: r?.units ?? 0, revenue: round2(r?.revenue ?? 0), netRevenue: round2(r?.netRevenue ?? 0) });
    if (out.length > 800) break;
  }
  return out;
}
