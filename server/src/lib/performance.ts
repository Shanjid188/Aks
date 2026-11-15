// Campaign performance: attributed net revenue (lib/revenue.ts rules) joined
// with ad spend (lib/adSpend.ts, BDT via the exchange-rate table).
//
// Defaults: booked net revenue, last non-direct touch, online orders only
// (POS sales are excluded from marketing attribution). Ratios with a zero or
// unknown denominator are null — the UI shows "—", never 0 or ∞.
import { prisma } from './prisma.ts';
import { revenueOrderWhere, refundsByOrder, netOrderValue, type OrderSourceFilter, type RevenueBasis } from './revenue.ts';
import { addToTotals, emptyTotals, isoDay, loadFxTable, spendWhere, storeDay, type SpendTotals } from './adSpend.ts';

export type AttributionModel = 'last' | 'first';
export const parseModel = (v: unknown): AttributionModel => (v === 'first' ? 'first' : 'last');

export interface PerfFilter {
  from: Date;
  to: Date;
  basis: RevenueBasis;
  model: AttributionModel;
  source: OrderSourceFilter;
}

export interface PerfMetrics {
  orders: number;
  revenue: number;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  /** Rows of this group's spend with no exchange rate (excluded from spend). */
  unconvertedSpendRows: number;
  roas: number | null;
  cpa: number | null;
  ctr: number | null;
  cpc: number | null;
  aov: number | null;
}

export interface CampaignRow extends PerfMetrics {
  campaignId: string | null;
  name: string;
  channel: string | null;
  platform: string | null;
  status: string | null;
}

const ratio = (a: number | null, b: number | null) => (a === null || b === null || b === 0 ? null : a / b);
const round2 = (n: number) => Math.round(n * 100) / 100;

function finish(m: { orders: number; revenue: number; spend: SpendTotals | null }, includeSpend: boolean): PerfMetrics {
  const spend = includeSpend && m.spend ? round2(m.spend.spendBdt) : null;
  const impressions = includeSpend && m.spend ? m.spend.impressions : null;
  const clicks = includeSpend && m.spend ? m.spend.clicks : null;
  // No spend recorded at all → spend-based ratios are unknown, not zero.
  const hasSpend = includeSpend && m.spend !== null && m.spend.rows > 0;
  return {
    orders: m.orders,
    revenue: round2(m.revenue),
    spend: hasSpend ? spend : includeSpend ? 0 : null,
    impressions: hasSpend ? impressions : null,
    clicks: hasSpend ? clicks : null,
    unconvertedSpendRows: includeSpend && m.spend ? m.spend.unconvertedRows : 0,
    roas: hasSpend ? ratio(m.revenue, spend) : null,
    cpa: hasSpend ? ratio(spend, m.orders) : null,
    ctr: hasSpend ? ratio(clicks, impressions) : null,
    cpc: hasSpend ? ratio(spend, clicks) : null,
    aov: ratio(m.revenue, m.orders),
  };
}

export interface PerformanceReport {
  filter: { from: string; to: string; basis: RevenueBasis; model: AttributionModel; source: OrderSourceFilter };
  totals: PerfMetrics & {
    attributedOrders: number;
    directOrders: number;
    directRevenue: number;
    /** All revenue in scope (attributed + direct). */
    totalRevenue: number;
    /** Total revenue ÷ total ad spend (marketing efficiency ratio). */
    blendedRoas: number | null;
  };
  campaigns: CampaignRow[];
  channels: (PerfMetrics & { channel: string })[];
  daily: { day: string; revenue: number; attributedRevenue: number; spend: number | null }[];
  spendIncluded: boolean;
}

