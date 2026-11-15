import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Coins, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import { api } from '../../api';
import { Badge, Button, EmptyState, Field, Modal, PageHeader, Select, Spinner, TextInput } from '../../components/ui';
import { DateRangePicker, StatTile, bdt, presetRange, rangeQuery, type DateRange } from '../../components/charts';
import { useCan } from '../../lib/permission-context';
import { PERM } from '../../lib/permissions';
import type { Campaign } from './Campaigns';

interface SpendEntry {
  id: string;
  date: string;
  platform: string;
  campaignName: string;
  campaign: { id: string; name: string } | null;
  currency: string;
  amount: number;
  amountBdt: number | null;
  impressions: number | null;
  clicks: number | null;
  source: 'manual' | 'csv' | 'meta_api';
  note: string | null;
}

interface SpendResponse {
  entries: SpendEntry[];
  totalCount: number;
  totals: { spendBdt: number; impressions: number; clicks: number; rows: number; unconvertedRows: number; unconverted: { currency: string; amount: number; rows: number }[] };
}

interface FxRate {
  id: string;
  currency: string;
  rateToBdt: number;
  effectiveFrom: string;
  note: string | null;
  createdBy: string | null;
}

interface FxResponse {
  rates: FxRate[];
  spendCurrencies: { currency: string; firstSpendDate: string | null }[];
}

interface ImportPreview {
  rows: number;
  skipped: number;
  errors: { line: number; message: string }[];
  errorCount: number;
  currencies: string[];
  missingFx: string[];
  dateFrom: string | null;
  dateTo: string | null;
  campaigns: number;
  totalByCurrency: { currency: string; amount: number }[];
}

