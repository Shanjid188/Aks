import { CURRENCY } from './config.ts';
import { prisma } from '../prisma.ts';
import { metaConfig, ga4Config } from './config.ts';
import {
  deliverGa4Refund,
  deliverMetaEvent,
  reclaimFailed,
  recordMarker,
  sendGa4RefundOnce,
  sendMetaEventOnce,
  type MetaServerEvent,
} from './send.ts';
import { buildUserData, cleanFbCookie, clientIp, userAgent } from './userData.ts';

/**
 * Order lifecycle → conversion events.
 *
 * Purchase rule: an order qualifies as a Purchase when the API has persisted it
 * (POST /orders succeeded). Every payment method this shop offers — COD and
 * the manual bKash/Nagad/bank transfers — is settled after the order is
 * placed, so placement is the conversion; a later cancellation/refund is
 * reported to GA4 as a refund (Meta has no refund event).
 *
 * Deduplication: the browser Pixel and this server use the same event_name
 * ("Purchase") and event_id (`purchase_<order.id>`). The ledger key
 * `meta:Purchase:<order.id>` makes the server send happen at most once.
 */

/** Same id the storefront builds in src/lib/tracking — keep them identical. */
export const purchaseEventId = (orderId: string) => `purchase_${orderId}`;

export interface CheckoutTracking {
  analytics: boolean;
  marketing: boolean;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
}

