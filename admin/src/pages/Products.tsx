import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Product } from '../types';
import { Badge, Button, EmptyState, Field, Modal, Select, Spinner, TextArea, TextInput, Toggle } from '../components/ui';
import { UploadImageButton } from '../components/ImageUpload';
import { Plus, Search, AlertTriangle, Package, Pencil, Trash2 } from 'lucide-react';

const BRANDS = ['SHUDDHO', 'AKS CRAFT', 'AKS HOME', 'AKS BEAUTY', 'AKS PRINT'];
const CATEGORIES = ['food', 'craft', 'home', 'beauty', 'print'];
const SUBCATEGORIES = [
  'Rice & Staples', 'Oils & Ghee', 'Dal & Pulses', 'Spices', 'Honey & Sweet', 'Pickles & Traditional', 'Dry Food & Essentials',
  'Nakshi Kantha', 'Paposh & Shotoronji', 'Jute Products', 'Bamboo Products', 'Handmade Bags', 'Handmade Décor',
  'Bedding & Linens', 'Curtains & Drapery', 'Cushions & Carpets', 'Kitchen Essentials', 'Storage & Organization', 'Home Décor',
  'Soap & Body Care', 'Hair Care', 'Face Care', 'Personal Care', 'Beauty Accessories',
  'Custom Apparel', 'Mugs & Drinkware', 'Cards & Stationery', 'Posters & Signage', 'Corporate & Packaging', 'Custom Design',
];

interface FormState {
  name: string;
  sku: string;
  brand: string;
  category: string;
  subcategory: string;
  price: string;
  originalPrice: string;
  discountPercent: string;
  rating: string;
  reviewsCount: string;
  featuredOrder: string;
  description: string;
  features: string;
  materials: string;
  colors: string;
  sizes: string;
  images: string;
  tags: string;
  fit: string;
  pattern: string;
  sleeve: string;
  occasion: string;
  cushionTech: string;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  isClearance: boolean;
  isActive: boolean;
}

const emptyForm: FormState = {
  name: '', sku: '', brand: 'SHUDDHO', category: 'food', subcategory: SUBCATEGORIES[0],
  price: '', originalPrice: '', discountPercent: '', rating: '4.5', reviewsCount: '0', featuredOrder: '',
  description: '', features: '', materials: '{}', colors: '[]', sizes: '[]', images: '', tags: '',
  fit: 'Regular Fit', pattern: 'Solid', sleeve: 'Full Sleeve', occasion: '', cushionTech: '',
  isNewArrival: false, isBestSeller: false, isTrending: false, isClearance: false, isActive: true,
};

function fromProduct(p: Product): FormState {
  return {
    name: p.name, sku: p.sku, brand: p.brand, category: p.category, subcategory: p.subcategory,
    price: String(p.price), originalPrice: p.originalPrice != null ? String(p.originalPrice) : '',
    discountPercent: p.discountPercent != null ? String(p.discountPercent) : '',
    rating: String(p.rating), reviewsCount: String(p.reviewsCount),
    featuredOrder: p.featuredOrder != null ? String(p.featuredOrder) : '',
    description: p.description, features: p.features.join('\n'),
    materials: JSON.stringify(p.materials, null, 2), colors: JSON.stringify(p.colors, null, 2),
    sizes: JSON.stringify(p.sizes, null, 2), images: p.images.join('\n'), tags: p.tags.join(', '),
    fit: p.fit || 'Regular Fit', pattern: p.pattern || 'Solid', sleeve: p.sleeve || 'Full Sleeve',
    occasion: p.occasion, cushionTech: p.cushionTech || '',
    isNewArrival: p.isNewArrival, isBestSeller: p.isBestSeller, isTrending: p.isTrending,
    isClearance: p.isClearance, isActive: p.isActive,
  };
}

function splitLines(v: string): string[] {
  return v.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
}

