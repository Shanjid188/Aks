import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Coupon } from '../types';
import { Badge, Button, EmptyState, Field, Modal, Select, Spinner, TextArea, TextInput, Toggle } from '../components/ui';
import { Plus, Tag, Pencil, Trash2 } from 'lucide-react';

const empty = { code: '', discountType: 'percent', value: '', minSpend: '', description: '', active: true };

export function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<{ coupons: Coupon[] }>('/admin/coupons')
      .then((res) => setCoupons(res.coupons))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty });
    setModalOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      discountType: c.discountType,
      value: String(c.value),
      minSpend: String(c.minSpend),
      description: c.description,
      active: c.active,
    });
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: form.code,
        discountType: form.discountType,
        value: Number(form.value) || 0,
        minSpend: Number(form.minSpend) || 0,
        description: form.description,
        active: form.active,
      };
      if (editing) {
        const res = await api.patch<{ coupon: Coupon }>(`/admin/coupons/${editing.id}`, payload);
        setCoupons((prev) => prev.map((c) => (c.id === editing.id ? res.coupon : c)));
      } else {
        const res = await api.post<{ coupon: Coupon }>('/admin/coupons', payload);
        setCoupons((prev) => [res.coupon, ...prev]);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Coupon) => {
    if (!window.confirm(`Delete coupon ${c.code}?`)) return;
    await api.del(`/admin/coupons/${c.id}`);
    setCoupons((prev) => prev.filter((x) => x.id !== c.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Coupons</h2>
          <p className="text-xs text-neutral-400">{coupons.length} promo codes</p>
        </div>
        <Button onClick={openCreate} className="gap-1">
          <Plus className="w-3.5 h-3.5" /> New coupon
        </Button>
      </div>

      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {loading ? (
        <Spinner />
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200">
          <EmptyState icon={<Tag className="w-6 h-6" />} title="No coupons yet" hint="Create your first promo code." />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Value</th>
                <th className="py-3 px-4">Min spend</th>
                <th className="py-3 px-4">Used</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50/60">
                  <td className="px-4 py-3 font-mono font-bold text-neutral-900">{c.code}</td>
                  <td className="px-4 py-3 capitalize text-neutral-600">{c.discountType}</td>
                  <td className="px-4 py-3 font-bold text-neutral-900">
                    {c.discountType === 'percent' ? `${c.value}%` : `৳${c.value}`}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">৳{c.minSpend.toLocaleString()}</td>
                  <td className="px-4 py-3 text-neutral-500">{c.usedCount}</td>
                  <td className="px-4 py-3">
                    {c.active ? (
                      <Badge color="bg-emerald-50 text-emerald-700">Active</Badge>
                    ) : (
                      <Badge color="bg-neutral-100 text-neutral-500">Disabled</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(c)} className="p-1.5 rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${editing.code}` : 'New Coupon'}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Code">
            <TextInput
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="AKS20"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
                <option value="percent">Percent %</option>
                <option value="fixed">Fixed ৳</option>
              </Select>
            </Field>
            <Field label={form.discountType === 'percent' ? 'Value (%)' : 'Value (৳)'}>
              <TextInput required type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </Field>
          </div>
          <Field label="Minimum spend (৳)">
            <TextInput type="number" value={form.minSpend} onChange={(e) => setForm({ ...form, minSpend: e.target.value })} />
          </Field>
          <Field label="Description">
            <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Active" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}