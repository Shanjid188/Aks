import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Store } from '../types';
import { Badge, Button, EmptyState, Field, Modal, Spinner, TextInput, Toggle } from '../components/ui';
import { Plus, Store as StoreIcon, Pencil, Trash2 } from 'lucide-react';

interface FormState {
  name: string;
  division: string;
  district: string;
  area: string;
  address: string;
  phone: string;
  openingHours: string;
  features: string;
  lat: string;
  lng: string;
  isFlagship: boolean;
}

const emptyForm: FormState = {
  name: '', division: 'Dhaka', district: 'Dhaka', area: '', address: '', phone: '', openingHours: '10:00 AM - 10:00 PM',
  features: '', lat: '23.8', lng: '90.4', isFlagship: false,
};

function fromStore(s: Store): FormState {
  return {
    name: s.name, division: s.division, district: s.district, area: s.area, address: s.address,
    phone: s.phone, openingHours: s.openingHours, features: s.features.join('\n'),
    lat: String(s.lat), lng: String(s.lng), isFlagship: s.isFlagship,
  };
}

function toPayload(f: FormState): Record<string, unknown> {
  return {
    name: f.name.trim(),
    division: f.division,
    district: f.district,
    area: f.area,
    address: f.address,
    phone: f.phone,
    openingHours: f.openingHours,
    features: f.features.split('\n').map((s) => s.trim()).filter(Boolean),
    lat: Number(f.lat) || 0,
    lng: Number(f.lng) || 0,
    isFlagship: f.isFlagship,
  };
}

export function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<{ stores: Store[] }>('/admin/stores')
      .then((res) => setStores(res.stores))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (s: Store) => {
    setEditing(s);
    setForm(fromStore(s));
    setModalOpen(true);
  };

  const set = (key: keyof FormState, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      if (editing) {
        const res = await api.patch<{ store: Store }>(`/admin/stores/${editing.id}`, payload);
        setStores((prev) => prev.map((s) => (s.id === editing.id ? res.store : s)));
      } else {
        const res = await api.post<{ store: Store }>('/admin/stores', payload);
        setStores((prev) => [...prev, res.store]);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: Store) => {
    if (!window.confirm(`Delete store "${s.name}"?`)) return;
    await api.del(`/admin/stores/${s.id}`);
    setStores((prev) => prev.filter((x) => x.id !== s.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
                    <h2 className="text-lg font-black text-neutral-900">AKS Mart Stores</h2>
          <p className="text-xs text-neutral-400">{stores.length} locations across Bangladesh</p>
        </div>
        <Button onClick={openCreate} className="gap-1">
          <Plus className="w-3.5 h-3.5" /> New store
        </Button>
      </div>

      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {loading ? (
        <Spinner />
      ) : stores.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200">
          <EmptyState icon={<StoreIcon className="w-6 h-6" />} title="No stores yet" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Store</th>
                <th className="py-3 px-4">Area</th>
                <th className="py-3 px-4">Division</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Flagship</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {stores.map((s) => (
                <tr key={s.id} className="hover:bg-neutral-50/60">
                  <td className="px-4 py-3">
                    <p className="font-bold text-neutral-900">{s.name}</p>
                    <p className="text-[11px] text-neutral-400">{s.address}</p>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{s.area}</td>
                  <td className="px-4 py-3 text-neutral-600">{s.division}</td>
                  <td className="px-4 py-3 text-neutral-600">{s.phone}</td>
                  <td className="px-4 py-3">
                    {s.isFlagship ? (
                      <Badge color="bg-neutral-900 text-white">Flagship</Badge>
                    ) : (
                      <Badge color="bg-neutral-100 text-neutral-500">Standard</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(s)} className="p-1.5 rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit — ${editing.name}` : 'New Store'} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Store name">
              <TextInput required value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Division">
              <TextInput value={form.division} onChange={(e) => set('division', e.target.value)} />
            </Field>
            <Field label="District">
              <TextInput value={form.district} onChange={(e) => set('district', e.target.value)} />
            </Field>
            <Field label="Area / neighbourhood">
              <TextInput value={form.area} onChange={(e) => set('area', e.target.value)} />
            </Field>
            <Field label="Address">
              <TextInput value={form.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field label="Phone">
              <TextInput value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Opening hours">
              <TextInput value={form.openingHours} onChange={(e) => set('openingHours', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Latitude">
                <TextInput type="number" step="any" value={form.lat} onChange={(e) => set('lat', e.target.value)} />
              </Field>
              <Field label="Longitude">
                <TextInput type="number" step="any" value={form.lng} onChange={(e) => set('lng', e.target.value)} />
              </Field>
            </div>
            <Field label="Features (one per line)">
              <textarea
                value={form.features}
                onChange={(e) => set('features', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 outline-none focus:border-[#D8232A] min-h-20"
              />
            </Field>
          </div>
          <Toggle checked={form.isFlagship} onChange={(v) => set('isFlagship', v)} label="Flagship store" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}