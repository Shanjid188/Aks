import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Announcement, Promotion } from '../types';
import { Button, EmptyState, Field, Modal, Spinner, TextArea, TextInput } from '../components/ui';
import { Plus, RefreshCw, Megaphone, Tag, Trash2, Pencil } from 'lucide-react';

/* Announcements manager — real DB-backed CRUD. */
interface AF { id: string | null; text: string; textBn: string; link: string; bgColor: string; isActive: boolean }
const blankA = (): AF => ({ id: null, text: '', textBn: '', link: '', bgColor: '#D8232A', isActive: true });

function AnnouncementManager() {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AF | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    api.get<{ announcements: Announcement[] }>('/admin/announcements')
      .then((r) => setRows(r.announcements))
      .catch((e: Error) => { setError(e.message); setRows([]); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    if (!form || !form.text.trim()) return;
    setSaving(true); setError(null);
    try {
      const body = { text: form.text, textBn: form.textBn || undefined, link: form.link || undefined, bgColor: form.bgColor, isActive: form.isActive };
      if (form.id) await api.patch(`/admin/announcements/${form.id}`, body); else await api.post('/admin/announcements', body);
      setForm(null); load();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };
  const del = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return;
    try { await api.del(`/admin/announcements/${id}`); load(); } catch (e) { setError((e as Error).message); }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500">The bar shown at the top of the storefront.</p>
        <Button onClick={() => { setError(null); setForm(blankA()); }}><Plus className="w-3.5 h-3.5" /> Add</Button>
      </div>
      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {loading ? <Spinner /> : rows.length === 0 ? <EmptyState icon={<Megaphone className="w-6 h-6" />} title="No announcements" hint="Add one to display a top bar on the storefront." /> : (
        <div className="space-y-2">
          {rows.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
              <span className="flex-1 text-xs font-bold px-3 py-2 rounded-lg" style={{ color: a.textColor, background: a.bgColor }}>{a.text}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{a.isActive ? 'Active' : 'Inactive'}</span>
              <button onClick={() => setForm({ id: a.id, text: a.text, textBn: a.textBn || '', link: a.link || '', bgColor: a.bgColor || '#D8232A', isActive: a.isActive })} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-200 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => del(a.id)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit Announcement' : 'New Announcement'}>
        {form && (
          <div className="space-y-4">
            <Field label="Text (English)"><TextInput value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></Field>
            <Field label="Text (Bangla)"><TextInput value={form.textBn} onChange={(e) => setForm({ ...form, textBn: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Background color"><TextInput value={form.bgColor} onChange={(e) => setForm({ ...form, bgColor: e.target.value })} /></Field>
              <Field label="Link"><TextInput value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-[#D8232A]" /> Active</label>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button disabled={saving || !form.text.trim()} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

interface PF { id: string | null; title: string; subtitle: string; image: string; link: string; startDate: string; endDate: string; isActive: boolean; sortOrder: number }
const blankP = (): PF => ({ id: null, title: '', subtitle: '', image: '', link: '', startDate: '', endDate: '', isActive: true, sortOrder: 0 });

function PromoManager() {
  const [rows, setRows] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PF | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    api.get<{ promotions: Promotion[] }>('/admin/promotions')
      .then((r) => setRows(r.promotions))
      .catch((e: Error) => { setError(e.message); setRows([]); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    if (!form || !form.title.trim()) return;
    setSaving(true); setError(null);
    try {
      const body = { title: form.title, subtitle: form.subtitle || undefined, image: form.image || undefined, link: form.link || undefined, startDate: form.startDate || undefined, endDate: form.endDate || undefined, isActive: form.isActive, sortOrder: form.sortOrder };
      if (form.id) await api.patch(`/admin/promotions/${form.id}`, body); else await api.post('/admin/promotions', body);
      setForm(null); load();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };
  const del = async (id: string) => {
    if (!window.confirm('Delete this promotion?')) return;
    try { await api.del(`/admin/promotions/${id}`); load(); } catch (e) { setError((e as Error).message); }
  };
  const toggle = async (p: Promotion) => {
    try { await api.patch(`/admin/promotions/${p.id}`, { isActive: !p.isActive }); load(); } catch (e) { setError((e as Error).message); }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500">Homepage promo banners — stored in the database.</p>
        <Button onClick={() => { setError(null); setForm(blankP()); }}><Plus className="w-3.5 h-3.5" /> New Promotion</Button>
      </div>
      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {loading ? <Spinner /> : rows.length === 0 ? <EmptyState icon={<Tag className="w-6 h-6" />} title="No promotions" hint="Create promotions to feature on the homepage." /> : (
        <div className="space-y-2">
          {rows.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
              <span className="w-14 h-14 rounded-xl bg-[#D8232A]/10 text-[#D8232A] flex items-center justify-center font-black text-sm shrink-0">#{p.sortOrder}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-neutral-900 truncate">{p.title}</p>
                <p className="text-[10px] text-neutral-400 truncate">{p.subtitle || 'No subtitle'}</p>
              </div>
              <button onClick={() => toggle(p)} className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-neutral-500'}`}>{p.isActive ? 'Active' : 'Inactive'}</button>
              <button onClick={() => setForm({ id: p.id, title: p.title, subtitle: p.subtitle || '', image: p.image || '', link: p.link || '', startDate: p.startDate ? p.startDate.slice(0, 10) : '', endDate: p.endDate ? p.endDate.slice(0, 10) : '', isActive: p.isActive, sortOrder: p.sortOrder })} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-200 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => del(p.id)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit Promotion' : 'New Promotion'}>
        {form && (
          <div className="space-y-4">
            <Field label="Title"><TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Subtitle"><TextInput value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Image URL"><TextInput value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></Field>
              <Field label="Link"><TextInput value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date"><TextInput type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
              <Field label="End date"><TextInput type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sort order"><TextInput type="number" value={String(form.sortOrder)} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })} /></Field>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer justify-center pt-7"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-[#D8232A]" /> Active</label>
            </div>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button disabled={saving || !form.title.trim()} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* Homepage copy manager — edits the `content.*` store settings that the
 * storefront home page reads (defaults live in src/data/siteContent.ts). */
interface ContentField { key: string; label: string; long?: boolean }
interface ContentGroup { title: string; hint?: string; fields: ContentField[] }

const CONTENT_GROUPS: ContentGroup[] = [
  {
    title: 'Featured Products',
    fields: [
      { key: 'content.featured.eyebrow', label: 'Eyebrow' },
      { key: 'content.featured.title', label: 'Title' },
      { key: 'content.featured.subtitle', label: 'Subtitle', long: true },
      { key: 'content.featured.action', label: '“View all” link label' },
    ],
  },
  {
    title: 'New Arrivals',
    fields: [
      { key: 'content.newArrivals.eyebrow', label: 'Eyebrow' },
      { key: 'content.newArrivals.title', label: 'Title' },
      { key: 'content.newArrivals.subtitle', label: 'Subtitle', long: true },
      { key: 'content.newArrivals.action', label: '“View all” link label' },
    ],
  },
  {
    title: 'Best Sellers',
    fields: [
      { key: 'content.bestSellers.eyebrow', label: 'Eyebrow' },
      { key: 'content.bestSellers.title', label: 'Title' },
      { key: 'content.bestSellers.subtitle', label: 'Subtitle', long: true },
      { key: 'content.bestSellers.action', label: '“View all” link label' },
    ],
  },
  {
    title: 'Division grid',
    fields: [
      { key: 'content.divisions.eyebrow', label: 'Eyebrow' },
      { key: 'content.divisions.title', label: 'Title' },
      { key: 'content.divisions.subtitle', label: 'Subtitle', long: true },
      { key: 'content.divisions.action', label: 'Link label' },
    ],
  },
  {
    title: 'Active Offers section',
    hint: 'The offer cards themselves come from Coupons.',
    fields: [
      { key: 'content.offers.eyebrow', label: 'Eyebrow' },
      { key: 'content.offers.title', label: 'Title' },
      { key: 'content.offers.subtitle', label: 'Subtitle', long: true },
    ],
  },
  {
    title: 'Circle showcase',
    fields: [
      { key: 'content.showcase.eyebrow', label: 'Eyebrow' },
      { key: 'content.showcase.title', label: 'Title' },
      { key: 'content.showcase.subtitle', label: 'Subtitle', long: true },
    ],
  },
  {
    title: 'Trust strip (below the showcase)',
    fields: [
      { key: 'content.trust.item1Title', label: 'Item 1 title' },
      { key: 'content.trust.item1Sub', label: 'Item 1 note' },
      { key: 'content.trust.item2Title', label: 'Item 2 title' },
      { key: 'content.trust.item2Sub', label: 'Item 2 note' },
      { key: 'content.trust.item3Title', label: 'Item 3 title' },
      { key: 'content.trust.item3Sub', label: 'Item 3 note' },
    ],
  },
  {
    title: 'Header',
    hint: 'Trending searches are comma-separated keywords.',
    fields: [
      { key: 'content.header.saleChip', label: 'Sale chip (navbar)' },
      { key: 'content.header.saleChipShort', label: 'Sale chip (mobile menu)' },
      { key: 'content.header.trendingSearches', label: 'Trending searches (comma separated)', long: true },
    ],
  },
];

function HomepageContentManager() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<{ settings: Record<string, unknown> }>('/admin/settings')
      .then((res) => {
        const next: Record<string, string> = {};
        for (const group of CONTENT_GROUPS) {
          for (const field of group.fields) {
            const value = res.settings[field.key];
            next[field.key] = typeof value === 'string' ? value : '';
          }
        }
        setValues(next);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const payload: Record<string, string> = {};
      for (const group of CONTENT_GROUPS) {
        for (const field of group.fields) payload[field.key] = values[field.key] ?? '';
      }
      const res = await api.put<{ updated: number }>('/admin/settings', payload);
      setStatus(`Saved ${res.updated} fields — refresh the storefront to see them.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Homepage content</h2>
          <p className="text-xs text-neutral-400">
            Section headings and copy for the storefront home page. Leave a field empty to keep the built-in default.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={load} className="gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {status && <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{status}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {CONTENT_GROUPS.map((group) => (
          <div key={group.title} className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">{group.title}</h3>
              {group.hint && <p className="text-[11px] text-neutral-400 mt-0.5">{group.hint}</p>}
            </div>
            {group.fields.map((field) => (
              <Field key={field.key} label={field.label}>
                {field.long ? (
                  <TextArea
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                ) : (
                  <TextInput
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                )}
              </Field>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturedManager() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Featured Products</h2>
      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
        <p className="text-sm text-amber-800">💡 Go to <strong>Products</strong> → Edit product → set a <strong>Featured order</strong> (1 = shown first) to place it in this section. The section title/eyebrow/copy live in the <strong>Homepage</strong> tab.</p>
      </div>
    </div>
  );
}

export default function StorefrontPage() {
  const [activeTab, setActiveTab] = useState('announcements');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Storefront Management</h1>
        <p className="text-sm text-neutral-500 mt-1">Hero slider, promotions, announcement bar and homepage copy — stored in the database.</p>
      </div>
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
        {[
          { id: 'hero', label: 'Hero Slider' },
          { id: 'announcements', label: 'Announcement Bar' },
          { id: 'featured', label: 'Featured Products' },
          { id: 'promo', label: 'Promotions' },
          { id: 'content', label: 'Homepage' },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'hero' && <HeroSlidesManagerStub />}
      {activeTab === 'announcements' && <AnnouncementManager />}
      {activeTab === 'featured' && <FeaturedManager />}
      {activeTab === 'promo' && <PromoManager />}
      {activeTab === 'content' && <HomepageContentManager />}
    </div>
  );
}

/** Hero slides live on the separate Hero Slides module — this stub links there. */
function HeroSlidesManagerStub() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6">
      <h2 className="text-lg font-semibold mb-3">Hero Slider</h2>
      <p className="text-sm text-neutral-500 mb-3">Manage hero slides from the dedicated <strong>Hero Slides</strong> module in the sidebar.</p>
      <button onClick={() => window.dispatchEvent(new CustomEvent('aks-admin-navigate', { detail: 'slides' }))} className="px-4 py-2 bg-[#D8232A] text-white text-xs font-bold rounded-lg hover:bg-[#b51c22] cursor-pointer">Open Hero Slides →</button>
    </div>
  );
}
