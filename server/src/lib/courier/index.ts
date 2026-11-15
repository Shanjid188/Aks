// Courier booking + status synchronisation.
//
// Flow: Packaging → Pack (order becomes `shipped`) → Shipped page → গাড়ি.
// When courier booking is enabled and credentials are set, গাড়ি calls
// bookOrder(): the order is sent to the courier and the consignment is stored;
// `dispatchedAt` is set exactly as the manual handoff does. Otherwise the
// button keeps doing the manual handoff (admin UI decides via courierState()).
//
// Status comes back two ways — the courier's webhook and a scheduled poll —
// and both go through applyCourierStatus(), which moves the order with the
// shared changeOrderStatus() transition. Payment is never touched: COD
// collection is reconciled by an admin.
import { prisma } from '../prisma.ts';
import { logAudit } from '../audit.ts';
import type { AdminPayload } from '../auth.ts';
import { parseJsonSafe } from '../../utils/json.ts';
import { changeOrderStatus, ITEM_INCLUDE, StatusChangeError } from '../orderStatus.ts';
import { steadfast } from './steadfast.ts';
import { CourierError, type CourierBookingInput, type CourierBookingResult, type CourierProvider } from './types.ts';

export { CourierError } from './types.ts';

/** Registered couriers. Add Pathao / RedX here once their clients exist. */
export const PROVIDERS: Record<string, CourierProvider> = { [steadfast.id]: steadfast };

export const COURIER_SETTING_KEYS = ['courierEnabled', 'courierProvider'] as const;
const DEFAULT_PROVIDER = steadfast.id;

/** Order statuses in which the parcel is with the courier and may still move. */
const IN_TRANSIT = ['shipped', 'out_for_delivery'];
/** A `booking` claim older than this is treated as abandoned (crashed process). */
const STALE_BOOKING_MS = 2 * 60_000;

export function getProvider(id: string | null | undefined): CourierProvider | null {
  return (id && PROVIDERS[id]) || null;
}

export async function courierSettings(): Promise<{ enabled: boolean; providerId: string }> {
  const rows = await prisma.storeSetting.findMany({ where: { key: { in: [...COURIER_SETTING_KEYS] } } });
  const map = new Map(rows.map((r) => [r.key, parseJsonSafe<unknown>(r.value, r.value)]));
  const providerId = typeof map.get('courierProvider') === 'string' ? String(map.get('courierProvider')) : DEFAULT_PROVIDER;
  return { enabled: map.get('courierEnabled') === true, providerId: PROVIDERS[providerId] ? providerId : DEFAULT_PROVIDER };
}

export interface CourierState {
  enabled: boolean;
  providerId: string;
  provider: CourierProvider;
  configured: boolean;
  /** Booking is live: enabled AND credentials present. */
  active: boolean;
}

export async function courierState(): Promise<CourierState> {
  const s = await courierSettings();
  const provider = getProvider(s.providerId) ?? steadfast;
  const configured = provider.isConfigured();
  return { enabled: s.enabled, providerId: provider.id, provider, configured, active: s.enabled && configured };
}

/** Thrown by the service with the HTTP status the route should answer with. */
export class CourierRequestError extends Error {
  constructor(readonly status: number, message: string, readonly code: string) {
    super(message);
  }
}

/* ───────────────────────────── Booking input ───────────────────────────── */

/** Normalise a Bangladeshi mobile number to 01XXXXXXXXX, or null if it is not one. */
export function normalizeBdPhone(raw: unknown): string | null {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.startsWith('880')) d = d.slice(2); // +8801XXXXXXXXX → 01XXXXXXXXX
  if (d.length === 10 && d.startsWith('1')) d = `0${d}`;
  return /^01[3-9]\d{8}$/.test(d) ? d : null;
}

/**
 * What the rider collects. COD orders: the outstanding due (whole taka).
 * Every other payment method (bKash, Nagad, card, bank, …) is prepaid → 0.
 * Paid/refunded orders never collect anything.
 */
export function courierCodAmount(o: { paymentMethod: string; paymentStatus: string; dueAmount: number }): number {
  if (String(o.paymentMethod).toLowerCase() !== 'cod') return 0;
  if (o.paymentStatus === 'paid' || o.paymentStatus === 'refunded') return 0;
  const due = Number(o.dueAmount);
  return Number.isFinite(due) && due > 0 ? Math.round(due) : 0;
}

