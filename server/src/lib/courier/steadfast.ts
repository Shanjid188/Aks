// Steadfast Courier (Packzy) merchant API client.
//
// Verified against Steadfast's official Postman collection
// (documenter.getpostman.com/view/26211192/2sAYJ1mhpk):
//   base       https://portal.packzy.com/api/v1
//   auth       headers `Api-Key` + `Secret-Key` (JSON body, no other auth)
//   POST /create_order            → { status: 200, message, consignment: { consignment_id, invoice, tracking_code, status, … } }
//   GET  /status_by_cid/{id}      → { status: 200, delivery_status }
//   GET  /trackings_by_invoice/{invoice} → { status: 200, tracking: [{ consignment_id, … }] }
//   GET  /get_balance             → { status: 200, current_balance }
// There is no order-cancellation endpoint, so none is offered here.
//
// Webhooks are not in the Postman collection. The format below (merchant panel
// → Webhook: callback URL + auth token, sent as `Authorization: Bearer <token>`;
// JSON body with notification_type, consignment_id, invoice, status,
// tracking_message, updated_at; answer 200) is what the maintained client
// libraries agree on. Unknown fields are ignored, missing ones tolerated.
//
// Write requests are NEVER retried automatically: create_order has no
// idempotency key, so a timed-out request may already have booked the parcel.
// Steadfast refuses a second order with the same invoice, which is what makes
// a manual retry safe (see bookOrder in ./index.ts).
import crypto from 'node:crypto';
import { getSecret } from '../secrets.ts';
import {
  CourierError,
  type CourierBookingInput,
  type CourierBookingResult,
  type CourierOutcome,
  type CourierProvider,
  type CourierWebhookEvent,
} from './types.ts';

const DEFAULT_BASE = 'https://portal.packzy.com/api/v1';
const TIMEOUT_MS = 20_000;
const READ_ATTEMPTS = 3;

function baseUrl(): string {
  return (process.env.STEADFAST_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');
}

const STATUS_LABELS: Record<string, string> = {
  in_review: 'In review',
  pending: 'Pending',
  hold: 'On hold',
  delivered_approval_pending: 'Delivered (awaiting approval)',
  partial_delivered_approval_pending: 'Partially delivered (awaiting approval)',
  cancelled_approval_pending: 'Cancelled (awaiting approval)',
  unknown_approval_pending: 'Awaiting approval',
  delivered: 'Delivered',
  partial_delivered: 'Partially delivered',
  cancelled: 'Cancelled / returning',
  unknown: 'Unknown',
};

/** Pull a readable message out of a Steadfast / Laravel error body. */
function errorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const b = body as Record<string, unknown>;
  const parts: string[] = [];
  if (b.errors && typeof b.errors === 'object') {
    for (const v of Object.values(b.errors as Record<string, unknown>)) {
      if (Array.isArray(v)) parts.push(...v.map(String));
      else if (v) parts.push(String(v));
    }
  }
  if (typeof b.message === 'string' && b.message && !parts.includes(b.message)) parts.unshift(b.message);
  if (typeof b.error === 'string' && b.error) parts.push(b.error);
  const msg = parts.join(' ').trim();
  return (msg || fallback).slice(0, 300);
}

const DUPLICATE_RE = /already\s+(been\s+)?(taken|exists?)|ALREADY_EXISTS/i;

interface RawResponse {
  status: number;
  body: unknown;
}

async function send(method: 'GET' | 'POST', path: string, body?: unknown): Promise<RawResponse> {
  const apiKey = getSecret('STEADFAST_API_KEY');
  const secretKey = getSecret('STEADFAST_SECRET_KEY');
  if (!apiKey || !secretKey) throw new CourierError('Steadfast API credentials are not configured', 'config');
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const timeout = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    // The request may have reached Steadfast — callers decide whether that matters.
    throw new CourierError(timeout ? 'Steadfast did not answer in time' : 'Could not reach Steadfast', 'network', true);
  }
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null; // HTML error pages etc.
  }
  return { status: res.status, body: parsed };
}

/** Map a non-success response to a CourierError. `write` marks 5xx as ambiguous. */
function failure(r: RawResponse, write: boolean): CourierError {
  const msg = errorMessage(r.body, `Steadfast returned HTTP ${r.status}`);
  if (r.status === 401 || r.status === 403) return new CourierError(`Steadfast rejected the API credentials: ${msg}`, 'auth', false, r.status);
  if (r.status === 429) return new CourierError('Steadfast rate limit reached — try again in a minute', 'rate_limited', false, r.status);
  if (DUPLICATE_RE.test(msg)) return new CourierError(msg, 'duplicate', false, r.status);
  if (r.status >= 500) return new CourierError(msg, 'remote', write, r.status);
  if (r.status >= 400) return new CourierError(msg, 'validation', false, r.status);
  return new CourierError(msg, 'remote', write, r.status);
}

