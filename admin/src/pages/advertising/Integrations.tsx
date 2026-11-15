import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CircleDashed, Plug, RefreshCw } from 'lucide-react';
import { api } from '../../api';
import { Badge, Button, Field, PageHeader, Spinner, TextInput, formatDate } from '../../components/ui';
import { SecretField, type SecretStatus } from '../../components/secrets';

interface SyncRun {
  id: string;
  integration: string;
  status: 'running' | 'success' | 'partial' | 'failed';
  trigger: string;
  rowsUpserted: number;
  rowsSkipped: number;
  message: string | null;
  triggeredBy: string | null;
  startedAt: string;
  finishedAt: string | null;
}

interface IntegrationsView {
  metaAds: { accountId: string | null; accountSource: 'env' | 'admin' | null; connected: boolean; maxSyncDays: number };
  ga4: { propertyId: string | null; propertySource: 'env' | 'admin' | null; serviceAccountEmail: string | null; connected: boolean };
  secrets: SecretStatus[];
  encryptionConfigured: boolean;
  runs: SyncRun[];
}

const RUN_COLOR: Record<SyncRun['status'], string> = {
  running: 'bg-sky-50 text-sky-700',
  success: 'bg-emerald-50 text-emerald-700',
  partial: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-700',
};
const INTEGRATION_LABEL: Record<string, string> = { meta_ads: 'Meta Ads sync', csv_import: 'CSV import' };
const dayOffset = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

function Connected({ on, label }: { on: boolean; label: string }) {
  return on ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> {label}</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-400"><CircleDashed className="w-3.5 h-3.5" /> Not connected</span>
  );
}

