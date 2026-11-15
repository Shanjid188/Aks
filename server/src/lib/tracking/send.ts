import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.ts';
import { CURRENCY, ga4Config, metaConfig } from './config.ts';
import type { MetaUserData } from './userData.ts';

/**
 * Delivery to Meta CAPI and the GA4 Measurement Protocol, with retries and a
 * send-once ledger (TrackingEvent). Nothing here throws: tracking must never
 * break checkout or an admin action. Logs carry event names, IDs and HTTP
 * status only — never request bodies, so no customer data reaches the logs.
 */

const RETRY_DELAYS_MS = [500, 2000];
const REQUEST_TIMEOUT_MS = 10_000;
/** Graph API error codes Meta documents as transient / throttling. */
const META_TRANSIENT_CODES = new Set([1, 2, 4, 17, 32, 341, 613]);

type SendResult = { ok: true; attempts: number } | { ok: false; attempts: number; error: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function shortError(text: string): string {
  return text.replace(/\s+/g, ' ').slice(0, 240);
}

async function postJson(
  url: string,
  body: unknown,
  isRetryable: (status: number, json: unknown) => boolean
): Promise<SendResult> {
  let lastError = 'unknown error';
  const maxAttempts = RETRY_DELAYS_MS.length + 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.ok) return { ok: true, attempts: attempt };
      const json: unknown = await res.json().catch(() => null);
      const err = (json as { error?: { code?: number; message?: string } } | null)?.error;
      lastError = shortError(`HTTP ${res.status}${err?.code ? ` code ${err.code}` : ''}${err?.message ? `: ${err.message}` : ''}`);
      if (!isRetryable(res.status, json)) return { ok: false, attempts: attempt, error: lastError };
    } catch (e) {
      lastError = shortError(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    }
    if (attempt < maxAttempts) await sleep(RETRY_DELAYS_MS[attempt - 1]);
  }
  return { ok: false, attempts: maxAttempts, error: lastError };
}

/* ─────────────────────────────── Ledger ─────────────────────────────── */

/**
 * Claim a send. Returns the ledger row id, or null when this key was already
 * claimed — the unique constraint is what makes a send happen at most once,
 * even under concurrent requests.
 */
export async function claimEvent(key: string, channel: string, eventName: string, orderId?: string | null) {
  try {
    const row = await prisma.trackingEvent.create({
      data: { key, channel, eventName, orderId: orderId ?? null },
      select: { id: true },
    });
    return row.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return null;
    throw e;
  }
}

async function settleEvent(id: string, result: SendResult) {
  await prisma.trackingEvent.update({
    where: { id },
    data: {
      status: result.ok ? 'sent' : 'failed',
      attempts: { increment: result.attempts },
      lastError: result.ok ? null : result.error,
    },
  });
}

/** Record a fact without sending anything (e.g. "the browser reported this purchase to GA4"). */
export async function recordMarker(key: string, channel: string, eventName: string, orderId: string) {
  try {
    await prisma.trackingEvent.create({ data: { key, channel, eventName, orderId, status: 'sent' } });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
  }
}

/**
 * Re-claim a failed send for a retry. Atomic: only one caller can move a row
 * from failed → pending, so a retry never sends twice.
 */
export async function reclaimFailed(id: string): Promise<boolean> {
  const res = await prisma.trackingEvent.updateMany({ where: { id, status: 'failed' }, data: { status: 'pending' } });
  return res.count === 1;
}

export async function hasEvent(key: string): Promise<boolean> {
  return (await prisma.trackingEvent.count({ where: { key } })) > 0;
}

/* ──────────────────────────── Meta CAPI ──────────────────────────── */

export interface MetaServerEvent {
  event_name: string;
  event_id: string;
  event_time: number;
  action_source: 'website';
  event_source_url?: string;
  user_data: MetaUserData;
  custom_data?: Record<string, unknown>;
}

export function metaEnabled(): boolean {
  return metaConfig() !== null;
}

