import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission, currentAdmin } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';

const router = Router();

/* ── Public storefront endpoints ─────────────────────────────────────────── */

/** Public: active promotions (sorted). */
router.get(
  '/promotions',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: { isActive: true, OR: [{ startDate: null }, { startDate: { lte: now } }] },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ promotions });
  })
);

/** Public: active announcements. */
router.get(
  '/announcements',
  asyncHandler(async (_req, res) => {
    const announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ announcements });
  })
);

/* ── Admin Promotions CRUD ───────────────────────────────────────────────── */

router.get(
  '/admin/promotions',
  requirePermission(PERM.PROMOTIONS_VIEW),
  asyncHandler(async (_req, res) => {
    const promotions = await prisma.promotion.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    res.json({ promotions });
  })
);

router.post(
  '/admin/promotions',
  requirePermission(PERM.PROMOTIONS_CREATE),
  asyncHandler(async (req, res) => {
    const b = (req.body || {}) as Record<string, unknown>;
    if (!b.title) return res.status(400).json({ error: 'title is required' });
    const promotion = await prisma.promotion.create({
      data: {
        title: String(b.title),
        subtitle: b.subtitle ? String(b.subtitle) : null,
        image: b.image ? String(b.image) : null,
        link: b.link ? String(b.link) : null,
        startDate: b.startDate ? new Date(String(b.startDate)) : null,
        endDate: b.endDate ? new Date(String(b.endDate)) : null,
        isActive: b.isActive !== false,
        sortOrder: Math.trunc(Number(b.sortOrder) || 0),
      },
    });
    await logAudit({ admin: currentAdmin(req), action: 'promotion.created', entity: 'promotion', entityId: promotion.id, details: promotion.title });
    res.status(201).json({ promotion });
  })
);

router.patch(
  '/admin/promotions/:id',
  requirePermission(PERM.PROMOTIONS_EDIT),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const b = (req.body || {}) as Record<string, unknown>;
    const existing = await prisma.promotion.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Promotion not found' });
    const data: Record<string, unknown> = {};
    for (const k of ['title', 'subtitle', 'image', 'link']) if (b[k] !== undefined) data[k] = String(b[k]);
    if (b.startDate !== undefined) data.startDate = b.startDate ? new Date(String(b.startDate)) : null;
    if (b.endDate !== undefined) data.endDate = b.endDate ? new Date(String(b.endDate)) : null;
    if (b.isActive !== undefined) data.isActive = Boolean(b.isActive);
    if (b.sortOrder !== undefined) data.sortOrder = Math.trunc(Number(b.sortOrder) || 0);
    const promotion = await prisma.promotion.update({ where: { id }, data });
    res.json({ promotion });
  })
);

router.delete(
  '/admin/promotions/:id',
  requirePermission(PERM.PROMOTIONS_DELETE),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    await prisma.promotion.delete({ where: { id } });
    await logAudit({ admin: currentAdmin(req), action: 'promotion.deleted', entity: 'promotion', entityId: id, details: '' });
    res.json({ deleted: true });
  })
);

/* ── Admin Announcements CRUD ────────────────────────────────────────────── */

router.get(
  '/admin/announcements',
  requirePermission(PERM.STOREFRONT_VIEW),
  asyncHandler(async (_req, res) => {
    const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ announcements });
  })
);

router.post(
  '/admin/announcements',
  requirePermission(PERM.STOREFRONT_EDIT),
  asyncHandler(async (req, res) => {
    const b = (req.body || {}) as Record<string, unknown>;
    if (!b.text) return res.status(400).json({ error: 'text is required' });
    const announcement = await prisma.announcement.create({
      data: {
        text: String(b.text),
        textBn: b.textBn ? String(b.textBn) : null,
        link: b.link ? String(b.link) : null,
        bgColor: String(b.bgColor || '#D8232A'),
        textColor: String(b.textColor || '#ffffff'),
        isActive: b.isActive !== false,
      },
    });
    res.status(201).json({ announcement });
  })
);

router.patch(
  '/admin/announcements/:id',
  requirePermission(PERM.STOREFRONT_EDIT),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const b = (req.body || {}) as Record<string, unknown>;
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });
    const data: Record<string, unknown> = {};
    for (const k of ['text', 'textBn', 'link', 'bgColor', 'textColor']) if (b[k] !== undefined) data[k] = String(b[k]);
    if (b.isActive !== undefined) data.isActive = Boolean(b.isActive);
    const announcement = await prisma.announcement.update({ where: { id }, data });
    res.json({ announcement });
  })
);

router.delete(
  '/admin/announcements/:id',
  requirePermission(PERM.STOREFRONT_EDIT),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    await prisma.announcement.delete({ where: { id } });
    res.json({ deleted: true });
  })
);

export default router;
