import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';

const router = Router();

/** Public: active customer photos for the "Loved by our customers" wall. */
router.get(
  '/love-banners',
  asyncHandler(async (_req, res) => {
    const banners = await prisma.loveBanner.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ banners });
  })
);

/* ======================== ADMIN LOVE BANNER CRUD ======================== */

router.get(
  '/admin/love-banners',
  requirePermission(PERM.STOREFRONT_VIEW),
  asyncHandler(async (_req, res) => {
    const banners = await prisma.loveBanner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ banners });
  })
);

router.post(
  '/admin/love-banners',
  requirePermission(PERM.STOREFRONT_EDIT),
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    // Customer photos are image-only (Admin → Customer Photos): the uploaded
    // picture is the whole tile, so an image is all that is needed.
    if (!body.image) {
      return res.status(400).json({ error: 'image is required' });
    }
    const banner = await prisma.loveBanner.create({
      data: {
        image: String(body.image),
        link: body.link ? String(body.link) : null,
        sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
        isActive: Boolean(body.isActive ?? true),
      },
    });
    res.status(201).json({ banner });
  })
);

router.patch(
  '/admin/love-banners/:id',
  requirePermission(PERM.STOREFRONT_EDIT),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.loveBanner.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Photo not found' });

    const body = (req.body || {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (body.image !== undefined) data.image = String(body.image);
    if (body.link !== undefined) data.link = body.link ? String(body.link) : null;
    if (body.sortOrder !== undefined) data.sortOrder = Math.trunc(Number(body.sortOrder) || 0);
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const banner = await prisma.loveBanner.update({ where: { id }, data });
    res.json({ banner });
  })
);

router.delete(
  '/admin/love-banners/:id',
  requirePermission(PERM.STOREFRONT_EDIT),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.loveBanner.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Photo not found' });
    await prisma.loveBanner.delete({ where: { id } });
    res.json({ deleted: true });
  })
);

export default router;
