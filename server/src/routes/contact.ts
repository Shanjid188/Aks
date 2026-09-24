import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission, currentAdmin } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';
import { clientKey, createThrottle } from '../lib/throttle.ts';

const router = Router();

/**
 * Storefront contact form → the admin inbox (Admin → Messages). Messages are
 * only stored: nothing is emailed, so the admin panel is the single place to
 * read them, and the storefront never claims a reply was sent.
 */

const contactThrottle = createThrottle({ windowMs: 60 * 60 * 1000, max: 8 });

/** Statuses an admin can set. Anything else is rejected. */
const MESSAGE_STATUSES = ['new', 'read', 'replied', 'closed'];

const LIMITS = { name: 120, email: 160, phone: 40, subject: 160, message: 4000 };

/** Same permissive shape as the newsletter: one @, a dot in the domain. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Public: submit a message from a content page (e.g. Contact Us). */
router.post(
  '/contact',
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const phone = String(body.phone ?? '').trim();
    const subject = String(body.subject ?? '').trim();
    const message = String(body.message ?? '').trim();

    // A phone number OR an email is enough — that is how a real shop replies.
    if (!name) return res.status(400).json({ error: 'Please tell us your name' });
    if (!phone && !email) {
      return res.status(400).json({ error: 'Please leave a phone number or an email address' });
    }
    if (email && !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'That email address does not look right' });
    }
    if (!message) return res.status(400).json({ error: 'Please write your message' });
    if (
      name.length > LIMITS.name ||
      email.length > LIMITS.email ||
      phone.length > LIMITS.phone ||
      subject.length > LIMITS.subject
    ) {
      return res.status(400).json({ error: 'One of the fields is too long' });
    }
    if (message.length > LIMITS.message) {
      return res.status(400).json({ error: `Message is too long (${LIMITS.message} characters max)` });
    }
    if (contactThrottle.isLimited(clientKey(req))) {
      return res
        .status(429)
        .json({ error: 'Too many messages from this connection. Please try again later.' });
    }

    const created = await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone,
        subject,
        message,
        status: 'new',
        pageSlug: String(body.pageSlug ?? 'contact').slice(0, 60) || 'contact',
      },
    });
    res.status(201).json({ received: true, id: created.id });
  })
);

/** Admin: the inbox (newest first, optional status/search filter). */
router.get(
  '/admin/contact-messages',
  requirePermission(PERM.MARKETING_MESSAGES_VIEW),
  asyncHandler(async (req, res) => {
    const status = String(req.query.status ?? '').trim();
    const q = String(req.query.q ?? '').trim();

    const where: Record<string, unknown> = {};
    if (status && MESSAGE_STATUSES.includes(status)) where.status = status;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { subject: { contains: q } },
        { message: { contains: q } },
      ];
    }

    const [messages, total, unread] = await Promise.all([
      prisma.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 }),
      prisma.contactMessage.count(),
      prisma.contactMessage.count({ where: { status: 'new' } }),
    ]);
    res.json({ messages, total, unread });
  })
);

/** Admin: move a message along and/or keep an internal note. */
router.patch(
  '/admin/contact-messages/:id',
  requirePermission(PERM.MARKETING_MESSAGES_MANAGE),
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (typeof body.status === 'string') {
      if (!MESSAGE_STATUSES.includes(body.status)) {
        return res.status(400).json({ error: 'Unknown status' });
      }
      data.status = body.status;
    }
    if (typeof body.adminNote === 'string') data.adminNote = body.adminNote.slice(0, 2000);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const existing = await prisma.contactMessage.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Message not found' });

    const message = await prisma.contactMessage.update({ where: { id: existing.id }, data });
    await logAudit({
      admin: currentAdmin(req),
      action: 'contact_message.updated',
      entity: 'contact_message',
      entityId: message.id,
      details: `status=${message.status}`,
    }).catch(() => undefined);
    res.json({ message });
  })
);

/** Admin: delete a message. */
router.delete(
  '/admin/contact-messages/:id',
  requirePermission(PERM.MARKETING_MESSAGES_MANAGE),
  asyncHandler(async (req, res) => {
    const existing = await prisma.contactMessage.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Message not found' });

    await prisma.contactMessage.delete({ where: { id: existing.id } });
    await logAudit({
      admin: currentAdmin(req),
      action: 'contact_message.deleted',
      entity: 'contact_message',
      entityId: existing.id,
      details: `${existing.name} — ${existing.subject || 'no subject'}`,
    }).catch(() => undefined);
    res.json({ deleted: true });
  })
);

export default router;
