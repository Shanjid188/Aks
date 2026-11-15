import { Router, type Request } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, currentAdmin, hasPermission, requirePermission } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';
import { clientKey, createThrottle } from '../lib/throttle.ts';
import {
  CART_CONSENT_TEXT,
  CartInputError,
  abandonAfterMinutes,
  cartSummary,
  contactRetentionDays,
  eraseContact,
  hashToken,
  parseItems,
  restoreSession,
  upsertSession,
  validRestoreCode,
  validToken,
  whatsappLink,
} from '../lib/checkoutSessions.ts';

/**
 * Abandoned carts. Public endpoints are anonymous (a random token the browser
 * holds), rate-limited, and never trust client prices. Admin endpoints never
 * return contact details except through the audited /contact route.
 */
const router = Router();

const writeThrottle = createThrottle({ windowMs: 60_000, max: 60 });
const restoreThrottle = createThrottle({ windowMs: 60_000, max: 20 });

/* ───────────────────────────── Public (storefront) ───────────────────────────── */

router.put(
  '/checkout-sessions/:token',
  asyncHandler(async (req, res) => {
    if (writeThrottle.isLimited(clientKey(req))) return res.status(429).json({ error: 'Too many requests' });
    const token = String(req.params.token);
    if (!validToken(token)) return res.status(400).json({ error: 'Invalid session' });
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const r = await upsertSession(token, { items: body.items, attribution: body.attribution, contact: body.contact });
      res.json(r);
    } catch (err) {
      if (err instanceof CartInputError) return res.status(400).json({ error: err.message });
      throw err;
    }
  })
);

/** Shopper unticks the reminder box at checkout. */
router.delete(
  '/checkout-sessions/:token/contact',
  asyncHandler(async (req, res) => {
    if (writeThrottle.isLimited(clientKey(req))) return res.status(429).json({ error: 'Too many requests' });
    const token = String(req.params.token);
    if (!validToken(token)) return res.status(400).json({ error: 'Invalid session' });
    await eraseContact({ tokenHash: hashToken(token) });
    res.json({ erased: true });
  })
);

/** /cart?restore=<code> → the items to put back in the bag. */
router.get(
  '/checkout-sessions/restore/:code',
  asyncHandler(async (req, res) => {
    if (restoreThrottle.isLimited(clientKey(req))) return res.status(429).json({ error: 'Too many requests' });
    const code = String(req.params.code);
    if (!validRestoreCode(code)) return res.status(404).json({ error: 'This cart link is no longer available' });
    const r = await restoreSession(code);
    if (!r) return res.status(404).json({ error: 'This cart link is no longer available' });
    res.json(r);
  })
);

/** "Forget my details" from the restore link. */
router.delete(
  '/checkout-sessions/restore/:code/contact',
  asyncHandler(async (req, res) => {
    if (restoreThrottle.isLimited(clientKey(req))) return res.status(429).json({ error: 'Too many requests' });
    const code = String(req.params.code);
    if (validRestoreCode(code)) await eraseContact({ restoreCode: code });
    // Same answer whether or not the code existed.
    res.json({ erased: true });
  })
);

/* ───────────────────────────── Admin ───────────────────────────── */

function windowFrom(q: Record<string, string | undefined>): { from: Date; to: Date } | { error: string } {
  const d = (v?: string) => {
    const x = v ? new Date(v) : null;
    return x && !Number.isNaN(x.getTime()) ? x : null;
  };
  const to = d(q.to) ?? new Date();
  const from = d(q.from) ?? new Date(to.getTime() - 30 * 86_400_000);
  if (from > to) return { error: 'The start date is after the end date' };
  if (to.getTime() - from.getTime() > 731 * 86_400_000) return { error: 'Choose a range of at most 2 years' };
  return { from, to };
}

const STATUSES = ['active', 'abandoned', 'converted', 'recovered', 'expired'];

