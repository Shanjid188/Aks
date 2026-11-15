import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, TrendingUp } from 'lucide-react';
import { api } from '../../api';
import { EmptyState, PageHeader, Spinner } from '../../components/ui';
import { BarList, DateRangePicker, Segmented as Toggle, StatTile, TrendChart, bdt, fmtMoney, fmtPct, fmtRatio, presetRange, rangeQuery, type DateRange } from '../../components/charts';
import { channelLabel } from '../../components/marketing';

interface Metrics {
  orders: number;
  revenue: number;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  unconvertedSpendRows: number;
  roas: number | null;
  cpa: number | null;
  ctr: number | null;
  cpc: number | null;
  aov: number | null;
}

interface Report {
  totals: Metrics & { attributedOrders: number; directOrders: number; directRevenue: number; totalRevenue: number; blendedRoas: number | null };
  campaigns: (Metrics & { campaignId: string | null; name: string; channel: string | null; platform: string | null; status: string | null })[];
  channels: (Metrics & { channel: string })[];
  daily: { day: string; revenue: number; attributedRevenue: number; spend: number | null }[];
  spendIncluded: boolean;
}

type Basis = 'booked' | 'delivered';
type Model = 'last' | 'first';

const roasTone = (v: number | null) => (v === null ? 'muted' : v >= 1 ? 'good' : 'bad');

export function PerformancePage() {
  const [range, setRange] = useState<DateRange>(() => presetRange('30d'));
  const [basis, setBasis] = useState<Basis>('booked');
  const [model, setModel] = useState<Model>('last');
  const [includePos, setIncludePos] = useState(false);
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<Report>(`/admin/advertising/performance?${rangeQuery(range)}&basis=${basis}&model=${model}&source=${includePos ? 'all' : 'online'}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [range, basis, model, includePos]);
  useEffect(() => {
    void load();
  }, [load]);

  const t = data?.totals;
  const unconverted = data?.campaigns.reduce((s, c) => s + c.unconvertedSpendRows, 0) ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Advertising"
        title="Campaign Performance"
        desc="Revenue from attributed orders against ad spend. Net of refunds; cancelled, returned and refunded orders excluded."
        icon={<TrendingUp className="w-5 h-5" />}
        actions={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            <button onClick={() => void load()} className="ml-1 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/15 bg-white/10 text-white hover:bg-white/20 cursor-pointer" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <Toggle value={basis} onChange={setBasis} options={[['booked', 'Booked revenue'], ['delivered', 'Delivered revenue']]} />
        <Toggle value={model} onChange={setModel} options={[['last', 'Last non-direct touch'], ['first', 'First touch']]} />
        <label className="inline-flex items-center gap-2 text-[11px] font-bold text-neutral-600 cursor-pointer">
          <input type="checkbox" checked={includePos} onChange={(e) => setIncludePos(e.target.checked)} /> Include POS orders
        </label>
      </div>
      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {loading && !data ? (
        <Spinner />
      ) : !data || !t ? null : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatTile label="Attributed revenue" value={bdt(t.revenue)} sub={`${t.attributedOrders} order(s)`} />
            <StatTile label="Ad spend" value={data.spendIncluded ? fmtMoney(t.spend) : '—'} tone="bad" sub={data.spendIncluded ? undefined : 'Needs spend permission'} />
            <StatTile label="ROAS" value={fmtRatio(t.roas)} tone={roasTone(t.roas)} sub="Attributed revenue ÷ spend" />
            <StatTile label="Blended ROAS" value={fmtRatio(t.blendedRoas)} tone={roasTone(t.blendedRoas)} sub="All revenue ÷ spend" />
            <StatTile label="CPA" value={fmtMoney(t.cpa)} sub="Spend ÷ attributed orders" />
            <StatTile label="Direct / untagged" value={bdt(t.directRevenue)} tone="muted" sub={`${t.directOrders} order(s)`} />
          </div>
          {unconverted > 0 && (
            <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {unconverted} spend row(s) have no exchange rate and are excluded from spend, ROAS and CPA. Add rates in Advertising → Ad Spend.
            </p>
          )}

          <section className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h3 className="text-sm font-black text-neutral-900 mb-3">Revenue vs. ad spend</h3>
            <TrendChart
              points={data.daily.map((d) => ({ label: d.day.slice(5), primary: d.attributedRevenue, secondary: d.spend ?? undefined }))}
              primaryLabel="Attributed revenue"
              secondaryLabel={data.spendIncluded ? 'Ad spend' : undefined}
              formatSecondary={bdt}
              ariaLabel="Daily attributed revenue and ad spend"
              footnote={model === 'last' ? 'Last non-direct touch within 30 days.' : 'First touch within 30 days.'}
            />
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <section className="xl:col-span-2 bg-white rounded-2xl border border-neutral-200">
              <header className="px-5 py-4 border-b border-neutral-100">
                <h3 className="text-sm font-black text-neutral-900">Campaigns</h3>
              </header>
              {data.campaigns.length === 0 ? (
                <EmptyState icon={<TrendingUp className="w-6 h-6" />} title="No campaign activity in this range" hint="Tag ad links with UTM parameters and record spend to see performance." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                        <th className="px-5 py-3">Campaign</th>
                        <th className="px-3 py-3 text-right">Spend</th>
                        <th className="px-3 py-3 text-right">Orders</th>
                        <th className="px-3 py-3 text-right">Revenue</th>
                        <th className="px-3 py-3 text-right">ROAS</th>
                        <th className="px-3 py-3 text-right">CPA</th>
                        <th className="px-3 py-3 text-right">CTR</th>
                        <th className="px-3 py-3 text-right">CPC</th>
                        <th className="px-5 py-3 text-right">AOV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {data.campaigns.map((c) => (
                        <tr key={c.campaignId ?? 'none'} className="hover:bg-neutral-50/70">
                          <td className="px-5 py-2.5">
                            <p className={`font-bold ${c.campaignId ? 'text-neutral-900' : 'text-neutral-400 italic'}`}>{c.name}</p>
                            <p className="text-[10px] text-neutral-400 capitalize">{[c.platform ?? c.channel, c.status].filter(Boolean).join(' · ')}</p>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                            {fmtMoney(c.spend)}
                            {c.unconvertedSpendRows > 0 && <AlertTriangle className="inline w-3 h-3 ml-1 text-amber-500" aria-label="Some spend not converted" />}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{c.orders}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">{bdt(c.revenue)}</td>
                          <td className={`px-3 py-2.5 text-right tabular-nums font-black ${c.roas === null ? 'text-neutral-400' : c.roas >= 1 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtRatio(c.roas)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">{fmtMoney(c.cpa)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{fmtPct(c.ctr, 2)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">{fmtMoney(c.cpc)}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums whitespace-nowrap">{fmtMoney(c.aov)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <section className="bg-white rounded-2xl border border-neutral-200">
              <header className="px-5 py-4 border-b border-neutral-100">
                <h3 className="text-sm font-black text-neutral-900">Revenue by channel</h3>
              </header>
              <div className="p-5">
                <BarList rows={data.channels.map((c) => ({ label: channelLabel(c.channel), value: c.revenue, hint: `${c.orders} order(s)` }))} />
              </div>
            </section>
          </div>
          <p className="text-[11px] text-neutral-400">
            ROAS, CPA, CTR and CPC show “—” when there is no spend, order, impression or click to divide by. Ad platforms count conversions differently; these numbers come from your own orders.
          </p>
        </>
      )}
    </div>
  );
}
