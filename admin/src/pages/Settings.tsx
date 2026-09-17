import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Button, Field, Spinner, TextInput } from '../components/ui';
import { Save, RefreshCw, Settings as SettingsIcon } from 'lucide-react';
import type { StoreSettings } from '../types';

const num = (v: unknown) => (v === undefined || v === null || v === '' ? '' : String(v));

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