/** Couriers strip/choke on some characters; keep text on one clean line. */
function clean(v: unknown): string {
  return String(v ?? '')
    .replace(/[<>;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface BookableOrder {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerNote: string | null;
  paymentMethod: string;
  paymentStatus: string;
  dueAmount: number;
  items: { productName: string; quantity: number }[];
}

/** Build and validate the courier request for an order. Throws CourierError('validation'). */
export function buildBookingInput(order: BookableOrder): CourierBookingInput {
  const addr = parseJsonSafe<Record<string, unknown>>(order.customerAddress, {});
  const invoice = order.orderNumber.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 100);
  const recipientName = clean(order.customerName || addr.fullName).slice(0, 100);
  const recipientPhone = normalizeBdPhone(order.customerPhone || addr.phone);

  const seen = new Set<string>();
  const recipientAddress = [addr.streetAddress ?? addr.address, addr.thana, addr.district]
    .map(clean)
    .filter((p) => p && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()))
    .join(', ');

  const problems: string[] = [];
  if (!invoice) problems.push('order number is missing');
  if (!recipientName) problems.push('customer name is missing');
  if (!recipientPhone) problems.push('customer phone is not a valid Bangladeshi mobile number (01XXXXXXXXX)');
  if (!recipientAddress) problems.push('delivery address is missing');
  if (problems.length) {
    throw new CourierError(`Cannot book this order: ${problems.join('; ')}. Fix the customer details and try again.`, 'validation');
  }

  const note = [addr.deliveryInstructions, order.customerNote].map(clean).filter(Boolean).join(' | ').slice(0, 480);
  const itemDescription = order.items
    .map((i) => `${clean(i.productName)} x${i.quantity}`)
    .join(', ')
    .slice(0, 255);

  return {
    invoice,
    recipientName,
    recipientPhone: recipientPhone!,
    recipientAddress,
    codAmount: courierCodAmount(order),
    ...(note ? { note } : {}),
    ...(itemDescription ? { itemDescription } : {}),
  };
}

/* ───────────────────────────── Booking ───────────────────────────── */

export type BookOutcome = 'booked' | 'recovered' | 'already_booked';

/**
 * Book one order with the configured courier. Safe against double clicks and
 * concurrent admins: a conditional `booking` claim lets exactly one request
 * call the courier; an order that already has a consignment is never re-sent.
 */
export async function bookOrder(orderId: string, admin: AdminPayload | null) {
  const state = await courierState();
  if (!state.active) {
    throw new CourierRequestError(409, 'Courier booking is turned off or its credentials are not set', 'courier_inactive');
  }
  const provider = state.provider;

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new CourierRequestError(404, 'Order not found', 'not_found');
  if (order.courierConsignmentId) {
    return { order: await loadOrder(orderId), outcome: 'already_booked' as BookOutcome };
  }
  if (order.status !== 'shipped') {
    throw new CourierRequestError(400, `Only shipped orders can be booked with the courier (this order is ${order.status})`, 'invalid_status');
  }
  if (order.deliveryMethod === 'pickup') {
    throw new CourierRequestError(400, 'Store-pickup orders are not sent to the courier', 'pickup_order');
  }

  let input: CourierBookingInput;
  try {
    input = buildBookingInput(order);
  } catch (e) {
    if (e instanceof CourierError) throw new CourierRequestError(422, e.message, e.kind);
    throw e;
  }

  // Claim the order: only one request may talk to the courier at a time.
  const claimed = await prisma.order.updateMany({
    where: {
      id: orderId,
      courierConsignmentId: null,
      OR: [
        { courierStatus: null },
        { courierStatus: { not: 'booking' } },
        { courierStatus: 'booking', updatedAt: { lt: new Date(Date.now() - STALE_BOOKING_MS) } },
      ],
    },
    data: { courierStatus: 'booking', courierProvider: provider.id, courierError: null },
  });
  if (claimed.count === 0) {
    const now = await prisma.order.findUnique({ where: { id: orderId }, select: { courierConsignmentId: true } });
    if (now?.courierConsignmentId) return { order: await loadOrder(orderId), outcome: 'already_booked' as BookOutcome };
    throw new CourierRequestError(409, 'A courier booking for this order is already in progress', 'booking_in_progress');
  }

  let result: CourierBookingResult;
  let outcome: BookOutcome = 'booked';
  try {
    try {
      result = await provider.createOrder(input);
    } catch (e) {
      // Same invoice already at the courier (an earlier attempt that timed out
      // did go through): link that consignment instead of creating another.
      if (!(e instanceof CourierError && e.kind === 'duplicate')) throw e;
      const found = await provider.findByInvoice(input.invoice).catch(() => null);
      if (!found) {
        throw new CourierError(
          `${provider.label} already has an order with invoice ${input.invoice}, but it could not be looked up. Check the ${provider.label} merchant panel.`,
          'duplicate'
        );
      }
      result = { consignmentId: found.consignmentId, trackingCode: null, trackingLink: null, status: found.status ?? 'in_review' };
      outcome = 'recovered';
    }
  } catch (e) {
    const ce = e instanceof CourierError ? e : new CourierError(e instanceof Error ? e.message : 'Courier booking failed', 'remote', true);
    const message = ce.ambiguous
      ? `${ce.message}. The parcel may or may not have been created — press গাড়ি again to retry; ${provider.label} refuses duplicate invoices, so it cannot be booked twice.`
      : ce.message;
    await prisma.order.update({
      where: { id: orderId },
      data: { courierStatus: ce.ambiguous ? 'unconfirmed' : 'failed', courierError: message.slice(0, 500) },
    });
    await logAudit({
      admin,
      action: 'courier.booking_failed',
      entity: 'order',
      entityId: orderId,
      details: `${order.orderNumber}: ${provider.label} booking failed (${ce.kind}) — ${message.slice(0, 200)}`,
    });
    console.warn(`[courier] ${provider.id} booking for ${order.orderNumber} failed: ${ce.kind}${ce.httpStatus ? ` HTTP ${ce.httpStatus}` : ''}`);
    const http = ce.kind === 'validation' || ce.kind === 'duplicate' ? 422 : ce.kind === 'config' ? 409 : ce.kind === 'rate_limited' ? 429 : 502;
    throw new CourierRequestError(http, message, ce.kind);
  }

  const now = new Date();
  await prisma.order.update({
    where: { id: orderId },
    data: {
      courierProvider: provider.id,
      courierConsignmentId: result.consignmentId,
      courierTrackingCode: result.trackingCode,
      courierTrackingLink: result.trackingLink,
      courierStatus: result.status,
      // A recovered consignment was created by an earlier attempt; its COD is not known here.
      courierCodAmount: outcome === 'booked' ? input.codAmount : null,
      courierBookedAt: now,
      courierSyncedAt: now,
      courierError: null,
      packedStatus: 'shipped',
      // Same meaning as the manual handoff: the parcel is with the courier.
      ...(order.dispatchedAt ? {} : { dispatchedAt: now }),
    },
  });
  await logAudit({
    admin,
    action: 'courier.booked',
    entity: 'order',
    entityId: orderId,
    details:
      outcome === 'booked'
        ? `${order.orderNumber}: booked with ${provider.label} — consignment ${result.consignmentId}, COD BDT ${input.codAmount}`
        : `${order.orderNumber}: linked existing ${provider.label} consignment ${result.consignmentId} (invoice already booked)`,
  });
  return { order: await loadOrder(orderId), outcome };
}

function loadOrder(id: string) {
  return prisma.order.findUniqueOrThrow({ where: { id }, include: ITEM_INCLUDE });
}

/* ───────────────────────────── Status sync ───────────────────────────── */

export interface ApplyResult {
  status: string;
  /** Order status the courier update moved the order to, if any. */
  movedTo: string | null;
}

/**
 * Record a courier status on an order and, for final outcomes, move the order
 * (delivered / returned) through the shared status transition. Orders an admin
 * already moved by hand keep their status. Payment is never changed here.
 */
export async function applyCourierStatus(
  orderId: string,
  rawStatus: string,
  source: 'webhook' | 'sync' | 'manual',
  admin: AdminPayload | null = null
): Promise<ApplyResult | null> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order?.courierConsignmentId) return null;
  const provider = getProvider(order.courierProvider);
  if (!provider) return null;
  const status = rawStatus.toLowerCase().trim();
  if (!status) return null;

  await prisma.order.update({
    where: { id: orderId },
    data: { courierStatus: status, courierSyncedAt: new Date(), courierError: null },
  });
  if (status !== order.courierStatus) {
    await logAudit({
      admin,
      ...(admin ? {} : { adminName: `${provider.label} (${source})` }),
      action: 'courier.status',
      entity: 'order',
      entityId: orderId,
      details: `${order.orderNumber}: ${provider.label} status ${order.courierStatus ?? '—'} → ${status}`,
    });
  }

  let movedTo: string | null = null;
  const outcome = provider.outcomeFor(status);
  if (outcome && IN_TRANSIT.includes(order.status)) {
    try {
      await changeOrderStatus({
        orderId,
        nextStatus: outcome,
        admin,
        systemActor: `${provider.label} (${source})`,
        expectedStatus: order.status,
        note: `courier status: ${status}`,
      });
      movedTo = outcome;
    } catch (e) {
      // 409: an admin changed the order at the same moment — their choice wins.
      if (!(e instanceof StatusChangeError && e.status === 409)) throw e;
    }
  }
  return { status, movedTo };
}