/** Send one event to the Conversions API. Returns null when CAPI is not configured. */
export async function sendMetaEvent(event: MetaServerEvent): Promise<SendResult | null> {
  const cfg = metaConfig();
  if (!cfg) return null;
  const url = `${cfg.graphApiBase}/${cfg.graphApiVersion}/${encodeURIComponent(cfg.pixelId)}/events`;
  // The token travels in the POST body, never in the URL, so it cannot end up
  // in proxy or access logs.
  const body: Record<string, unknown> = { data: [event], access_token: cfg.accessToken };
  if (cfg.testEventCode) body.test_event_code = cfg.testEventCode;

  const result = await postJson(url, body, (status, json) => {
    if (status === 429 || status >= 500) return true;
    const err = (json as { error?: { code?: number; is_transient?: boolean } } | null)?.error;
    return !!err && (err.is_transient === true || META_TRANSIENT_CODES.has(Number(err.code)));
  });
  if (!result.ok) {
    console.warn(`[tracking] Meta CAPI ${event.event_name} ${event.event_id} failed after ${result.attempts} attempt(s): ${result.error}`);
  }
  return result;
}

/** Send a Meta event exactly once per ledger key. */
export async function sendMetaEventOnce(key: string, orderId: string | null, event: MetaServerEvent) {
  if (!metaEnabled()) return;
  const id = await claimEvent(key, 'meta_capi', event.event_name, orderId);
  if (!id) return;
  await deliverMetaEvent(id, event);
}

/** Send for an already-claimed ledger row and record the outcome. */
export async function deliverMetaEvent(id: string, event: MetaServerEvent): Promise<SendResult | null> {
  const result = await sendMetaEvent(event);
  // CAPI switched off between claim and send: release the row as failed.
  await settleEvent(id, result ?? { ok: false, attempts: 0, error: 'Conversions API not configured' });
  return result;
}

/* ─────────────────────── GA4 Measurement Protocol ─────────────────────── */

export interface Ga4RefundItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
}

/**
 * GA4 refund for an order. Sent once per order, and only when the browser
 * reported that order's purchase to GA4 (marker row) — otherwise the refund
 * would subtract revenue GA4 never recorded.
 */
export async function sendGa4RefundOnce(orderId: string, transactionId: string, value: number, items?: Ga4RefundItem[]) {
  const cfg = ga4Config();
  if (!cfg) return;
  if (!(await hasEvent(`ga4:purchase:${orderId}`))) return;
  const id = await claimEvent(`ga4:refund:${orderId}`, 'ga4_mp', 'refund', orderId);
  if (!id) return;
  await deliverGa4Refund(id, orderId, transactionId, value, items);
}

/** Send a GA4 refund for an already-claimed ledger row and record the outcome. */
export async function deliverGa4Refund(
  id: string,
  orderId: string,
  transactionId: string,
  value: number,
  items?: Ga4RefundItem[]
): Promise<SendResult> {
  const cfg = ga4Config();
  if (!cfg) {
    const off: SendResult = { ok: false, attempts: 0, error: 'GA4 Measurement Protocol not configured' };
    await settleEvent(id, off);
    return off;
  }
  const url = `${cfg.endpoint}?measurement_id=${encodeURIComponent(cfg.measurementId)}&api_secret=${encodeURIComponent(cfg.apiSecret)}`;
  const params: Record<string, unknown> = { currency: CURRENCY, transaction_id: transactionId, value };
  if (items?.length) params.items = items;
  const result = await postJson(
    url,
    // The refund is attributed by transaction_id; client_id only has to be stable.
    { client_id: `server.${orderId}`, events: [{ name: 'refund', params }] },
    (status) => status === 429 || status >= 500
  );
  if (!result.ok) {
    console.warn(`[tracking] GA4 refund ${transactionId} failed after ${result.attempts} attempt(s): ${result.error}`);
  }
  await settleEvent(id, result);
  return result;
}
