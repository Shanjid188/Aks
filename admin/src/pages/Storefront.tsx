import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Announcement, Promotion } from '../types';
import { Button, EmptyState, Field, Modal, Spinner, TextInput } from '../components/ui';
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

function FeaturedManager() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Featured Products</h2>
      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
        <p className="text-sm text-amber-800">💡 Go to <strong>Products</strong> → Edit product → Enable <strong>Featured</strong> to show it on the homepage. The storefront section title and subtitle can be configured from Settings later.</p>
      </div>
    </div>
  );
}

export default function StorefrontPage() {
  const [activeTab, setActiveTab] = useState('slider');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Storefront Management</h1>
        <p className="text-sm text-neutral-500 mt-1">Hero slider, promotions and announcement bar — stored in the database.</p>
      </div>
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
        {[
          { id: 'hidden', label: 'Hero Slider' },
          { id: 'slider', label: 'Announcement Bar' },
          { id: 'featured', label: 'Featured Products' },
          { id: 'promo', label: 'Promotions' },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'hidden' && <HeroSlidesManagerStub />}
      {activeTab === 'slider' && <AnnouncementManager />}
      {activeTab === 'featured' && <FeaturedManager />}
      {activeTab === 'promo' && <PromoManager />}
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