/** Page is only reachable with advertising.integrations_manage. */
export function IntegrationsPage() {
  const [view, setView] = useState<IntegrationsView | null>(null);
  const [account, setAccount] = useState('');
  const [sync, setSync] = useState({ from: dayOffset(29), to: dayOffset(0) });
  const [property, setProperty] = useState('');
  const [busy, setBusy] = useState<'save' | 'sync' | 'ga4' | 'ga4test' | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const apply = (v: IntegrationsView) => {
    setView(v);
    setAccount(v.metaAds.accountSource === 'admin' ? `act_${v.metaAds.accountId}` : '');
    setProperty(v.ga4.propertySource === 'admin' ? (v.ga4.propertyId ?? '') : '');
  };
  const load = useCallback(async () => {
    try {
      apply(await api.get<IntegrationsView>('/admin/advertising/integrations'));
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const saveAccount = async () => {
    setBusy('save');
    setMessage(null);
    try {
      apply(await api.put<IntegrationsView>('/admin/advertising/integrations/meta-ads', { accountId: account.trim() }));
      setMessage({ ok: true, text: 'Ad account saved.' });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const runSync = async () => {
    setBusy('sync');
    setMessage(null);
    try {
      const res = await api.post<IntegrationsView & { outcome: { message: string } }>('/admin/advertising/integrations/meta-ads/sync', sync);
      apply(res);
      setMessage({ ok: true, text: res.outcome.message });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const saveProperty = async () => {
    setBusy('ga4');
    setMessage(null);
    try {
      await api.put('/admin/advertising/integrations/ga4', { propertyId: property.trim() });
      await load();
      setMessage({ ok: true, text: 'GA4 property saved.' });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const testGa4 = async () => {
    setBusy('ga4test');
    setMessage(null);
    try {
      const r = await api.post<{ sessionsLast7Days: number }>('/admin/advertising/integrations/ga4/test');
      setMessage({ ok: true, text: `Connected to GA4 — ${r.sessionsLast7Days.toLocaleString('en-IN')} sessions in the last 7 days.` });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const onSecrets = (secrets: SecretStatus[]) => {
    setView((v) => (v ? { ...v, secrets: secrets.filter((s) => s.group === 'integrations') } : v));
    void load();
  };
  const secret = (key: string) => view?.secrets.find((s) => s.key === key);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Advertising"
        title="Integrations"
        desc="Connect ad platforms to pull daily campaign spend. Tokens are stored encrypted and are never shown again."
        icon={<Plug className="w-5 h-5" />}
        actions={
          <button onClick={() => void load()} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/15 bg-white/10 text-white hover:bg-white/20 cursor-pointer" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        }
      />
      {message && (
        <p className={`text-xs font-semibold rounded-lg px-3 py-2 border ${message.ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>{message.text}</p>
      )}
      {!view ? (
        <Spinner />
      ) : (
        <>
          {!view.encryptionConfigured && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              INTEGRATION_ENCRYPTION_KEY is not set on the server, so tokens can only come from environment variables.
            </p>
          )}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <section className="bg-white rounded-2xl border border-neutral-200">
              <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-neutral-900">Meta Ads</h3>
                  <p className="text-[11px] text-neutral-400">Daily campaign spend, impressions and clicks (Insights API, read-only).</p>
                </div>
                <Connected on={view.metaAds.connected} label="Connected" />
              </header>
              <div className="p-5 space-y-4">
                <Field
                  label="Ad account ID"
                  hint={view.metaAds.accountSource === 'env' ? `Set by META_AD_ACCOUNT_ID on the server (act_${view.metaAds.accountId}).` : 'Business Settings → Ad accounts, e.g. act_1234567890.'}
                >
                  <div className="flex gap-2">
                    <TextInput value={account} onChange={(e) => setAccount(e.target.value)} placeholder="act_1234567890" disabled={view.metaAds.accountSource === 'env'} />
                    {view.metaAds.accountSource !== 'env' && (
                      <Button onClick={() => void saveAccount()} disabled={busy !== null}>{busy === 'save' ? 'Saving…' : 'Save'}</Button>
                    )}
                  </div>
                </Field>
                {secret('META_ADS_ACCESS_TOKEN') && (
                  <SecretField status={secret('META_ADS_ACCESS_TOKEN')!} canManage encryptionConfigured={view.encryptionConfigured} onChange={onSecrets} />
                )}
                <p className="text-[11px] text-neutral-500">
                  Use a System User token with the <code>ads_read</code> permission for this ad account. Spend is pulled automatically every 6 hours (last 3 days, as Meta revises recent numbers).
                </p>
                <div className="rounded-xl border border-neutral-200 p-3 space-y-2">
                  <p className="text-[11px] font-black text-neutral-900">Sync a date range</p>
                  <div className="flex flex-wrap items-end gap-2">
                    <Field label="From"><TextInput type="date" value={sync.from} onChange={(e) => setSync({ ...sync, from: e.target.value })} /></Field>
                    <Field label="To"><TextInput type="date" value={sync.to} onChange={(e) => setSync({ ...sync, to: e.target.value })} /></Field>
                    <Button onClick={() => void runSync()} disabled={busy !== null || !view.metaAds.connected}>
                      <RefreshCw className={`w-3.5 h-3.5 ${busy === 'sync' ? 'animate-spin' : ''}`} /> {busy === 'sync' ? 'Syncing…' : 'Sync now'}
                    </Button>
                  </div>
                  <p className="text-[10px] text-neutral-400">At most {view.metaAds.maxSyncDays} days per sync. Re-syncing replaces those days.</p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-neutral-200">
              <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-neutral-900">Google Ads</h3>
                  <p className="text-[11px] text-neutral-400">Spend via CSV import for now; API connection planned.</p>
                </div>
                <Badge color="bg-neutral-100 text-neutral-600">CSV</Badge>
              </header>
              <div className="p-5 space-y-2 text-xs text-neutral-600">
                <p>In Google Ads open <b>Campaigns</b>, segment by <b>Day</b>, then <b>Download → CSV</b>.</p>
                <p>Import it in <b>Advertising → Ad Spend → Import CSV</b>. Campaigns are matched by Campaign ID (add <code>utm_id=&#123;campaignid&#125;</code> to your tracking template so orders match too).</p>
              </div>
            </section>
          </div>

          <section className="bg-white rounded-2xl border border-neutral-200">
            <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-neutral-900">Google Analytics 4 (reporting)</h3>
                <p className="text-[11px] text-neutral-400">Read-only GA4 Data API for the Traffic page. Separate from the GA4 tag in Tracking Settings.</p>
              </div>
              <Connected on={view.ga4.connected} label="Connected" />
            </header>
            <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className="space-y-4">
                <Field
                  label="GA4 property ID"
                  hint={view.ga4.propertySource === 'env' ? `Set by GA4_PROPERTY_ID on the server (${view.ga4.propertyId}).` : 'GA4 → Admin → Property details → Property ID (a number, not the G- measurement ID).'}
                >
                  <div className="flex gap-2">
                    <TextInput value={property} onChange={(e) => setProperty(e.target.value)} placeholder="412345678" disabled={view.ga4.propertySource === 'env'} />
                    {view.ga4.propertySource !== 'env' && (
                      <Button onClick={() => void saveProperty()} disabled={busy !== null}>{busy === 'ga4' ? 'Saving…' : 'Save'}</Button>
                    )}
                  </div>
                </Field>
                {view.ga4.serviceAccountEmail && (
                  <div className="text-[11px] text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
                    In GA4 → Admin → <b>Property access management</b>, add <code className="break-all">{view.ga4.serviceAccountEmail}</code> with the <b>Viewer</b> role.
                  </div>
                )}
                <Button variant="ghost" onClick={() => void testGa4()} disabled={busy !== null || !view.ga4.connected}>
                  {busy === 'ga4test' ? 'Testing…' : 'Test connection'}
                </Button>
              </div>
              <div className="space-y-2">
                {secret('GA4_SERVICE_ACCOUNT_JSON') && (
                  <SecretField status={secret('GA4_SERVICE_ACCOUNT_JSON')!} canManage multiline encryptionConfigured={view.encryptionConfigured} onChange={onSecrets} />
                )}
                <p className="text-[11px] text-neutral-500">
                  Google Cloud → IAM → Service accounts → create one, enable the <b>Google Analytics Data API</b>, then Keys → Add key → JSON. Paste the whole file. It is stored encrypted and never shown again.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-neutral-200">
            <header className="px-5 py-4 border-b border-neutral-100">
              <h3 className="text-sm font-black text-neutral-900">Recent syncs & imports</h3>
            </header>
            {view.runs.length === 0 ? (
              <p className="p-5 text-xs text-neutral-400">Nothing yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                      <th className="px-5 py-3">When</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Details</th><th className="px-5 py-3">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {view.runs.map((r) => (
                      <tr key={r.id}>
                        <td className="px-5 py-2.5 whitespace-nowrap">{formatDate(r.startedAt)}</td>
                        <td className="px-3 py-2.5">{INTEGRATION_LABEL[r.integration] ?? r.integration}</td>
                        <td className="px-3 py-2.5"><Badge color={RUN_COLOR[r.status]}>{r.status}</Badge></td>
                        <td className="px-3 py-2.5 text-neutral-600">{r.message}</td>
                        <td className="px-5 py-2.5 text-neutral-400">{r.triggeredBy ?? (r.trigger === 'schedule' ? 'schedule' : '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