function cleanUrl(value: unknown): string | undefined {
  const s = String(value ?? '').trim();
  if (!s || s.length > 1000) return undefined;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Read the optional `tracking` block the storefront sends with an order. Absent = no consent. */
export function parseCheckoutTracking(raw: unknown): CheckoutTracking {
  const t = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const consent = (t.consent && typeof t.consent === 'object' ? t.consent : {}) as Record<string, unknown>;
  return {
    analytics: consent.analytics === true,
    marketing: consent.marketing === true,
    fbp: cleanFbCookie(t.fbp),
    fbc: cleanFbCookie(t.fbc),
    eventSourceUrl: cleanUrl(t.eventSourceUrl),
  };
}

interface PlacedOrder {
  id: string;
  createdAt: Date;
  total: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  items: { productId: string | null; productSku: string; productName: string; price: number; quantity: number }[];
}

type Req = { ip?: string; headers: Record<string, unknown> };

/** The CAPI Purchase for an order. `ctx` carries browser signals when known. */
function purchaseEvent(
  order: PlacedOrder,
  ctx: { ip?: string; userAgent?: string; fbp?: string; fbc?: string; eventSourceUrl?: string }
): MetaServerEvent {
  let address: Record<string, unknown> = {};
  try {
    address = JSON.parse(order.customerAddress || '{}');
  } catch {
    address = {};
  }
  const contents = order.items.map((it) => ({
    id: it.productSku || it.productId || '',
    quantity: it.quantity,
    item_price: it.price,
  }));
  return {
    event_name: 'Purchase',
    event_id: purchaseEventId(order.id),
    event_time: Math.floor(order.createdAt.getTime() / 1000),
    action_source: 'website',
    event_source_url: ctx.eventSourceUrl,
    user_data: buildUserData(
      {
        fullName: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
        district: address.district,
        division: address.division,
        postalCode: address.postalCode,
      },
      { ip: ctx.ip, userAgent: ctx.userAgent, fbp: ctx.fbp, fbc: ctx.fbc }
    ),
    custom_data: {
      currency: CURRENCY,
      value: order.total,
      order_id: order.id,
      content_type: 'product',
      content_ids: contents.map((c) => c.id),
      contents,
      num_items: order.items.reduce((n, it) => n + it.quantity, 0),
    },
  };
}

async function reportOrderPlaced(order: PlacedOrder, req: Req, tracking: CheckoutTracking) {
  if (tracking.analytics) {
    // The browser sends the GA4 purchase (it owns the GA client id). Remember
    // that it did, so a later refund is only sent for purchases GA4 has seen.
    await recordMarker(`ga4:purchase:${order.id}`, 'ga4_browser', 'purchase', order.id);
  }
  if (!tracking.marketing) return;
  const referer = typeof req.headers.referer === 'string' ? req.headers.referer : undefined;
  await sendMetaEventOnce(
    `meta:Purchase:${order.id}`,
    order.id,
    purchaseEvent(order, {
      ip: clientIp(req),
      userAgent: userAgent(req),
      fbp: tracking.fbp,
      fbc: tracking.fbc,
      eventSourceUrl: tracking.eventSourceUrl ?? cleanUrl(referer),
    })
  );
}

/** Fire-and-forget: never delays or fails the checkout response. */
export function trackOrderPlaced(order: PlacedOrder, req: Req, tracking: CheckoutTracking): void {
  reportOrderPlaced(order, req, tracking).catch((e) => {
    console.warn(`[tracking] order ${order.id}: ${e instanceof Error ? e.message : String(e)}`);
  });
}

/** Statuses that reverse a purchase in GA4 reports. */
export const REVERSAL_STATUSES = ['cancelled', 'refunded', 'returned'];

/** Fire-and-forget GA4 refund (full order unless `value` is given). */
export function trackOrderRefund(
  order: { id: string; total: number; items?: PlacedOrder['items'] },
  value?: number
): void {
  const full = value === undefined;
  const items = full
    ? order.items?.map((it) => ({
        item_id: it.productSku || it.productId || '',
        item_name: it.productName,
        price: it.price,
        quantity: it.quantity,
      }))
    : undefined;
  sendGa4RefundOnce(order.id, order.id, full ? order.total : value, items).catch((e) => {
    console.warn(`[tracking] refund ${order.id}: ${e instanceof Error ? e.message : String(e)}`);
  });
}

/* ─────────────────────────────── Retries ─────────────────────────────── */

/** Meta rejects events whose event_time is more than 7 days old. */
const META_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

export type RetryOutcome = 'sent' | 'failed' | 'skipped';

/** Can this ledger row be rebuilt and re-sent from stored order data? */
export function isRetryable(row: { channel: string; eventName: string; orderId: string | null; createdAt: Date }): boolean {
  if (!row.orderId) return false; // browser-relayed events keep no payload
  if (row.channel === 'meta_capi' && row.eventName === 'Purchase') return Date.now() - row.createdAt.getTime() < META_MAX_AGE_MS;
  return row.channel === 'ga4_mp' && row.eventName === 'refund';
}

/**
 * Re-send failed ledger rows. Each row is rebuilt from the stored order (the
 * original send had consent — rows are only ever claimed with it). Browser
 * signals (IP, user agent, fbp/fbc) were never stored, so a retried Purchase
 * matches on hashed contact details only.
 */
export async function retryFailedTracking(ids?: string[]): Promise<Record<RetryOutcome, number>> {
  const out: Record<RetryOutcome, number> = { sent: 0, failed: 0, skipped: 0 };
  const rows = await prisma.trackingEvent.findMany({
    where: { status: 'failed', ...(ids?.length ? { id: { in: ids } } : {}) },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });
  for (const row of rows) {
    const ready = row.channel === 'meta_capi' ? metaConfig() : ga4Config();
    if (!ready || !isRetryable(row)) {
      out.skipped++;
      continue;
    }
    const order = await prisma.order.findUnique({ where: { id: row.orderId! }, include: { items: true } });
    if (!order || !(await reclaimFailed(row.id))) {
      out.skipped++;
      continue;
    }
    if (row.channel === 'meta_capi') {
      const res = await deliverMetaEvent(row.id, purchaseEvent(order, {}));
      out[res?.ok ? 'sent' : 'failed']++;
    } else {
      const refunded = await prisma.refund.aggregate({ where: { orderId: order.id }, _sum: { amount: true } });
      const partial = refunded._sum.amount ?? 0;
      const full = partial <= 0 || partial >= order.total;
      const res = await deliverGa4Refund(
        row.id,
        order.id,
        order.id,
        full ? order.total : partial,
        full
          ? order.items.map((it) => ({ item_id: it.productSku || it.productId || '', item_name: it.productName, price: it.price, quantity: it.quantity }))
          : undefined
      );
      out[res.ok ? 'sent' : 'failed']++;
    }
  }
  return out;
}
