import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Supplier } from '../types';
import { Button, EmptyState, Field, Modal, Spinner, TextInput, formatDate } from '../components/ui';
import { Plus, RefreshCw, Truck, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';

interface F { id: string | null; name: string; phone: string; email: string; address: string; company: string; notes: string; isActive: boolean }
const blank = (): F => ({ id: null, name: '', phone: '', email: '', address: '', company: '', notes: '', isActive: true });

export function SuppliersPage() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<F | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => {
    setLoading(true); setError(null);
    api.get<{ suppliers: Supplier[] }>('/admin/suppliers')
      .then((r) => setRows(r.suppliers))
      .catch((e: Error) => { setError(e.message); setRows([]); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    if (!form || !form.name.trim()) return;
    setSaving(true);
    try {
      const body = { name: form.name, phone: form.phone || undefined, email: form.email || undefined, address: form.address || undefined, company: form.company || undefined, notes: form.notes || undefined, isActive: form.isActive };
      if (form.id) await api.patch(`/admin/suppliers/${form.id}`, body); else await api.post('/admin/suppliers', body);
      setForm(null); load();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };
  const toggle = async (s: Supplier) => {
    try { await api.patch(`/admin/suppliers/${s.id}`, { isActive: !s.isActive }); load(); } catch (e) { setError((e as Error).message); }
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div><h2 className="text-lg font-black text-neutral-900">Suppliers</h2><p className="text-xs text-neutral-500 mt-0.5">Vendors you buy stock from.</p></div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
          <Button onClick={() => { setError(null); setForm(blank()); }}><Plus className="w-3.5 h-3.5" /> Add Supplier</Button>
        </div>
      </div>
      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <section className="bg-white rounded-2xl border border-neutral-200">
        <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2"><Truck className="w-4 h-4 text-[#D8232A]" /> All Suppliers</h3>
          <span className="text-[11px] font-bold text-neutral-400">{rows.length} suppliers</span>
        </header>
        {loading ? <Spinner /> : rows.length === 0 ? <EmptyState icon={<Truck className="w-6 h-6" />} title="No suppliers yet" hint="Add your vendors to start recording purchases." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100"><th className="px-5 py-3">Supplier</th><th className="px-4 py-3">Company</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Address</th><th className="px-4 py-3">Purchases</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50/70">
                    <td className="px-5 py-3 font-bold text-neutral-900">{s.name}</td>
                    <td className="px-4 py-3 text-neutral-600">{s.company || '—'}</td>
                    <td className="px-4 py-3"><p className="text-neutral-700">{s.phone || '—'}</p>{s.email && <p className="text-[10px] text-neutral-400">{s.email}</p>}</td>
                    <td className="px-4 py-3 text-neutral-500 max-w-[180px] truncate">{s.address || '—'}</td>
                    <td className="px-4 py-3 text-neutral-600">{s._count?.purchases ?? 0}</td>
                    <td className="px-4 py-3"><button onClick={() => toggle(s)} className="cursor-pointer" title={s.isActive ? 'Active' : 'Inactive'}>{s.isActive ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-neutral-300" />}</button></td>
                    <td className="px-5 py-3 text-right"><button onClick={() => setForm({ id: s.id, name: s.name, phone: s.phone || '', email: s.email || '', address: s.address || '', company: s.company || '', notes: s.notes || '', isActive: s.isActive })} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit Supplier' : 'Add Supplier'}>
        {form && (
          <div className="space-y-4">
            <Field label="Supplier name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Email"><TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company"><TextInput value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
              <Field label="Active">
                <button type="button" onClick={() => setForm({ ...form, isActive: !form.isActive })} className="flex items-center gap-2 mt-2 cursor-pointer">{form.isActive ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-neutral-300" />}<span className="text-xs font-bold">{form.isActive ? 'Active' : 'Inactive'}</span></button>
              </Field>
            </div>
            <Field label="Address"><TextInput value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            <Field label="Notes"><TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button disabled={saving || !form.name.trim()} onClick={save}>{saving ? 'Saving…' : 'Save Supplier'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
