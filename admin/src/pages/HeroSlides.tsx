import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { HeroSlide, SideBanner } from '../types';
import { Badge, Button, EmptyState, Field, Modal, Spinner, TextInput, Toggle, PageHeader } from '../components/ui';
import { UploadImageButton } from '../components/ImageUpload';
import { adminImageUrl } from '../lib/imageUrl';
import { Plus, Images, Pencil, Trash2 } from 'lucide-react';

/** Slides and side banners are both image-only: the storefront renders the
 *  uploaded artwork, so the form is just image + order + visibility. */
interface FormState {
  image: string;
  sortOrder: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  image: '',
  sortOrder: '0',
  isActive: true,
};

/** Shared by both lists — hero slides and side banners have the same fields. */
function fromRow(r: { image: string; sortOrder: number; isActive: boolean }): FormState {
  return {
    image: r.image,
    sortOrder: String(r.sortOrder),
    isActive: r.isActive,
  };
}

function toPayload(f: FormState): Record<string, unknown> {
  return {
    image: f.image.trim(),
    sortOrder: Number(f.sortOrder) || 0,
    isActive: f.isActive,
  };
}

/**
 * Side banners — the image-only column beside the hero carousel. Same idea as
 * the slides above: upload the artwork, set the order, show/hide. The storefront
 * renders the upload as-is, with no copy laid over it.
 */
