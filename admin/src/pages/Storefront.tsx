import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Announcement, Promotion } from '../types';
import { Button, EmptyState, Field, Modal, Spinner, TextArea, TextInput, PageHeader } from '../components/ui';
import { Plus, RefreshCw, Megaphone, Tag, Trash2, Pencil } from 'lucide-react';
import { UploadImageButton } from '../components/ImageUpload';
import { adminImageUrl } from '../lib/imageUrl';
import { DEFAULT_SITE_CONTENT, SITE_CONTENT_KEYS } from '../../../src/data/siteContent';

/* Announcements manager � real DB-backed CRUD. */
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
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button disabled={saving || !form.text.trim()} onClick={save}>{saving ? 'Saving�' : 'Save'}</Button></div>
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
        <p className="text-xs text-neutral-500">Optional extra artwork for the homepage gallery above the footer — for plain image-only banners use <strong>Gallery Images</strong> in the sidebar (upload and you are done). What you set here only shows while that page is empty, in sort order, and rows without an image are skipped.</p>
        <Button onClick={() => { setError(null); setForm(blankP()); }}><Plus className="w-3.5 h-3.5" /> New Promotion</Button>
      </div>
      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {loading ? <Spinner /> : rows.length === 0 ? <EmptyState icon={<Tag className="w-6 h-6" />} title="No promotions" hint="For the gallery above the footer, add pictures in Gallery Images — no title needed." /> : (
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
            <Field label="Banner image">
              <div className="flex items-center gap-2">
                <TextInput value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="/images/uploads/…" />
                <UploadImageButton label="Upload" onUploaded={(url) => setForm({ ...form, image: url })} />
              </div>
            </Field>
            {form.image && (
              <img src={adminImageUrl(form.image)} alt="" className="h-24 w-full rounded-xl border border-neutral-200 object-cover" />
            )}
            <Field label="Link (product, category or full URL)"><TextInput value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date"><TextInput type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
              <Field label="End date"><TextInput type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sort order"><TextInput type="number" value={String(form.sortOrder)} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })} /></Field>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer justify-center pt-7"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-[#D8232A]" /> Active</label>
            </div>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button disabled={saving || !form.title.trim()} onClick={save}>{saving ? 'Saving�' : 'Save'}</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* Homepage copy manager � edits the `content.*` store settings that the
 * storefront home page reads (defaults live in src/data/siteContent.ts). Every
 * row is an English/Bangla pair: the Bangla field is the same key with `.bn`
 * appended, derived here exactly like the storefront derives it. */
interface ContentField {
  key: string;
  label: string;
  long?: boolean;
  /** Bangla list/labels that have no counterpart (e.g. search keywords). */
  single?: boolean;
}
interface ContentGroup { title: string; hint?: string; fields: ContentField[] }

/** The bundled default for each setting key � shown as a placeholder so the
 *  editor always reveals what the storefront is currently rendering. */
const CONTENT_DEFAULTS: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [field, key] of Object.entries(SITE_CONTENT_KEYS) as [keyof typeof DEFAULT_SITE_CONTENT, string][]) {
    const value = DEFAULT_SITE_CONTENT[field];
    if (typeof value === 'string') out[key] = value;
  }
  return out;
})();

/** Every setting key a field writes (English, plus Bangla unless `single`). */
const fieldKeys = (field: ContentField): string[] =>
  field.single ? [field.key] : [field.key, `${field.key}.bn`];

