import { useCallback, useEffect, useState } from 'react';
import { BarChart2, RefreshCw } from 'lucide-react';
import { api } from '../../api';
import { EmptyState, PageHeader, Spinner, formatDate } from '../../components/ui';
import { BarList, DateRangePicker, StatTile, TrendChart, bdt, compact, fmtPct, presetRange, type DateRange } from '../../components/charts';

interface TrafficReport {
  connected: true;
  propertyId: string;
  range: { start: string; end: string };
  fetchedAt: string;
  totals: {
    sessions: number;
    users: number;
    newUsers: number;
    engagedSessions: number;
    engagementRate: number | null;
    purchases: number;
    purchaseRevenue: number;
    conversionRate: number | null;
  };
  daily: { day: string; sessions: number; users: number }[];
  channels: { channel: string; sessions: number; engagedSessions: number; purchases: number; revenue: number }[];
  sourceMedium: { sourceMedium: string; sessions: number; purchases: number; revenue: number }[];
  landingPages: { page: string; sessions: number; engagedSessions: number; purchases: number }[];
  devices: { device: string; sessions: number; purchases: number }[];
}

type Response = TrafficReport | { connected: false };

const num = (n: number) => n.toLocaleString('en-IN');
const rate = (a: number, b: number) => (b === 0 ? null : a / b);

function Table<T>({ title, rows, cols, empty }: { title: string; rows: T[]; cols: [string, (r: T) => React.ReactNode, boolean?][]; empty: string }) {
  return (
    <section className="bg-white rounded-2xl border border-neutral-200">
      <header className="px-5 py-4 border-b border-neutral-100">
        <h3 className="text-sm font-black text-neutral-900">{title}</h3>
      </header>
      {rows.length === 0 ? (
        <p className="p-5 text-xs text-neutral-400">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                {cols.map(([h, , right], i) => (
                  <th key={h} className={`py-3 ${i === 0 ? 'px-5' : 'px-3'} ${right ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-neutral-50/70">
                  {cols.map(([h, cell, right], j) => (
                    <td key={h} className={`py-2.5 ${j === 0 ? 'px-5 font-bold text-neutral-900 break-all' : 'px-3 tabular-nums whitespace-nowrap'} ${right ? 'text-right' : ''}`}>{cell(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function TrafficPage() {
  const [range, setRange] = useState<DateRange>(() => presetRange('30d'));
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError(null);
      try {
        setData(await api.get<Response>(`/admin/advertising/traffic?from=${range.from}&to=${range.to}${refresh ? '&refresh=1' : ''}`));
      } catch (e) {
        setError((e as Error).message);
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [range]
  );
  useEffect(() => {
    void load();
  }, [load]);

  const report = data && data.connected ? data : null;
  const t = report?.totals;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Advertising"
        title="Traffic"
        desc="Visits, channels and landing pages from Google Analytics 4 (as reported by GA4 — only visitors who accepted analytics cookies are counted)."
        icon={<BarChart2 className="w-5 h-5" />}
        actions={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            <button onClick={() => void load(true)} className="ml-1 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/15 bg-white/10 text-white hover:bg-white/20 cursor-pointer" title="Fetch fresh data from GA4">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </>
        }
      />
      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {loading && !data ? (
        <Spinner />
      ) : data && !data.connected ? (
        <EmptyState
          icon={<BarChart2 className="w-6 h-6" />}
          title="Google Analytics is not connected"
          hint="Add the GA4 property ID and a service-account key in Advertising → Integrations."
        />
      ) : report && t ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatTile label="Sessions" value={num(t.sessions)} source="GA4" />
            <StatTile label="Users" value={num(t.users)} sub={`${num(t.newUsers)} new`} source="GA4" />
            <StatTile label="Engagement rate" value={fmtPct(t.engagementRate)} source="GA4" />
            <StatTile label="Purchases" value={num(t.purchases)} source="GA4" />
            <StatTile label="Conversion rate" value={fmtPct(t.conversionRate, 2)} sub="Purchases ÷ sessions" source="GA4" />
            <StatTile label="Purchase revenue" value={bdt(t.purchaseRevenue)} sub="Gross, as tracked" source="GA4" />
          </div>

          <section className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h3 className="text-sm font-black text-neutral-900 mb-3">Sessions per day</h3>
            <TrendChart
              points={report.daily.map((d) => ({ label: d.day.slice(5), primary: d.sessions, secondary: d.users }))}
              formatPrimary={compact}
              formatSecondary={compact}
              primaryLabel="Sessions"
              secondaryLabel="Users"
              ariaLabel="Daily sessions and users from GA4"
              footnote={`Fetched from GA4 ${formatDate(report.fetchedAt)} · property ${report.propertyId}`}
            />
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <section className="bg-white rounded-2xl border border-neutral-200">
              <header className="px-5 py-4 border-b border-neutral-100">
                <h3 className="text-sm font-black text-neutral-900">Sessions by channel</h3>
              </header>
              <div className="p-5">
                <BarList format={num} rows={report.channels.map((c) => ({ label: c.channel, value: c.sessions, hint: `${c.purchases} purchase(s)` }))} />
              </div>
            </section>
            <section className="bg-white rounded-2xl border border-neutral-200">
              <header className="px-5 py-4 border-b border-neutral-100">
                <h3 className="text-sm font-black text-neutral-900">Devices</h3>
              </header>
              <div className="p-5">
                <BarList format={num} rows={report.devices.map((d) => ({ label: <span className="capitalize">{d.device}</span>, value: d.sessions, hint: `${d.purchases} purchase(s)` }))} />
              </div>
            </section>
            <Table
              title="Channel quality"
              rows={report.channels}
              empty="No sessions."
              cols={[
                ['Channel', (c) => c.channel],
                ['Engaged', (c) => fmtPct(rate(c.engagedSessions, c.sessions)), true],
                ['Conv.', (c) => fmtPct(rate(c.purchases, c.sessions), 2), true],
              ]}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <Table
              title="Source / medium"
              rows={report.sourceMedium}
              empty="No sessions."
              cols={[
                ['Source / medium', (r) => r.sourceMedium],
                ['Sessions', (r) => num(r.sessions), true],
                ['Purchases', (r) => num(r.purchases), true],
                ['Revenue', (r) => bdt(r.revenue), true],
              ]}
            />
            <Table
              title="Landing pages"
              rows={report.landingPages}
              empty="No sessions."
              cols={[
                ['Page', (r) => r.page],
                ['Sessions', (r) => num(r.sessions), true],
                ['Engaged', (r) => fmtPct(rate(r.engagedSessions, r.sessions)), true],
                ['Purchases', (r) => num(r.purchases), true],
              ]}
            />
          </div>
          <p className="text-[11px] text-neutral-400">
            GA4 numbers differ from your order data: GA4 only sees visitors who allowed analytics cookies and counts gross purchases. For revenue and ROAS use Performance and Reports, which use your own orders.
          </p>
        </>
      ) : null}
    </div>
  );
}
