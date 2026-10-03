import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';

const router = Router();

/** Public: active side banners for the homepage hero column (ordered). */
router.get(
  '/side-banners',
  asyncHandler(async (_req, res) => {
    const banners = await prisma.sideBanner.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ banners });
  })
);

/* ======================= ADMIN SIDE BANNER CRUD ======================= */

router.get(
  '/admin/side-banners',
  requirePermission(PERM.SLIDES_VIEW),
  asyncHandler(async (_req, res) => {
    const banners = await prisma.sideBanner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ banners });
  })
);

router.post(
  '/admin/side-banners',
  requirePermission(PERM.SLIDES_CREATE),
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    // Side banners are image-only (Admin → Hero Slides → Side banners); the
    // uploaded artwork is the whole banner, so an image is all that is needed.
    if (!body.image) {
      return res.status(400).json({ error: 'image is required' });
    }
    const banner = await prisma.sideBanner.create({
      data: {
        image: String(body.image),
        sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
        isActive: Boolean(body.isActive ?? true),
      },
    });
    res.status(201).json({ banner });
  })
);

router.patch(
  '/admin/side-banners/:id',
  requirePermission(PERM.SLIDES_EDIT),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.sideBanner.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Banner not found' });

    const body = (req.body || {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (body.image !== undefined) data.image = String(body.image);
    if (body.sortOrder !== undefined) data.sortOrder = Math.trunc(Number(body.sortOrder) || 0);
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const banner = await prisma.sideBanner.update({ where: { id }, data });
    res.json({ banner });
  })
);

router.delete(
  '/admin/side-banners/:id',
  requirePermission(PERM.SLIDES_DELETE),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.sideBanner.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Banner not found' });
    await prisma.sideBanner.delete({ where: { id } });
    res.json({ deleted: true });
  })
);

export default router;