const HOMEPAGE_GROUPS: ContentGroup[] = [
  {
    title: 'Featured Products',
    fields: [
      { key: 'content.featured.eyebrow', label: 'Eyebrow' },
      { key: 'content.featured.title', label: 'Title' },
      { key: 'content.featured.subtitle', label: 'Subtitle', long: true },
      { key: 'content.featured.action', label: '�View all� link label' },
    ],
  },
  {
    title: 'New Arrivals',
    fields: [
      { key: 'content.newArrivals.eyebrow', label: 'Eyebrow' },
      { key: 'content.newArrivals.title', label: 'Title' },
      { key: 'content.newArrivals.subtitle', label: 'Subtitle', long: true },
      { key: 'content.newArrivals.action', label: '�View all� link label' },
    ],
  },
  {
    title: 'Best Sellers',
    fields: [
      { key: 'content.bestSellers.eyebrow', label: 'Eyebrow' },
      { key: 'content.bestSellers.title', label: 'Title' },
      { key: 'content.bestSellers.subtitle', label: 'Subtitle', long: true },
      { key: 'content.bestSellers.action', label: '�View all� link label' },
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
    title: 'Header / Navigation',
    hint: 'Menu labels. Trending searches are comma-separated keywords.',
    fields: [
      { key: 'content.header.saleChip', label: 'Sale chip (navbar)' },
      { key: 'content.header.saleChipShort', label: 'Sale chip (mobile menu)' },
      { key: 'content.header.allDepartments', label: '“All Products” label (nav + footer)' },
      { key: 'content.header.divisions', label: '�Divisions� menu label' },
      { key: 'content.header.otherDivisions', label: '�Other Divisions� heading (mega menu)' },
      { key: 'content.header.categoriesSuffix', label: 'Categories heading suffix' },
      { key: 'content.header.shopPrefix', label: '�Shop �� link prefix' },
      { key: 'content.header.trendingLabel', label: 'Trending searches heading' },
      { key: 'content.header.mobileShopBy', label: 'Mobile menu division heading' },
      { key: 'content.header.quickTrack', label: 'Top-bar link: track order' },
      { key: 'content.header.searchPlaceholder', label: 'Search box placeholder' },
      { key: 'content.header.searchPlaceholderMobile', label: 'Search placeholder (mobile)' },
      { key: 'content.header.trendingSearches', label: 'Trending searches (comma separated)', long: true, single: true },
    ],
  },
  /* Promo gallery heading — the homepage section right above the footer. */
  {
    title: 'Promo gallery heading',
    hint: 'The words above the closing homepage image gallery. The images themselves come from the Promotions tab — upload a banner image there and it appears in the grid.',
    fields: [
      { key: 'content.promoBar.tagline', label: 'Eyebrow (pill above the heading)' },
      { key: 'content.promoBar.title', label: 'Heading' },
      { key: 'content.promoBar.subtitle', label: 'Intro paragraph', long: true },
      { key: 'content.promoBar.cta', label: 'Link label (beside the heading)' },
    ],
  },
];

/* Product-listing copy (Admin → Storefront → Shop UI tab). `{name}`, `{query}`,
 * `{count}` and `{size}` are filled in by the storefront with live values. */
const SHOP_UI_GROUPS: ContentGroup[] = [
  {
    title: 'Product listing header',
    hint: 'The heading and count above the shop grid. {name}, {query} and {count} are filled in automatically.',
    fields: [
      { key: 'content.listing.allProducts', label: 'Heading: all products' },
      { key: 'content.listing.collectionSuffix', label: 'Heading: division ({name})' },
      { key: 'content.listing.searchResults', label: 'Heading: search ({query})' },
      { key: 'content.listing.productsCount', label: 'Results count ({count})' },
      { key: 'content.listing.tagline', label: 'Tagline under the heading', long: true },
    ],
  },
  {
    title: 'Sort & layout',
    fields: [
      { key: 'content.listing.filters', label: '“Filters” button (mobile)' },
      { key: 'content.listing.sortAria', label: 'Sort dropdown label (screen readers)' },
      { key: 'content.listing.sortFeatured', label: 'Sort: featured' },
      { key: 'content.listing.sortBestSellers', label: 'Sort: best sellers' },
      { key: 'content.listing.sortPriceLow', label: 'Sort: price low → high' },
      { key: 'content.listing.sortPriceHigh', label: 'Sort: price high → low' },
      { key: 'content.listing.sortRating', label: 'Sort: customer rating' },
      { key: 'content.listing.sortNewest', label: 'Sort: new arrivals' },
    ],
  },
  {
    title: 'Filters panel',
    fields: [
      { key: 'content.listing.refine', label: 'Panel heading' },
      { key: 'content.listing.reset', label: '“Reset” button' },
      { key: 'content.listing.department', label: 'Section: department' },
      { key: 'content.listing.allDivisions', label: 'Department option: all' },
      { key: 'content.listing.brands', label: 'Section: brands' },
      { key: 'content.listing.sizesFull', label: 'Section: sizes (sidebar)' },
      { key: 'content.listing.sizesShort', label: 'Section: sizes (mobile)' },
      { key: 'content.listing.deals', label: 'Checkbox: deals & on sale' },
      { key: 'content.listing.apply', label: 'Apply button ({count})' },
      { key: 'content.listing.clearAll', label: 'Clear-all button' },
    ],
  },
  {
    title: 'Active filters & empty state',
    fields: [
      { key: 'content.listing.activeFilters', label: '“Active filters” label' },
      { key: 'content.listing.sizeChip', label: 'Size chip ({size})' },
      { key: 'content.listing.onSaleChip', label: 'Sale chip' },
      { key: 'content.listing.noMatchTitle', label: 'No results: heading' },
      { key: 'content.listing.noMatchBody', label: 'No results: explanation', long: true },
    ],
  },
  {
    title: 'Product page',
    hint: 'The product detail page. {sku}, {count} and {size} are filled in automatically. The three trust badges use the trust strip copy from the Homepage tab.',
    fields: [
      { key: 'content.pdp.backToProducts', label: 'Back link' },
      { key: 'content.pdp.skuPrefix', label: 'SKU badge ({sku})' },
      { key: 'content.pdp.newArrivalBadge', label: '“New Arrival” badge' },
      { key: 'content.pdp.lowStock', label: 'Low-stock warning ({count}, {size})', long: true },
      { key: 'content.pdp.quantity', label: 'Quantity label' },
      { key: 'content.pdp.addToBag', label: 'Add-to-bag button' },
      { key: 'content.pdp.buyNow', label: 'Buy-now button' },
      { key: 'content.pdp.wishlistTitle', label: 'Wishlist button tooltip' },
      { key: 'content.pdp.pairsBadge', label: '“Pairs well with” badge' },
      { key: 'content.pdp.pairsTitle', label: '“Pairs well with” heading' },
    ],
  },
  {
    title: 'Product page: reviews & info tabs',
    fields: [
      { key: 'content.pdp.writeReview', label: '“Write a review” button' },
      { key: 'content.pdp.ratingBasedOn', label: 'Rating summary ({count})' },
      { key: 'content.pdp.writtenReviewOne', label: 'Word after the count (just 1)' },
      { key: 'content.pdp.writtenReviewMany', label: 'Word after the count (many)' },
      { key: 'content.pdp.ratingBreakdown', label: 'Star breakdown heading' },
      { key: 'content.pdp.noReviews', label: 'No reviews yet', long: true },
      { key: 'content.pdp.careHeading', label: 'Tab: care heading' },
      { key: 'content.pdp.careDefault', label: 'Tab: care text', long: true },
      { key: 'content.pdp.deliveryHeading', label: 'Tab: delivery heading' },
      { key: 'content.pdp.deliveryBody', label: 'Tab: delivery text', long: true },
      { key: 'content.pdp.returnsHeading', label: 'Tab: returns heading' },
      { key: 'content.pdp.returnsBody', label: 'Tab: returns text', long: true },
    ],
  },
  {
    title: 'Cart (drawer & page)',
    hint: '{amount} is filled with the live amount/threshold, {size} with the chosen size and {code}/{description} with the applied coupon.',
    fields: [
      { key: 'content.cart.bagTitle', label: 'Drawer heading' },
      { key: 'content.cart.pageTitle', label: 'Cart page heading' },
      { key: 'content.cart.itemOne', label: 'Item count word (just 1)' },
      { key: 'content.cart.itemMany', label: 'Item count word (many)' },
      { key: 'content.cart.emptyTitle', label: 'Empty cart heading' },
      { key: 'content.cart.emptyHint', label: 'Empty cart hint' },
      { key: 'content.cart.continue', label: 'Continue-shopping link' },
      { key: 'content.cart.freeDeliveryUnlocked', label: 'Free delivery unlocked', long: true },
      { key: 'content.cart.freeDeliveryRemaining', label: 'Amount still needed ({amount})' },
      { key: 'content.cart.freeDeliveryNote', label: 'Free-delivery note ({amount})' },
      { key: 'content.cart.promoPlaceholder', label: 'Drawer coupon placeholder' },
      { key: 'content.cart.couponPlaceholder', label: 'Cart page coupon placeholder' },
      { key: 'content.cart.applyCoupon', label: 'Apply-coupon button' },
      { key: 'content.cart.removeCoupon', label: 'Remove-coupon button' },
      { key: 'content.cart.couponActive', label: 'Applied coupon line', long: true },
      { key: 'content.cart.subtotal', label: 'Subtotal' },
      { key: 'content.cart.couponDiscount', label: 'Coupon discount row' },
      { key: 'content.cart.estimatedShipping', label: 'Estimated shipping row' },
      { key: 'content.cart.shippingFree', label: 'Shipping free value' },
      { key: 'content.cart.totalAmount', label: 'Total row (drawer)' },
      { key: 'content.cart.discountShort', label: 'Summary: discount' },
      { key: 'content.cart.deliveryShort', label: 'Summary: delivery' },
      { key: 'content.cart.deliveryFreeWord', label: 'Summary: free value' },
      { key: 'content.cart.totalShort', label: 'Summary: total' },
      { key: 'content.cart.sizeBadge', label: 'Size badge ({size})' },
      { key: 'content.cart.proceedToCheckout', label: 'Checkout button' },
      { key: 'content.cart.orderSummary', label: 'Order-summary heading' },
      { key: 'content.cart.removeItem', label: 'Remove-item tooltip' },
      { key: 'content.cart.decreaseQty', label: 'Qty minus label (screen readers)' },
      { key: 'content.cart.increaseQty', label: 'Qty plus label (screen readers)' },
    ],
  },
  {
    title: 'Checkout',
    fields: [
      { key: 'content.checkout.emptyHint', label: 'Empty checkout hint' },
      { key: 'content.checkout.deliveryHeading', label: 'Section: delivery information' },
      { key: 'content.checkout.areaPaymentHeading', label: 'Section: area & payment' },
      { key: 'content.checkout.fullName', label: 'Field: full name' },
      { key: 'content.checkout.namePlaceholder', label: 'Placeholder: full name' },
      { key: 'content.checkout.emailLabel', label: 'Field: email' },
      { key: 'content.checkout.division', label: 'Field: division' },
      { key: 'content.checkout.district', label: 'Field: district' },
      { key: 'content.checkout.postal', label: 'Field: postal code' },
      { key: 'content.checkout.note', label: 'Field: delivery instructions' },
      { key: 'content.checkout.notePlaceholder', label: 'Placeholder: instructions' },
      { key: 'content.checkout.streetPlaceholder', label: 'Placeholder: street address' },
      { key: 'content.checkout.placeOrder', label: 'Place-order button' },
      { key: 'content.checkout.placingOrder', label: 'Place-order button (sending)' },
    ],
  },
  {
    title: 'Order statuses',
    hint: 'The words a shopper sees for each status — on the confirmation page, the tracker progress bar and the status badge. Codes like pending/shipped come from the API and stay fixed.',
    fields: [
      { key: 'content.order.status.pending', label: 'pending' },
      { key: 'content.order.status.confirmed', label: 'confirmed' },
      { key: 'content.order.status.processing', label: 'processing' },
      { key: 'content.order.status.shipped', label: 'shipped' },
      { key: 'content.order.status.outForDelivery', label: 'out_for_delivery' },
      { key: 'content.order.status.delivered', label: 'delivered' },
      { key: 'content.order.status.cancelled', label: 'cancelled' },
      { key: 'content.order.status.returned', label: 'returned' },
      { key: 'content.order.status.refunded', label: 'refunded' },
    ],
  },
  {
    title: 'Order confirmation & tracking',
    hint: 'Both pages share these labels. {code} is filled with the live tracking code and {count} with the line quantity. Subtotal, Discount, Total and Free come from the Cart group.',
    fields: [
      { key: 'content.order.idLabel', label: 'Field: order ID' },
      { key: 'content.order.trackingLabel', label: 'Field: tracking code' },
      { key: 'content.order.statusLabel', label: 'Field: status' },
      { key: 'content.order.deliveryAddress', label: 'Field: delivery address' },
      { key: 'content.order.deliveryCharge', label: 'Receipt row: delivery charge' },
      { key: 'content.order.itemQty', label: 'Line quantity ({count})' },
      { key: 'content.orderSuccess.loading', label: 'Confirm: loading note' },
      { key: 'content.orderSuccess.title', label: 'Confirm: order placed' },
      { key: 'content.orderSuccess.cancelledTitle', label: 'Confirm: order cancelled' },
      { key: 'content.orderSuccess.thanks', label: 'Confirm: thank-you line' },
      { key: 'content.orderSuccess.paymentLabel', label: 'Confirm: payment label' },
      { key: 'content.orderSuccess.codNote', label: 'Confirm: cash-on-delivery note' },
      { key: 'content.orderSuccess.nextNote', label: 'Confirm: what-happens-next ({code})', long: true },
      { key: 'content.orderSuccess.trackCta', label: 'Confirm: track-order button' },
      { key: 'content.orderSuccess.notFoundTitle', label: 'Confirm: not-found heading' },
      { key: 'content.orderSuccess.notFoundBody', label: 'Confirm: not-found help text', long: true },
      { key: 'content.trackOrder.title', label: 'Tracker: page heading' },
      { key: 'content.trackOrder.subtitle', label: 'Tracker: subtitle', long: true },
      { key: 'content.trackOrder.inputPlaceholder', label: 'Tracker: input placeholder' },
      { key: 'content.trackOrder.inputAria', label: 'Tracker: input screen-reader label' },
      { key: 'content.trackOrder.search', label: 'Tracker: search button' },
      { key: 'content.trackOrder.idleHint', label: 'Tracker: empty-state hint' },
      { key: 'content.trackOrder.notFound', label: 'Tracker: not-found message', long: true },
      { key: 'content.trackOrder.closeAria', label: 'Tracker: close screen-reader label' },
      { key: 'content.trackOrder.returnedNotice', label: 'Tracker: returned notice', long: true },
      { key: 'content.trackOrder.refundedNotice', label: 'Tracker: refunded notice', long: true },
    ],
  },
];


/* Footer copy (Admin ? Storefront ? Footer tab). */
const FOOTER_GROUPS: ContentGroup[] = [
  {
    title: 'Brand & newsletter',
    hint: 'Leave a field empty to keep the built-in default. Payment badges come from Admin ? Settings ? Delivery & Payment.',
    fields: [
      { key: 'content.footer.brand', label: 'About paragraph', long: true },
      { key: 'content.footer.newsletterTitle', label: 'Newsletter heading' },
      { key: 'content.footer.newsletterNote', label: 'Newsletter note', long: true },
      { key: 'content.footer.newsletterCta', label: 'Newsletter button' },
      { key: 'content.footer.newsletterPlaceholder', label: 'Email field placeholder' },
      { key: 'content.footer.copyright', label: 'Copyright line ({year}, {store}, {site})', long: true },
    ],
  },
  {
    title: 'Footer columns',
    fields: [
      { key: 'content.footer.divisionsHeading', label: 'Divisions column heading' },
      { key: 'content.footer.followUs', label: 'Social row heading (e.g. Follow Us)' },
      { key: 'content.footer.careHeading', label: 'Support column heading' },
      { key: 'content.footer.policyHeading', label: 'Consumer Policy column heading' },
      { key: 'content.footer.infoHeading', label: 'Information column heading' },
      { key: 'content.footer.paymentsLabel', label: 'Pay-with strip heading (e.g. "Pay with")' },
      { key: 'content.footer.track', label: 'Link: track order' },
      { key: 'content.footer.guides', label: 'Link: product & fit guides' },
      { key: 'content.footer.contactHeading', label: 'Contact column heading' },
      { key: 'content.footer.contactPhoneLabel', label: 'Contact phone label' },
    ],
  },
];

/** Shared editor for one set of admin-editable copy groups. */
function ContentManager({
  groups,
  title,
  hint,
}: {
  groups: ContentGroup[];
  title: string;
  hint: string;
}) {
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
        for (const group of groups) {
          for (const field of group.fields) {
            for (const key of fieldKeys(field)) {
              const value = res.settings[key];
              next[key] = typeof value === 'string' ? value : '';
            }
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
      for (const group of groups) {
        for (const field of group.fields) {
          for (const key of fieldKeys(field)) payload[key] = values[key] ?? '';
        }
      }
      const res = await api.put<{ updated: number }>('/admin/settings', payload);
      setStatus(`Saved ${res.updated} fields � refresh the storefront to see them.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Storefront"
        title={title}
        desc={hint}
        icon={<Megaphone className="w-5 h-5" />}
        actions={
          <>
            <Button variant="ghost" onClick={load} className="gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Reload
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              Save changes
            </Button>
          </>
        }
      />

      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {status && <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{status}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <div key={group.title} className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">{group.title}</h3>
              {group.hint && <p className="text-[11px] text-neutral-400 mt-0.5">{group.hint}</p>}
            </div>
            {group.fields.map((field) => (
              <div key={field.key} className={field.single ? '' : 'grid gap-2 sm:grid-cols-2'}>
                <Field label={field.label}>
                  {field.long ? (
                    <TextArea
                      value={values[field.key] ?? ''}
                      placeholder={CONTENT_DEFAULTS[field.key] ?? ''}
                      onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  ) : (
                    <TextInput
                      value={values[field.key] ?? ''}
                      placeholder={CONTENT_DEFAULTS[field.key] ?? ''}
                      onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  )}
                </Field>
                {!field.single && (
                  <Field label="?????">
                    {field.long ? (
                      <TextArea
                        value={values[`${field.key}.bn`] ?? ''}
                        placeholder={CONTENT_DEFAULTS[`${field.key}.bn`] ?? ''}
                        onChange={(e) =>
                          setValues((prev) => ({ ...prev, [`${field.key}.bn`]: e.target.value }))
                        }
                      />
                    ) : (
                      <TextInput
                        value={values[`${field.key}.bn`] ?? ''}
                        placeholder={CONTENT_DEFAULTS[`${field.key}.bn`] ?? ''}
                        onChange={(e) =>
                          setValues((prev) => ({ ...prev, [`${field.key}.bn`]: e.target.value }))
                        }
                      />
                    )}
                  </Field>
                )}
              </div>
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
        <p className="text-sm text-amber-800">?? Go to <strong>Products</strong> ? Edit product ? turn on <strong>Featured on homepage</strong> (and optionally set a <strong>Featured order</strong>, 1 = first). Section headings/copy live in the <strong>Homepage</strong> tab.</p>
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
        <p className="text-sm text-neutral-500 mt-1">Hero slider, promotions, announcement bar and homepage copy � stored in the database.</p>
      </div>
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
        {[
          { id: 'hero', label: 'Hero Slider' },
          { id: 'announcements', label: 'Announcement Bar' },
          { id: 'featured', label: 'Featured Products' },
          { id: 'promo', label: 'Promotions' },
          { id: 'content', label: 'Homepage' },
        { id: 'shopui', label: 'Shop UI' },
        { id: 'footer', label: 'Footer' },
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
      {activeTab === 'content' && (
        <ContentManager
          groups={HOMEPAGE_GROUPS}
          title="Homepage content"
          hint="Section headings and copy for the storefront home page — English and বাংলা. Leave a field empty to keep the built-in default (shown as a placeholder)."
        />
      )}
      {activeTab === 'shopui' && (
        <ContentManager
          groups={SHOP_UI_GROUPS}
          title="Shop UI copy"
          hint="The product listing (filters, sort labels, result count, empty state) in both languages. Leave a field empty to keep the built-in default."
        />
      )}
      {activeTab === 'footer' && (
        <ContentManager
          groups={FOOTER_GROUPS}
          title="Footer content"
          hint="Footer copy in both languages. Leave a field empty to keep the built-in default (shown as a placeholder)."
        />
      )}
    </div>
  );
}

/** Hero slides live on the separate Hero Slides module � this stub links there. */
function HeroSlidesManagerStub() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6">
      <h2 className="text-lg font-semibold mb-3">Hero Slider</h2>
      <p className="text-sm text-neutral-500 mb-3">Manage hero slides from the dedicated <strong>Hero Slides</strong> module in the sidebar.</p>
      <button onClick={() => window.dispatchEvent(new CustomEvent('aks-admin-navigate', { detail: 'slides' }))} className="px-4 py-2 bg-[#D8232A] text-white text-xs font-bold rounded-lg hover:bg-[#b51c22] cursor-pointer">Open Hero Slides ?</button>
    </div>
  );
}
