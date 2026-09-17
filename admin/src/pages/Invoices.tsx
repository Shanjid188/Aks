import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Order } from '../types';
import { Button, EmptyState, Select, Spinner, formatDate } from '../components/ui';
import { RefreshCw, FileText, Printer } from 'lucide-react';

const bdt = (n: number) => `BDT ${Number(n || 0).toLocaleString('en-IN')}`;
const addr = (o: Order, k: string) => (o.customerAddress as Record<string, string>)?.[k] || '';
const parseImgs = (raw: unknown): string[] => { try { const p = JSON.parse(String(raw || '[]')); return Array.isArray(p) ? p : []; } catch { return []; } };

/** Opens a print window with an A4 invoice derived from real order data. */
function printInvoice(i: number, invoice: Order & { invoiceNumber?: string | null }) {
  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) return;
  const rows = (invoice.items || []).map((it) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:12px">${it.productName}<br/><span style="color:#999;font-size:11px">${it.productSku}${it.size ? ' · ' + it.size : ''}${it.color && it.color !== 'Default' ? ' · ' + it.color : ''}</span></td>
      <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:center;font-size:12px">${it.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;font-size:12px">${bdt(it.price)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;font-size:12px">${bdt(it.price * it.quantity)}</td>
    </tr>`).join('');
  w.document.write(`
  <html><head><title>Invoice ${invoice.invoiceNumber || invoice.orderNumber}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;color:#171717;margin:0;padding:24px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #D8232A;padding-bottom:14px;margin-bottom:18px}
    .brand{font-size:22px;font-weight:900;letter-spacing:-.5px}
    .brand span{color:#D8232A}
    .meta{text-align:right;font-size:12px;color:#525252}
    .box{display:flex;justify-content:space-between;gap:24px;margin-bottom:18px}
    .box div{width:50%;font-size:12px;color:#404040;line-height:1.6}
    .box b{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#a3a3a3;margin-bottom:4px}
    h2{font-size:16px;margin:0 0 10px}
    table{width:100%;border-collapse:collapse}
    thead th{text-align:left;font-size:11px;text-transform:uppercase;color:#a3a3a3;border-bottom:2px solid #e5e5e5;padding:6px 0}
    .totals{margin-top:16px;margin-left:auto;width:280px}
    .totals div{display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid #f5f5f5}
    .totals .grand{font-size:16px;font-weight:900;color:#D8232A;padding-top:8px;border-top:2px solid #171717}
    .foot{margin-top:26px;font-size:11px;color:#a3a3a3;line-height:1.7;border-top:1px solid #e5e5e5;padding-top:12px}
    .sig{margin-top:36px;display:flex;justify-content:space-between;font-size:12px;color:#525252}
    .sign{width:200px;border-top:1px solid #171717;padding-top:6px;text-align:center}
    @media print{ body{-webkit-print-color-adjust:exact} }
  </style></head><body>
    <div class="head">
      <div class="brand">AKS <span>Mart</span><div style="font-size:11px;color:#737373;font-weight:500">One Mart. Many Choices.</div></div>
      <div class="meta"><b style="font-size:14px;color:#171717">INVOICE</b><br/>${invoice.invoiceNumber || invoice.orderNumber}<br/>${formatDate(invoice.createdAt)}</div>
    </div>
    <div class="box">
      <div><b>Billed To</b>${invoice.customerName || addr(invoice,'fullName') || 'Walk-in Customer'}<br/>${invoice.customerPhone || addr(invoice,'phone') || ''}<br/>${invoice.customerEmail || addr(invoice,'email') || ''}<br/>${[addr(invoice,'streetAddress'),addr(invoice,'thana'),addr(invoice,'district'),addr(invoice,'division')].filter(Boolean).join(', ')}</div>
      <div style="text-align:right"><b>Order</b>${invoice.orderNumber}<br/>Tracking: ${invoice.trackingCode}<br/>Method: ${invoice.paymentMethod}<br/>Status: ${invoice.status}</div>
    </div>
    <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals">
      <div><span>Subtotal</span><span>${bdt(invoice.subtotal)}</span></div>
      ${Number(invoice.discount) > 0 ? `<div><span>Discount</span><span>−${bdt(invoice.discount)}</span></div>` : ''}
      ${Number(invoice.shippingFee) > 0 ? `<div><span>Shipping</span><span>${bdt(invoice.shippingFee)}</span></div>` : ''}
      ${Number(invoice.tax ?? 0) > 0 ? `<div><span>Tax</span><span>${bdt(invoice.tax ?? 0)}</span></div>` : ''}
      <div class="grand"><span>Grand Total</span><span>${bdt(invoice.total)}</span></div>
      <div><span>Paid</span><span>${bdt(invoice.paidAmount ?? 0)}</span></div>
      <div><span>Due</span><span>${bdt((invoice.dueAmount ?? invoice.total) - (invoice.paidAmount ?? 0))}</span></div>
    </div>
    <div class="sig"><div class="sign">Authorized Signature</div><div class="sign">Customer Signature</div></div>
    <div class="foot">Thank you for shopping with AKS Mart — One Mart. Many Choices.<br/>Items returned within 7 days in original condition are eligible for exchange.</div>
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div><h2 className="text-lg font-black text-neutral-900">Invoices</h2><p className="text-xs text-neutral-500 mt-0.5">Every order becomes a printable invoice — generated from real order data only.</p></div>
        <div className="flex items-center gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="!w-40"><option value="">All statuses</option><option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option><option value="refunded">Refunded</option></Select>
          <button onClick={load} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 cursor-pointer" title="Refresh"><RefreshCw className="w-3.5 h-3.5 text-neutral-600" /></button>
        </div>
      </div>
      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <section className="bg-white rounded-2xl border border-neutral-200">
        <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2"><FileText className="w-4 h-4 text-[#D8232A]" /> Invoice Register</h3>
          <span className="text-[11px] font-bold text-neutral-400">{rows.length} invoices</span>
        </header>
        {loading ? <Spinner /> : rows.length === 0 ? <EmptyState icon={<FileText className="w-6 h-6" />} title="No invoices yet" hint="Orders with invoices appear here." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100"><th className="px-5 py-3">Invoice</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Source</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Print</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((o, i) => (
                  <tr key={o.id} className="hover:bg-neutral-50/70">
                    <td className="px-5 py-3 font-black text-neutral-900">{o.invoiceNumber || o.orderNumber}</td>
                    <td className="px-4 py-3 font-mono text-neutral-600">{o.orderNumber}</td>
                    <td className="px-4 py-3 text-neutral-700">{o.customerName}</td>
                    <td className="px-4 py-3 text-neutral-500">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${o.source === 'pos' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>{o.source}</span></td>
                    <td className="px-4 py-3 text-right font-black text-neutral-900">{bdt(o.total)}</td>
                    <td className="px-4 py-3 uppercase text-neutral-600">{o.paymentMethod}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${o.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : o.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-700' : o.paymentStatus === 'refunded' ? 'bg-neutral-100 text-neutral-600' : 'bg-red-100 text-red-700'}`}>{o.paymentStatus || 'unpaid'}</span></td>
                    <td className="px-5 py-3 text-right"><Button onClick={() => printInvoice(i, o)} variant="secondary" className="!px-2.5 !py-1 text-[11px]"><Printer className="w-3.5 h-3.5" /> Print</Button></td>
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
