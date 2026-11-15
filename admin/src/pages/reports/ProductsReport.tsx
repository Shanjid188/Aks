import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Download, Package, RefreshCw } from 'lucide-react';
import { api } from '../../api';
import { EmptyState, Modal, PageHeader, Spinner } from '../../components/ui';
import { DateRangePicker, Segmented, StatTile, TrendChart, bdt, fmtMoney, fmtPct, presetRange, rangeQuery, type DateRange } from '../../components/charts';
import { channelLabel } from '../../components/marketing';
import { useCan } from '../../lib/permission-context';
import { PERM } from '../../lib/permissions';

interface Ga4Item {
  viewed: number;
  addedToCart: number;
  purchased: number;
  addToCartRate: number | null;
  viewToPurchaseRate: number | null;
}

interface ProductRow {
  key: string;
  productId: string | null;
  name: string;
  sku: string;
  unitsSold: number;
  orders: number;
  revenue: number;
  refunds: number;
  netRevenue: number;
  cost: number | null;
  profit: number | null;
  margin: number | null;
  unitsOrdered: number;
  unitsReturned: number;
  returnRate: number | null;
  channels?: Record<string, number>;
  ga4?: Ga4Item;
}

interface Report {
  rows: ProductRow[];
  totals: {
    unitsSold: number;
    orders: number;
    revenue: number;
    refunds: number;
    netRevenue: number;
    profit: number | null;
    margin: number | null;
    returnRate: number | null;
    costCoverage: number | null;
  };
  channelsIncluded: boolean;
  ga4: { connected: boolean; fetchedAt?: string; error?: string; unmatchedItems?: number } | null;
}

type SortKey = 'name' | 'unitsSold' | 'netRevenue' | 'refunds' | 'profit' | 'margin' | 'returnRate' | 'viewed' | 'addToCartRate' | 'viewToPurchaseRate';