function toPayload(f: FormState): Record<string, unknown> {
  const num = (v: string) => (v.trim() === '' ? null : Number(v));
  return {
    name: f.name.trim(),
    sku: f.sku.trim(),
    brand: f.brand,
    category: f.category,
    subcategory: f.subcategory,
    price: Number(f.price) || 0,
    originalPrice: num(f.originalPrice),
    discountPercent: num(f.discountPercent),
    rating: Number(f.rating) || 4.5,
    reviewsCount: Number(f.reviewsCount) || 0,
    featuredOrder: num(f.featuredOrder),
    description: f.description.trim(),
    features: splitLines(f.features),
    materials: JSON.parse(f.materials || '{}'),
    colors: JSON.parse(f.colors || '[]'),
    sizes: JSON.parse(f.sizes || '[]'),
    images: splitLines(f.images),
    tags: splitLines(f.tags),
    fit: f.fit,
    pattern: f.pattern,
    sleeve: f.sleeve,
    occasion: f.occasion.trim(),
    cushionTech: f.cushionTech.trim() || null,
    isNewArrival: f.isNewArrival,
    isBestSeller: f.isBestSeller,
    isTrending: f.isTrending,
    isClearance: f.isClearance,
    isActive: f.isActive,
  };
}

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((term = '') => {
    setLoading(true);
    setError(null);
    const q = term ? `?search=${encodeURIComponent(term)}` : '?all=true';
    api
      .get<{ products: Product[] }>(`/admin/products${q}`)
      .then((res) => setProducts(res.products))
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

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm(fromProduct(p));
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
        const res = await api.patch<{ product: Product }>(`/admin/products/${editing.id}`, payload);
        setProducts((prev) => prev.map((p) => (p.id === editing.id ? res.product : p)));
      } else {
        const res = await api.post<{ product: Product }>('/admin/products', payload);
        setProducts((prev) => [res.product, ...prev]);
      }
      setModalOpen(false);
    } catch (err) {
      if (err instanceof SyntaxError) setError('Invalid JSON in one of the complex fields.');
      else setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Product) => {
    if (!window.confirm(`Hide "${p.name}" from the storefront?`)) return;
    await api.del<{ deleted: boolean }>(`/admin/products/${p.id}`);
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, isActive: false } : x)));
  };

  const lowStock = (p: Product) => p.sizes.filter((s) => s.inStock && s.stockCount <= 10).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Products</h2>
          <p className="text-xs text-neutral-400">{products.length} products in database</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(search)}
              placeholder="Search products…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-300 outline-none focus:border-[#D8232A]"
            />
          </div>
          <Button onClick={() => load(search)}>Search</Button>
          <Button onClick={openCreate} className="gap-1">
            <Plus className="w-3.5 h-3.5" /> New
          </Button>
        </div>
      </div>

      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200">
          <EmptyState icon={<Package className="w-6 h-6" />} title="No products found" hint="Try a different search term or add a new product." />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {p.images[0] && (
                        <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover bg-neutral-100 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-neutral-900 truncate max-w-xs">{p.name}</p>
                        <p className="text-[10px] text-neutral-400">{p.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-neutral-500">{p.sku}</td>
                  <td className="px-4 py-3">
                    <span className="capitalize text-neutral-700">{p.category}</span>
                    <span className="block text-neutral-400">{p.subcategory}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-neutral-900">{p.price.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {lowStock(p) > 0 ? (
                      <Badge color="bg-red-50 text-red-700">
                        <AlertTriangle className="w-3 h-3" /> {lowStock(p)} low
                      </Badge>
                    ) : (
                      <Badge color="bg-emerald-50 text-emerald-700">OK</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.isActive ? (
                      <Badge color="bg-emerald-50 text-emerald-700">Active</Badge>
                    ) : (
                      <Badge color="bg-neutral-100 text-neutral-500">Hidden</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(p)} className="p-1.5 rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 cursor-pointer" title="Hide">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit — ${editing.name}` : 'New Product'} wide>
        <form onSubmit={submit} className="space-y-5">
          {error && (
            <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Product name" hint={editing ? `slug: /${editing.slug}` : 'A slug is generated automatically'}>
              <TextInput required value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="SKU">
              <TextInput value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="auto-generated" />
            </Field>
            <Field label="Brand">
              <Select value={form.brand} onChange={(e) => set('brand', e.target.value)}>
                {BRANDS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </Select>
            </Field>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Subcategory">
              <Select value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)}>
                {SUBCATEGORIES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Price (৳)"><TextInput required type="number" value={form.price} onChange={(e) => set('price', e.target.value)} /></Field>
              <Field label="Was (৳)"><TextInput type="number" value={form.originalPrice} onChange={(e) => set('originalPrice', e.target.value)} /></Field>
              <Field label="Discount %"><TextInput type="number" value={form.discountPercent} onChange={(e) => set('discountPercent', e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Field label="Rating"><TextInput type="number" step="0.1" value={form.rating} onChange={(e) => set('rating', e.target.value)} /></Field>
              <Field label="Reviews"><TextInput type="number" value={form.reviewsCount} onChange={(e) => set('reviewsCount', e.target.value)} /></Field>
              <Field label="Order"><TextInput type="number" value={form.featuredOrder} onChange={(e) => set('featuredOrder', e.target.value)} placeholder="--" /></Field>
              <Field label="Fit">
                <Select value={form.fit} onChange={(e) => set('fit', e.target.value)}>
                  <option>Slim Fit</option>
                  <option>Regular Fit</option>
                  <option>Relaxed Fit</option>
                  <option>Tailored Fit</option>
                  <option>Classic Fit</option>
                </Select>
              </Field>
            </div>
            <Field label="Pattern">
              <Select value={form.pattern} onChange={(e) => set('pattern', e.target.value)}>
                {['Solid', 'Embroidered', 'Printed', 'Striped', 'Checked', 'Jacquard', 'Textured'].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </Field>
            <Field label="Sleeve">
              <Select value={form.sleeve} onChange={(e) => set('sleeve', e.target.value)}>
                {['Full Sleeve', 'Half Sleeve', 'Three-Quarter', 'Sleeveless'].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </Field>
            <Field label="Occasion">
              <TextInput value={form.occasion} onChange={(e) => set('occasion', e.target.value)} />
            </Field>
            <Field label="CushionTech / finish">
              <TextInput value={form.cushionTech} onChange={(e) => set('cushionTech', e.target.value)} />
            </Field>
            <Field label="Description">
              <TextArea value={form.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
            <Field label="Features (one per line)">
              <TextArea value={form.features} onChange={(e) => set('features', e.target.value)} />
            </Field>
            <Field label="Tags (comma / newline separated)">
              <TextArea value={form.tags} onChange={(e) => set('tags', e.target.value)} />
            </Field>
            <Field label="Images (one URL per line)" hint="Paste URLs or upload images from your PC">
              <TextArea value={form.images} onChange={(e) => set('images', e.target.value)} />
              <UploadImageButton
                className="mt-2"
                label="Upload image"
                onUploaded={(url) =>
                  set('images', form.images.trim() ? `${form.images.replace(/\s+$/, '')}\n${url}` : url)
                }
              />
            </Field>
            <Field label="Materials (JSON)" hint='e.g. {"fabric": "100% Cotton", "care": "Dry clean"}'>
              <TextArea value={form.materials} onChange={(e) => set('materials', e.target.value)} className="font-mono text-xs" />
            </Field>
            <Field label="Colors (JSON)" hint='[{"name": "...", "hex": "#000", "image": "url"}]'>
              <TextArea value={form.colors} onChange={(e) => set('colors', e.target.value)} className="font-mono text-xs" />
            </Field>
            <Field label="Sizes (JSON)" hint='[{"size": "42 (L)", "inStock": true, "stockCount": 12}]'>
              <TextArea value={form.sizes} onChange={(e) => set('sizes', e.target.value)} className="font-mono text-xs" />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-neutral-100 pt-4">
            <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} label="Active" />
            <Toggle checked={form.isBestSeller} onChange={(v) => set('isBestSeller', v)} label="Best seller" />
            <Toggle checked={form.isTrending} onChange={(v) => set('isTrending', v)} label="Trending" />
            <Toggle checked={form.isNewArrival} onChange={(v) => set('isNewArrival', v)} label="New arrival" />
            <Toggle checked={form.isClearance} onChange={(v) => set('isClearance', v)} label="Clearance" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}