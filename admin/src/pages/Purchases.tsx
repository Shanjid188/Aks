import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Purchase, Supplier } from '../types';
import { Button, EmptyState, Field, Modal, Select, Spinner, TextInput, formatDate } from '../components/ui';
import { Plus, RefreshCw, ReceiptText, PackagePlus, Loader2, CheckCircle2 } from 'lucide-react';

interface Line { productId: string; name: string; quantity: number; costPrice: number }
interface F { id: string | null; supplierId: string; status: string; paidAmount: string; purchaseDate: string; notes: string; lines: Line[] }
const blank = (): F => ({ id: null, supplierId: '', status: 'pending', paidAmount: '0', purchaseDate: new Date().toISOString().slice(0, 10), notes: '', lines: [{ productId: '', name: '', quantity: 1, costPrice: 0 }] });

const bdt = (n: number) => `BDT ${n.toLocaleString('en-IN')}`;

export function PurchasesPage() {
  const [rows, setRows] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<F | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(() => {
    setLoading(true); setError(null);
    Promise.all([api.get<{ purchases: Purchase[] }>('/admin/purchases'), api.get<{ suppliers: Supplier[] }>('/admin/suppliers')])
      .then(([p, s]) => { setRows(p.purchases); setSuppliers(s.suppliers.filter((x) => x.isActive)); })
      .catch((e: Error) => { setError(e.message); setRows([]); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const totalCost = (form?.lines || []).reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.costPrice) || 0), 0);
  const save = async () => {
    if (!form || form.lines.length === 0) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      const body = {
        supplierId: form.supplierId || undefined, status: form.status,
        paidAmount: Number(form.paidAmount) || 0, purchaseDate: form.purchaseDate, notes: form.notes || undefined,
        items: form.lines.map((l) => ({ productId: l.productId || undefined, name: l.name || 'Unknown', quantity: l.quantity, costPrice: l.costPrice })),
      };
      await api.post('/admin/purchases', body);
      setForm(null); load(); setNotice('Purchase recorded' + (form.status === 'received' ? ' — stock received and inventory updated.' : '.'));
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };
  const receive = async (id: string) => {
    if (!window.confirm('Mark this purchase as received? Stock will be added to inventory.')) return;
    try { await api.patch(`/admin/purchases/${id}`, { status: 'received' }); load(); } catch (e) { setError((e as Error).message); }
  };
  const upLine = (i: number, patch: Partial<Line>) => setForm((f) => f ? { ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, ...patch } : l) } : f);
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div><h2 className="text-lg font-black text-neutral-900">Purchases</h2><p className="text-xs text-neutral-500 mt-0.5">Stock purchase orders — receiving adds inventory automatically.</p></div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
          <Button onClick={() => { setError(null); setForm(blank()); }}><Plus className="w-3.5 h-3.5" /> New Purchase</Button>
        </div>
      </div>
      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {notice && <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{notice}</p>}
      <section className="bg-white rounded-2xl border border-neutral-200">
        <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2"><ReceiptText className="w-4 h-4 text-[#D8232A]" /> Purchase Orders</h3>
          <span className="text-[11px] font-bold text-neutral-400">{rows.length} purchases</span>
        </header>
        {loading ? <Spinner /> : rows.length === 0 ? <EmptyState icon={<ReceiptText className="w-6 h-6" />} title="No purchases yet" hint="Record supplier purchases to track cost price and increase stock." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100"><th className="px-5 py-3">Purchase</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Items</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Due</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/70">
                    <td className="px-5 py-3"><p className="font-bold text-neutral-900">{p.purchaseNumber}</p><p className="text-[10px] text-neutral-400">{formatDate(p.purchaseDate)}</p></td>
                    <td className="px-4 py-3 text-neutral-700">{p.supplier?.name || '—'}</td>
                    <td className="px-4 py-3 text-neutral-600">{p.items.length}</td>
                    <td className="px-4 py-3 text-right font-black text-neutral-900">{bdt(p.totalCost)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-bold">{bdt(p.paidAmount)}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-bold">{bdt(p.dueAmount)}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${p.status === 'received' ? 'bg-emerald-100 text-emerald-700' : p.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span></td>
                    <td className="px-5 py-3">{p.status === 'pending' ? (
                      <button onClick={() => receive(p.id)} className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"><PackagePlus className="w-3.5 h-3.5" /> Receive</button>
                    ) : <span className="text-neutral-300"><CheckCircle2 className="w-3.5 h-3.5 inline" /></span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Modal open={!!form} onClose={() => setForm(null)} title="New Purchase" wide>
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Supplier"><Select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}><option value="">— none —</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
              <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="pending">Pending</option><option value="received">Received</option></Select></Field>
              <Field label="Date"><TextInput type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></Field>
            </div>
            <div className="space-y-2">
              {form.lines.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={l.name} onChange={(e) => upLine(i, { name: e.target.value, productId: e.target.value })} placeholder="Product name / SKU" className="flex-1 px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:border-[#D8232A] outline-none" />
                  <TextInput type="number" min="1" value={String(l.quantity)} onChange={(e) => upLine(i, { quantity: Number(e.target.value) || 1 })} className="!w-20" />
                  <TextInput type="number" min="0" value={String(l.costPrice)} onChange={(e) => upLine(i, { costPrice: Number(e.target.value) || 0 })} className="!w-28" placeholder="Cost price" />
                  <button onClick={() => setForm((f) => f && { ...f, lines: f.lines.filter((_, idx) => idx !== i) })} className="text-neutral-300 hover:text-red-600 text-lg cursor-pointer">×</button>
                </div>
              ))}
              <Button variant="ghost" onClick={() => setForm((f) => f && { ...f, lines: [...f.lines, { productId: '', name: '', quantity: 1, costPrice: 0 }] })} className="text-[11px]"><PackagePlus className="w-3.5 h-3.5" /> Add item</Button>
            </div>
            <div className="flex items-end gap-3">
              <Field label="Paid amount"><TextInput type="number" min="0" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} /></Field>
              <div className="pb-2 text-sm"><span className="text-neutral-400 mr-2">Total cost:</span><span className="font-black text-[#D8232A]">{bdt(totalCost)}</span><span className="ml-3 text-neutral-400 mr-2">Due:</span><span className="font-black text-red-600">{bdt(Math.max(0, totalCost - (Number(form.paidAmount) || 0)))}</span></div>
            </div>
            <Field label="Notes"><TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button disabled={saving || form.lines.length === 0} onClick={save}>{saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Create Purchase'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
