import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Order } from '../types';
import { openInvoice } from '../lib/invoice';
import { Button, EmptyState, Select, Spinner, formatDate, PageHeader } from '../components/ui';
import { RefreshCw, FileText, Printer, Eye } from 'lucide-react';

const bdt = (n: number) => `৳${Number(n || 0).toLocaleString('en-IN')}`;

export function InvoicesPage() {
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const load = useCallback(() => {
    setLoading(true); setError(null);
    api.get<{ invoices: Order[] }>(`/admin/invoices${status ? `?status=${status}` : ''}`)
      .then((r) => setRows(r.invoices))
      .catch((e: Error) => { setError(e.message); setRows([]); })
      .finally(() => setLoading(false));
  }, [status]);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Billing"
        title="Invoices"
        desc={`${rows.length} printable A4 invoices — built from the real order and store settings only`}
        icon={<FileText className="w-5 h-5" />}
        actions={
          <>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="!w-40 !bg-white/10 !border-white/15 !text-white [&>option]:text-neutral-900"><option value="">All statuses</option><option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option><option value="refunded">Refunded</option></Select>
            <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-2 bg-white/10 border border-white/15 text-white hover:bg-white/20 cursor-pointer" title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
          </>
        }
      />
      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <section className="bg-white rounded-2xl border border-neutral-200">
        <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2"><FileText className="w-4 h-4 text-[#D8232A]" /> Invoice Register</h3>
          <span className="text-[11px] font-bold text-neutral-400">{rows.length} invoices</span>
        </header>
        {loading ? <Spinner /> : rows.length === 0 ? <EmptyState icon={<FileText className="w-6 h-6" />} title="No invoices yet" hint="Orders with invoices appear here." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100"><th className="px-5 py-3">Invoice</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Source</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Invoice</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-neutral-50/70">
                    <td className="px-5 py-3 font-black text-neutral-900">{o.invoiceNumber || o.orderNumber}</td>
                    <td className="px-4 py-3 font-mono text-neutral-600">{o.orderNumber}</td>
                    <td className="px-4 py-3 text-neutral-700">{o.customerName}</td>
                    <td className="px-4 py-3 text-neutral-500">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${o.source === 'pos' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>{o.source}</span></td>
                    <td className="px-4 py-3 text-right font-black text-neutral-900">{bdt(o.total)}</td>
                    <td className="px-4 py-3 uppercase text-neutral-600">{o.paymentMethod}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${o.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : o.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-700' : o.paymentStatus === 'refunded' ? 'bg-neutral-100 text-neutral-600' : 'bg-red-100 text-red-700'}`}>{o.paymentStatus || 'unpaid'}</span></td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button onClick={() => openInvoice(o)} variant="secondary" className="!px-2.5 !py-1 text-[11px]" title="View invoice"><Eye className="w-3.5 h-3.5" /> View</Button>
                        <Button onClick={() => openInvoice(o, { autoPrint: true })} variant="secondary" className="!px-2.5 !py-1 text-[11px]" title="Print invoice / Save as PDF"><Printer className="w-3.5 h-3.5" /> Print</Button>
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
