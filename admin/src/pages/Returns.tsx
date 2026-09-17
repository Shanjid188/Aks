import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { ReturnRequest, Order } from '../types';
import { Button, EmptyState, Field, Modal, Select, Spinner, TextInput, formatDate } from '../components/ui';
import { Plus, RefreshCw, RotateCcw, Check, X, Banknote } from 'lucide-react';

const STATUS_BADGE: Record<string, string> = {
  requested: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  approved: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  rejected: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  received: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  refunded: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  cancelled: 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200',
};

export function ReturnsPage() {
  const [rows, setRows] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ orderId: string; reason: string; quantity: number; refundAmount: string; refundMethod: string; customerNote: string } | null>(null);
  const [orderOptions, setOrderOptions] = useState<Order[]>([]);
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => {
    setLoading(true); setError(null);
    api.get<{ returns: ReturnRequest[] }>('/admin/returns')
      .then((r) => setRows(r.returns))
      .catch((e: Error) => { setError(e.message); setRows([]); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const openCreate = async () => {
    setError(null);
    try {
      const o = await api.get<{ orders: Order[] }>('/admin/orders');
      setOrderOptions(o.orders.slice(0, 50));
      setForm({ orderId: '', reason: '', quantity: 1, refundAmount: '', refundMethod: 'store_credit', customerNote: '' });
    } catch (e) { setError((e as Error).message); }
  };
  const save = async () => {
    if (!form || !form.orderId || !form.reason) return;
    setSaving(true);
    try {
      await api.post('/admin/returns', { orderId: form.orderId, reason: form.reason, quantity: form.quantity, refundAmount: form.refundAmount ? Number(form.refundAmount) : undefined, refundMethod: form.refundMethod, customerNote: form.customerNote || undefined });
      setForm(null); load();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };
  const updateStatus = async (id: string, status: string) => {
    try { await api.patch(`/admin/returns/${id}`, { status }); load(); } catch (e) { setError((e as Error).message); }
  };
  const refund = async (id: string) => {
    const ret = rows.find((r) => r.id === id);
    const amount = window.prompt('Refund amount (BDT):', String(ret?.refundAmount || 0));
    if (amount == null) return;
    try { await api.post(`/admin/returns/${id}/refund`, { amount: Number(amount) || 0, method: ret?.refundMethod || 'store_credit' }); load(); }
    catch (e) { setError((e as Error).message); }
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div><h2 className="text-lg font-black text-neutral-900">Returns &amp; Refunds</h2><p className="text-xs text-neutral-500 mt-0.5">Customer returns, approvals and refund ledger.</p></div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
          <Button onClick={openCreate}><Plus className="w-3.5 h-3.5" /> New Return</Button>
        </div>
      </div>
      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <section className="bg-white rounded-2xl border border-neutral-200">
        <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2"><RotateCcw className="w-4 h-4 text-[#D8232A]" /> Return Requests</h3>
          <span className="text-[11px] font-bold text-neutral-400">{rows.length} total</span>
        </header>
        {loading ? <Spinner /> : rows.length === 0 ? (
          <EmptyState icon={<RotateCcw className="w-6 h-6" />} title="No returns yet" hint="Returns appear here when customers request one." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                <th className="px-5 py-3">Return</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Refund</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50/70">
                    <td className="px-5 py-3"><p className="font-bold text-neutral-900">{r.returnNumber.slice(0, 8)}</p><p className="text-[10px] text-neutral-400">{formatDate(r.createdAt)}</p></td>
                    <td className="px-4 py-3 font-mono text-neutral-600">{r.order?.orderNumber || r.orderId?.slice(0, 8) || '—'}</td>
                    <td className="px-4 py-3 text-neutral-700 max-w-[160px] truncate">{r.productName || '—'}</td>
                    <td className="px-4 py-3 text-neutral-600">{r.quantity}</td>
                    <td className="px-4 py-3 text-neutral-500 max-w-[140px] truncate">{r.reason}</td>
                    <td className="px-4 py-3 font-black text-neutral-900">{r.refundAmount ? `BDT ${r.refundAmount}` : '—'}</td>
                    <td className="px-4 py-3"><span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status] || ''}`}>{r.status}</span></td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1 flex-wrap">
                        {r.status === 'requested' && <>
                          <button onClick={() => updateStatus(r.id, 'approved')} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer" title="Approve"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => updateStatus(r.id, 'rejected')} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer" title="Reject"><X className="w-3.5 h-3.5" /></button>
                        </>}
                        {r.status === 'approved' && <button onClick={() => updateStatus(r.id, 'received')} className="text-[11px] font-bold text-violet-700 hover:underline cursor-pointer">Mark received</button>}
                        {r.status === 'received' && <button onClick={() => refund(r.id)} className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"><Banknote className="w-3.5 h-3.5" /> Refund</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Modal open={!!form} onClose={() => setForm(null)} title="New Return Request">
        {form && (
          <div className="space-y-4">
            <Field label="Order">
              <Select value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })}>
                <option value="">Select an order…</option>
                {orderOptions.map((o) => <option key={o.id} value={o.id}>{o.orderNumber} — {o.customerName}</option>)}
              </Select>
            </Field>
            <Field label="Reason"><TextInput value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. wrong size, damaged" /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Quantity"><TextInput type="number" min="1" value={String(form.quantity)} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) || 1 })} /></Field>
              <Field label="Refund amount"><TextInput type="number" min="0" value={form.refundAmount} onChange={(e) => setForm({ ...form, refundAmount: e.target.value })} /></Field>
              <Field label="Refund method"><Select value={form.refundMethod} onChange={(e) => setForm({ ...form, refundMethod: e.target.value })}><option value="store_credit">Store credit</option><option value="cash">Cash</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="bank">Bank</option></Select></Field>
            </div>
            <Field label="Customer note"><TextInput value={form.customerNote} onChange={(e) => setForm({ ...form, customerNote: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button disabled={saving || !form.orderId || !form.reason} onClick={save}>{saving ? 'Saving…' : 'Create Return'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