/** Poll the courier for every in-transit booked order (scheduled job + "Sync now"). */
export async function syncCourierStatuses(limit = 100): Promise<string> {
  const orders = await prisma.order.findMany({
    where: { courierConsignmentId: { not: null }, status: { in: IN_TRANSIT } },
    orderBy: { courierSyncedAt: 'asc' },
    take: limit,
    select: { id: true, orderNumber: true, courierConsignmentId: true, courierProvider: true },
  });
  let checked = 0;
  let moved = 0;
  let failed = 0;
  const authFailed = new Set<string>();
  for (const o of orders) {
    const provider = getProvider(o.courierProvider);
    if (!provider || !provider.isConfigured() || authFailed.has(provider.id)) continue;
    try {
      const status = await provider.getStatus(o.courierConsignmentId!);
      const r = await applyCourierStatus(o.id, status, 'sync');
      checked++;
      if (r?.movedTo) moved++;
    } catch (e) {
      failed++;
      const ce = e instanceof CourierError ? e : null;
      if (ce?.kind === 'auth') authFailed.add(provider.id); // don't hammer with bad keys (account lockout)
      await prisma.order.update({
        where: { id: o.id },
        // Rotate to the back of the queue so one bad consignment can't block the rest.
        data: { courierSyncedAt: new Date(), courierError: `Status sync failed: ${(e instanceof Error ? e.message : 'unknown error').slice(0, 300)}` },
      });
    }
  }
  if (orders.length === 0) return 'no booked parcels in transit';
  return `${checked} checked, ${moved} moved, ${failed} failed${authFailed.size ? ' (credentials rejected)' : ''}`;
}

