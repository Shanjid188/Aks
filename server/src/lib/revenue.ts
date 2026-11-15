// The single definition of "revenue" used by every admin report, dashboard
// and marketing metric. Changing what counts as revenue happens here only.
//
//  booked    — orders that are a real sale: not cancelled / returned /
//              refunded, and not a parked POS cart (heldAt set).
//  delivered — booked orders that reached the customer (delivered/completed).
//              For cash-on-delivery this is the closest to collected money.
//  net       — booked (or delivered) order totals minus Refund rows recorded
//              against those same orders. Refunds on orders that are already
//              excluded (status refunded/returned) are NOT subtracted again.
//
// Refunds are attributed to the order's own period (order cohort), so a
// window's net revenue only ever includes orders created inside it.
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.ts';

export const NON_REVENUE_STATUSES = ['cancelled', 'returned', 'refunded'] as const;
export const DELIVERED_STATUSES = ['delivered', 'completed'] as const;

export type RevenueBasis = 'booked' | 'delivered';
export type OrderSourceFilter = 'online' | 'pos' | 'all';

export interface RevenueFilter {
  basis?: RevenueBasis;
  source?: OrderSourceFilter;
  /** Order creation window. */
  createdAt?: Prisma.DateTimeFilter;
}

export function parseBasis(v: unknown): RevenueBasis {
  return v === 'delivered' ? 'delivered' : 'booked';
}

export function parseSource(v: unknown, fallback: OrderSourceFilter = 'all'): OrderSourceFilter {
  return v === 'online' || v === 'pos' || v === 'all' ? v : fallback;
}

/** Prisma `where` for orders that count as revenue under the given filter. */
export function revenueOrderWhere(f: RevenueFilter = {}): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {
    heldAt: null,
    status:
      f.basis === 'delivered'
        ? { in: [...DELIVERED_STATUSES] }
        : { notIn: [...NON_REVENUE_STATUSES] },
  };
  if (f.source && f.source !== 'all') where.source = f.source;
  if (f.createdAt) where.createdAt = f.createdAt;
  return where;
}

/** Does this single order count as revenue (in-memory form of revenueOrderWhere)? */
export function isRevenueOrder(
  o: { status: string; heldAt?: Date | null; source?: string },
  f: Omit<RevenueFilter, 'createdAt'> = {}
): boolean {
  if (o.heldAt) return false;
  if (f.source && f.source !== 'all' && o.source !== f.source) return false;
  return f.basis === 'delivered'
    ? (DELIVERED_STATUSES as readonly string[]).includes(o.status)
    : !(NON_REVENUE_STATUSES as readonly string[]).includes(o.status);
}

const CHUNK = 500;

/** Sum of Refund.amount per order, for the given order ids. */
export async function refundsByOrder(orderIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (let i = 0; i < orderIds.length; i += CHUNK) {
    const rows = await prisma.refund.groupBy({
      by: ['orderId'],
      where: { orderId: { in: orderIds.slice(i, i + CHUNK) } },
      _sum: { amount: true },
    });
    for (const r of rows) if (r.orderId) out.set(r.orderId, r._sum.amount ?? 0);
  }
  return out;
}

/** Order total net of its own refunds, never below zero. */
export function netOrderValue(total: number, refunded = 0): number {
  return Math.max(0, total - refunded);
}

export interface RevenueOrder {
  id: string;
  total: number;
  createdAt: Date;
  source: string;
  /** total − refunds recorded against this order. */
  net: number;
}

/** Revenue orders for a filter, each carrying its net value. */
export async function revenueOrders(f: RevenueFilter = {}): Promise<RevenueOrder[]> {
  const orders = await prisma.order.findMany({
    where: revenueOrderWhere(f),
    select: { id: true, total: true, createdAt: true, source: true },
  });
  const refunds = await refundsByOrder(orders.map((o) => o.id));
  return orders.map((o) => ({ ...o, net: netOrderValue(o.total, refunds.get(o.id)) }));
}

export interface RevenueSummary {
  /** Sum of order totals. */
  gross: number;
  /** Refunds recorded against the counted orders. */
  refunds: number;
  /** gross − refunds (per order, floored at 0). */
  net: number;
  orders: number;
}

export async function revenueSummary(f: RevenueFilter = {}): Promise<RevenueSummary> {
  const orders = await revenueOrders(f);
  let gross = 0;
  let net = 0;
  for (const o of orders) {
    gross += o.total;
    net += o.net;
  }
  return { gross, net, refunds: gross - net, orders: orders.length };
}