const PLATFORMS: [string, string][] = [
  ['meta', 'Meta'],
  ['google', 'Google Ads'],
  ['tiktok', 'TikTok'],
  ['other', 'Other'],
];
const SOURCE_LABEL: Record<SpendEntry['source'], string> = { manual: 'Manual', csv: 'CSV import', meta_api: 'Meta API' };
const COMMON_CURRENCIES = ['BDT', 'USD', 'EUR', 'GBP', 'INR', 'SGD', 'AED'];
const money = (currency: string, n: number) => `${currency} ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

export function AdSpendPage() {
  const can = useCan();
  const canManage = can(PERM.ADVERTISING_SPEND_MANAGE);
  const [range, setRange] = useState<DateRange>(() => presetRange('30d'));
  const [platform, setPlatform] = useState('');
  const [data, setData] = useState<SpendResponse | null>(null);
  const [fx, setFx] = useState<FxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [modal, setModal] = useState<'manual' | 'import' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, f] = await Promise.all([
        api.get<SpendResponse>(`/admin/advertising/spend?${rangeQuery(range)}${platform ? `&platform=${platform}` : ''}`),
        api.get<FxResponse>('/admin/advertising/fx-rates'),
      ]);
      setData(s);
      setFx(f);
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [range, platform]);
  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (e: SpendEntry) => {
    if (!window.confirm(`Delete ${money(e.currency, e.amount)} for “${e.campaignName}” on ${e.date}?`)) return;
    try {
      await api.del(`/admin/advertising/spend/${e.id}`);
      await load();
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    }
  };

  const done = async (text: string) => {
    setModal(null);
    setMessage({ ok: true, text });
    await load();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Advertising"
        title="Ad Spend"
        desc="Daily spend per campaign from Meta sync, CSV imports (Google Ads) and manual entries. Converted to BDT with your exchange rates."
        icon={<Coins className="w-5 h-5" />}
        actions={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            <button onClick={() => void load()} className="ml-1 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/15 bg-white/10 text-white hover:bg-white/20 cursor-pointer" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="text-xs font-semibold border border-neutral-200 rounded-lg px-2.5 py-2 bg-white">
          <option value="">All platforms</option>
          {PLATFORMS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setModal('manual')}><Plus className="w-3.5 h-3.5" /> Add spend</Button>
            <Button onClick={() => setModal('import')}><Upload className="w-3.5 h-3.5" /> Import CSV</Button>
          </div>
        )}
      </div>
      {message && (
        <p className={`text-xs font-semibold rounded-lg px-3 py-2 border ${message.ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>{message.text}</p>
      )}

      {loading && !data ? (
        <Spinner />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile label="Spend (BDT)" value={bdt(data.totals.spendBdt)} tone="bad" sub={`${data.totals.rows} day row(s)`} />
            <StatTile label="Impressions" value={data.totals.impressions.toLocaleString('en-IN')} source="ad platforms" />
            <StatTile label="Clicks" value={data.totals.clicks.toLocaleString('en-IN')} source="ad platforms" />
            <StatTile
              label="Not converted"
              value={data.totals.unconvertedRows}
              tone={data.totals.unconvertedRows ? 'bad' : 'muted'}
              sub={data.totals.unconvertedRows ? data.totals.unconverted.map((u) => money(u.currency, u.amount)).join(', ') : 'All spend converted'}
            />
          </div>
          {data.totals.unconvertedRows > 0 && (
            <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Some spend is in a currency without an exchange rate for its day. It is left out of BDT totals, ROAS and CPA until you add a rate below — rates are never assumed.
            </p>
          )}

          <section className="bg-white rounded-2xl border border-neutral-200">
            <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-neutral-900">Entries</h3>
              {data.totalCount > data.entries.length && <span className="text-[11px] text-neutral-400">Showing latest {data.entries.length} of {data.totalCount}; totals include all.</span>}
            </header>
            {data.entries.length === 0 ? (
              <EmptyState icon={<Coins className="w-6 h-6" />} title="No ad spend in this range" hint="Connect Meta in Integrations, import a Google Ads CSV, or add spend manually." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                      <th className="px-5 py-3">Date</th><th className="px-3 py-3">Campaign</th><th className="px-3 py-3">Platform</th><th className="px-3 py-3 text-right">Spend</th><th className="px-3 py-3 text-right">BDT</th><th className="px-3 py-3 text-right">Impr.</th><th className="px-3 py-3 text-right">Clicks</th><th className="px-3 py-3">Source</th><th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {data.entries.map((e) => (
                      <tr key={e.id} className="hover:bg-neutral-50/70">
                        <td className="px-5 py-2.5 whitespace-nowrap tabular-nums">{e.date}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-bold text-neutral-900">{e.campaign?.name ?? e.campaignName}</p>
                          {e.note && <p className="text-[10px] text-neutral-400">{e.note}</p>}
                        </td>
                        <td className="px-3 py-2.5">{PLATFORMS.find(([k]) => k === e.platform)?.[1] ?? e.platform}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">{money(e.currency, e.amount)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">{e.amountBdt === null ? <span className="text-amber-600 font-bold" title="No exchange rate for this day">no rate</span> : bdt(e.amountBdt)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{e.impressions?.toLocaleString('en-IN') ?? '—'}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{e.clicks?.toLocaleString('en-IN') ?? '—'}</td>
                        <td className="px-3 py-2.5"><Badge color="bg-neutral-100 text-neutral-600">{SOURCE_LABEL[e.source]}</Badge></td>
                        <td className="px-5 py-2.5 text-right">
                          {canManage && (
                            <button onClick={() => void remove(e)} className="p-1.5 rounded-lg hover:bg-red-50 cursor-pointer" title="Delete">
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}

      {fx && <FxRatesSection fx={fx} canManage={canManage} onChange={load} onError={(t) => setMessage({ ok: false, text: t })} />}

      {modal === 'manual' && <ManualSpendModal onClose={() => setModal(null)} onDone={done} />}
      {modal === 'import' && <ImportModal onClose={() => setModal(null)} onDone={done} />}
    </div>
  );
}

function FxRatesSection({ fx, canManage, onChange, onError }: { fx: FxResponse; canManage: boolean; onChange: () => Promise<void>; onError: (t: string) => void }) {
  const [form, setForm] = useState({ currency: 'USD', rateToBdt: '', effectiveFrom: today(), note: '' });
  const [busy, setBusy] = useState(false);
  const covered = (c: string, day: string | null) => fx.rates.some((r) => r.currency === c && (!day || r.effectiveFrom <= day));
  const gaps = fx.spendCurrencies.filter((s) => !covered(s.currency, s.firstSpendDate));

  const add = async () => {
    setBusy(true);
    try {
      await api.post('/admin/advertising/fx-rates', { ...form, rateToBdt: Number(form.rateToBdt) });
      setForm((f) => ({ ...f, rateToBdt: '', note: '' }));
      await onChange();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (r: FxRate) => {
    if (!window.confirm(`Delete the ${r.currency} rate from ${r.effectiveFrom}? Spend on those days becomes unconverted unless an earlier rate applies.`)) return;
    try {
      await api.del(`/admin/advertising/fx-rates/${r.id}`);
      await onChange();
    } catch (e) {
      onError((e as Error).message);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-neutral-200">
      <header className="px-5 py-4 border-b border-neutral-100">
        <h3 className="text-sm font-black text-neutral-900">Exchange rates</h3>
        <p className="text-[11px] text-neutral-400">BDT per 1 unit. A rate applies from its date until the next rate for that currency. Use the rate on your bank / card statement.</p>
      </header>
      <div className="p-5 space-y-4">
        {gaps.length > 0 && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Missing rates: {gaps.map((g) => `${g.currency} (spend from ${g.firstSpendDate})`).join(', ')}.
          </p>
        )}
        {fx.rates.length === 0 ? (
          <p className="text-xs text-neutral-400">No exchange rates yet. BDT spend needs none.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                <th className="py-2">Currency</th><th className="py-2 text-right">BDT per unit</th><th className="py-2 pl-4">From</th><th className="py-2">Note</th><th className="py-2">Added by</th><th />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {fx.rates.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 font-bold">{r.currency}</td>
                  <td className="py-2 text-right tabular-nums">{r.rateToBdt.toLocaleString('en-IN', { maximumFractionDigits: 4 })}</td>
                  <td className="py-2 pl-4 tabular-nums">{r.effectiveFrom}</td>
                  <td className="py-2 text-neutral-500">{r.note ?? ''}</td>
                  <td className="py-2 text-neutral-400">{r.createdBy ?? ''}</td>
                  <td className="py-2 text-right">
                    {canManage && (
                      <button onClick={() => void remove(r)} className="p-1.5 rounded-lg hover:bg-red-50 cursor-pointer" title="Delete">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {canManage && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
            <Field label="Currency"><TextInput value={form.currency} maxLength={3} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></Field>
            <Field label="BDT per 1 unit"><TextInput type="number" min="0" step="0.0001" value={form.rateToBdt} onChange={(e) => setForm({ ...form, rateToBdt: e.target.value })} /></Field>
            <Field label="Effective from"><TextInput type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} /></Field>
            <Field label="Note"><TextInput value={form.note} maxLength={200} placeholder="e.g. card statement" onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            <Button onClick={() => void add()} disabled={busy || !form.rateToBdt || form.currency.length !== 3}>{busy ? 'Saving…' : 'Save rate'}</Button>
          </div>
        )}
      </div>
    </section>
  );
}

function ManualSpendModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => Promise<void> }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState({ campaignId: '', date: today(), currency: 'BDT', amount: '', impressions: '', clicks: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.get<{ campaigns: Campaign[] }>('/admin/advertising/campaigns').then((r) => setCampaigns(r.campaigns)).catch((e: Error) => setError(e.message));
  }, []);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/admin/advertising/spend', { ...form, amount: Number(form.amount) });
      await onDone('Spend added.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  return (
    <Modal open onClose={onClose} title="Add spend">
      <div className="space-y-3">
        <Field label="Campaign" hint="Create campaigns under Advertising → Campaigns.">
          <Select value={form.campaignId} onChange={set('campaignId')}>
            <option value="">Choose…</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date"><TextInput type="date" value={form.date} onChange={set('date')} /></Field>
          <Field label="Currency">
            <Select value={form.currency} onChange={set('currency')}>
              {COMMON_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Amount"><TextInput type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} /></Field>
          <Field label="Impressions"><TextInput type="number" min="0" value={form.impressions} onChange={set('impressions')} /></Field>
          <Field label="Clicks"><TextInput type="number" min="0" value={form.clicks} onChange={set('clicks')} /></Field>
        </div>
        <Field label="Note"><TextInput value={form.note} maxLength={500} onChange={set('note')} placeholder="e.g. boosted post, influencer fee" /></Field>
        {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => void save()} disabled={busy || !form.campaignId || form.amount === ''}>{busy ? 'Saving…' : 'Add spend'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => Promise<void> }) {
  const [platform, setPlatform] = useState('google');
  const [currency, setCurrency] = useState('');
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (dryRun: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ preview: ImportPreview; result?: { upserted: number; campaignsCreated: number; ordersRelinked: number } }>(
        '/admin/advertising/spend/import',
        { platform, currency: currency || null, csv, dryRun }
      );
      if (dryRun) setPreview(res.preview);
      else if (res.result) {
        await onDone(`Imported ${res.result.upserted} row(s); ${res.result.campaignsCreated} campaign(s) added; ${res.result.ordersRelinked} order touch(es) linked.`);
      }
    } catch (e) {
      setError((e as Error).message);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const onFile = (file: File | undefined) => {
    setPreview(null);
    setError(null);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError('The file is larger than 5 MB');
    setFileName(file.name);
    void file.text().then(setCsv);
  };

  return (
    <Modal open onClose={onClose} title="Import ad spend (CSV)" wide>
      <div className="space-y-4">
        <div className="text-[11px] text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 space-y-1">
          <p><b>Google Ads:</b> Campaigns → Segment by Day → Download → CSV. Keep the Day, Campaign, Campaign ID, Cost, Currency code, Impr. and Clicks columns.</p>
          <p><b>Other platforms:</b> any CSV with Date/Day, Campaign and Cost/Spend columns. Importing the same days again replaces them.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Platform">
            <Select value={platform} onChange={(e) => { setPlatform(e.target.value); setPreview(null); }}>
              {PLATFORMS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Billing currency" hint="Only needed if the file has no currency column.">
            <Select value={currency} onChange={(e) => { setCurrency(e.target.value); setPreview(null); }}>
              <option value="">From the file</option>
              {COMMON_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="File">
            <label className="flex items-center gap-2 text-xs font-semibold border border-dashed border-neutral-300 rounded-lg px-3 py-2 cursor-pointer hover:bg-neutral-50">
              <Upload className="w-3.5 h-3.5" /> <span className="truncate">{fileName || 'Choose CSV…'}</span>
              <input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          </Field>
        </div>

        {preview && (
          <div className="rounded-xl border border-neutral-200 p-4 space-y-2 text-xs">
            <p className="font-black text-neutral-900">Preview</p>
            <p>
              {preview.rows} spend row(s) for {preview.campaigns} campaign(s), {preview.dateFrom} → {preview.dateTo}. Totals:{' '}
              {preview.totalByCurrency.map((t) => money(t.currency, t.amount)).join(', ') || '—'}. {preview.skipped} line(s) without spend skipped.
            </p>
            {preview.missingFx.length > 0 && (
              <p className="text-amber-800">No exchange rate yet for {preview.missingFx.join(', ')} on some days — these rows import, but stay out of BDT totals until you add rates.</p>
            )}
            {preview.errorCount > 0 && (
              <div className="text-red-700">
                <p className="font-bold">{preview.errorCount} line(s) will be skipped:</p>
                <ul className="list-disc pl-5">
                  {preview.errors.map((e) => <li key={e.line}>Line {e.line}: {e.message}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
        {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          {!preview ? (
            <Button onClick={() => void run(true)} disabled={busy || !csv}>{busy ? 'Reading…' : 'Preview'}</Button>
          ) : (
            <Button onClick={() => void run(false)} disabled={busy || preview.rows === 0}>{busy ? 'Importing…' : `Import ${preview.rows} row(s)`}</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
