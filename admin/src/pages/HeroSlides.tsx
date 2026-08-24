import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { HeroSlide } from '../types';
import { Badge, Button, EmptyState, Field, Modal, Select, Spinner, TextArea, TextInput, Toggle } from '../components/ui';
import { UploadImageButton } from '../components/ImageUpload';
import { Plus, Images, Pencil, Trash2 } from 'lucide-react';

interface FormState {
  badge: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaCategory: string;
  ctaSubcategory: string;
  ctaBrand: string;
  image: string;
  accentColor: string;
  tagline: string;
  sortOrder: string;
  isActive: boolean;
}

const CTA_CATEGORIES = [
  'all',
  'food',
  'craft',
  'home',
  'beauty',
  'print',
];
const CTA_CATEGORY_LABELS: Record<string, string> = {
  all: 'All products',
  food: 'SHUDDHO',
  craft: 'AKS CRAFT',
  home: 'AKS HOME',
  beauty: 'AKS BEAUTY',
  print: 'AKS PRINT',
};

const emptyForm: FormState = {
  badge: '',
  title: '',
  subtitle: '',
  ctaText: 'Shop Now',
  ctaCategory: 'all',
  ctaSubcategory: '',
  ctaBrand: '',
  image: '',
  accentColor: '#D8232A',
  tagline: '',
  sortOrder: '0',
  isActive: true,
};

function fromSlide(s: HeroSlide): FormState {
  return {
    badge: s.badge,
    title: s.title,
    subtitle: s.subtitle,
    ctaText: s.ctaText,
    ctaCategory: s.ctaCategory,
    ctaSubcategory: s.ctaSubcategory ?? '',
    ctaBrand: s.ctaBrand ?? '',
    image: s.image,
    accentColor: s.accentColor,
    tagline: s.tagline,
    sortOrder: String(s.sortOrder),
    isActive: s.isActive,
  };
}

function toPayload(f: FormState): Record<string, unknown> {
  return {
    badge: f.badge.trim(),
    title: f.title.trim(),
    subtitle: f.subtitle.trim(),
    ctaText: f.ctaText.trim() || 'Shop Now',
    ctaCategory: f.ctaCategory,
    ctaSubcategory: f.ctaSubcategory.trim() || null,
    ctaBrand: f.ctaBrand.trim() || null,
    image: f.image.trim(),
    accentColor: f.accentColor,
    tagline: f.tagline.trim(),
    sortOrder: Number(f.sortOrder) || 0,
    isActive: f.isActive,
  };
}

export function HeroSlidesPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HeroSlide | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<{ slides: HeroSlide[] }>('/admin/hero-slides')
      .then((res) => setSlides(res.slides))
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

  const openEdit = (s: HeroSlide) => {
    setEditing(s);
    setForm(fromSlide(s));
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
        const res = await api.patch<{ slide: HeroSlide }>(`/admin/hero-slides/${editing.id}`, payload);
        setSlides((prev) => prev.map((s) => (s.id === editing.id ? res.slide : s)));
      } else {
        const res = await api.post<{ slide: HeroSlide }>('/admin/hero-slides', payload);
        setSlides((prev) => [...prev, res.slide]);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: HeroSlide) => {
    if (!window.confirm(`Delete slide "${s.title}"?`)) return;
    await api.del(`/admin/hero-slides/${s.id}`);
    setSlides((prev) => prev.filter((x) => x.id !== s.id));
  };

  const toggleActive = async (s: HeroSlide) => {
    const res = await api.patch<{ slide: HeroSlide }>(`/admin/hero-slides/${s.id}`, { isActive: !s.isActive });
    setSlides((prev) => prev.map((x) => (x.id === s.id ? res.slide : x)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Hero Slides</h2>
          <p className="text-xs text-neutral-400">{slides.length} sliding banners on the storefront homepage</p>
        </div>
        <Button onClick={openCreate} className="gap-1">
          <Plus className="w-3.5 h-3.5" /> New slide
        </Button>
      </div>

      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {loading ? (
        <Spinner />
      ) : slides.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200">
          <EmptyState icon={<Images className="w-6 h-6" />} title="No hero slides yet" hint="Add your first homepage banner slide." />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Slide</th>
                <th className="py-3 px-4">Badge</th>
                <th className="py-3 px-4">CTA</th>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {[...slides]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {s.image && <img src={s.image} alt="" className="w-16 h-10 rounded-lg object-cover bg-neutral-100 shrink-0" />}
                        <div className="min-w-0">
                          <p className="font-bold text-neutral-900 truncate max-w-56">{s.title}</p>
                          <p className="text-[11px] text-neutral-400 truncate max-w-56">{s.subtitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{s.badge || '—'}</td>
                    <td className="px-4 py-3 text-neutral-600">{s.ctaText}</td>
                    <td className="px-4 py-3 text-neutral-600">{s.sortOrder}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(s)} className="cursor-pointer" title="Click to toggle">
                        {s.isActive ? (
                          <Badge color="bg-emerald-50 text-emerald-700">Live</Badge>
                        ) : (
                          <Badge color="bg-neutral-100 text-neutral-500">Hidden</Badge>
                        )}
                      </button>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Slide' : 'New Hero Slide'} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Title">
              <TextInput required value={form.title} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <Field label="Badge">
              <TextInput value={form.badge} placeholder="e.g. FESTIVE COLLECTION 2026" onChange={(e) => set('badge', e.target.value)} />
            </Field>
            <Field label="Subtitle / description">
              <TextArea value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
            </Field>
            <Field label="Tagline">
              <TextInput value={form.tagline} placeholder="Crafted care • AKS Mart quality" onChange={(e) => set('tagline', e.target.value)} />
            </Field>
            <Field label="Image" hint="Upload from your PC, or paste an image URL / /images/... path served from public/">
              <div className="flex items-start gap-2">
                <TextInput required value={form.image} placeholder="/images/my-banner.jpg or https://…" onChange={(e) => set('image', e.target.value)} />
                <UploadImageButton
                  onUploaded={(url) => set('image', url)}
                />
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Accent color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(form.accentColor) ? form.accentColor : '#D8232A'}
                    onChange={(e) => set('accentColor', e.target.value)}
                    className="w-9 h-9 rounded-lg border border-neutral-300 cursor-pointer bg-white p-0.5 shrink-0"
                  />
                  <TextInput value={form.accentColor} onChange={(e) => set('accentColor', e.target.value)} />
                </div>
              </Field>
              <Field label="Sort order" hint="Lower shows first">
                <TextInput type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
              </Field>
            </div>
            <Field label="CTA button text">
              <TextInput value={form.ctaText} onChange={(e) => set('ctaText', e.target.value)} />
            </Field>
            <Field label="CTA category filter">
              <Select value={form.ctaCategory} onChange={(e) => set('ctaCategory', e.target.value)}>
                {CTA_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>
                    {CTA_CATEGORY_LABELS[c] ?? c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="CTA subcategory (optional)">
              <TextInput value={form.ctaSubcategory} placeholder="e.g. Rice & Staples" onChange={(e) => set('ctaSubcategory', e.target.value)} />
            </Field>
            <Field label="CTA brand (optional)" hint="Must match a brand name exactly to pre-filter">
              <TextInput value={form.ctaBrand} placeholder="e.g. SHUDDHO" onChange={(e) => set('ctaBrand', e.target.value)} />
            </Field>
          </div>

          {form.image && (
            <div className="rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50">
              <img
                src={form.image}
                alt="Slide preview"
                className="w-full h-40 object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                }}
              />
            </div>
          )}

          <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} label="Show on storefront" />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save slide'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}