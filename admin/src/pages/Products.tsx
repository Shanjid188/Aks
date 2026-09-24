import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { Product } from '../types';
import { Badge, Button, EmptyState, Field, Modal, Select, Spinner, TextArea, TextInput, Toggle } from '../components/ui';
import { UploadImageButton } from '../components/ImageUpload';
import {
  Plus, Search, AlertTriangle, Package, Pencil, Trash2, Image as ImageIcon, Info, Percent,
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X, Ruler, Palette, ListTree, Sparkles,
} from 'lucide-react';

const BRANDS = ['SHUDDHO', 'AKS CRAFT', 'AKS HOME', 'AKS BEAUTY', 'AKS PRINT'];
const CATEGORIES = ['food', 'craft', 'home', 'beauty', 'print'];
const SUBCATEGORIES = [
  'Rice & Staples', 'Oils & Ghee', 'Dal & Pulses', 'Spices', 'Honey & Sweet', 'Pickles & Traditional', 'Dry Food & Essentials',
  'Nakshi Kantha', 'Paposh & Shotoronji', 'Jute Products', 'Bamboo Products', 'Handmade Bags', 'Handmade Décor',
  'Bedding & Linens', 'Curtains & Drapery', 'Cushions & Carpets', 'Kitchen Essentials', 'Storage & Organization', 'Home Décor',
  'Soap & Body Care', 'Hair Care', 'Face Care', 'Personal Care', 'Beauty Accessories',
  'Custom Apparel', 'Mugs & Drinkware', 'Cards & Stationery', 'Posters & Signage', 'Corporate & Packaging', 'Custom Design',
];

/** Subcategories grouped per category (mirrors the real product data). Drives the searchable dropdown + auto reset. */
const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  food: ['Rice & Staples', 'Oils & Ghee', 'Dal & Pulses', 'Spices', 'Honey & Sweet', 'Pickles & Traditional', 'Dry Food & Essentials'],
  craft: ['Nakshi Kantha', 'Paposh & Shotoronji', 'Jute Products', 'Bamboo Products', 'Handmade Bags', 'Handmade Décor'],
  home: ['Bedding & Linens', 'Curtains & Drapery', 'Cushions & Carpets', 'Kitchen Essentials', 'Storage & Organization', 'Home Décor'],
  beauty: ['Soap & Body Care', 'Hair Care', 'Face Care', 'Personal Care', 'Beauty Accessories'],
  print: ['Custom Apparel', 'Mugs & Drinkware', 'Cards & Stationery', 'Posters & Signage', 'Corporate & Packaging', 'Custom Design'],
};

interface FormState {
  name: string;
  sku: string;
  barcode: string;
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
  isFeatured: boolean;
  isActive: boolean;
}

const emptyForm: FormState = {
  name: '', sku: '', barcode: '', brand: 'SHUDDHO', category: 'food', subcategory: SUBCATEGORIES[0],
  price: '', originalPrice: '', discountPercent: '', rating: '4.5', reviewsCount: '0', featuredOrder: '',
  description: '', features: '', materials: '', colors: '', sizes: '', images: '', tags: '',
  fit: 'Regular Fit', pattern: 'Solid', sleeve: 'Full Sleeve', occasion: '', cushionTech: '',
  isNewArrival: false, isBestSeller: false, isTrending: false, isClearance: false, isFeatured: false, isActive: true,
};

function fromProduct(p: Product): FormState {
  return {
    name: p.name, sku: p.sku, barcode: p.barcode || '', brand: p.brand, category: p.category, subcategory: p.subcategory,
    price: String(p.price), originalPrice: p.originalPrice != null ? String(p.originalPrice) : '',
    discountPercent: p.discountPercent != null ? String(p.discountPercent) : '',
    rating: String(p.rating), reviewsCount: String(p.reviewsCount),
    featuredOrder: p.featuredOrder != null ? String(p.featuredOrder) : '',
    description: p.description, features: p.features.join('\n'),
    // Keep colors/sizes as JSON so color images and size details survive the edit round-trip.
    materials: materialsJsonToText(p.materials),
    colors: JSON.stringify(p.colors ?? [], null, 2),
    sizes: JSON.stringify(p.sizes ?? [], null, 2),
    images: p.images.join('\n'), tags: p.tags.join(', '),
    fit: p.fit || 'Regular Fit', pattern: p.pattern || 'Solid', sleeve: p.sleeve || 'Full Sleeve',
    occasion: p.occasion, cushionTech: p.cushionTech || '',
    isNewArrival: p.isNewArrival, isBestSeller: p.isBestSeller, isTrending: p.isTrending,
    isClearance: p.isClearance, isFeatured: p.isFeatured, isActive: p.isActive,
  };
}

