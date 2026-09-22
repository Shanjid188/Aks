import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Category, Subcategory } from '../types';
import { Badge, Button, EmptyState, Field, Modal, Spinner, TextArea, TextInput, Toggle } from '../components/ui';
import { UploadImageButton } from '../components/ImageUpload';
import { Plus, LayoutGrid, Pencil, Trash2, ChevronUp, ChevronDown, Layers } from 'lucide-react';

interface CategoryForm {
  name: string;
  nameBn: string;
  slug: string;
  description: string;
  descriptionBn: string;
  tagline: string;
  taglineBn: string;
  brand: string;
  image: string;
  heroImage: string;
  gridImage: string;
  badge: string;
  accentColor: string;
  sortOrder: string;
  isActive: boolean;
}

const emptyCategoryForm: CategoryForm = {
  name: '',
  nameBn: '',
  slug: '',
  description: '',
  descriptionBn: '',
  tagline: '',
  taglineBn: '',
  brand: '',
  image: '',
  heroImage: '',
  gridImage: '',
  badge: '',
  accentColor: '#D8232A',
  sortOrder: '',
  isActive: true,
};

function fromCategory(c: Category): CategoryForm {
  return {
    name: c.name,
    nameBn: c.nameBn ?? '',
    slug: c.slug,
    description: c.description ?? '',
    descriptionBn: c.descriptionBn ?? '',
    tagline: c.tagline ?? '',
    taglineBn: c.taglineBn ?? '',
    brand: c.brand ?? '',
    image: c.image ?? '',
    heroImage: c.heroImage ?? '',
    gridImage: c.gridImage ?? '',
    badge: c.badge,
    accentColor: c.accentColor,
    sortOrder: String(c.sortOrder),
    isActive: c.isActive,
  };
}

function categoryPayload(f: CategoryForm): Record<string, unknown> {
  return {
    name: f.name.trim(),
    nameBn: f.nameBn.trim() || null,
    slug: f.slug.trim() || undefined,
    description: f.description.trim(),
    descriptionBn: f.descriptionBn.trim() || null,
    tagline: f.tagline.trim(),
    taglineBn: f.taglineBn.trim() || null,
    brand: f.brand.trim() || f.name.trim(),
    image: f.image.trim() || null,
    heroImage: f.heroImage.trim() || null,
    gridImage: f.gridImage.trim() || null,
    badge: f.badge.trim(),
    accentColor: f.accentColor,
    sortOrder: Number(f.sortOrder) || 0,
    isActive: f.isActive,
  };
}

interface SubForm {
  categoryId: string;
  name: string;
  nameBn: string;
  sortOrder: string;
  isActive: boolean;
}

