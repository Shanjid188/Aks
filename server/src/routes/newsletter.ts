import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission, currentAdmin } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';
import { clientKey, createThrottle } from '../lib/throttle.ts';

const router = Router();

/**
 * Newsletter sign-ups. Nothing is emailed yet — this is the audience list the
 * merchant owns, shown in Admin → Subscribers. The public endpoint is
 * idempotent: signing up twice is the same address, not an error.
 */

// Shopper-friendly limit: a real person subscribes once; a bot tries thousands.
const subscribeThrottle = createThrottle({ windowMs: 60 * 60 * 1000, max: 15 });

/** Deliberately permissive: one @, a dot in the domain, no spaces. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 160;

export function normaliseEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

/** Public: subscribe an email address. */
router.post(
  '/newsletter',
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const email = normaliseEmail(body.email);

    if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    if (subscribeThrottle.isLimited(clientKey(req))) {
      return res
        .status(429)
        .json({ error: 'Too many sign-ups from this connection. Please try again later.' });
    }

    const source = String(body.source ?? 'footer').slice(0, 40) || 'footer';
    const existing = await prisma.subscriber.findUnique({ where: { email } });

    if (existing) {
      // Re-subscribing after unsubscribing flips the flag back on; an active
      // address is simply left alone.
      if (!existing.isActive) {
        await prisma.subscriber.update({ where: { id: existing.id }, data: { isActive: true } });
        return res.json({ subscribed: true, alreadySubscribed: false, reactivated: true });
      }
      return res.json({ subscribed: true, alreadySubscribed: true, reactivated: false });
    }

    await prisma.subscriber.create({ data: { email, source } });
    res.status(201).json({ subscribed: true, alreadySubscribed: false, reactivated: false });
  })
);

/** Admin: the audience list (newest first, optional search). */
router.get(
  '/admin/subscribers',
  requirePermission(PERM.MARKETING_SUBSCRIBERS_VIEW),
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    const activeOnly = String(req.query.active ?? '') === 'true';

    const where: Record<string, unknown> = {};
    if (q) where.email = { contains: q };
    if (activeOnly) where.isActive = true;

    const [subscribers, total, active] = await Promise.all([
      prisma.subscriber.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 }),
      prisma.subscriber.count(),
      prisma.subscriber.count({ where: { isActive: true } }),
    ]);
    res.json({ subscribers, total, active });
  })
);

/** Admin: add someone manually (e.g. an address collected offline). */
router.post(
  '/admin/subscribers',
  requirePermission(PERM.MARKETING_SUBSCRIBERS_MANAGE),
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const email = normaliseEmail(body.email);
    if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    const existing = await prisma.subscriber.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'That address is already on the list' });

    const subscriber = await prisma.subscriber.create({
      data: { email, source: 'manual', isActive: true },
    });
    await logAudit({
      admin: currentAdmin(req),
      action: 'subscriber.created',
      entity: 'subscriber',
      entityId: subscriber.id,
      details: email,
    }).catch(() => undefined);
    res.status(201).json({ subscriber });
  })
);

/** Admin: pause or resume an address (the honest version of "unsubscribe"). */
router.patch(
  '/admin/subscribers/:id',
  requirePermission(PERM.MARKETING_SUBSCRIBERS_MANAGE),
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const existing = await prisma.subscriber.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Subscriber not found' });

    const subscriber = await prisma.subscriber.update({ where: { id: existing.id }, data });
    await logAudit({
      admin: currentAdmin(req),
      action: 'subscriber.updated',
      entity: 'subscriber',
      entityId: subscriber.id,
      details: `active=${subscriber.isActive}`,
    }).catch(() => undefined);
    res.json({ subscriber });
  })
);

/** Admin: remove an address for good. */
router.delete(
  '/admin/subscribers/:id',
  requirePermission(PERM.MARKETING_SUBSCRIBERS_MANAGE),
  asyncHandler(async (req, res) => {
    const existing = await prisma.subscriber.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Subscriber not found' });

    await prisma.subscriber.delete({ where: { id: existing.id } });
    await logAudit({
      admin: currentAdmin(req),
      action: 'subscriber.deleted',
      entity: 'subscriber',
      entityId: existing.id,
      details: existing.email,
    }).catch(() => undefined);
    res.json({ deleted: true });
  })
);

export default router;
