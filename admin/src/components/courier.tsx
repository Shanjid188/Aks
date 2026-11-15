// Courier booking UI pieces: the per-order courier line (Shipped page, order
// detail) and the Settings → Courier section. Secrets go through the shared
// write-only SecretField; nothing here ever sees a credential value.
import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, PlugZap, RefreshCw, Truck } from 'lucide-react';
import { api } from '../api';
import type { Order } from '../types';
import { Badge, Button, Spinner, Toggle } from './ui';
import { SecretField, type SecretStatus } from './secrets';
import { PERM } from '../lib/permissions';
import { useCan } from '../lib/permission-context';

const PROVIDER_LABELS: Record<string, string> = { steadfast: 'Steadfast' };

/** Same labels as the server's Steadfast client (lib/courier/steadfast.ts). */
const STATUS_LABELS: Record<string, string> = {
  booking: 'Booking…',
  failed: 'Booking failed',
  unconfirmed: 'Unconfirmed',
  in_review: 'In review',
  pending: 'Pending',
  hold: 'On hold',
  delivered_approval_pending: 'Delivered (awaiting approval)',
  partial_delivered_approval_pending: 'Partly delivered (awaiting approval)',
  cancelled_approval_pending: 'Cancelled (awaiting approval)',
  unknown_approval_pending: 'Awaiting approval',
  delivered: 'Delivered',
  partial_delivered: 'Partly delivered',
  cancelled: 'Cancelled / returning',
  unknown: 'Unknown',
};

export function courierStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

function statusColor(status: string | null | undefined): string {
  if (!status) return 'bg-neutral-100 text-neutral-500';
  if (status === 'delivered' || status === 'partial_delivered') return 'bg-emerald-50 text-emerald-700';
  if (status === 'cancelled' || status === 'failed') return 'bg-red-50 text-red-700';
  if (status === 'hold' || status === 'unconfirmed' || status.endsWith('_approval_pending')) return 'bg-amber-50 text-amber-700';
  return 'bg-sky-50 text-sky-700';
}

/** Compact courier line for an order: provider · tracking code (link) · status, plus the last error. */
export function CourierInfo({ order, compact }: { order: Order; compact?: boolean }) {
  const booked = !!order.courierConsignmentId;
  if (!booked && !order.courierError) return null;
  const provider = PROVIDER_LABELS[order.courierProvider ?? ''] ?? order.courierProvider ?? 'Courier';
  const code = order.courierTrackingCode || order.courierConsignmentId;
  return (
    <div className={compact ? 'mt-0.5 space-y-0.5' : 'space-y-1'}>
      {booked && (
        <p className="flex flex-wrap items-center gap-1 text-[10px] text-neutral-500">
          <Truck className="w-3 h-3 text-neutral-400" />
          <span className="font-bold">{provider}</span>
          {order.courierTrackingLink ? (
            <a href={order.courierTrackingLink} target="_blank" rel="noreferrer" className="font-mono text-sky-700 hover:underline inline-flex items-center gap-0.5">
              {code} <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ) : (
            <span className="font-mono">{code}</span>
          )}
          <Badge color={statusColor(order.courierStatus)}>{courierStatusLabel(order.courierStatus)}</Badge>
          {!compact && order.courierCodAmount != null && <span>· COD BDT {Number(order.courierCodAmount).toLocaleString('en-IN')}</span>}
        </p>
      )}
      {order.courierError && (
        <p className="text-[10px] font-semibold text-red-700 max-w-xs" title={order.courierError}>
          {compact && order.courierError.length > 110 ? `${order.courierError.slice(0, 110)}…` : order.courierError}
        </p>
      )}
    </div>
  );
}

interface CourierConfig {
  enabled: boolean;
  provider: string;
  configured: boolean;
  active: boolean;
  providers: { id: string; label: string; credentialKeys: string[] }[];
  encryptionConfigured: boolean;
  secrets: SecretStatus[];
  webhookPath: string;
  lastSync: { at: string | null; result: string | null } | null;
  bookedInTransit: number;
}

function apiOrigin(): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined) || '';
  try {
    if (/^https?:\/\//.test(base)) return new URL(base).origin;
  } catch {
    /* fall through */
  }
  return window.location.origin;
}

