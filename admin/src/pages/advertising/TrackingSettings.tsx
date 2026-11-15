import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Radar, RefreshCw, Send, XCircle } from 'lucide-react';
import { api } from '../../api';
import { Badge, Button, EmptyState, Field, PageHeader, Spinner, TextInput, Toggle, formatDate } from '../../components/ui';
import { SecretField, type SecretStatus } from '../../components/secrets';
import { useCan } from '../../lib/permission-context';
import { PERM } from '../../lib/permissions';

type Source = 'env' | 'admin' | null;

interface TrackingView {
  meta: {
    enabled: boolean;
    pixelId: string | null;
    pixelIdSource: Source;
    testEventCode: string | null;
    testEventCodeSource: Source;
    graphApiVersion: string;
    pixelActive: boolean;
    capiActive: boolean;
  };
  ga4: {
    enabled: boolean;
    measurementId: string | null;
    measurementIdSource: Source;
    tagActive: boolean;
    refundsActive: boolean;
  };
  secrets: SecretStatus[];
  encryptionConfigured: boolean;
}

interface Health {
  channels: {
    channel: 'meta_capi' | 'ga4_mp';
    last7d: { sent: number; failed: number; pending: number };
    last24h: { sent: number; failed: number; pending: number };
    lastSentAt: string | null;
    lastSentEvent: string | null;
  }[];
  browserPurchasesReported7d: number;
  failures: {
    id: string;
    channel: string;
    eventName: string;
    orderId: string | null;
    attempts: number;
    lastError: string | null;
    createdAt: string;
    updatedAt: string;
    retryable: boolean;
  }[];
}

const CHANNEL_LABEL: Record<string, string> = { meta_capi: 'Meta Conversions API', ga4_mp: 'GA4 Measurement Protocol (refunds)' };

