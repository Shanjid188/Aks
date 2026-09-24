import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Subscriber } from '../types';
import { Badge, Button, EmptyState, Field, Modal, Spinner, TextInput } from '../components/ui';
import { Mail, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';

/**
 * Newsletter audience (storefront footer → POST /api/newsletter).
 *
 * Nothing is emailed from here: this is the list the merchant owns, so the page
 * is deliberately honest about that instead of offering a "send campaign"
 * button that would do nothing.
 */
export function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    const suffix = params.toString() ? `?${params.toString()}` : '';
    api
      .get<{ subscribers: Subscriber[]; total: number; active: number }>(`/admin/subscribers${suffix}`)
      .then((res) => {
        setSubscribers(res.subscribers);
        setTotal(res.total);
        setActive(res.active);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (s: Subscriber) => {
    try {
      const res = await api.patch<{ subscriber: Subscriber }>(`/admin/subscribers/${s.id}`, {
        isActive: !s.isActive,
      });
      setSubscribers((prev) => prev.map((x) => (x.id === s.id ? res.subscriber : x)));
      setActive((prev) => prev + (res.subscriber.isActive ? 1 : -1));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (s: Subscriber) => {
    if (!window.confirm(`Remove ${s.email} from the list?`)) return;
    try {
      await api.del(`/admin/subscribers/${s.id}`);
      setSubscribers((prev) => prev.filter((x) => x.id !== s.id));
      setTotal((prev) => Math.max(0, prev - 1));
      if (s.isActive) setActive((prev) => Math.max(0, prev - 1));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const add = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post('/admin/subscribers', { email: newEmail.trim() });
      setAdding(false);
      setNewEmail('');
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return '—';
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Newsletter Subscribers</h2>
          <p className="text-xs text-neutral-400">
            {total} addresses · {active} subscribed
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Collected from the storefront footer. Nothing is emailed automatically — copy this list when you want to
            send something.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={load} className="gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </Button>
          <Button onClick={() => setAdding(true)} className="gap-1">
            <Plus className="w-3.5 h-3.5" /> Add address
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-xl outline-none focus:border-[#D8232A]"
        />
      </div>

      {error && (
        <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : subscribers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200">
          <EmptyState icon={<Mail className="w-6 h-6" />} title={query ? 'No match' : 'No subscribers yet'} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-x-auto">
          <table className="w-full text-left min-w-[34rem]">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase text-neutral-500">Email</th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase text-neutral-500">Source</th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase text-neutral-500">Added</th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase text-neutral-500">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2.5 text-xs font-semibold text-neutral-800 break-all">{s.email}</td>
                  <td className="px-4 py-2.5 text-[11px] text-neutral-500 uppercase">{s.source}</td>
                  <td className="px-4 py-2.5 text-[11px] text-neutral-500">{fmtDate(s.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    {s.isActive ? (
                      <Badge color="bg-emerald-50 text-emerald-700">Subscribed</Badge>
                    ) : (
                      <Badge color="bg-neutral-100 text-neutral-500">Paused</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <Button variant="ghost" onClick={() => toggle(s)} className="px-2.5 py-1 text-[11px]">
                      {s.isActive ? 'Pause' : 'Resume'}
                    </Button>
                    <Button variant="danger" onClick={() => remove(s)} className="px-2.5 py-1 text-[11px] ml-1.5">
                      <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <Modal open onClose={() => setAdding(false)} title="Add a subscriber">
          <div className="space-y-3">
            <Field label="Email address" hint="Useful for addresses collected in the shop or over the phone.">
              <TextInput value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="name@example.com" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button onClick={add} disabled={saving || !newEmail.trim()}>
                {saving ? 'Adding…' : 'Add address'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