/** Public storefront origin for restore links (PUBLIC_SITE_URL, else this request's host). */
function siteOrigin(req: Request): string {
  const env = (process.env.PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (env) return env;
  const host = req.get('host');
  return host ? `${req.protocol}://${host}` : '';
}

router.get(
  '/admin/advertising/carts',
  requirePermission(PERM.ADVERTISING_CARTS_VIEW),
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const w = windowFrom(q);
    if ('error' in w) return res.status(400).json({ error: w.error });
    const status = q.status && STATUSES.includes(q.status) ? q.status : 'abandoned';
    const page = Math.max(1, Math.floor(Number(q.page) || 1));
    const pageSize = 50;
    const where = { createdAt: { gte: w.from, lte: w.to }, itemCount: { gt: 0 }, status };
    const [summary, total, rows] = await Promise.all([
      cartSummary(w.from, w.to),
      prisma.checkoutSession.count({ where }),
      prisma.checkoutSession.findMany({
        where,
        orderBy: { lastActivityAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          status: true,
          value: true,
          itemCount: true,
          items: true,
          channel: true,
          campaign: { select: { id: true, name: true } },
          orderId: true,
          contactPhone: true,
          contactConsentAt: true,
          contactedAt: true,
          restoredAt: true,
          lastActivityAt: true,
          abandonedAt: true,
          convertedAt: true,
          recoveredAt: true,
          createdAt: true,
        },
      }),
    ]);
    const orderNumbers = new Map(
      (await prisma.order.findMany({ where: { id: { in: rows.map((r) => r.orderId).filter((x): x is string => !!x) } }, select: { id: true, orderNumber: true } })).map((o) => [o.id, o.orderNumber])
    );
    res.json({
      filter: { from: w.from, to: w.to, status },
      settings: { abandonAfterMinutes: abandonAfterMinutes(), contactRetentionDays: contactRetentionDays(), consentText: CART_CONSENT_TEXT },
      summary,
      total,
      page,
      pageSize,
      canRevealContact: await hasPermission(req, PERM.ADVERTISING_CARTS_CONTACT),
      // Contact details are never in this list — only whether the shopper opted in.
      carts: rows.map(({ contactPhone, items, orderId, ...r }) => ({
        ...r,
        hasContact: !!contactPhone,
        items: parseItems(items).map(({ sku, name, quantity, size, color, price }) => ({ sku, name, quantity, size, color, price })),
        orderId,
        orderNumber: orderId ? orderNumbers.get(orderId) ?? null : null,
      })),
    });
  })
);

/** Reveal an opted-in shopper's contact details. Every reveal is audited. */
router.get(
  '/admin/advertising/carts/:id/contact',
  requirePermission(PERM.ADVERTISING_CARTS_CONTACT),
  asyncHandler(async (req, res) => {
    const s = await prisma.checkoutSession.findUnique({
      where: { id: String(req.params.id) },
      select: { id: true, contactPhone: true, contactEmail: true, contactConsentAt: true, restoreCode: true, status: true },
    });
    if (!s) return res.status(404).json({ error: 'Cart not found' });
    if (!s.contactPhone) return res.status(404).json({ error: 'No contact details — the shopper did not opt in, or they have been erased' });
    await logAudit({
      admin: currentAdmin(req),
      action: 'cart.contact_viewed',
      entity: 'checkout_session',
      entityId: s.id,
      details: 'Viewed opted-in cart contact details',
    });
    const restoreUrl = s.restoreCode ? `${siteOrigin(req)}/cart?restore=${s.restoreCode}` : null;
    res.json({
      phone: s.contactPhone,
      email: s.contactEmail,
      consentAt: s.contactConsentAt,
      consentText: CART_CONSENT_TEXT,
      restoreUrl,
      whatsappUrl: whatsappLink(s.contactPhone, restoreUrl),
    });
  })
);

/** Mark a cart as contacted (manual WhatsApp follow-up) or recovered (e.g. ordered by phone). */
router.patch(
  '/admin/advertising/carts/:id',
  requirePermission(PERM.ADVERTISING_CARTS_CONTACT),
  asyncHandler(async (req, res) => {
    const action = String(req.body?.action ?? '');
    if (action !== 'contacted' && action !== 'recovered') return res.status(400).json({ error: 'action must be contacted or recovered' });
    const s = await prisma.checkoutSession.findUnique({ where: { id: String(req.params.id) }, select: { id: true, status: true } });
    if (!s) return res.status(404).json({ error: 'Cart not found' });
    if (action === 'recovered' && s.status !== 'abandoned') return res.status(409).json({ error: 'Only an abandoned cart can be marked recovered' });
    const now = new Date();
    const updated = await prisma.checkoutSession.update({
      where: { id: s.id },
      data: action === 'contacted' ? { contactedAt: now } : { status: 'recovered', recoveredAt: now },
      select: { id: true, status: true, contactedAt: true, recoveredAt: true },
    });
    await logAudit({
      admin: currentAdmin(req),
      action: action === 'contacted' ? 'cart.contacted' : 'cart.recovered',
      entity: 'checkout_session',
      entityId: s.id,
      details: action === 'contacted' ? 'Marked as contacted' : 'Marked as recovered',
    });
    res.json(updated);
  })
);

export default router;
