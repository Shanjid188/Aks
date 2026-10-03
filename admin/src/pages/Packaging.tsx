import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Button, EmptyState, Select, Spinner, formatDate, PageHeader } from '../components/ui';
import { RefreshCw, PackageCheck, Printer, CheckSquare, Eye } from 'lucide-react';
import { openPackingSlip } from '../lib/packingSlip';

interface PackItem {
  id: string;
  orderNumber: string;
  trackingCode: string;
  customerName: string;
  customerPhone: string;
  status: string;
  packedStatus: string;
  packedAt: string | null;
  packedBy: string | null;
  source: string;
  itemsCount: number;
  createdAt: string;
  customerAddress: Record<string, string>;
  items: { productName: string; productSku: string; size: string; color: string; quantity: number; product?: { weight?: number | null } | null }[];
}

export function PackagingPage() {
  const [rows, setRows] = useState<PackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const load = useCallback(() => {
    setLoading(true); setError(null);
    api.get<{ packaging: PackItem[] }>(`/admin/packaging${status ? `?status=${status}` : ''}`)
      .then((r) => setRows(r.packaging))
      .catch((e: Error) => { setError(e.message); setRows([]); })
      .finally(() => setLoading(false));
  }, [status]);
  useEffect(() => { load(); }, [load]);
  const mark = async (id: string, packedStatus: string) => {
    try { await api.patch(`/admin/packaging/${id}`, { packedStatus }); load(); } catch (e) { setError((e as Error).message); }
  };
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const bulkPrint = () => {
    rows.filter((r) => selected.has(r.id)).forEach((r) => setTimeout(() => openPackingSlip(r, { autoPrint: true }), 120));
  };
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Fulfilment"
        title="Packaging"
        desc={`${rows.length} orders in the queue · pack and print packing slips`}
        icon={<PackageCheck className="w-5 h-5" />}
        actions={
          <>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="!w-40 !bg-white/10 !border-white/15 !text-white [&>option]:text-neutral-900"><option value="">All</option><option value="not_packed">Not packed</option><option value="packing">Packing</option><option value="packed">Packed</option><option value="shipped">Shipped</option></Select>
            <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-2 bg-white/10 border border-white/15 text-white hover:bg-white/20 cursor-pointer" title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
            {selected.size > 0 && <Button onClick={bulkPrint} variant="secondary"><Printer className="w-3.5 h-3.5" /> Print {selected.size}</Button>}
          </>
        }
      />
      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <section className="bg-white rounded-2xl border border-neutral-200">
        <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2"><PackageCheck className="w-4 h-4 text-[#D8232A]" /> Packing Queue</h3>
          <span className="text-[11px] font-bold text-neutral-400">{rows.length} orders</span>
        </header>
        {loading ? <Spinner /> : rows.length === 0 ? <EmptyState icon={<PackageCheck className="w-6 h-6" />} title="Nothing to pack" hint="Orders waiting for packing appear here." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100"><th className="px-4 py-3"><CheckSquare className="w-3.5 h-3.5 inline" /></th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Packed</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-neutral-50/70">
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} className="accent-[#D8232A]" /></td>
                    <td className="px-4 py-3"><p className="font-bold text-neutral-900">{o.orderNumber}</p><p className="text-[10px] text-neutral-400 font-mono">{o.trackingCode}</p></td>
                    <td className="px-4 py-3 text-neutral-700">{o.customerName}<br/><span className="text-[10px] text-neutral-400">{o.customerPhone}</span></td>
                    <td className="px-4 py-3 text-neutral-600">{o.itemsCount}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${o.source === 'pos' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>{o.source}</span></td>
                    <td className="px-4 py-3 text-neutral-500 text-[10px]">{o.packedAt ? formatDate(o.packedAt) : '—'}{o.packedBy ? ` · ${o.packedBy}` : ''}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${o.packedStatus === 'packed' ? 'bg-emerald-100 text-emerald-700' : o.packedStatus === 'shipped' ? 'bg-blue-100 text-blue-700' : o.packedStatus === 'packing' ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-600'}`}>{o.packedStatus.replace(/_/g, ' ')}</span></td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button onClick={() => openPackingSlip(o)} variant="secondary" className="!px-2.5 !py-1 text-[11px]" title="View packing slip"><Eye className="w-3.5 h-3.5" /> View</Button>
                        <Button onClick={() => openPackingSlip(o, { autoPrint: true })} variant="secondary" className="!px-2.5 !py-1 text-[11px]" title="Print packing slip / Save as PDF"><Printer className="w-3.5 h-3.5" /> Print</Button>
                        {o.packedStatus !== 'shipped' && <Button onClick={() => mark(o.id, 'packed')} className="!px-2.5 !py-1 text-[11px]"><PackageCheck className="w-3.5 h-3.5" /> Pack</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