export async function campaignPerformance(f: PerfFilter, opts: { includeSpend: boolean }): Promise<PerformanceReport> {
  const orders = await prisma.order.findMany({
    where: revenueOrderWhere({ basis: f.basis, source: f.source, createdAt: { gte: f.from, lte: f.to } }),
    select: {
      id: true,
      total: true,
      createdAt: true,
      attributions: { where: { touch: f.model }, select: { campaignId: true, channel: true } },
    },
  });
  const refunds = await refundsByOrder(orders.map((o) => o.id));

  type Acc = { orders: number; revenue: number; spend: SpendTotals | null };
  const byCampaign = new Map<string | null, Acc>();
  const byChannel = new Map<string, Acc>();
  const daily = new Map<string, { revenue: number; attributedRevenue: number; spend: number }>();
  const dayRow = (d: string) => {
    let r = daily.get(d);
    if (!r) daily.set(d, (r = { revenue: 0, attributedRevenue: 0, spend: 0 }));
    return r;
  };
  const acc = <K>(m: Map<K, Acc>, k: K) => {
    let a = m.get(k);
    if (!a) m.set(k, (a = { orders: 0, revenue: 0, spend: null }));
    return a;
  };

  let directOrders = 0;
  let directRevenue = 0;
  let totalRevenue = 0;
  for (const o of orders) {
    const net = netOrderValue(o.total, refunds.get(o.id));
    totalRevenue += net;
    const day = dayRow(isoDay(storeDay(o.createdAt)));
    day.revenue += net;
    const touch = o.attributions[0];
    if (!touch) {
      directOrders++;
      directRevenue += net;
      const ch = acc(byChannel, 'direct');
      ch.orders++;
      ch.revenue += net;
      continue;
    }
    day.attributedRevenue += net;
    const ch = acc(byChannel, touch.channel);
    ch.orders++;
    ch.revenue += net;
    if (touch.campaignId) {
      const c = acc(byCampaign, touch.campaignId);
      c.orders++;
      c.revenue += net;
    }
  }

  // Spend for the same store-local days.
  const spendTotalsAll = emptyTotals();
  if (opts.includeSpend) {
    const [rows, fx] = await Promise.all([
      prisma.adSpendEntry.findMany({
        where: spendWhere({ from: f.from, to: f.to }),
        select: { amount: true, currency: true, date: true, impressions: true, clicks: true, campaignId: true, campaign: { select: { channel: true } } },
      }),
      loadFxTable(),
    ]);
    for (const r of rows) {
      const c = acc(byCampaign, r.campaignId);
      c.spend ??= emptyTotals();
      const bdt = addToTotals(c.spend, r, fx);
      addToTotals(spendTotalsAll, r, fx);
      if (bdt !== null) dayRow(isoDay(r.date)).spend += bdt;
    }
  }

  const campaignIds = [...byCampaign.keys()].filter((k): k is string => k !== null);
  const meta = new Map(
    (await prisma.marketingCampaign.findMany({ where: { id: { in: campaignIds } }, select: { id: true, name: true, channel: true, platform: true, status: true } })).map((c) => [c.id, c])
  );
  const campaigns: CampaignRow[] = [...byCampaign.entries()].map(([id, a]) => {
    const c = id ? meta.get(id) : undefined;
    return {
      campaignId: id,
      name: c?.name ?? 'Spend without a campaign',
      channel: c?.channel ?? null,
      platform: c?.platform ?? null,
      status: c?.status ?? null,
      ...finish(a, opts.includeSpend),
    };
  });
  campaigns.sort((a, b) => b.revenue - a.revenue || (b.spend ?? 0) - (a.spend ?? 0));

  const channels = [...byChannel.entries()]
    .map(([channel, a]) => ({ channel, ...finish({ ...a, spend: null }, false) }))
    .sort((a, b) => b.revenue - a.revenue);

  // Continuous day axis across the window.
  const days: PerformanceReport['daily'] = [];
  for (let d = storeDay(f.from); d <= storeDay(f.to); d = new Date(d.getTime() + 86_400_000)) {
    const k = isoDay(d);
    const r = daily.get(k);
    days.push({ day: k, revenue: round2(r?.revenue ?? 0), attributedRevenue: round2(r?.attributedRevenue ?? 0), spend: opts.includeSpend ? round2(r?.spend ?? 0) : null });
    if (days.length > 800) break;
  }

  const attributedRevenue = totalRevenue - directRevenue;
  const totals = {
    ...finish({ orders: orders.length - directOrders, revenue: attributedRevenue, spend: opts.includeSpend ? spendTotalsAll : null }, opts.includeSpend),
    attributedOrders: orders.length - directOrders,
    directOrders,
    directRevenue: round2(directRevenue),
    totalRevenue: round2(totalRevenue),
    blendedRoas: opts.includeSpend && spendTotalsAll.rows > 0 ? ratio(totalRevenue, spendTotalsAll.spendBdt) : null,
  };

  return {
    filter: { from: f.from.toISOString(), to: f.to.toISOString(), basis: f.basis, model: f.model, source: f.source },
    totals,
    campaigns,
    channels,
    daily: days,
    spendIncluded: opts.includeSpend,
  };
}