/** GET with retries on transient failures (network, 5xx, 429). Reads are safe to repeat. */
async function read(path: string): Promise<RawResponse> {
  let last: CourierError | null = null;
  for (let attempt = 1; attempt <= READ_ATTEMPTS; attempt++) {
    try {
      const r = await send('GET', path);
      if (r.status < 500 && r.status !== 429) return r;
      last = failure(r, false);
    } catch (e) {
      if (!(e instanceof CourierError) || e.kind !== 'network') throw e;
      last = e;
    }
    if (attempt < READ_ATTEMPTS) await new Promise((res) => setTimeout(res, 400 * attempt * attempt));
  }
  throw last ?? new CourierError('Steadfast request failed', 'remote');
}

function str(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return null;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export const steadfast: CourierProvider = {
  id: 'steadfast',
  label: 'Steadfast Courier',
  credentialKeys: ['STEADFAST_API_KEY', 'STEADFAST_SECRET_KEY'],

  isConfigured() {
    return !!getSecret('STEADFAST_API_KEY') && !!getSecret('STEADFAST_SECRET_KEY');
  },

  async createOrder(input: CourierBookingInput): Promise<CourierBookingResult> {
    const payload: Record<string, unknown> = {
      invoice: input.invoice,
      recipient_name: input.recipientName,
      recipient_phone: input.recipientPhone,
      recipient_address: input.recipientAddress,
      cod_amount: input.codAmount,
    };
    if (input.note) payload.note = input.note;
    if (input.itemDescription) payload.item_description = input.itemDescription;

    const r = await send('POST', '/create_order', payload); // never retried (see header)
    const body = (r.body ?? {}) as Record<string, unknown>;
    const c = (body.consignment ?? null) as Record<string, unknown> | null;
    const consignmentId = c ? str(c.consignment_id) : null;
    if (r.status >= 200 && r.status < 300 && consignmentId) {
      return {
        consignmentId,
        trackingCode: str(c!.tracking_code),
        trackingLink: str(c!.tracking_link),
        status: str(c!.status) ?? 'in_review',
      };
    }
    // A 2xx without a consignment is not a booking we can rely on.
    throw failure(r.status >= 200 && r.status < 300 ? { status: 502, body: r.body } : r, true);
  },

  async findByInvoice(invoice: string) {
    const r = await read(`/trackings_by_invoice/${encodeURIComponent(invoice)}`);
    if (r.status === 404) return null;
    if (r.status >= 400) throw failure(r, false);
    const body = r.body as Record<string, unknown> | unknown[] | null;
    const events = Array.isArray(body) ? body : Array.isArray((body as Record<string, unknown> | null)?.tracking) ? ((body as Record<string, unknown>).tracking as unknown[]) : [];
    const first = events.find((e) => e && typeof e === 'object' && str((e as Record<string, unknown>).consignment_id)) as Record<string, unknown> | undefined;
    if (!first) return null;
    const consignmentId = str(first.consignment_id)!;
    let status: string | null = null;
    try {
      status = await this.getStatus(consignmentId);
    } catch {
      status = null;
    }
    return { consignmentId, status };
  },

  async getStatus(consignmentId: string): Promise<string> {
    const r = await read(`/status_by_cid/${encodeURIComponent(consignmentId)}`);
    if (r.status >= 400) throw failure(r, false);
    const status = str((r.body as Record<string, unknown> | null)?.delivery_status);
    if (!status) throw new CourierError('Steadfast returned no delivery status', 'remote');
    return status.toLowerCase();
  },

  async getBalance(): Promise<number> {
    const r = await read('/get_balance');
    if (r.status >= 400) throw failure(r, false);
    const n = Number((r.body as Record<string, unknown> | null)?.current_balance);
    if (!Number.isFinite(n)) throw new CourierError('Steadfast returned no balance', 'remote');
    return n;
  },

  outcomeFor(status: string): CourierOutcome {
    switch (status) {
      case 'delivered':
      case 'partial_delivered':
        return 'delivered';
      case 'cancelled':
        // Final "not delivered": Steadfast sends the parcel back to the merchant.
        return 'returned';
      default:
        // in_review / pending / hold / *_approval_pending / unknown: still in transit.
        return null;
    }
  },

  statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
  },

  verifyWebhook(headers) {
    const token = getSecret('STEADFAST_WEBHOOK_TOKEN');
    if (!token) return false; // webhook disabled until a token is configured
    const raw = headers.authorization;
    const got = Array.isArray(raw) ? raw[0] : raw;
    if (!got) return false;
    return timingSafeEqualStr(got.trim(), `Bearer ${token}`);
  },

  parseWebhook(body: unknown): CourierWebhookEvent | null {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    const b = body as Record<string, unknown>;
    const consignmentId = str(b.consignment_id);
    const invoice = str(b.invoice);
    if (!consignmentId && !invoice) return null;
    const status = str(b.status) ?? str(b.delivery_status);
    return {
      type: str(b.notification_type) ?? (status ? 'delivery_status' : 'tracking_update'),
      consignmentId,
      invoice,
      status: status ? status.toLowerCase() : null,
      message: str(b.tracking_message)?.slice(0, 300) ?? null,
    };
  },
};