function SideBannersSection() {
  const [banners, setBanners] = useState<SideBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SideBanner | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<{ banners: SideBanner[] }>('/admin/side-banners')
      .then((res) => setBanners(res.banners))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: keyof FormState, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (b: SideBanner) => {
    setEditing(b);
    setForm(fromRow(b));
    setError(null);
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      if (editing) {
        const res = await api.patch<{ banner: SideBanner }>(`/admin/side-banners/${editing.id}`, payload);
        setBanners((prev) => prev.map((b) => (b.id === editing.id ? res.banner : b)));
      } else {
        const res = await api.post<{ banner: SideBanner }>('/admin/side-banners', payload);
        setBanners((prev) => [...prev, res.banner]);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b: SideBanner) => {
    if (!window.confirm('Delete this side banner?')) return;
    await api.del(`/admin/side-banners/${b.id}`);
    setBanners((prev) => prev.filter((x) => x.id !== b.id));
  };

  const toggleActive = async (b: SideBanner) => {
    const res = await api.patch<{ banner: SideBanner }>(`/admin/side-banners/${b.id}`, { isActive: !b.isActive });
    setBanners((prev) => prev.map((x) => (x.id === b.id ? res.banner : x)));
  };

  return (
    <section className="space-y-3 pt-4 border-t border-neutral-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-neutral-900">Side banners (beside the hero)</h3>
          <p className="text-xs text-neutral-400">
            {banners.length} image banner{banners.length === 1 ? '' : 's'} · shown in the column next to the homepage slider — the image is the whole banner.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1">
          <Plus className="w-3.5 h-3.5" /> New banner
        </Button>
      </div>

      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {loading ? (
        <Spinner />
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200">
          <EmptyState
            icon={<Images className="w-6 h-6" />}
            title="No side banners yet"
            hint="Upload a banner image to fill the column beside the hero slider."
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-4 gap-3">
          {[...banners]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((b) => (
              <div key={b.id} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                <div className="relative aspect-[16/10] bg-neutral-100">
                  {b.image && <img src={adminImageUrl(b.image)} alt="" className="w-full h-full object-cover" />}
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-neutral-900 backdrop-blur">
                    #{b.sortOrder}
                  </span>
                  {!b.isActive && <span aria-hidden="true" className="absolute inset-0 bg-white/60" />}
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <button onClick={() => toggleActive(b)} className="cursor-pointer" title="Click to show/hide on the storefront">
                    {b.isActive ? (
                      <Badge color="bg-emerald-50 text-emerald-700">Live</Badge>
                    ) : (
                      <Badge color="bg-neutral-100 text-neutral-500">Hidden</Badge>
                    )}
                  </button>
                  <div className="flex items-center">
                    <button
                      onClick={() => openEdit(b)}
                      title="Edit / replace image"
                      className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => remove(b)}
                      title="Delete"
                      className="p-1.5 rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Side Banner' : 'New Side Banner'}>
        <form onSubmit={submit} className="space-y-4">
          {/* Shown inside the modal too — the page-level banner sits behind the overlay. */}
          {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Field
                label="Banner image"
                hint="Upload from your PC, or paste an image URL / /images/... path served from public/. The image is the whole banner — no text or buttons are added on top."
              >
                <div className="flex items-start gap-2">
                  <TextInput
                    required
                    value={form.image}
                    placeholder="/images/my-banner.jpg or https://…"
                    onChange={(e) => set('image', e.target.value)}
                  />
                  <UploadImageButton onUploaded={(url) => set('image', url)} />
                </div>
              </Field>
            </div>
            <Field label="Sort order" hint="Lower shows first">
              <TextInput type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
            </Field>
          </div>

          {form.image && (
            <div className="rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50">
              <img
                src={adminImageUrl(form.image)}
                alt="Banner preview"
                className="w-full h-40 object-cover"
                /* If the file really is missing, say so instead of silently
                   hiding the image and leaving an empty grey box. */
                onError={(e) => {
                  const box = e.currentTarget.parentElement;
                  if (box) {
                    box.innerHTML =
                      '<p class="px-3 py-6 text-center text-xs font-semibold text-red-600">' +
                      'Preview unavailable — the saved file could not be loaded from the API.</p>';
                  }
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
              {saving ? 'Saving…' : 'Save banner'}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
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
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (s: HeroSlide) => {
    setEditing(s);
    setForm(fromRow(s));
    setError(null);
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
    if (!window.confirm(`Delete slide "${s.title || 'banner image'}"?`)) return;
    await api.del(`/admin/hero-slides/${s.id}`);
    setSlides((prev) => prev.filter((x) => x.id !== s.id));
  };

  const toggleActive = async (s: HeroSlide) => {
    const res = await api.patch<{ slide: HeroSlide }>(`/admin/hero-slides/${s.id}`, { isActive: !s.isActive });
    setSlides((prev) => prev.map((x) => (x.id === s.id ? res.slide : x)));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Storefront"
        title="Hero Slides"
        desc={`${slides.length} sliding banners on the storefront homepage`}
        icon={<Images className="w-5 h-5" />}
        actions={
          <Button onClick={openCreate} className="gap-1">
            <Plus className="w-3.5 h-3.5" /> New slide
          </Button>
        }
      />

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
                <th className="py-3 px-4">Slide image</th>
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
                        {s.image && <img src={adminImageUrl(s.image)} alt="" className="w-16 h-10 rounded-lg object-cover bg-neutral-100 shrink-0" />}
                        <div className="min-w-0">
                          <p className="font-bold text-neutral-900 truncate max-w-56">
                            {s.title || 'Banner image'}
                          </p>
                          <p className="text-[11px] text-neutral-400 truncate max-w-56">{s.image}</p>
                        </div>
                      </div>
                    </td>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Slide' : 'New Hero Slide'}>
        <form onSubmit={submit} className="space-y-4">
          {/* Shown inside the modal too — the page-level banner sits behind the overlay. */}
          {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Field
                label="Banner image"
                hint="Upload from your PC, or paste an image URL / /images/... path served from public/. The image is the whole slide — no text or buttons are added on top."
              >
                <div className="flex items-start gap-2">
                  <TextInput required value={form.image} placeholder="/images/my-banner.jpg or https://…" onChange={(e) => set('image', e.target.value)} />
                  <UploadImageButton
                    onUploaded={(url) => set('image', url)}
                  />
                </div>
              </Field>
            </div>
            <Field label="Sort order" hint="Lower shows first">
              <TextInput type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
            </Field>
          </div>

          {form.image && (
            <div className="rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50">
              <img
                src={adminImageUrl(form.image)}
                alt="Slide preview"
                className="w-full h-40 object-cover"
                onError={(e) => {
                  const box = e.currentTarget.parentElement;
                  if (box) {
                    box.innerHTML =
                      '<p class="px-3 py-6 text-center text-xs font-semibold text-red-600">' +
                      'Preview unavailable — the saved file could not be loaded from the API.</p>';
                  }
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

      <SideBannersSection />
    </div>
  );
}