/** Refresh one order's courier status now (admin "sync" button). */
export async function syncOneOrder(orderId: string, admin: AdminPayload | null) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new CourierRequestError(404, 'Order not found', 'not_found');
  if (!order.courierConsignmentId) throw new CourierRequestError(400, 'This order has not been booked with a courier', 'not_booked');
  const provider = getProvider(order.courierProvider);
  if (!provider?.isConfigured()) throw new CourierRequestError(409, 'Courier credentials are not set', 'courier_inactive');
  let status: string;
  try {
    status = await provider.getStatus(order.courierConsignmentId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Status check failed';
    await prisma.order.update({ where: { id: orderId }, data: { courierError: `Status sync failed: ${msg.slice(0, 300)}` } });
    throw new CourierRequestError(502, msg, e instanceof CourierError ? e.kind : 'remote');
  }
  const result = await applyCourierStatus(orderId, status, 'manual', admin);
  return { order: await loadOrder(orderId), result };
}

/* ───────────────────────────── Webhook ───────────────────────────── */

/**
 * Handle a courier webhook. Returns the HTTP status + JSON body to answer with.
 * Unknown consignments are acknowledged (200) so the courier doesn't retry
 * forever; bad credentials get 401.
 */
export async function handleCourierWebhook(
  providerId: string,
  headers: Record<string, string | string[] | undefined>,
  body: unknown
): Promise<{ http: number; body: Record<string, unknown> }> {
  const provider = getProvider(providerId);
  if (!provider) return { http: 404, body: { status: 'error', message: 'Unknown courier' } };
  if (!provider.verifyWebhook(headers)) return { http: 401, body: { status: 'error', message: 'Unauthorized' } };
  const event = provider.parseWebhook(body);
  if (!event) return { http: 400, body: { status: 'error', message: 'Invalid payload' } };

  const order = await prisma.order.findFirst({
    where: {
      courierProvider: provider.id,
      courierConsignmentId: { not: null },
      OR: [
        ...(event.consignmentId ? [{ courierConsignmentId: event.consignmentId }] : []),
        ...(event.invoice ? [{ orderNumber: event.invoice }] : []),
      ],
    },
    select: { id: true },
  });
  if (!order) return { http: 200, body: { status: 'success', message: 'Ignored: unknown consignment' } };

  if (event.status) {
    await applyCourierStatus(order.id, event.status, 'webhook');
  } else {
    await prisma.order.update({ where: { id: order.id }, data: { courierSyncedAt: new Date() } });
  }
  return { http: 200, body: { status: 'success', message: 'Webhook received successfully.' } };
}
