import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Gauge, Info, RefreshCw } from 'lucide-react';
import { api } from '../../api';
import { PageHeader, Spinner } from '../../components/ui';
import { BarList, DateRangePicker, StatTile, TrendChart, bdt, fmtMoney, fmtPct, fmtRatio, presetRange, rangeQuery, type DateRange } from '../../components/charts';
import { channelLabel } from '../../components/marketing';
import { useCan } from '../../lib/permission-context';
import { PERM } from '../../lib/permissions';

/*
 * Marketing Dashboard — composes the existing Advertising endpoints only
 * (Performance, Traffic, Abandoned Carts, Tracking health, unmatched UTM
 * campaigns). It does no metric maths of its own: every number is shown as
 * its endpoint reports it, with the source labelled. Sections whose data
 * source isn't connected show a setup prompt; sections the admin may not see
 * are left out.
 */

interface PerfMetrics {
  orders: number;
  revenue: number;
  spend: number | null;
  roas: number | null;
  cpa: number | null;
  unconvertedSpendRows: number;
}
interface Performance {
  totals: PerfMetrics & { attributedOrders: number; directOrders: number; totalRevenue: number; blendedRoas: number | null };
  campaigns: (PerfMetrics & { campaignId: string | null; name: string; channel: string | null })[];
  channels: (PerfMetrics & { channel: string })[];
  daily: { day: string; revenue: number; attributedRevenue: number; spend: number | null }[];
  spendIncluded: boolean;
}
type Traffic =
  | { connected: false }
  | { connected: true; fetchedAt: string; totals: { sessions: number; users: number; conversionRate: number | null; engagementRate: number | null } };
interface Carts {
  summary: { sessions: number; abandoned: number; abandonedValue: number; abandonmentRate: number | null; recovered: number; recoveredValue: number; withContact: number };
}
interface Health {
  channels: { channel: string; last24h: { sent: number; failed: number; pending: number }; last7d: { sent: number; failed: number; pending: number }; lastSentAt: string | null }[];
  failures: unknown[];
}
interface Unmatched {
  unmatched: { utmCampaign: string | null; utmId: string | null; orders: number }[];
}

type Section<T> = { data?: T; error?: string } | null; // null = not permitted