/** Settings → Courier: enable booking, store credentials, test, sync. */
export function CourierSettingsSection() {
  const can = useCan();
  const canManage = can(PERM.SETTINGS_MANAGE);
  const [cfg, setCfg] = useState<CourierConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api.get<CourierConfig>('/admin/courier/config').then(setCfg).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setError(null); setNotice(null);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };

  const setEnabled = (enabled: boolean) =>
    run('toggle', async () => { setCfg(await api.put<CourierConfig>('/admin/courier/config', { enabled })); });
  const test = () =>
    run('test', async () => {
      const r = await api.post<{ provider: string; balance: number }>('/admin/courier/test');
      setNotice(`Connected to ${r.provider}. Current balance: BDT ${Number(r.balance).toLocaleString('en-IN')}.`);
    });
  const sync = () =>
    run('sync', async () => {
      const r = await api.post<{ result: string }>('/admin/courier/sync');
      setNotice(`Status sync: ${r.result}.`);
      load();
    });
  const onSecrets = (secrets: SecretStatus[]) => {
    setCfg((c) => (c ? { ...c, secrets: secrets.filter((s) => s.group === 'courier') } : c));
    load();
  };

  const providerLabel = cfg?.providers.find((p) => p.id === cfg.provider)?.label ?? 'Courier';
  const webhookUrl = cfg ? `${apiOrigin()}${cfg.webhookPath}` : '';

  return (
    <section className="bg-white rounded-2xl border border-neutral-200 p-5">
      <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2 mb-1"><Truck className="w-4 h-4 text-[#D8232A]" /> Courier Booking</h3>
      <p className="text-[11px] text-neutral-500 mb-4">
        When on, the গাড়ি button on the Shipped page books the parcel with {providerLabel} automatically. When off, or while credentials are missing, it keeps doing the manual handoff.
      </p>
      {error && <p className="mb-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {notice && <p className="mb-3 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{notice}</p>}
      {!cfg ? (error ? null : <Spinner small />) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {canManage ? (
              <Toggle checked={cfg.enabled} onChange={(v) => void setEnabled(v)} label={`Book with ${providerLabel} on গাড়ি`} />
            ) : (
              <span className="text-xs font-bold text-neutral-700">Booking {cfg.enabled ? 'enabled' : 'disabled'}</span>
            )}
            {cfg.active ? (
              <Badge color="bg-emerald-50 text-emerald-700">Live</Badge>
            ) : cfg.enabled && !cfg.configured ? (
              <Badge color="bg-amber-50 text-amber-700">Credentials missing: manual handoff</Badge>
            ) : (
              <Badge color="bg-neutral-100 text-neutral-500">Off: manual handoff</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {cfg.secrets.map((s) => (
              <SecretField key={s.key} status={s} canManage={canManage} encryptionConfigured={cfg.encryptionConfigured} onChange={onSecrets} />
            ))}
          </div>

          <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3.5 text-[11px] text-neutral-600 space-y-1">
            <p className="font-bold text-neutral-800">Status updates</p>
            <p>
              In the {providerLabel} merchant panel → Webhook, set the callback URL to{' '}
              <code className="font-mono bg-white border border-neutral-200 rounded px-1 py-0.5 break-all">{webhookUrl}</code>{' '}
              and the auth token to the webhook token above. Statuses are also checked every 30 minutes.
            </p>
            <p>
              {cfg.bookedInTransit} booked parcel{cfg.bookedInTransit === 1 ? '' : 's'} in transit
              {cfg.lastSync?.at ? ` · last sync ${new Date(cfg.lastSync.at).toLocaleString('en-GB')}${cfg.lastSync.result ? ` (${cfg.lastSync.result})` : ''}` : ''}.
            </p>
            <p>Delivered parcels move the order to Delivered; payment stays as it is until you confirm the COD collection.</p>
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void test()} disabled={!!busy || !cfg.configured}>
                <PlugZap className="w-3.5 h-3.5" /> {busy === 'test' ? 'Testing…' : 'Test connection'}
              </Button>
              <Button variant="secondary" onClick={() => void sync()} disabled={!!busy || !cfg.configured}>
                <RefreshCw className={`w-3.5 h-3.5 ${busy === 'sync' ? 'animate-spin' : ''}`} /> Sync statuses now
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