function splitLines(v: string): string[] {
  return v.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
}

// Convert user-friendly materials text to JSON object
function materialsTextToJson(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!text.trim()) return result;
  // Try parsing as JSON first (backward compat)
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch { /* not JSON, parse as key:value lines */ }
  text.split('\n').forEach((line) => {
    line = line.trim();
    if (!line) return;
    const sep = line.indexOf(':');
    if (sep > -1) {
      const key = line.slice(0, sep).trim();
      const val = line.slice(sep + 1).trim();
      if (key) result[key] = val;
    }
  });
  return result;
}

// Convert materials JSON object to user-friendly text
function materialsJsonToText(obj: Record<string, string>): string {
  return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join('\n');
}

// Convert user-friendly colors text to JSON array
function colorsTextToJson(text: string): Array<{ name: string; hex?: string; image?: string }> {
  if (!text.trim()) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* not JSON, parse as lines */ }
  return text.split('\n').map((line) => {
    line = line.trim();
    if (!line) return null;
    const parts = line.split(/\s+(?=#)/);
    const name = parts[0] || line;
    const hex = parts[1] || undefined;
    return { name, hex };
  }).filter(Boolean) as Array<{ name: string; hex?: string }>;
}

// Convert colors JSON array to user-friendly text
function colorsJsonToText(arr: Array<{ name: string; hex?: string }>): string {
  return arr.map((c) => c.hex ? `${c.name} ${c.hex}` : c.name).join('\n');
}

// Convert user-friendly sizes text to JSON array
function sizesTextToJson(text: string): Array<{ size: string; inStock?: boolean; stockCount?: number }> {
  if (!text.trim()) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* not JSON, parse as lines */ }
  return text.split('\n').map((line) => {
    line = line.trim();
    if (!line) return null;
    const parts = line.split(/\s*-\s*/);
    const size = parts[0].trim();
    let stockCount: number | undefined;
    let inStock = true;
    if (parts[1]) {
      const numMatch = parts[1].match(/(\d+)/);
      if (numMatch) stockCount = parseInt(numMatch[1]);
      inStock = !parts[1].toLowerCase().includes('out');
    }
    return { size, inStock, stockCount };
  }).filter(Boolean) as Array<{ size: string; inStock: boolean; stockCount?: number }>;
}

// Convert sizes JSON array to user-friendly text
function sizesJsonToText(arr: Array<{ size: string; inStock?: boolean; stockCount?: number }>): string {
  return arr.map((s) => {
    if (s.stockCount != null) return `${s.size} - ${s.stockCount} in stock`;
    return s.size;
  }).join('\n');
}

function toPayload(f: FormState): Record<string, unknown> {
  const num = (v: string) => (v.trim() === '' ? null : Number(v));
  return {
    name: f.name.trim(),
    sku: f.sku.trim(),
    barcode: f.barcode.trim() || null,
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
    materials: materialsTextToJson(f.materials),
    colors: colorsTextToJson(f.colors),
    sizes: sizesTextToJson(f.sizes),
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
    isFeatured: f.isFeatured,
    isActive: f.isActive,
  };
}

/* ─────────────────────────── Form building blocks ─────────────────────────── */

/** Compact titled card used for each section of the product form. */
function FormSection({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-neutral-200">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100">
        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#D8232A]/10 text-[#D8232A] shrink-0">{icon}</span>
        <h4 className="text-xs font-black uppercase tracking-wide text-neutral-800">{title}</h4>
        {hint && <span className="ml-auto text-[10px] text-neutral-400 hidden sm:block text-right">{hint}</span>}
      </header>
      <div className="p-4 space-y-4">{children}</div>
    </section>
  );
}

