import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { EmptyState, Spinner } from '../components/ui';
import { RefreshCw, BarChart3, TrendingUp, Wallet, ShoppingBag } from 'lucide-react';

const bdt = (n: number) => `BDT ${Math.round(n).toLocaleString('en-IN')}`;

interface ReportData {
  range: string;
  from: string;
  revenue: number;
  ordersCount: number;
  totalExpenses: number;
  totalRefunds: number;
  netRevenue: number;
  profit: number | null;
  paymentMethod: Record<string, { count: number; revenue: number }>;
  source: Record<string, { count: number; revenue: number }>;
  orderStatus: Record<string, number>;
  topProducts: { name: string; qty: number; revenue: number }[];
}

export function ReportsPage() {
  const [range, setRange] = useState('7d');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setLoading(true); setError(null);
    api.get<ReportData>(`/admin/reports?range=${range}`)
      .then(setData)
      .catch((e: Error) => { setError(e.message); setData(null); })
      .finally(() => setLoading(false));
  }, [range]);
  useEffect(() => { load(); }, [load]);

  const ranges = [['today','Today'],['7d','Last 7 Days'],['30d','Last 30 Days'],['3m','Last 3 Months'],['1y','Last 1 Year']] as const;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div><h2 className="text-lg font-black text-neutral-900">Reports</h2><p className="text-xs text-neutral-500 mt-0.5">Real sales, orders, source, payment method and top products.</p></div>
        <div className="flex items-center gap-1.5">
          {ranges.map(([id, label]) => (
            <button key={id} onClick={() => setRange(id)} className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${range === id ? 'bg-neutral-900 text-white' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'}`}>{label}</button>
          ))}
          <button onClick={load} className="ml-1 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 cursor-pointer" title="Refresh"><RefreshCw className="w-3.5 h-3.5 text-neutral-600" /></button>
        </div>
      </div>
      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {loading ? <Spinner /> : !data ? (
        <EmptyState icon={<BarChart3 className="w-6 h-6" />} title="No report data" hint="Select a range and try again." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-neutral-200 p-4"><p className="text-[10px] font-bold uppercase text-neutral-400">Revenue</p><p className="text-xl font-black text-neutral-900 mt-1">{bdt(data.revenue)}</p></div>
            <div className="bg-white rounded-2xl border border-neutral-200 p-4"><p className="text-[10px] font-bold uppercase text-neutral-400">Net (excl. refunds)</p><p className="text-xl font-black text-emerald-600 mt-1">{bdt(data.netRevenue)}</p></div>
            <div className="bg-white rounded-2xl border border-neutral-200 p-4"><p className="text-[10px] font-bold uppercase text-neutral-400">Orders</p><p className="text-xl font-black text-neutral-900 mt-1">{data.ordersCount}</p></div>
            <div className="bg-white rounded-2xl border border-neutral-200 p-4"><p className="text-[10px] font-bold uppercase text-neutral-400">Expenses</p><p className="text-xl font-black text-rose-600 mt-1">{bdt(data.totalExpenses)}</p></div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <section className="bg-white rounded-2xl border border-neutral-200">
              <header className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#D8232A]" /><h3 className="text-sm font-black text-neutral-900">By Source</h3></header>
              <div className="p-5 space-y-3">
                {Object.entries(data.source).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-xs"><span className="font-bold capitalize text-neutral-800">{k}</span><span className="text-neutral-500">{v.count} orders · <b className="text-neutral-900">{bdt(v.revenue)}</b></span></div>
                ))}
                {Object.keys(data.source).length === 0 && <p className="text-xs text-neutral-400">No orders in this range.</p>}
              </div>
            </section>
            <section className="bg-white rounded-2xl border border-neutral-200">
              <header className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2"><Wallet className="w-4 h-4 text-[#D8232A]" /><h3 className="text-sm font-black text-neutral-900">By Payment Method</h3></header>
              <div className="p-5 space-y-3">
                {Object.entries(data.paymentMethod).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-xs"><span className="font-bold uppercase text-neutral-800">{k}</span><span className="text-neutral-500">{v.count} orders · <b className="text-neutral-900">{bdt(v.revenue)}</b></span></div>
                ))}
                {Object.keys(data.paymentMethod).length === 0 && <p className="text-xs text-neutral-400">No payments in this range.</p>}
              </div>
            </section>
          </div>

          <section className="bg-white rounded-2xl border border-neutral-200">
            <header className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-[#D8232A]" /><h3 className="text-sm font-black text-neutral-900">Top Selling Products</h3></header>
            {data.topProducts.length === 0 ? <EmptyState icon={<ShoppingBag className="w-6 h-6" />} title="No product sales yet" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead><tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100"><th className="px-5 py-3">Product</th><th className="px-4 py-3">Qty</th><th className="px-5 py-3 text-right">Revenue</th></tr></thead>
                  <tbody className="divide-y divide-neutral-100">
                    {data.topProducts.map((p, i) => (
                      <tr key={`${p.name}-${i}`} className="hover:bg-neutral-50/70"><td className="px-5 py-3 font-bold text-neutral-900">{p.name}</td><td className="px-4 py-3 text-neutral-600">{p.qty}</td><td className="px-5 py-3 text-right font-black text-neutral-900">{bdt(p.revenue)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