async function load<T>(allowed: boolean, path: string): Promise<Section<T>> {
  if (!allowed) return null;
  try {
    return { data: await api.get<T>(path) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const HEALTH_LABEL: Record<string, string> = { meta_capi: 'Meta Conversions API', ga4_mp: 'GA4 Measurement Protocol' };

function Panel({ title, source, children, className = '' }: { title: string; source?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-2xl border border-neutral-200 p-5 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="text-sm font-black text-neutral-900">{title}</h3>
        {source && <span className="text-[10px] text-neutral-400">Source: {source}</span>}
      </div>
      {children}
    </section>
  );
}

function Setup({ children }: { children: ReactNode }) {
  return <p className="text-xs text-neutral-500 bg-neutral-50 border border-dashed border-neutral-200 rounded-lg px-3 py-2">{children}</p>;
}

function Failed({ msg }: { msg: string }) {
  return <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{msg}</p>;
}

export function MarketingDashboardPage() {
  const can = useCan();
  const [range, setRange] = useState<DateRange>(() => presetRange('30d'));
  const [loading, setLoading] = useState(true);
  const [perf, setPerf] = useState<Section<Performance>>(null);
  const [perf7, setPerf7] = useState<Section<Performance>>(null);
  const [traffic, setTraffic] = useState<Section<Traffic>>(null);
  const [carts, setCarts] = useState<Section<Carts>>(null);
  const [health, setHealth] = useState<Section<Health>>(null);
  const [unmatched, setUnmatched] = useState<Section<Unmatched>>(null);

  const canCampaigns = can(PERM.ADVERTISING_CAMPAIGNS_VIEW);
  const canTraffic = can(PERM.ADVERTISING_TRAFFIC_VIEW);
  const canCarts = can(PERM.ADVERTISING_CARTS_VIEW);
  const canTracking = can(PERM.ADVERTISING_TRACKING_VIEW);

  const refresh = useCallback(async () => {
    setLoading(true);
    const q = rangeQuery(range);
    const [p, p7, t, c, h, u] = await Promise.all([
      load<Performance>(canCampaigns, `/admin/advertising/performance?${q}`),
      load<Performance>(canCampaigns, `/admin/advertising/performance?${rangeQuery(presetRange('7d'))}`),
      load<Traffic>(canTraffic, `/admin/advertising/traffic?from=${range.from}&to=${range.to}`),
      load<Carts>(canCarts, `/admin/advertising/carts?${q}`),
      load<Health>(canTracking, '/admin/advertising/tracking/health'),
      load<Unmatched>(canCampaigns, '/admin/advertising/attribution/unmatched'),
    ]);
    setPerf(p);
    setPerf7(p7);
    setTraffic(t);
    setCarts(c);
    setHealth(h);
    setUnmatched(u);
    setLoading(false);
  }, [range, canCampaigns, canTraffic, canCarts, canTracking]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const P = perf?.data;
  const T = traffic?.data;
  const C = carts?.data?.summary;
  const ga4 = T && T.connected ? T : null;

  // Insights: plain rules over the data above.
  const insights: { tone: 'warn' | 'info'; text: string }[] = [];
  const P7 = perf7?.data;
  if (P7?.spendIncluded) {
    const idle = P7.campaigns.filter((c) => c.campaignId && (c.spend ?? 0) > 0 && c.orders === 0);
    if (idle.length) insights.push({ tone: 'warn', text: `${idle.length} campaign(s) spent money in the last 7 days with no attributed orders: ${idle.slice(0, 3).map((c) => c.name).join(', ')}${idle.length > 3 ? '…' : ''}.` });
  }
  const unconverted = P?.campaigns.reduce((s, c) => s + c.unconvertedSpendRows, 0) ?? 0;
  if (unconverted > 0) insights.push({ tone: 'warn', text: `${unconverted} ad-spend row(s) have no exchange rate, so they are left out of spend and ROAS. Add rates in Ad Spend.` });
  const um = unmatched?.data?.unmatched ?? [];
  if (um.length) insights.push({ tone: 'info', text: `${um.length} UTM campaign name(s) on orders don't match any campaign (e.g. “${um[0].utmCampaign ?? um[0].utmId}”). Add them as match keys in Campaigns.` });
  const failed24 = health?.data?.channels.reduce((s, c) => s + c.last24h.failed, 0) ?? 0;
  if (failed24 > 0) insights.push({ tone: 'warn', text: `${failed24} server-side tracking event(s) failed in the last 24 hours. See Tracking Settings.` });
  if (C && C.withContact > 0) insights.push({ tone: 'info', text: `${C.withContact} abandoned cart(s) have opted in to a reminder. See Abandoned Carts.` });
  if (P && P.spendIncluded && P.totals.spend === 0) insights.push({ tone: 'info', text: 'No ad spend recorded for this range. Sync Meta or import spend to see ROAS and CPA.' });

  const nothingAllowed = !canCampaigns && !canTraffic && !canCarts && !canTracking;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Advertising"
        title="Marketing Dashboard"
        desc="Ad spend, attributed revenue, traffic and carts in one place. Each number is labelled with its source."
        icon={<Gauge className="w-5 h-5" />}
        actions={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            <button onClick={() => void refresh()} className="ml-1 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/15 bg-white/10 text-white hover:bg-white/20 cursor-pointer" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </>
        }
      />

      {nothingAllowed ? (
        <Setup>Your role can open this dashboard but none of its sections. Ask a Super Admin for campaign, traffic, cart or tracking access.</Setup>
      ) : loading && !perf && !traffic && !carts ? (
        <Spinner />
      ) : (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            {P && (
              <>
                <StatTile label="Ad spend" value={P.spendIncluded ? fmtMoney(P.totals.spend) : '—'} tone="bad" source="Ad Spend" sub={P.spendIncluded ? undefined : 'Needs spend access'} />
                <StatTile label="Attributed revenue" value={bdt(P.totals.revenue)} tone="good" source="Your orders" sub={`${P.totals.attributedOrders} order(s)`} />
                <StatTile label="ROAS" value={fmtRatio(P.totals.roas)} tone={P.totals.roas === null ? 'muted' : P.totals.roas >= 1 ? 'good' : 'bad'} source="Orders ÷ spend" />
                <StatTile label="CPA" value={fmtMoney(P.totals.cpa)} source="Spend ÷ orders" />
              </>
            )}
            {traffic && (
              <>
                <StatTile label="Sessions" value={ga4 ? ga4.totals.sessions.toLocaleString('en-IN') : '—'} tone={ga4 ? 'neutral' : 'muted'} source="GA4" sub={ga4 ? undefined : traffic.error ? 'GA4 error' : 'GA4 not connected'} />
                <StatTile label="Conversion rate" value={ga4 ? fmtPct(ga4.totals.conversionRate) : '—'} tone={ga4 ? 'neutral' : 'muted'} source="GA4 (consented)" />
              </>
            )}
            {C && <StatTile label="Abandoned carts" value={bdt(C.abandonedValue)} tone="bad" source="Checkout sessions" sub={`${C.abandoned} cart(s) · ${fmtPct(C.abandonmentRate)}`} />}
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <section className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-2">
              <h3 className="text-sm font-black text-neutral-900">Needs attention</h3>
              {insights.map((i, k) => (
                <p key={k} className={`flex items-start gap-2 text-xs ${i.tone === 'warn' ? 'text-amber-800' : 'text-neutral-600'}`}>
                  {i.tone === 'warn' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Info className="w-4 h-4 shrink-0 text-sky-600" />}
                  {i.text}
                </p>
              ))}
            </section>
          )}

          {perf && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <Panel title="Spend vs. attributed revenue" source="Your orders + Ad Spend" className="xl:col-span-2">
                {perf.error ? (
                  <Failed msg={perf.error} />
                ) : P ? (
                  <TrendChart
                    points={P.daily.map((d) => ({ label: d.day.slice(5), primary: d.attributedRevenue, secondary: d.spend ?? undefined }))}
                    primaryLabel="Attributed revenue"
                    secondaryLabel={P.spendIncluded ? 'Ad spend' : undefined}
                    formatSecondary={bdt}
                    ariaLabel="Daily attributed revenue and ad spend"
                    footnote="Booked net revenue, last non-direct touch, online orders."
                  />
                ) : null}
              </Panel>
              <Panel title="Revenue by channel" source="Your orders">
                {P && <BarList rows={P.channels.map((c) => ({ label: channelLabel(c.channel), value: c.revenue, hint: `${c.orders} order(s)` }))} />}
              </Panel>
            </div>
          )}

          {P && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <Panel title="Top campaigns by ROAS" source="Your orders + Ad Spend">
                {!P.spendIncluded ? (
                  <Setup>ROAS needs ad spend access.</Setup>
                ) : (
                  <BarList
                    format={(n) => fmtRatio(n)}
                    rows={P.campaigns
                      .filter((c) => c.campaignId && c.roas !== null)
                      .sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))
                      .slice(0, 5)
                      .map((c) => ({ label: c.name, value: c.roas ?? 0, hint: bdt(c.revenue) }))}
                    empty="No campaign has both spend and revenue in this range."
                  />
                )}
              </Panel>
              <Panel title="Top campaigns by revenue" source="Your orders">
                <BarList
                  rows={P.campaigns
                    .filter((c) => c.campaignId && c.revenue > 0)
                    .slice(0, 5)
                    .map((c) => ({ label: c.name, value: c.revenue, hint: `${c.orders} order(s)` }))}
                  empty="No attributed campaign revenue in this range."
                />
              </Panel>
            </div>
          )}

          {/* Funnel — each step from its own source, so steps are not strictly comparable */}
          {(traffic || carts || perf) && (
            <Panel title="Funnel">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
                <FunnelStep
                  label="Sessions"
                  source="GA4 (consented visitors)"
                  value={ga4 ? ga4.totals.sessions : null}
                  missing={!traffic ? 'No traffic access' : traffic.error ? 'GA4 error' : 'Connect GA4 in Integrations'}
                />
                <FunnelStep label="Checkouts started" source="Checkout sessions" value={C ? C.sessions : null} missing={!carts ? 'No cart access' : carts.error ?? 'No data'} arrow />
                <FunnelStep label="Online orders" source="Your orders (booked)" value={P ? P.totals.attributedOrders + P.totals.directOrders : null} missing={!perf ? 'No campaign access' : perf.error ?? 'No data'} arrow />
              </div>
              <p className="mt-3 text-[10px] text-neutral-400">GA4 sees only visitors who accepted analytics cookies, while checkouts and orders count every shopper. Treat the step-to-step ratios as rough.</p>
            </Panel>
          )}

          {/* Tracking health strip */}
          {health && (
            <Panel title="Tracking health" source="Server-side send log">
              {health.error ? (
                <Failed msg={health.error} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {health.data!.channels.map((c) => (
                    <div key={c.channel} className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-xs">
                      {c.last24h.failed > 0 ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : c.lastSentAt ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Info className="w-4 h-4 text-neutral-400" />}
                      <div className="min-w-0">
                        <p className="font-bold text-neutral-900">{HEALTH_LABEL[c.channel] ?? c.channel}</p>
                        <p className="text-neutral-500">
                          {c.lastSentAt ? `Last sent ${new Date(c.lastSentAt).toLocaleString()}` : 'Nothing sent yet'} · 7 days: {c.last7d.sent} sent, {c.last7d.failed} failed
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {traffic?.data && !traffic.data.connected && <Setup>Connect GA4 in Advertising → Integrations to add sessions and conversion rate.</Setup>}
          {traffic?.error && <Failed msg={`GA4: ${traffic.error}`} />}
          {carts?.error && <Failed msg={`Abandoned carts: ${carts.error}`} />}
        </>
      )}
    </div>
  );
}

function FunnelStep({ label, source, value, missing, arrow }: { label: string; source: string; value: number | null; missing: string; arrow?: boolean }) {
  return (
    <div className="relative rounded-xl border border-neutral-200 px-4 py-3">
      {arrow && <ArrowRight className="hidden sm:block absolute -left-[18px] top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />}
      <p className="text-[10px] font-bold uppercase text-neutral-400">{label}</p>
      <p className={`text-xl font-black mt-1 tabular-nums ${value === null ? 'text-neutral-300' : 'text-neutral-900'}`}>{value === null ? '—' : value.toLocaleString('en-IN')}</p>
      <p className="text-[10px] text-neutral-400 mt-1">{value === null ? missing : `Source: ${source}`}</p>
    </div>
  );
}