/** Searchable dropdown — type to filter, click or Enter to pick, Escape to close. */
function SearchSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Always keep the current value selectable, even if it is not part of the option list.
  const opts = useMemo(() => (value && !options.includes(value) ? [value, ...options] : options), [options, value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? opts.filter((o) => o.toLowerCase().includes(q)) : opts;
  }, [opts, query]);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setQuery(''); }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg border border-neutral-300 bg-white outline-none focus:border-[#D8232A] cursor-pointer text-left"
      >
        <span className={`truncate ${value ? 'text-neutral-900' : 'text-neutral-400'}`}>{value || placeholder || 'Select…'}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full bg-white rounded-lg border border-neutral-200 shadow-xl overflow-hidden">
            <div className="p-2 border-b border-neutral-100">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filtered[0]) { onChange(filtered[0]); setOpen(false); }
                  if (e.key === 'Escape') setOpen(false);
                }}
                placeholder="Type to search…"
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-neutral-200 outline-none focus:border-[#D8232A]"
              />
            </div>
            <ul className="max-h-48 overflow-y-auto py-1">
              {filtered.length === 0 && <li className="px-3 py-2 text-[11px] text-neutral-400">No matches found</li>}
              {filtered.map((o) => (
                <li key={o}>
                  <button
                    type="button"
                    onClick={() => { onChange(o); setOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs cursor-pointer ${o === value ? 'bg-[#D8232A]/10 text-[#D8232A] font-bold' : 'text-neutral-700 hover:bg-neutral-100'}`}
                  >
                    {o}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

type SizeRow = { size: string; inStock?: boolean; stockCount?: number; [key: string]: unknown };

/** Size-wise stock editor — structured rows that serialize back into the same JSON the API expects. */
function SizeStockEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const rows = useMemo<SizeRow[]>(() => sizesTextToJson(value) as SizeRow[], [value]);

  const commit = (next: SizeRow[]) =>
    onChange(JSON.stringify(next.filter((r) => String(r.size ?? '').trim() !== '')));

  const update = (idx: number, patch: Partial<SizeRow>) =>
    commit(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const removeRow = (idx: number) => commit(rows.filter((_, i) => i !== idx));

  const addRow = () => commit([...rows, { size: '', inStock: true, stockCount: 0 }]);

  const total = rows.reduce((sum, r) => sum + (typeof r.stockCount === 'number' ? r.stockCount : 0), 0);

  return (
    <div className="rounded-lg border border-neutral-200 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-neutral-50 border-b border-neutral-200">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-neutral-500">
          <Ruler className="w-3 h-3" /> Size-wise stock
        </span>
        <span className="text-[10px] font-bold text-neutral-500">Total units: {total}</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-3 py-3 text-[11px] text-neutral-400">No sizes yet — add one below. Leave empty for products without sizes.</p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2">
              <TextInput
                value={String(r.size ?? '')}
                placeholder="e.g. 42 (L) or 1kg"
                onChange={(e) => update(i, { size: e.target.value })}
                className="flex-1 min-w-0 text-xs"
              />
              <TextInput
                type="number"
                min={0}
                value={r.stockCount != null ? String(r.stockCount) : ''}
                placeholder="Qty"
                onChange={(e) => update(i, { stockCount: e.target.value === '' ? undefined : Number(e.target.value) })}
                className="w-20 text-xs"
              />
              <Toggle checked={r.inStock !== false} onChange={(v) => update(i, { inStock: v })} />
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                title="Remove size"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={addRow}
        className="w-full flex items-center justify-center gap-1 py-2 text-[11px] font-bold text-[#D8232A] hover:bg-red-50/50 cursor-pointer border-t border-neutral-100"
      >
        <Plus className="w-3 h-3" /> Add size
      </button>
    </div>
  );
}

type ColorRow = { name: string; hex?: string; image?: string; [key: string]: unknown };

/** Color editor — readable rows (name + hex) that serialize back into the same JSON the API expects. */
function ColorEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const rows = useMemo<ColorRow[]>(() => colorsTextToJson(value) as ColorRow[], [value]);

  const commit = (next: ColorRow[]) =>
    onChange(JSON.stringify(next.filter((r) => String(r.name ?? '').trim() !== '')));

  const update = (idx: number, patch: Partial<ColorRow>) =>
    commit(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const removeRow = (idx: number) => commit(rows.filter((_, i) => i !== idx));

  const addRow = () => commit([...rows, { name: '', hex: '' }]);

  const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

  return (
    <div className="rounded-lg border border-neutral-200 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-neutral-50 border-b border-neutral-200">
        <Palette className="w-3 h-3 text-neutral-400" />
        <span className="text-[10px] font-black uppercase tracking-wide text-neutral-500">Colors</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-3 py-3 text-[11px] text-neutral-400">No colors — leave empty if the product has no color options.</p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2">
              <input
                type="color"
                value={isHex(r.hex) ? r.hex : '#ffffff'}
                onChange={(e) => update(i, { hex: e.target.value })}
                title="Pick color"
                className="w-8 h-8 rounded-lg border border-neutral-200 cursor-pointer bg-white shrink-0"
              />
              <TextInput
                value={String(r.name ?? '')}
                placeholder="Color name, e.g. Navy Blue"
                onChange={(e) => update(i, { name: e.target.value })}
                className="flex-1 min-w-0 text-xs"
              />
              <TextInput
                value={isHex(r.hex) ? r.hex : ''}
                placeholder="#1a2b3c"
                onChange={(e) => update(i, { hex: e.target.value })}
                className="w-24 text-xs"
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                title="Remove color"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={addRow}
        className="w-full flex items-center justify-center gap-1 py-2 text-[11px] font-bold text-[#D8232A] hover:bg-red-50/50 cursor-pointer border-t border-neutral-100"
      >
        <Plus className="w-3 h-3" /> Add color
      </button>
    </div>
  );
}

type MaterialRow = { name: string; val: string };

/** Material editor — name + value rows with Add More. Serializes to key:value lines. */
function MaterialEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const rows = useMemo<MaterialRow[]>(() => {
    if (!value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return Object.entries(parsed as Record<string, string>).map(([name, val]) => ({
          name: String(name ?? ''), val: String(val ?? ''),
        }));
      }
    } catch { /* fall through to line parsing */ }
    return value.split('\n').map((line) => {
      const t = line.trim();
      if (!t) return null;
      const sep = t.indexOf(':');
      if (sep > -1) return { name: t.slice(0, sep).trim(), val: t.slice(sep + 1).trim() };
      return { name: t, val: '' };
    }).filter(Boolean) as MaterialRow[];
  }, [value]);

  const commit = (next: MaterialRow[]) =>
    onChange(next.filter((r) => r.name.trim() !== '').map((r) => `${r.name.trim()}: ${r.val.trim()}`).join('\n'));
  const update = (idx: number, patch: Partial<MaterialRow>) =>
    commit(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeRow = (idx: number) => commit(rows.filter((_, i) => i !== idx));
  const addRow = () => commit([...rows, { name: '', val: '' }]);

  return (
    <div className="rounded-lg border border-neutral-200 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-neutral-50 border-b border-neutral-200">
        <ListTree className="w-3 h-3 text-neutral-400" />
        <span className="text-[10px] font-black uppercase tracking-wide text-neutral-500">Materials</span>
        <span className="ml-auto text-[10px] text-neutral-400">Name + value rows</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-3 py-3 text-[11px] text-neutral-400">No materials yet — add one below. Example: fabric / 100% Cotton.</p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2">
              <TextInput value={r.name} placeholder="Material, e.g. fabric" onChange={(e) => update(i, { name: e.target.value })} className="flex-1 min-w-0 text-xs" />
              <TextInput value={r.val} placeholder="Value, e.g. 100% Cotton" onChange={(e) => update(i, { val: e.target.value })} className="flex-1 min-w-0 text-xs" />
              <button type="button" onClick={() => removeRow(i)} className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0" title="Remove material">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={addRow} className="w-full flex items-center justify-center gap-1 py-2 text-[11px] font-bold text-[#D8232A] hover:bg-red-50/50 cursor-pointer border-t border-neutral-100">
        <Plus className="w-3 h-3" /> Add material
      </button>
    </div>
  );
}

/** Feature list editor — one simple input per row with Add More. No JSON, no special format. */
function FeatureListEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const rows = useMemo<string[]>(() => {
    if (!value.trim()) return [];
    return value.split('\n').map((s) => s.trim()).filter(Boolean);
  }, [value]);

  const commit = (next: string[]) => onChange(next.join('\n'));
  const update = (idx: number, v: string) => commit(rows.map((r, i) => (i === idx ? v : r)));
  const removeRow = (idx: number) => commit(rows.filter((_, i) => i !== idx));
  const addRow = () => commit([...rows, '']);

  return (
    <div className="rounded-lg border border-neutral-200 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-neutral-50 border-b border-neutral-200">
        <Sparkles className="w-3 h-3 text-neutral-400" />
        <span className="text-[10px] font-black uppercase tracking-wide text-neutral-500">Features</span>
        <span className="ml-auto text-[10px] text-neutral-400">One feature per row</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-3 py-3 text-[11px] text-neutral-400">No features yet — add one below.</p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2">
              <TextInput value={r} placeholder={`Feature ${i + 1}, e.g. Premium quality`} onChange={(e) => update(i, e.target.value)} className="flex-1 min-w-0 text-xs" />
              <button type="button" onClick={() => removeRow(i)} className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0" title="Remove feature">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={addRow} className="w-full flex items-center justify-center gap-1 py-2 text-[11px] font-bold text-[#D8232A] hover:bg-red-50/50 cursor-pointer border-t border-neutral-100">
        <Plus className="w-3 h-3" /> Add feature
      </button>
    </div>
  );
}

/** Tag editor — chips with a simple input. Type a tag and press Enter or comma to add. No JSON. */
function TagEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const tags = useMemo(() => splitLines(value), [value]);
  const [draft, setDraft] = useState('');

  const commit = (next: string[]) => onChange(next.join(', '));
  const removeTag = (idx: number) => commit(tags.filter((_, i) => i !== idx));
  const addDraft = () => {
    const parts = draft.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const seen = new Set(tags.map((t) => t.toLowerCase()));
    const next = [...tags];
    for (const p of parts) {
      if (!seen.has(p.toLowerCase())) { next.push(p); seen.add(p.toLowerCase()); }
    }
    commit(next);
    setDraft('');
  };

  return (
    <div className="rounded-lg border border-neutral-200 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-neutral-50 border-b border-neutral-200">
        <Plus className="w-3 h-3 text-neutral-400" />
        <span className="text-[10px] font-black uppercase tracking-wide text-neutral-500">Tags</span>
        <span className="ml-auto text-[10px] text-neutral-400">Type + Enter</span>
      </div>
      <div className="px-3 py-2 space-y-2">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t, i) => (
              <span key={`${t}-${i}`} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-neutral-100 text-[11px] font-semibold text-neutral-700">
                {t}
                <button type="button" onClick={() => removeTag(i)} className="p-0.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-red-600 cursor-pointer" title={`Remove ${t}`}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <TextInput
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addDraft(); } }}
          onBlur={addDraft}
          placeholder="e.g. organic — press Enter to add"
          className="text-xs"
        />
      </div>
    </div>
  );
}

/** Image manager — upload (prepended automatically), paste URL, reorder, make-first, delete. */
function ImageManager({ images, onUploadedUrl, onChange }: { images: string; onUploadedUrl: (url: string) => void; onChange: (v: string) => void }) {
  const list = useMemo(() => splitLines(images), [images]);
  const [url, setUrl] = useState('');

  const commit = (next: string[]) => onChange(next.join('\n'));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...list];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };
  const makeFirst = (i: number) => commit([list[i], ...list.filter((_, k) => k !== i)]);
  const remove = (i: number) => commit(list.filter((_, k) => k !== i));
  const addUrl = () => {
    const u = url.trim();
    if (!u) return;
    commit([...list.filter((x) => x !== u), u]);
    setUrl('');
  };

  return (
    <div className="space-y-3">
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1.5 py-8 border border-dashed border-neutral-300 rounded-lg text-neutral-400">
          <ImageIcon className="w-5 h-5" />
          <p className="text-[11px]">No images yet — upload from PC or paste an image URL below.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {list.map((src, i) => (
            <div key={src + i} className="relative group rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50">
              <img src={src} alt="" className="w-full h-20 object-cover" />
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-[#D8232A] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow">Card</span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 p-1 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 rounded bg-white/10 text-white hover:bg-white/25 disabled:opacity-30 cursor-pointer" title="Move left"><ChevronLeft className="w-3 h-3" /></button>
                <button type="button" onClick={() => makeFirst(i)} disabled={i === 0} className="p-1 rounded bg-white/10 text-white hover:bg-white/25 disabled:opacity-30 cursor-pointer" title="Make card image"><ChevronUp className="w-3 h-3" /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} className="p-1 rounded bg-white/10 text-white hover:bg-white/25 disabled:opacity-30 cursor-pointer" title="Move right"><ChevronRight className="w-3 h-3" /></button>
                <button type="button" onClick={() => remove(i)} className="p-1 rounded bg-white/10 text-white hover:bg-red-500 cursor-pointer" title="Remove image"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <UploadImageButton label="Upload image" onUploaded={onUploadedUrl} className="shrink-0" />
        <div className="flex flex-1 gap-2 min-w-0">
          <TextInput
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
            placeholder="or paste an image URL and press Enter…"
          />
          <Button variant="ghost" onClick={addUrl} className="shrink-0">Add</Button>
        </div>
      </div>
      <p className="text-[10px] text-neutral-400">The first image is used on the storefront product card. Uploaded images are placed at the top automatically — remember to save.</p>
    </div>
  );
}

/** Live storefront-style card preview of the product being created/edited. */
function ProductPreview({ form }: { form: FormState }) {
  const imgs = splitLines(form.images);
  const price = Number(form.price) || 0;
  const disc = form.discountPercent.trim() === '' ? 0 : Number(form.discountPercent) || 0;
  const original = form.originalPrice.trim() === '' ? 0 : Number(form.originalPrice) || 0;
  const finalPrice = disc > 0 && disc < 100 ? Math.round(price * (1 - disc / 100)) : price;
  const sizes = sizesTextToJson(form.sizes);
  const inStockCount = sizes.filter((s) => s.inStock !== false && (s.stockCount == null || s.stockCount > 0)).length;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      <div className="bg-neutral-100 flex items-center justify-center h-36">
        {imgs[0] ? <img src={imgs[0]} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-neutral-300" />}
      </div>
      <div className="p-3 space-y-2">
        <p className="text-xs font-bold text-neutral-900 leading-snug break-words">{form.name.trim() || 'Product name'}</p>
        <div className="flex flex-wrap gap-1">
          {form.brand && <Badge color="bg-neutral-100 text-neutral-600">{form.brand}</Badge>}
          {form.category && <Badge color="bg-neutral-100 text-neutral-600 capitalize">{form.category}</Badge>}
          {form.subcategory && <Badge color="bg-neutral-100 text-neutral-600">{form.subcategory}</Badge>}
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-black text-neutral-900">{finalPrice.toLocaleString()} BDT</span>
          {(original > 0 || disc > 0) && (
            <span className="text-[10px] text-neutral-400 line-through">{original > 0 ? original.toLocaleString() : price.toLocaleString()}</span>
          )}
          {disc > 0 && <Badge color="bg-red-50 text-red-600">-{disc}%</Badge>}
        </div>
        <div className="flex flex-wrap gap-1 pt-1">
          {!form.isActive && <Badge color="bg-neutral-200 text-neutral-500">Hidden</Badge>}
          {form.isNewArrival && <Badge color="bg-emerald-50 text-emerald-600">New</Badge>}
          {form.isBestSeller && <Badge color="bg-amber-50 text-amber-700">Best seller</Badge>}
          {form.isTrending && <Badge color="bg-sky-50 text-sky-700">Trending</Badge>}
          {form.isClearance && <Badge color="bg-red-50 text-red-700">Clearance</Badge>}
          {form.isFeatured && <Badge color="bg-violet-50 text-violet-700">Featured</Badge>}
        </div>
        {sizes.length > 0 && (
          <p className="text-[10px] text-neutral-400">{inStockCount} of {sizes.length} sizes in stock</p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────── Products page ─────────────────────────────── */

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
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm(fromProduct(p));
    setError(null);
    setModalOpen(true);
  };

  const set = (key: keyof FormState, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  /** Category change keeps a matching subcategory (auto-resets to the first one of the new category). */
  const setCategory = (c: string) =>
    setForm((prev) => {
      const subs = CATEGORY_SUBCATEGORIES[c] ?? SUBCATEGORIES;
      const subcategory = (CATEGORY_SUBCATEGORIES[c] ?? []).includes(prev.subcategory) ? prev.subcategory : subs[0] ?? prev.subcategory;
      return { ...prev, category: c, subcategory };
    });

  /** Uploaded image: prepend to the gallery AND keep colors[0].image (the card source) in sync. */
  const handleImageUploaded = (url: string) =>
    setForm((prev) => {
      const existingImgs = prev.images.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
      const nextImgs = existingImgs.filter((u) => u !== url);
      const images = [url, ...nextImgs].join('\n');
      let colors = prev.colors;
      try {
        const arr = JSON.parse(prev.colors);
        if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object') {
          arr[0] = { ...arr[0], image: url };
          colors = JSON.stringify(arr, null, 2);
        }
      } catch { /* colors is free-form text — leave it untouched */ }
      return { ...prev, images, colors };
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Client-side validation before touching the API
    const missing: string[] = [];
    if (!form.name.trim()) missing.push('Product name');
    if (!form.brand.trim()) missing.push('Brand');
    if (!form.category.trim()) missing.push('Category');
    if (!form.subcategory.trim()) missing.push('Subcategory');
    if (form.price.trim() === '' || Number(form.price) <= 0) missing.push('Selling price (must be > 0)');
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(', ')}`);
      return;
    }
    setSaving(true);
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

      {error && !modalOpen && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

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

      {/* ─── Product form — ERP-style sectioned dialog ─── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit — ${editing.name}` : 'New Product'}
        size="lg"
      >
        <form onSubmit={submit} className="space-y-5">
          {error && (
            <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
            {/* Left column — form sections */}
            <div className="xl:col-span-2 space-y-5">

              {/* 1 ─ Product Information */}
              <FormSection icon={<Info className="w-3.5 h-3.5" />} title="Product Information" hint="Name, identity & classification">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Product name *">
                    <TextInput
                      required
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="e.g. Premium Golchini Rice 5kg"
                    />
                  </Field>
                  <Field label="Brand *">
                    <SearchSelect value={form.brand} onChange={(v) => set('brand', v)} options={BRANDS} placeholder="Search brands…" />
                  </Field>
                  <Field label="Category *">
                    <SearchSelect value={form.category} onChange={setCategory} options={CATEGORIES} placeholder="Search categories…" />
                  </Field>
                  <Field label="Subcategory *">
                    <SearchSelect
                      value={form.subcategory}
                      onChange={(v) => set('subcategory', v)}
                      options={CATEGORY_SUBCATEGORIES[form.category] ?? SUBCATEGORIES}
                      placeholder="Search subcategories…"
                    />
                  </Field>
                  <Field label="SKU" hint={editing ? 'SKU cannot be changed' : 'Auto-generated when left empty'}>
                    <TextInput value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="auto-generated" disabled={!!editing} />
                  </Field>
                  <Field label="Barcode (EAN/UPC)" hint="Unique per product — used for POS scanning">
                    <TextInput value={form.barcode} onChange={(e) => set('barcode', e.target.value)} placeholder="e.g. 89694 00001" />
                  </Field>
                </div>
              </FormSection>

              {/* 2 ─ Product Images */}
              <FormSection icon={<ImageIcon className="w-3.5 h-3.5" />} title="Product Images" hint="Upload, paste URL, reorder or remove">
                <ImageManager images={form.images} onUploadedUrl={handleImageUploaded} onChange={(v) => set('images', v)} />
              </FormSection>

              {/* 3 ─ Pricing & Inventory */}
              <FormSection icon={<Percent className="w-3.5 h-3.5" />} title="Pricing & Inventory" hint="Selling price, discount & size-wise stock">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Field label="Selling price (BDT) *">
                    <TextInput required type="number" min={0} step="any" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Was (BDT)" hint="Crossed-out original price">
                    <TextInput type="number" min={0} step="any" value={form.originalPrice} onChange={(e) => set('originalPrice', e.target.value)} placeholder="Optional" />
                  </Field>
                  <Field label="Discount %" hint="Shown as a badge">
                    <TextInput type="number" min={0} max={100} step="any" value={form.discountPercent} onChange={(e) => set('discountPercent', e.target.value)} placeholder="0-100" />
                  </Field>
                </div>
                <p className="text-[11px] text-neutral-500 -mt-1">
                  Customers pay:{' '}
                  <span className="font-bold text-neutral-900">
                    {(() => {
                      const p = Number(form.price) || 0;
                      const d = form.discountPercent.trim() === '' ? 0 : Number(form.discountPercent) || 0;
                      return (d > 0 && d < 100 ? Math.round(p * (1 - d / 100)) : p).toLocaleString();
                    })()} BDT
                  </span>
                </p>
                <SizeStockEditor value={form.sizes} onChange={(v) => set('sizes', v)} />
              </FormSection>

              {/* 4 ─ Product Details */}
              <FormSection icon={<ListTree className="w-3.5 h-3.5" />} title="Product Details" hint="Description, features, materials & options">
                <Field label="Description">
                  <TextArea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Marketing description shown on the storefront…" className="min-h-20" />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FeatureListEditor value={form.features} onChange={(v) => set('features', v)} />
                  <TagEditor value={form.tags} onChange={(v) => set('tags', v)} />
                </div>
                <MaterialEditor value={form.materials} onChange={(v) => set('materials', v)} />
                <ColorEditor value={form.colors} onChange={(v) => set('colors', v)} />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
                  <Field label="Fit">
                    <Select value={form.fit} onChange={(e) => set('fit', e.target.value)}>
                      <option>Regular Fit</option><option>Slim Fit</option><option>Tailored Fit</option><option>Classic Fit</option>
                    </Select>
                  </Field>
                  <Field label="Pattern">
                    <Select value={form.pattern} onChange={(e) => set('pattern', e.target.value)}>
                      {['Solid', 'Embroidered', 'Printed', 'Striped', 'Checked', 'Jacquard', 'Textured'].map((o) => <option key={o}>{o}</option>)}
                    </Select>
                  </Field>
                  <Field label="Sleeve">
                    <Select value={form.sleeve} onChange={(e) => set('sleeve', e.target.value)}>
                      {['Full Sleeve', 'Half Sleeve', 'Three-Quarter', 'Sleeveless'].map((o) => <option key={o}>{o}</option>)}
                    </Select>
                  </Field>
                  <Field label="Occasion">
                    <TextInput value={form.occasion} onChange={(e) => set('occasion', e.target.value)} placeholder="e.g. Casual" />
                  </Field>
                  <Field label="CushionTech / finish">
                    <TextInput value={form.cushionTech} onChange={(e) => set('cushionTech', e.target.value)} placeholder="Optional" />
                  </Field>
                </div>
              </FormSection>

              {/* 5 ─ Marketing & Status */}
              <FormSection icon={<Sparkles className="w-3.5 h-3.5" />} title="Marketing & Status" hint="Badges, visibility & sorting">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Field label="Featured order" hint="1 = first in the homepage row (a product is featured when the toggle below is on, or when it has an order)">
                    <TextInput type="number" value={form.featuredOrder} onChange={(e) => set('featuredOrder', e.target.value)} placeholder="Auto" />
                  </Field>
                  <Field label="Rating">
                    <TextInput type="number" step="0.1" min={0} max={5} value={form.rating} onChange={(e) => set('rating', e.target.value)} />
                  </Field>
                  <Field label="Reviews count">
                    <TextInput type="number" min={0} value={form.reviewsCount} onChange={(e) => set('reviewsCount', e.target.value)} />
                  </Field>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
                  <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} label="Active (visible on storefront)" />
                  <Toggle checked={form.isNewArrival} onChange={(v) => set('isNewArrival', v)} label="New arrival" />
                  <Toggle checked={form.isBestSeller} onChange={(v) => set('isBestSeller', v)} label="Best seller" />
                  <Toggle checked={form.isTrending} onChange={(v) => set('isTrending', v)} label="Trending" />
                  <Toggle checked={form.isClearance} onChange={(v) => set('isClearance', v)} label="Clearance" />
                  <Toggle checked={form.isFeatured} onChange={(v) => set('isFeatured', v)} label="Featured on homepage" />
                </div>
              </FormSection>
            </div>

            {/* Right column — live preview (sticky) */}
            <div className="xl:sticky xl:top-2 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Storefront preview</p>
              <ProductPreview form={form} />
              <p className="text-[10px] text-neutral-400 leading-relaxed">
                This is how the product will appear on the storefront. The first image is the card image; sizes with stock drive availability.
              </p>
            </div>
          </div>

          {/* Sticky footer actions */}
          <div className="sticky bottom-0 -mx-5 -mb-5 px-5 py-3 bg-white/95 backdrop-blur border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] text-neutral-400 hidden sm:block">* Required fields</span>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Save Product'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