function Status({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${on ? 'text-emerald-700' : 'text-neutral-400'}`}>
      {on ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} {label}
    </span>
  );
}

function SourceNote({ source }: { source: Source }) {
  if (source === 'env') return <Badge color="bg-sky-50 text-sky-700">From environment</Badge>;
  if (source === 'admin') return <Badge color="bg-neutral-100 text-neutral-600">Set here</Badge>;
  return null;
}

export function TrackingSettingsPage() {
  const can = useCan();
  const canManage = can(PERM.ADVERTISING_TRACKING_MANAGE);
  const [view, setView] = useState<TrackingView | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [form, setForm] = useState({ metaPixelId: '', ga4MeasurementId: '', metaTestEventCode: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const apply = (v: TrackingView) => {
    setView(v);
    // Only admin-set values are editable; environment values are shown read-only.
    setForm({
      metaPixelId: v.meta.pixelIdSource === 'admin' ? v.meta.pixelId ?? '' : '',
      ga4MeasurementId: v.ga4.measurementIdSource === 'admin' ? v.ga4.measurementId ?? '' : '',
      metaTestEventCode: v.meta.testEventCodeSource === 'admin' ? v.meta.testEventCode ?? '' : '',
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [v, h] = await Promise.all([
        api.get<TrackingView>('/admin/advertising/tracking'),
        api.get<Health>('/admin/advertising/tracking/health'),
      ]);
      apply(v);
      setHealth(h);
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    setMessage(null);
    try {
      apply(await api.put<TrackingView>('/admin/advertising/tracking', patch));
      setMessage({ ok: true, text: 'Saved. The storefront picks up changes within 5 minutes.' });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const testEvent = async () => {
    setBusyAction('test');
    setMessage(null);
    try {
      const res = await api.post<{ testEventCode: string }>('/admin/advertising/tracking/test-event');
      setMessage({ ok: true, text: `Meta accepted the test event. Check Events Manager → Test events (code ${res.testEventCode}).` });
      setHealth(await api.get<Health>('/admin/advertising/tracking/health'));
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusyAction(null);
    }
  };

  const retry = async (ids?: string[]) => {
    setBusyAction(ids ? ids[0] : 'all');
    setMessage(null);
    try {
      const r = await api.post<{ sent: number; failed: number; skipped: number }>('/admin/advertising/tracking/retry', ids ? { ids } : {});
      setMessage({ ok: r.failed === 0, text: `Retry: ${r.sent} sent, ${r.failed} failed, ${r.skipped} not retryable.` });
      setHealth(await api.get<Health>('/admin/advertising/tracking/health'));
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusyAction(null);
    }
  };

  const secretsFor = (key: string) => view?.secrets.find((s) => s.key === key);
  const onSecrets = (secrets: SecretStatus[]) => {
    // Activation flags depend on secrets; re-read the whole view.
    setView((v) => (v ? { ...v, secrets } : v));
    void api.get<TrackingView>('/admin/advertising/tracking').then(apply).catch(() => undefined);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Advertising"
        title="Tracking Settings"
        desc="Meta Pixel, Conversions API and GA4. Environment variables always win over values set here; secrets are encrypted and never shown again."
        icon={<Radar className="w-5 h-5" />}
        actions={
          <button onClick={() => void load()} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/15 bg-white/10 text-white hover:bg-white/20 cursor-pointer" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        }
      />
      {message && (
        <p className={`text-xs font-semibold rounded-lg px-3 py-2 border ${message.ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
          {message.text}
        </p>
      )}
      {loading && !view ? (
        <Spinner />
      ) : !view ? (
        <EmptyState icon={<Radar className="w-6 h-6" />} title="Tracking settings unavailable" />
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Meta */}
            <section className="bg-white rounded-2xl border border-neutral-200">
              <header className="px-5 py-4 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-black text-neutral-900">Meta Pixel &amp; Conversions API</h3>
                <Toggle checked={view.meta.enabled} onChange={(v) => canManage && void save({ metaEnabled: v })} label={view.meta.enabled ? 'Enabled' : 'Disabled'} />
              </header>
              <div className="p-5 space-y-4">
                <div className="flex flex-wrap gap-4">
                  <Status on={view.meta.pixelActive} label="Browser Pixel" />
                  <Status on={view.meta.capiActive} label="Conversions API" />
                </div>
                <Field label="Pixel / dataset ID" hint="Public ID from Events Manager — digits only.">
                  {view.meta.pixelIdSource === 'env' ? (
                    <div className="flex items-center gap-2"><TextInput value={view.meta.pixelId ?? ''} disabled /><SourceNote source="env" /></div>
                  ) : (
                    <TextInput value={form.metaPixelId} disabled={!canManage} inputMode="numeric" onChange={(e) => setForm({ ...form, metaPixelId: e.target.value })} placeholder="e.g. 123456789012345" />
                  )}
                </Field>
                <Field label="Test event code" hint="Optional. While set, server events appear under Test events only — clear it for production.">
                  {view.meta.testEventCodeSource === 'env' ? (
                    <div className="flex items-center gap-2"><TextInput value={view.meta.testEventCode ?? ''} disabled /><SourceNote source="env" /></div>
                  ) : (
                    <TextInput value={form.metaTestEventCode} disabled={!canManage} onChange={(e) => setForm({ ...form, metaTestEventCode: e.target.value })} placeholder="e.g. TEST12345" />
                  )}
                </Field>
                <p className="text-[11px] text-neutral-500">Graph API version: <b>{view.meta.graphApiVersion}</b> (server environment <code>META_GRAPH_API_VERSION</code>).</p>
                {secretsFor('META_CAPI_ACCESS_TOKEN') && (
                  <SecretField status={secretsFor('META_CAPI_ACCESS_TOKEN')!} canManage={canManage} encryptionConfigured={view.encryptionConfigured} onChange={onSecrets} />
                )}
                {canManage && (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void save({ metaPixelId: form.metaPixelId, metaTestEventCode: form.metaTestEventCode })} disabled={saving}>
                      {saving ? 'Saving…' : 'Save Meta settings'}
                    </Button>
                    <Button variant="ghost" onClick={() => void testEvent()} disabled={busyAction !== null || !view.meta.capiActive || !view.meta.testEventCode}>
                      <Send className="w-3.5 h-3.5" /> Send test event
                    </Button>
                  </div>
                )}
              </div>
            </section>

            {/* GA4 */}
            <section className="bg-white rounded-2xl border border-neutral-200">
              <header className="px-5 py-4 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-black text-neutral-900">Google Analytics 4</h3>
                <Toggle checked={view.ga4.enabled} onChange={(v) => canManage && void save({ ga4Enabled: v })} label={view.ga4.enabled ? 'Enabled' : 'Disabled'} />
              </header>
              <div className="p-5 space-y-4">
                <div className="flex flex-wrap gap-4">
                  <Status on={view.ga4.tagActive} label="GA4 tag (browser)" />
                  <Status on={view.ga4.refundsActive} label="Server refunds" />
                </div>
                <Field label="Measurement ID" hint="Admin → Data streams → Web, e.g. G-XXXXXXXXXX.">
                  {view.ga4.measurementIdSource === 'env' ? (
                    <div className="flex items-center gap-2"><TextInput value={view.ga4.measurementId ?? ''} disabled /><SourceNote source="env" /></div>
                  ) : (
                    <TextInput value={form.ga4MeasurementId} disabled={!canManage} onChange={(e) => setForm({ ...form, ga4MeasurementId: e.target.value })} placeholder="G-XXXXXXXXXX" />
                  )}
                </Field>
                {secretsFor('GA4_API_SECRET') && (
                  <SecretField status={secretsFor('GA4_API_SECRET')!} canManage={canManage} encryptionConfigured={view.encryptionConfigured} onChange={onSecrets} />
                )}
                {canManage && (
                  <Button onClick={() => void save({ ga4MeasurementId: form.ga4MeasurementId })} disabled={saving}>
                    {saving ? 'Saving…' : 'Save GA4 settings'}
                  </Button>
                )}
              </div>
            </section>
          </div>

          <section className="bg-white rounded-2xl border border-neutral-200 p-5 text-xs text-neutral-600 leading-relaxed">
            <h3 className="text-sm font-black text-neutral-900 mb-1.5">Consent</h3>
            Shoppers see a cookie banner offering only the trackers enabled above. Analytics (GA4) and Advertising (Meta)
            are separate choices; nothing loads and no event is sent before the shopper agrees. Server-side Purchase and
            refund events follow the consent recorded with each order. Campaign tags (UTM) are kept for every order;
            ad click IDs only with advertising consent.
          </section>

          {/* Health */}
          <section className="bg-white rounded-2xl border border-neutral-200">
            <header className="px-5 py-4 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-[#D8232A]" /><h3 className="text-sm font-black text-neutral-900">Server delivery health</h3></div>
              {canManage && health && health.failures.some((f) => f.retryable) && (
                <Button variant="ghost" onClick={() => void retry()} disabled={busyAction !== null}>Retry all retryable</Button>
              )}
            </header>
            {!health ? (
              <Spinner />
            ) : (
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {health.channels.map((c) => (
                    <div key={c.channel} className="rounded-xl border border-neutral-200 p-4">
                      <p className="text-xs font-black text-neutral-900">{CHANNEL_LABEL[c.channel]}</p>
                      <p className="mt-1 text-[11px] text-neutral-500">
                        Last success: {c.lastSentAt ? `${formatDate(c.lastSentAt)} (${c.lastSentEvent})` : 'never'}
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                        {(['sent', 'failed', 'pending'] as const).map((k) => (
                          <div key={k} className="rounded-lg bg-neutral-50 py-2">
                            <p className={`text-base font-black tabular-nums ${k === 'failed' && c.last7d.failed ? 'text-rose-600' : 'text-neutral-900'}`}>{c.last7d[k]}</p>
                            <p className="text-[10px] font-bold uppercase text-neutral-400">{k} · 7d</p>
                            <p className="text-[10px] text-neutral-400">{c.last24h[k]} in 24h</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-neutral-500">
                  Purchases reported to GA4 by shoppers' browsers in the last 7 days: <b>{health.browserPurchasesReported7d}</b> (browser events are not visible to the server beyond this marker).
                </p>
                {health.failures.length === 0 ? (
                  <p className="text-xs text-emerald-700 inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> No failed server sends.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] font-black uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                          <th className="py-2 pr-3">When</th><th className="py-2 pr-3">Channel</th><th className="py-2 pr-3">Event</th><th className="py-2 pr-3">Order</th><th className="py-2 pr-3">Attempts</th><th className="py-2 pr-3">Error</th><th className="py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {health.failures.map((f) => (
                          <tr key={f.id}>
                            <td className="py-2 pr-3 whitespace-nowrap text-neutral-500">{formatDate(f.updatedAt)}</td>
                            <td className="py-2 pr-3">{CHANNEL_LABEL[f.channel] ?? f.channel}</td>
                            <td className="py-2 pr-3 font-bold">{f.eventName}</td>
                            <td className="py-2 pr-3 font-mono text-[10px]">{f.orderId ?? '—'}</td>
                            <td className="py-2 pr-3">{f.attempts}</td>
                            <td className="py-2 pr-3 text-rose-700 max-w-xs truncate" title={f.lastError ?? ''}>
                              <AlertTriangle className="inline w-3 h-3 mr-1" />{f.lastError ?? 'unknown'}
                            </td>
                            <td className="py-2 text-right">
                              {canManage && f.retryable ? (
                                <Button variant="ghost" onClick={() => void retry([f.id])} disabled={busyAction !== null}>Retry</Button>
                              ) : (
                                <span className="text-[10px] text-neutral-400">{f.retryable ? '' : 'not retryable'}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
