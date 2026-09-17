import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Expense } from '../types';
import { Button, EmptyState, Field, Modal, Select, Spinner, TextInput, formatDate } from '../components/ui';
import { Plus, RefreshCw, Trash2, Wallet, Pencil } from 'lucide-react';

const CAT = ['Delivery', 'Packaging', 'Rent', 'Electricity', 'Internet', 'Salary', 'Marketing', 'Office', 'Other'];
const PAY = ['cash', 'bkash', 'nagad', 'card', 'bank'];
interface F { id: string | null; title: string; category: string; amount: string; expenseDate: string; paymentMethod: string; note: string }
const blank = (): F => ({ id: null, title: '', category: 'Other', amount: '', expenseDate: new Date().toISOString().slice(0, 10), paymentMethod: 'cash', note: '' });

export function ExpensesPage() {
  const [rows, setRows] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState<F | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => {
    setLoading(true); setError(null);
    api.get<{ expenses: Expense[]; total: number }>('/admin/expenses')
      .then((r) => { setRows(r.expenses); setTotal(r.total); })
      .catch((e: Error) => { setError(e.message); setRows([]); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    if (!form || !form.title.trim() || !form.amount) return;
    setSaving(true);
    try {
      const body = { title: form.title, category: form.category, amount: Number(form.amount) || 0, expenseDate: form.expenseDate, paymentMethod: form.paymentMethod, note: form.note || undefined };
      if (form.id) await api.patch(`/admin/expenses/${form.id}`, body); else await api.post('/admin/expenses', body);
      setForm(null); load();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };
  const del = async (id: string) => {
    if (!window.confirm('Delete this expense?')) return;
    try { await api.del(`/admin/expenses/${id}`); load(); } catch (e) { setError((e as Error).message); }
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div><h2 className="text-lg font-black text-neutral-900">Expenses</h2><p className="text-xs text-neutral-500 mt-0.5">Total <span className="font-black text-[#D8232A]">BDT {total.toLocaleString('en-IN')}</span></p></div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
          <Button onClick={() => { setError(null); setForm(blank()); }}><Plus className="w-3.5 h-3.5" /> Add Expense</Button>
        </div>
      </div>
      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <section className="bg-white rounded-2xl border border-neutral-200">
        <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2"><Wallet className="w-4 h-4 text-red-500" /> All Expenses</h3>
          <span className="text-[11px] font-bold text-neutral-400">{rows.length} entries</span>
        </header>
        {loading ? <Spinner /> : rows.length === 0 ? <EmptyState icon={<Wallet className="w-6 h-6" />} title="No expenses yet" hint="Add delivery, rent, marketing or office costs." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100"><th className="px-5 py-3">Title</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Method</th><th className="px-4 py-3 text-right">Amount</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((e) => (
                  <tr key={e.id} className="hover:bg-neutral-50/70">
                    <td className="px-5 py-3 font-bold text-neutral-900">{e.title}</td>
                    <td className="px-4 py-3"><span className="text-[10px] font-bold uppercase text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">{e.category}</span></td>
                    <td className="px-4 py-3 text-neutral-500">{formatDate(e.expenseDate)}</td>
                    <td className="px-4 py-3 uppercase text-neutral-500">{e.paymentMethod}</td>
                    <td className="px-4 py-3 text-right font-black text-neutral-900">{e.amount.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setForm({ id: e.id, title: e.title, category: e.category, amount: String(e.amount), expenseDate: e.expenseDate.slice(0, 10), paymentMethod: e.paymentMethod, note: e.note || '' })} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 cursor-pointer" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => del(e.id)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit Expense' : 'Add Expense'}>
        {form && (
          <div className="space-y-4">
            <Field label="Title"><TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CAT.map((c) => <option key={c}>{c}</option>)}</Select></Field>
              <Field label="Amount (BDT)"><TextInput type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date"><TextInput type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} /></Field>
              <Field label="Payment Method"><Select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>{PAY.map((m) => <option key={m}>{m}</option>)}</Select></Field>
            </div>
            <Field label="Note"><TextInput value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button disabled={saving || !form.title.trim() || !form.amount} onClick={save}>{saving ? 'Saving…' : 'Save Expense'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
