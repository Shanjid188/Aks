import { Router } from 'express';
import { asyncHandler } from '../lib/auth.ts';
import { clientKey, createThrottle } from '../lib/throttle.ts';
import { CURRENCY } from '../lib/tracking/config.ts';
import { metaEnabled, sendMetaEvent } from '../lib/tracking/send.ts';
import { buildUserData, cleanFbCookie, clientIp, userAgent } from '../lib/tracking/userData.ts';

/**
 * Server-side copy of browser Pixel events (Meta "redundant setup").
 *
 * POST /api/tracking/meta  { eventName, eventId, eventSourceUrl, customData, fbp, fbc, consent }
 *
 * The browser fires the Pixel event and posts the same event_id here, so Meta
 * deduplicates the pair. Only shopping events are accepted — Purchase is never
 * relayed: it is sent from POST /orders with server-computed totals.
 * No customer identity is accepted here; user_data is IP, user agent and the
 * _fbp/_fbc cookies only.
 */

const router = Router();

const RELAYED_EVENTS = new Set(['ViewContent', 'AddToCart', 'InitiateCheckout', 'AddPaymentInfo', 'Search']);
const throttle = createThrottle({ windowMs: 60_000, max: 120 });

const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n < 1e9 ? Math.round(n * 100) / 100 : undefined;
};
const count = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= 10_000 ? n : undefined;
};

/** Keep only well-formed, non-personal commerce fields. */
function cleanCustomData(raw: unknown): Record<string, unknown> {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { currency: CURRENCY };
  const value = money(c.value);
  if (value !== undefined) out.value = value;
  if (Array.isArray(c.contents)) {
    const contents = c.contents
      .slice(0, 50)
      .map((row) => {
        const r = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
        const id = str(r.id, 100);
        if (!id) return null;
        return { id, quantity: count(r.quantity) ?? 1, item_price: money(r.item_price) };
      })
      .filter(Boolean);
    if (contents.length) {
      out.contents = contents;
      out.content_ids = contents.map((x) => x!.id);
      out.content_type = 'product';
    }
  }
  const name = str(c.content_name, 200);
  if (name) out.content_name = name;
  const category = str(c.content_category, 100);
  if (category) out.content_category = category;
  const search = str(c.search_string, 100);
  if (search) out.search_string = search;
  const numItems = count(c.num_items);
  if (numItems) out.num_items = numItems;
  return out;
}

router.post(
  '/tracking/meta',
  asyncHandler(async (req, res) => {
    if (!metaEnabled()) return res.json({ accepted: false, reason: 'disabled' });

    const body = (req.body || {}) as Record<string, unknown>;
    const consent = (body.consent && typeof body.consent === 'object' ? body.consent : {}) as Record<string, unknown>;
    const eventName = String(body.eventName ?? '');
    const eventId = str(body.eventId, 100);
    if (consent.marketing !== true) return res.status(202).json({ accepted: false, reason: 'no-consent' });
    if (!RELAYED_EVENTS.has(eventName) || !eventId || !/^[A-Za-z0-9_.:-]+$/.test(eventId)) {
      return res.status(400).json({ error: 'Invalid tracking event' });
    }
    if (throttle.isLimited(clientKey(req))) return res.status(429).json({ error: 'Too many events' });

    let eventSourceUrl: string | undefined;
    try {
      const u = new URL(String(body.eventSourceUrl ?? ''));
      if (u.protocol === 'https:' || u.protocol === 'http:') eventSourceUrl = u.toString().slice(0, 1000);
    } catch {
      eventSourceUrl = undefined;
    }

    // Answer immediately; delivery (with retries) continues in the background.
    res.status(202).json({ accepted: true });
    void sendMetaEvent({
      event_name: eventName,
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: eventSourceUrl,
      user_data: buildUserData(null, {
        ip: clientIp(req),
        userAgent: userAgent(req),
        fbp: cleanFbCookie(body.fbp),
        fbc: cleanFbCookie(body.fbc),
      }),
      custom_data: cleanCustomData(body.customData),
    }).catch(() => {});
  })
);

export default router;
