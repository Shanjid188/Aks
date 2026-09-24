import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Button, Field, Spinner, TextArea, TextInput, Toggle } from '../components/ui';
import { Save, RefreshCw, Settings as SettingsIcon, Plus } from 'lucide-react';
import type { ShippingZoneSetting, StoreSettings } from '../types';

const num = (v: unknown) => (v === undefined || v === null || v === '' ? '' : String(v));

/** Same delivery zones the API falls back to when nothing is configured. */
const DEFAULT_ZONES: ShippingZoneSetting[] = [
  { id: 'inside_dhaka', label: 'Inside Dhaka', labelBn: 'ঢাকার ভিতরে', fee: 120 },
  { id: 'sub_dhaka', label: 'Sub-Dhaka Area', labelBn: 'ঢাকার আশপাশে', fee: 150 },
  { id: 'outside_dhaka', label: 'Outside Dhaka', labelBn: 'ঢাকার বাইরে', fee: 200 },
];

export function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    api.get<{ settings: StoreSettings }>('/admin/settings')
      .then((r) => setSettings(r.settings || {}))
      .catch((e: Error) => { setError(e.message); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (key: keyof StoreSettings, value: unknown) => setSettings((s) => ({ ...s, [key]: value }));

  // Delivery & payment helpers (Admin → Settings → Delivery & Payment).
  const zones: ShippingZoneSetting[] =
    Array.isArray(settings.shippingZones) && settings.shippingZones.length > 0
      ? settings.shippingZones
      : DEFAULT_ZONES;
  const enabledMethods = Array.isArray(settings.paymentMethods) ? settings.paymentMethods : ['cod'];
  const updateZone = (index: number, patch: Partial<ShippingZoneSetting>) =>
    set('shippingZones', zones.map((z, i) => (i === index ? { ...z, ...patch } : z)));
  const toggleMethod = (id: string, on: boolean) =>
    set(
      'paymentMethods',
      on ? Array.from(new Set([...enabledMethods, id])) : enabledMethods.filter((m) => m !== id)
    );

  const save = async () => {
    setSaving(true); setError(null); setNotice(null);
    try {
      await api.put('/admin/settings', settings);
      setNotice('Settings saved.');
      load();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div><h2 className="text-lg font-black text-neutral-900">Settings</h2><p className="text-xs text-neutral-500 mt-0.5">Store-wide configuration — persisted in the database and used by invoices, receipts and the storefront.</p></div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 cursor-pointer" title="Refresh"><RefreshCw className="w-3.5 h-3.5 text-neutral-600" /></button>
          <Button onClick={save} disabled={saving}><Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Settings'}</Button>
        </div>
      </div>
      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {notice && <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{notice}</p>}
      {loading ? <Spinner /> : (
        <div className="space-y-5">
          <section className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2 mb-4"><SettingsIcon className="w-4 h-4 text-[#D8232A]" /> Store Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Store name"><TextInput value={settings.storeName || ''} onChange={(e) => set('storeName', e.target.value)} /></Field>
              <Field label="Tagline"><TextInput value={settings.storeTagline || ''} onChange={(e) => set('storeTagline', e.target.value)} /></Field>
              <Field label="Phone"><TextInput value={settings.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
              <Field label="Email"><TextInput value={settings.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
              <Field label="Website"><TextInput value={settings.website || ''} onChange={(e) => set('website', e.target.value)} /></Field>
              <Field label="Address"><TextInput value={settings.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
            </div>
          </section>
          <section className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h3 className="text-sm font-black text-neutral-900 mb-4">Commerce</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Currency"><TextInput value={settings.currency || ''} onChange={(e) => set('currency', e.target.value)} placeholder="BDT" /></Field>
              <Field label="Currency symbol"><TextInput value={settings.currencySymbol || ''} onChange={(e) => set('currencySymbol', e.target.value)} placeholder="৳" /></Field>
              <Field label="Tax/VAT (%)"><TextInput type="number" value={num(settings.taxPercent)} onChange={(e) => set('taxPercent', Number(e.target.value) || 0)} /></Field>
              <Field label="Default shipping charge"><TextInput type="number" value={num(settings.defaultShippingCharge)} onChange={(e) => set('defaultShippingCharge', Number(e.target.value) || 0)} /></Field>
              <Field label="Free shipping threshold"><TextInput type="number" value={num(settings.freeShippingThreshold)} onChange={(e) => set('freeShippingThreshold', Number(e.target.value) || 0)} /></Field>
              <Field label="Low-stock threshold"><TextInput type="number" value={num(settings.lowStockThreshold)} onChange={(e) => set('lowStockThreshold', Number(e.target.value) || 0)} /></Field>
            </div>
          </section>
          <section className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2 mb-4"><SettingsIcon className="w-4 h-4 text-[#D8232A]" /> Delivery &amp; Payment</h3>

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-neutral-700">Delivery areas &amp; charges</p>
              <Button
                variant="ghost"
                className="gap-1"
                onClick={() =>
                  set('shippingZones', [
                    ...zones,
                    { id: `zone_${Date.now().toString().slice(-6)}`, label: 'New area', labelBn: '', fee: 120 },
                  ])
                }
              >
                <Plus className="w-3.5 h-3.5" /> Add area
              </Button>
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              Checkout charges exactly these amounts — the order API recalculates the fee server-side, so a tampered
              request cannot ship an order for free.
            </p>

            <div className="mt-3 space-y-3">
              {zones.map((zone, i) => (
                <div key={zone.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_8rem_auto] gap-2 items-end rounded-xl border border-neutral-200 p-3">
                  <Field label="Name (English)">
                    <TextInput value={zone.label} onChange={(e) => updateZone(i, { label: e.target.value })} />
                  </Field>
                  <Field label="Name (Bangla)">
                    <TextInput value={zone.labelBn} onChange={(e) => updateZone(i, { labelBn: e.target.value })} />
                  </Field>
                  <Field label="Fee (BDT)">
                    <TextInput
                      type="number"
                      value={String(zone.fee)}
                      onChange={(e) => updateZone(i, { fee: Number(e.target.value) || 0 })}
                    />
                  </Field>
                  <Button
                    variant="ghost"
                    onClick={() => set('shippingZones', zones.filter((z) => z.id !== zone.id))}
                    disabled={zones.length <= 1}
                  >
                    Remove
                  </Button>
                  <p className="text-[10px] text-neutral-400 sm:col-span-4">
                    Key: <span className="font-mono">{zone.id}</span>
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3 border-t border-neutral-100 pt-4">
              <p className="text-xs font-bold text-neutral-700">Payment methods</p>
              <p className="text-[11px] text-neutral-400">
                bKash, Nagad and bank transfer are <strong>manual transfers</strong>: the customer sends the money and
                enters the transaction ID, and the order stays unpaid until you verify it. A manual method is only
                offered at checkout once its pay-to details are filled in below.
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <Toggle checked={enabledMethods.includes('cod')} onChange={(v) => toggleMethod('cod', v)} label="Cash on Delivery" />
                <Toggle checked={enabledMethods.includes('bkash')} onChange={(v) => toggleMethod('bkash', v)} label="bKash (manual)" />
                <Toggle checked={enabledMethods.includes('nagad')} onChange={(v) => toggleMethod('nagad', v)} label="Nagad (manual)" />
                <Toggle checked={enabledMethods.includes('bank')} onChange={(v) => toggleMethod('bank', v)} label="Bank transfer (manual)" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="bKash number" hint="Shown at checkout — leave empty to hide bKash">
                  <TextInput
                    value={settings.bkashNumber || ''}
                    onChange={(e) => set('bkashNumber', e.target.value)}
                    placeholder="01XXXXXXXXX (Personal)"
                  />
                </Field>
                <Field label="Nagad number" hint="Leave empty to hide Nagad">
                  <TextInput value={settings.nagadNumber || ''} onChange={(e) => set('nagadNumber', e.target.value)} placeholder="01XXXXXXXXX" />
                </Field>
                <Field label="Bank details" hint="Leave empty to hide bank transfer">
                  <TextInput
                    value={settings.bankDetails || ''}
                    onChange={(e) => set('bankDetails', e.target.value)}
                    placeholder="Bank · A/C name · A/C no · Branch"
                  />
                </Field>
              </div>
            </div>
          </section>
          <section className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2 mb-4"><SettingsIcon className="w-4 h-4 text-[#D8232A]" /> Storefront Display</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Store tagline"><TextInput value={settings.storeTagline || ''} onChange={(e) => set('storeTagline', e.target.value)} placeholder="One Mart. Many Choices." /></Field>
              <Field label="Site / logo host" hint="Used for logo/favicon URLs (/images/...)"><TextInput value={settings.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="aksmartbd.com" /></Field>
              <Field label="Logo image path" hint="e.g. /images/AKS.logo.jpg"><TextInput value={settings.storeLogo || ''} onChange={(e) => set('storeLogo', e.target.value)} placeholder="" /></Field>
              <Field label="Favicon path" hint="e.g. /AKS.logo.jpg or /favicon.ico"><TextInput value={settings.favicon || ''} onChange={(e) => set('favicon', e.target.value)} placeholder="" /></Field>
            </div>
          </section>
          <section className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2 mb-4"><SettingsIcon className="w-4 h-4 text-[#D8232A]" /> Motto / Bangla Brand Statement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Motto (English)"><TextInput value={settings.mottoEn || ''} onChange={(e) => set('mottoEn', e.target.value)} placeholder="Uncompromising in Quality, Committed to Humanity." /></Field>
              <Field label="Motto (Bangla)"><TextInput value={settings.mottoBn || ''} onChange={(e) => set('mottoBn', e.target.value)} placeholder="গুণগত মানে আপসহীন, মানবিকতায় অঙ্গীকারবদ্ধ।" /></Field>
              <Field label="Address (English)"><TextInput value={settings.address || ''} onChange={(e) => set('address', e.target.value)} placeholder="" /></Field>
              <Field label="Address (Bangla)"><TextInput value={settings.addressBn || ''} onChange={(e) => set('addressBn', e.target.value)} placeholder="Paltan Tower, 87 Purana Paltan Line, Dhaka" /></Field>
            </div>
          </section>
          <section className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h3 className="text-sm font-black text-neutral-900 mb-4">Social Links (storefront footer / contact block)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Facebook"><TextInput value={settings.facebook || ''} onChange={(e) => set('facebook', e.target.value)} placeholder="facebook.com/aksmartbd" /></Field>
              <Field label="WhatsApp"><TextInput value={settings.whatsapp || ''} onChange={(e) => set('whatsapp', e.target.value)} placeholder="+8801XXXXXXXXX" /></Field>
              <Field label="Instagram"><TextInput value={settings.instagram || ''} onChange={(e) => set('instagram', e.target.value)} placeholder="instagram.com/aksmartbd" /></Field>
              <Field label="YouTube"><TextInput value={settings.youtube || ''} onChange={(e) => set('youtube', e.target.value)} placeholder="youtube.com/@aksmartbd" /></Field>
              <Field label="TikTok"><TextInput value={settings.tiktok || ''} onChange={(e) => set('tiktok', e.target.value)} placeholder="tiktok.com/@aksmartbd" /></Field>
            </div>
          </section>
          <section className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h3 className="text-sm font-black text-neutral-900 mb-4">Search &amp; Social Preview (SEO)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Default page title" hint="Browser tab and search-result title">
                <TextInput
                  value={settings.seoTitle || ''}
                  onChange={(e) => set('seoTitle', e.target.value)}
                  placeholder="AKS Mart — Food, Craft, Home, Beauty & Print in Bangladesh"
                />
              </Field>
              <Field label="Share image (og:image)" hint="A /path or a full https:// URL">
                <TextInput
                  value={settings.ogImage || ''}
                  onChange={(e) => set('ogImage', e.target.value)}
                  placeholder="/AKS.logo.jpg"
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Default meta description" hint="Used when a page has no description of its own">
                <TextArea
                  value={settings.seoDescription || ''}
                  onChange={(e) => set('seoDescription', e.target.value)}
                />
              </Field>
            </div>
            <p className="mt-3 text-[11px] text-neutral-400">
              Product pages, content pages, robots.txt and sitemap.xml are generated automatically.
            </p>
          </section>

          <section className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h3 className="text-sm font-black text-neutral-900 mb-4">Invoice &amp; Printing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Invoice paper size"><TextInput value={settings.invoicePaperSize || ''} onChange={(e) => set('invoicePaperSize', e.target.value)} placeholder="A4" /></Field>
              <Field label="Thermal width"><TextInput value={settings.thermalWidth || ''} onChange={(e) => set('thermalWidth', e.target.value)} placeholder="80mm" /></Field>
              <Field label="Invoice footer"><TextInput value={settings.invoiceFooter || ''} onChange={(e) => set('invoiceFooter', e.target.value)} /></Field>
              <Field label="Thank-you message"><TextInput value={settings.thankYouMessage || ''} onChange={(e) => set('thankYouMessage', e.target.value)} /></Field>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