const emptySubForm = (categoryId: string): SubForm => ({
  categoryId,
  name: '',
  nameBn: '',
  sortOrder: '',
  isActive: true,
});

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Category form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyCategoryForm);
  const [saving, setSaving] = useState(false);

  // Subcategory form state
  const [subOpen, setSubOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null);
  const [subForm, setSubForm] = useState<SubForm>(emptySubForm(''));
  const [savingSub, setSavingSub] = useState(false);

  const load = useCallback(() => {
    api
      .get<{ categories: Category[] }>('/admin/categories')
      .then((res) => setCategories(res.categories))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: keyof CategoryForm, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));
  const setSub = (key: keyof SubForm, value: string | boolean) => setSubForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyCategoryForm, sortOrder: String(categories.length + 1) });
    setModalOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm(fromCategory(c));
    setModalOpen(true);
  };

  const submitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = categoryPayload(form);
      if (editing) {
        const res = await api.patch<{ category: Category }>(`/admin/categories/${editing.id}`, payload);
        setCategories((prev) => prev.map((c) => (c.id === editing.id ? res.category : c)));
      } else {
        const res = await api.post<{ category: Category }>('/admin/categories', payload);
        setCategories((prev) => [...prev, res.category].sort((a, b) => a.sortOrder - b.sortOrder));
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (c: Category) => {
    if (!window.confirm(`Delete division "${c.name}"? Its subcategories are deleted too.`)) return;
    setError(null);
    try {
      await api.del(`/admin/categories/${c.id}`);
      setCategories((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const toggleActive = async (c: Category) => {
    const res = await api.patch<{ category: Category }>(`/admin/categories/${c.id}`, { isActive: !c.isActive });
    setCategories((prev) => prev.map((x) => (x.id === c.id ? res.category : x)));
  };

  /** Reorder by patching two neighbours' sortOrder (practical alternative to drag/drop). */
  const move = async (c: Category, dir: -1 | 1) => {
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((x) => x.id === c.id);
    const neighbour = sorted[idx + dir];
    if (!neighbour) return;
    setError(null);
    try {
      const [mine, theirs] = await Promise.all([
        api.patch<{ category: Category }>(`/admin/categories/${c.id}`, { sortOrder: neighbour.sortOrder }),
        api.patch<{ category: Category }>(`/admin/categories/${neighbour.id}`, { sortOrder: c.sortOrder }),
      ]);
      setCategories((prev) =>
        prev
          .map((x) => (x.id === mine.category.id ? mine.category : x.id === theirs.category.id ? theirs.category : x))
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reorder failed');
    }
  };

  const openSubCreate = (categoryId: string) => {
    setEditingSub(null);
    setSubForm(emptySubForm(categoryId));
    setSubOpen(true);
  };

  const openSubEdit = (parentId: string, sub: Subcategory) => {
    setEditingSub(sub);
    setSubForm({ categoryId: parentId, name: sub.name, nameBn: sub.nameBn ?? '', sortOrder: String(sub.sortOrder), isActive: sub.isActive });
    setSubOpen(true);
  };

  const submitSub = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSub(true);
    setError(null);
    try {
      const payload = {
        categoryId: subForm.categoryId,
        name: subForm.name.trim(),
        nameBn: subForm.nameBn.trim() || null,
        sortOrder: Number(subForm.sortOrder) || 0,
        isActive: subForm.isActive,
      };
      if (editingSub) {
        await api.patch<{ subcategory: Subcategory }>(`/admin/subcategories/${editingSub.id}`, payload);
      } else {
        await api.post<{ subcategory: Subcategory }>('/admin/subcategories', payload);
      }
      setSubOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingSub(false);
    }
  };

  const removeSub = async (cat: Category, sub: Subcategory) => {
    if (!window.confirm(`Delete subcategory "${sub.name}" from ${cat.name}?`)) return;
    setError(null);
    try {
      await api.del(`/admin/subcategories/${sub.id}`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const moveSub = async (cat: Category, sub: Subcategory, dir: -1 | 1) => {
    const sorted = [...cat.subcategories].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((s) => s.id === sub.id);
    const neighbour = sorted[idx + dir];
    if (!neighbour) return;
    setError(null);
    try {
      await api.patch(`/admin/subcategories/${sub.id}`, { sortOrder: neighbour.sortOrder });
      await api.patch(`/admin/subcategories/${neighbour.id}`, { sortOrder: sub.sortOrder });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reorder failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Categories &amp; Divisions</h2>
          <p className="text-xs text-neutral-400">
            Drives the storefront nav, mega menu, division grid, marquee, footer and catalog filters.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1">
          <Plus className="w-3.5 h-3.5" /> New division
        </Button>
      </div>

      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {loading ? (
        <Spinner />
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200">
          <EmptyState icon={<LayoutGrid className="w-6 h-6" />} title="No divisions yet" hint="Add your first storefront division." />
        </div>
      ) : (
        <div className="space-y-4">
          {[...categories]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((c, idx, arr) => (
            <div key={c.id} className="bg-white rounded-2xl border border-neutral-200">
              <div className="flex items-start gap-4 p-5 border-b border-neutral-100">
                {c.gridImage || c.image ? (
                  <img src={c.gridImage || c.image || ''} alt="" className="w-14 h-14 rounded-xl object-cover bg-neutral-100 shrink-0" />
                ) : (
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
                    style={{ backgroundColor: c.accentColor }}
                  >
                    {c.name.substring(0, 3)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-neutral-900">{c.name}</h3>
                    {c.brand && c.brand !== c.name && <Badge color="bg-neutral-100 text-neutral-600">{c.brand}</Badge>}
                    {c.badge && <Badge color="bg-neutral-100 text-neutral-600">{c.badge}</Badge>}
                    {!c.isActive && <Badge color="bg-neutral-200 text-neutral-500">Hidden</Badge>}
                    <Badge color="bg-neutral-100 text-neutral-400">order {c.sortOrder}</Badge>
                  </div>
                  {c.tagline && <p className="text-xs font-semibold text-neutral-500 mt-0.5">{c.tagline}</p>}
                  {c.description && <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">{c.description}</p>}
                  <p className="text-[10px] text-neutral-400 mt-1">slug: /{c.slug} · products filter by this slug</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => move(c, -1)}
                    disabled={idx === 0}
                    title="Move up"
                    className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => move(c, 1)}
                    disabled={idx === arr.length - 1}
                    title="Move down"
                    className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleActive(c)}
                    title={c.isActive ? 'Hide from storefront' : 'Show on storefront'}
                    className="px-2 py-1.5 rounded-lg text-xs font-bold text-neutral-500 hover:bg-neutral-100 cursor-pointer"
                  >
                    {c.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 cursor-pointer"
                    title="Edit division"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeCategory(c)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    title="Delete division"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Subcategories manager */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-neutral-400" /> Subcategories ({c.subcategories.length})
                  </span>
                  <Button variant="ghost" onClick={() => openSubCreate(c.id)} className="gap-1">
                    <Plus className="w-3 h-3" /> Add subcategory
                  </Button>
                </div>

                {c.subcategories.length === 0 ? (
                  <p className="text-[11px] text-neutral-400">
                    No subcategories — the mega menu for this division will only show sibling divisions.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {[...c.subcategories]
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((sub, i, sorted) => (
                      <div
                        key={sub.id}
                        className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50"
                      >
                        <span className={`text-xs font-bold ${sub.isActive ? 'text-neutral-800' : 'text-neutral-400 line-through'}`}>
                          {sub.name}
                          {sub.nameBn && <span className="text-neutral-400 font-normal"> · {sub.nameBn}</span>}
                        </span>
                        <button
                          onClick={() => moveSub(c, sub, -1)}
                          disabled={i === 0}
                          title="Move up"
                          className="p-0.5 rounded text-neutral-400 hover:text-neutral-800 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveSub(c, sub, 1)}
                          disabled={i === sorted.length - 1}
                          title="Move down"
                          className="p-0.5 rounded text-neutral-400 hover:text-neutral-800 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openSubEdit(c.id, sub)}
                          title="Edit"
                          className="p-0.5 rounded text-neutral-400 hover:text-neutral-800 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeSub(c, sub)}
                          title="Delete"
                          className="p-0.5 rounded text-neutral-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category create/edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit division — ${editing.name}` : 'New division'}>
        <form onSubmit={submitCategory} className="space-y-4">
          {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name (brand shown in nav)"><TextInput required value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Name (Bangla)"><TextInput value={form.nameBn} onChange={(e) => set('nameBn', e.target.value)} /></Field>
            <Field label="Slug" hint="Must match Product.category — locked while products use it">
              <TextInput value={form.slug} onChange={(e) => set('slug', e.target.value)} />
            </Field>
            <Field label="Badge"><TextInput value={form.badge} onChange={(e) => set('badge', e.target.value)} placeholder="Food & Staples" /></Field>
            <Field label="Tagline"><TextInput value={form.tagline} onChange={(e) => set('tagline', e.target.value)} /></Field>
            <Field label="Tagline (Bangla)"><TextInput value={form.taglineBn} onChange={(e) => set('taglineBn', e.target.value)} /></Field>
            <Field label="Brand filter value" hint="Product.brand match"><TextInput value={form.brand} onChange={(e) => set('brand', e.target.value)} /></Field>
            <Field label="Accent color"><TextInput value={form.accentColor} onChange={(e) => set('accentColor', e.target.value)} placeholder="#D8232A" /></Field>
            <Field label="Sort order" hint="Lower shows first"><TextInput type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} /></Field>
            <div className="flex items-end pb-1">
              <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} label="Active on storefront" />
            </div>
          </div>
          <Field label="Description"><TextArea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <Field label="Description (Bangla)"><TextArea rows={2} value={form.descriptionBn} onChange={(e) => set('descriptionBn', e.target.value)} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Image">
              <TextInput value={form.image} onChange={(e) => set('image', e.target.value)} placeholder="/images/…" />
              <UploadImageButton onUploaded={(url) => set('image', url)} label="Upload" className="mt-1.5" />
            </Field>
            <Field label="Hero image (slider)">
              <TextInput value={form.heroImage} onChange={(e) => set('heroImage', e.target.value)} placeholder="/images/…" />
              <UploadImageButton onUploaded={(url) => set('heroImage', url)} label="Upload" className="mt-1.5" />
            </Field>
            <Field label="Grid image (division grid)">
              <TextInput value={form.gridImage} onChange={(e) => set('gridImage', e.target.value)} placeholder="/images/…" />
              <UploadImageButton onUploaded={(url) => set('gridImage', url)} label="Upload" className="mt-1.5" />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>{saving ? 'Saving…' : 'Save division'}</Button>
          </div>
        </form>
      </Modal>

      {/* Subcategory create/edit modal */}
      <Modal open={subOpen} onClose={() => setSubOpen(false)} title={editingSub ? `Edit subcategory — ${editingSub.name}` : 'New subcategory'}>
        <form onSubmit={submitSub} className="space-y-4">
          {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" hint="Must match Product.subcategory">
              <TextInput required value={subForm.name} onChange={(e) => setSub('name', e.target.value)} />
            </Field>
            <Field label="Name (Bangla)"><TextInput value={subForm.nameBn} onChange={(e) => setSub('nameBn', e.target.value)} /></Field>
            <Field label="Sort order" hint="Lower shows first">
              <TextInput type="number" value={subForm.sortOrder} onChange={(e) => setSub('sortOrder', e.target.value)} />
            </Field>
            <div className="flex items-end pb-1">
              <Toggle checked={subForm.isActive} onChange={(v) => setSub('isActive', v)} label="Active on storefront" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSubOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={savingSub || !subForm.name.trim()}>{savingSub ? 'Saving…' : 'Save subcategory'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


