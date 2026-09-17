import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Button, EmptyState, Select, Spinner, formatDate } from '../components/ui';
import { RefreshCw, PackageCheck, Printer, CheckSquare } from 'lucide-react';

interface PackItem { id: string; orderNumber: string; trackingCode: string; customerName: string; customerPhone: string; status: string; packedStatus: string; packedAt: string | null; packedBy: string | null; source: string; itemsCount: number; createdAt: string; customerAddress: Record<string, string>; items: { productName: string; productSku: string; size: string; color: string; quantity: number }[] }
const bdt = (n: number) => `BDT ${Number(n || 0).toLocaleString('en-IN')}`;

function printSlip(o: PackItem) {
  const w = window.open('', '_blank', 'width=760,height=1000');
  if (!w) return;
  const a = o.customerAddress || {};
  const rows = (o.items || []).map((it) => `
    <tr><td style="padding:7px;border-bottom:1px solid #e5e5e5">${it.productName}<br/><span style="color:#999;font-size:11px">${it.productSku}</span></td><td style="padding:7px;border-bottom:1px solid #e5e5e5">${it.color || '—'}</td><td style="padding:7px;border-bottom:1px solid #e5e5e5">${it.size || '—'}</td><td style="padding:7px;border-bottom:1px solid #e5e5e5;text-align:center">${it.quantity}</td><td style="width:50px;text-align:center">😐</td></tr>`).join('');
  w.document.write(`
  <html><head><title>Packaging Slip ${o.orderNumber}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;color:#171717;margin:0;padding:22px;font-size:13px}
    .head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #D8232A;padding-bottom:12px;margin-bottom:14px}
    .brand{font-size:20px;font-weight:900} .brand span{color:#D8232A}
    .no{text-align:right;font-size:12px;color:#525252}
    .cust{margin-bottom:12px;font-size:12px;color:#404040;line-height:1.6}
    table{width:100%;border-collapse:collapse} thead th{text-align:left;font-size:11px;text-transform:uppercase;color:#a3a3a3;border-bottom:2px solid #e5e5e5;padding:5px}
    .foot{margin-top:26px;display:flex;justify-content:space-between;font-size:12px}
    .sign{width:200px;border-top:1px solid #171717;padding-top:6px;text-align:center;color:#525252}
  </style></head><body>
    <div class="head"><div class="brand">AKS <span>Mart</span></div><div class="no"><b style="font-size:14px">PACKING SLIP</b><br/>${o.orderNumber}<br/>${o.trackingCode}<br/>${formatDate(o.createdAt)}</div></div>
    <div class="cust"><b>Ship To</b><br/>${o.customerName}<br/>${o.customerPhone}<br/>${[a.streetAddress,a.thana,a.district,a.division].filter(Boolean).join(', ')}</div>
    <table><thead><tr><th>Item</th><th>Color</th><th>Size</th><th style="text-align:center">Qty</th><th style="text-align:center">✓</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="foot"><div class="sign">Packed By</div><div class="sign">Checked By</div></div>
  </body></html>`);
  w.document.close(); w.focus(); w.print();
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
  const dispatch = async (id: string) => {
  // (Ship button removed — "Pack" auto-ships. Courier handoff is on the Shipped page.)
    try { await api.patch(`/admin/packaging/${id}`, { packedStatus: 'shipped', dispatched: true }); load(); } catch (e) { setError((e as Error).message); }
  };
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const bulkPrint = () => {
    rows.filter((r) => selected.has(r.id)).forEach((r) => setTimeout(() => printSlip(r), 120));
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div><h2 className="text-lg font-black text-neutral-900">Packaging</h2><p className="text-xs text-neutral-500 mt-0.5">Pack orders and print packaging slips — each slip starts on its own page.</p></div>
        <div className="flex items-center gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="!w-40"><option value="">All</option><option value="not_packed">Not packed</option><option value="packing">Packing</option><option value="packed">Packed</option><option value="shipped">Shipped</option></Select>
          <button onClick={load} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 cursor-pointer" title="Refresh"><RefreshCw className="w-3.5 h-3.5 text-neutral-600" /></button>
          {selected.size > 0 && <Button onClick={bulkPrint} variant="secondary"><Printer className="w-3.5 h-3.5" /> Print {selected.size}</Button>}
        </div>
      </div>
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
                    <td className="px-4 py-3 text-neutral-500 text-[10px]">{o.packedAt ? formatDate(o.packedAt) : '—'}{o.packedBy ? `
${o.packedBy}` : ''}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${o.packedStatus === 'packed' ? 'bg-emerald-100 text-emerald-700' : o.packedStatus === 'shipped' ? 'bg-blue-100 text-blue-700' : o.packedStatus === 'packing' ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-600'}`}>{o.packedStatus.replace(/_/g, ' ')}</span></td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => printSlip(o)} className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-700 hover:underline cursor-pointer"><Printer className="w-3.5 h-3.5" /> Slip</button>
                        {o.packedStatus !== 'shipped' && <button onClick={() => mark(o.id, 'packed')} className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"><PackageCheck className="w-3.5 h-3.5" /> Pack</button>}
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