const sortValue = (r: ProductRow, k: SortKey): number | string | null => {
  if (k === 'name') return r.name.toLowerCase();
  if (k === 'viewed' || k === 'addToCartRate' || k === 'viewToPurchaseRate') return r.ga4?.[k] ?? null;
  return r[k];
};

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Reports → Products: per-product sales, refunds, profit, returns, channels and GA4 funnel. */
export function ProductsReport({ tabs }: { tabs: ReactNode }) {
  const can = useCan();
  const [range, setRange] = useState<DateRange>(() => presetRange('30d'));
  const [basis, setBasis] = useState<'booked' | 'delivered'>('booked');
  const [source, setSource] = useState<'all' | 'online' | 'pos'>('all');
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'netRevenue', desc: true });
  const [trendFor, setTrendFor] = useState<ProductRow | null>(null);

  const query = `${rangeQuery(range)}&basis=${basis}&source=${source}`;
  const load = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError(null);
      try {
        setData(await api.get<Report>(`/admin/reports/products?${query}${refresh ? '&refresh=1' : ''}`));
      } catch (e) {
        setError((e as Error).message);
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [query]
  );
  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    if (!data) return [];
    const out = [...data.rows];
    out.sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      // Unknown values always sink to the bottom, whatever the direction.
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      const c = va < vb ? -1 : va > vb ? 1 : 0;
      return sort.desc ? -c : c;
    });
    return out;
  }, [data, sort]);

  const channelKeys = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of data?.rows ?? []) for (const [k, v] of Object.entries(r.channels ?? {})) totals.set(k, (totals.get(k) ?? 0) + v);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [data]);

  const showGa4 = !!data?.ga4?.connected && !data.ga4.error;

  const exportCsv = () => {
    if (!data) return;
    const head = ['Product', 'SKU', 'Units sold', 'Orders', 'Revenue', 'Refunds', 'Net revenue', 'Cost', 'Profit', 'Margin %', 'Units ordered', 'Units returned', 'Return rate %'];
    if (data.channelsIncluded) head.push(...channelKeys.map((k) => `Net revenue: ${channelLabel(k)}`));
    if (showGa4) head.push('GA4 views', 'GA4 add-to-carts', 'GA4 purchases', 'Add-to-cart rate %', 'View-to-purchase rate %');
    const pct = (v: number | null | undefined) => (v == null ? '' : (v * 100).toFixed(2));
    const lines = rows.map((r) => {
      const cells: unknown[] = [r.name, r.sku, r.unitsSold, r.orders, r.revenue, r.refunds, r.netRevenue, r.cost ?? '', r.profit ?? '', pct(r.margin), r.unitsOrdered, r.unitsReturned, pct(r.returnRate)];
      if (data.channelsIncluded) cells.push(...channelKeys.map((k) => r.channels?.[k] ?? 0));
      if (showGa4) cells.push(r.ga4?.viewed ?? '', r.ga4?.addedToCart ?? '', r.ga4?.purchased ?? '', pct(r.ga4?.addToCartRate), pct(r.ga4?.viewToPurchaseRate));
      return cells.map(csvCell).join(',');
    });
    const blob = new Blob([[head.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `product-performance_${range.from}_${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const Th = ({ k, children, right }: { k: SortKey; children: ReactNode; right?: boolean }) => (
    <th className={`px-3 py-3 ${right ? 'text-right' : ''}`}>
      <button
        onClick={() => setSort((s) => ({ key: k, desc: s.key === k ? !s.desc : k !== 'name' }))}
        className={`inline-flex items-center gap-1 uppercase cursor-pointer hover:text-neutral-700 ${sort.key === k ? 'text-neutral-800' : ''}`}
      >
        {children}
        {sort.key === k && (sort.desc ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
      </button>
    </th>
  );

  const t = data?.totals;
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Insights"
        title="Reports"
        desc="Per-product sales, refunds, profit and returns from your own orders."
        icon={<Package className="w-5 h-5" />}
        actions={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            <button onClick={() => void load(true)} className="ml-1 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/15 bg-white/10 text-white hover:bg-white/20 cursor-pointer" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </>
        }
      />
      {tabs}
      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={basis} onChange={setBasis} options={[['booked', 'Booked'], ['delivered', 'Delivered']]} />
        <Segmented value={source} onChange={setSource} options={[['all', 'All orders'], ['online', 'Online'], ['pos', 'POS']]} />
        {can(PERM.REPORTS_EXPORT) && data && data.rows.length > 0 && (
          <button onClick={exportCsv} className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 cursor-pointer">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        )}
      </div>
      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {loading && !data ? (
        <Spinner />
      ) : !data || !t ? null : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatTile label="Units sold" value={t.unitsSold.toLocaleString('en-IN')} sub={`${t.orders} order(s)`} />
            <StatTile label="Product revenue" value={bdt(t.revenue)} sub="Price × qty, before discounts & shipping" />
            <StatTile label="Refunds" value={bdt(t.refunds)} tone="bad" />
            <StatTile label="Net revenue" value={bdt(t.netRevenue)} tone="good" />
            <StatTile
              label="Profit"
              value={fmtMoney(t.profit)}
              tone={t.profit === null ? 'muted' : t.profit >= 0 ? 'good' : 'bad'}
              sub={t.profit === null || t.costCoverage === null ? 'No cost prices on these products' : t.costCoverage < 0.9995 ? `Covers ${fmtPct(t.costCoverage, 0)} of net revenue (products with cost)` : `Margin ${fmtPct(t.margin)}`}
            />
            <StatTile label="Return rate" value={fmtPct(t.returnRate)} sub="Returned ÷ ordered units" />
          </div>

          {data.ga4 && !data.ga4.connected && (
            <p className="text-xs text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
              Connect GA4 in Advertising → Integrations to add product views and add-to-cart rates.
            </p>
          )}
          {data.ga4?.error && (
            <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> GA4 columns unavailable: {data.ga4.error}
            </p>
          )}

          <section className="bg-white rounded-2xl border border-neutral-200">
            {rows.length === 0 ? (
              <EmptyState icon={<Package className="w-6 h-6" />} title="No product sales in this range" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-black tracking-wide text-neutral-400 border-b border-neutral-100">
                      <Th k="name">Product</Th>
                      <Th k="unitsSold" right>Units</Th>
                      <Th k="netRevenue" right>Net revenue</Th>
                      <Th k="refunds" right>Refunds</Th>
                      <Th k="profit" right>Profit</Th>
                      <Th k="margin" right>Margin</Th>
                      <Th k="returnRate" right>Return rate</Th>
                      {data.channelsIncluded && <th className="px-3 py-3 uppercase">Net revenue by channel</th>}
                      {showGa4 && (
                        <>
                          <Th k="viewed" right>Views</Th>
                          <Th k="addToCartRate" right>Add-to-cart</Th>
                          <Th k="viewToPurchaseRate" right>View → buy</Th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {rows.map((r) => (
                      <tr key={r.key} className="hover:bg-neutral-50/70">
                        <td className="px-3 py-3">
                          {r.productId ? (
                            <button onClick={() => setTrendFor(r)} className="font-bold text-neutral-900 hover:text-[#D8232A] text-left cursor-pointer" title="Show daily trend">
                              {r.name}
                            </button>
                          ) : (
                            <span className="font-bold text-neutral-900">{r.name}</span>
                          )}
                          <p className="text-[10px] text-neutral-400">{r.sku || 'Deleted product'}</p>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{r.unitsSold}</td>
                        <td className="px-3 py-3 text-right font-black tabular-nums">{bdt(r.netRevenue)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-neutral-500">{r.refunds ? bdt(r.refunds) : '—'}</td>
                        <td className={`px-3 py-3 text-right tabular-nums ${r.profit === null ? 'text-neutral-400' : r.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {r.profit === null ? (r.unitsSold ? 'No cost price' : '—') : bdt(r.profit)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{fmtPct(r.margin)}</td>
                        <td className="px-3 py-3 text-right tabular-nums" title={`${r.unitsReturned} of ${r.unitsOrdered} unit(s)`}>{fmtPct(r.returnRate)}</td>
                        {data.channelsIncluded && (
                          <td className="px-3 py-3 text-[11px] text-neutral-600">
                            {channelKeys
                              .filter((k) => (r.channels?.[k] ?? 0) > 0)
                              .map((k) => `${channelLabel(k)} ${bdt(r.channels![k])}`)
                              .join(' · ') || '—'}
                          </td>
                        )}
                        {showGa4 && (
                          <>
                            <td className="px-3 py-3 text-right tabular-nums">{r.ga4 ? r.ga4.viewed.toLocaleString('en-IN') : '—'}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{fmtPct(r.ga4?.addToCartRate)}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{fmtPct(r.ga4?.viewToPurchaseRate)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="px-5 py-3 border-t border-neutral-100 text-[10px] text-neutral-400 leading-relaxed">
              Net revenue = item value on {basis === 'booked' ? 'booked' : 'delivered'} orders minus refunds (a return's refund goes to its product; other refunds are split by item value).
              Profit uses each sale's cost snapshot, else the product's cost price.
              {data.channelsIncluded && ' Channels use the last non-direct touch; POS is shown separately.'}
              {showGa4 && ` Views and rates come from GA4 (consented shoppers only, matched on SKU), fetched ${new Date(data.ga4!.fetchedAt!).toLocaleString()}.`}
            </p>
          </section>
        </>
      )}

      {trendFor?.productId && <ProductTrend product={trendFor} query={query} onClose={() => setTrendFor(null)} />}
    </div>
  );
}

function ProductTrend({ product, query, onClose }: { product: ProductRow; query: string; onClose: () => void }) {
  const [daily, setDaily] = useState<{ day: string; units: number; netRevenue: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api
      .get<{ daily: { day: string; units: number; netRevenue: number }[] }>(`/admin/reports/products/${product.productId}/trend?${query}`)
      .then((r) => setDaily(r.daily))
      .catch((e: Error) => setError(e.message));
  }, [product.productId, query]);
  return (
    <Modal open onClose={onClose} title={`${product.name} — daily trend`} wide>
      {error ? (
        <p className="text-xs text-red-700">{error}</p>
      ) : !daily ? (
        <Spinner />
      ) : (
        <TrendChart
          points={daily.map((d) => ({ label: d.day.slice(5), primary: d.netRevenue, secondary: d.units }))}
          primaryLabel="Net revenue"
          secondaryLabel="Units"
          ariaLabel={`Daily net revenue and units for ${product.name}`}
        />
      )}
    </Modal>
  );
}
