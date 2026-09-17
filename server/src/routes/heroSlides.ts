import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';

const router = Router();

/** Public: active hero slides for the storefront carousel (ordered). */
router.get(
  '/hero-slides',
  asyncHandler(async (_req, res) => {
    const slides = await prisma.heroSlide.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ slides });
  })
);

/* ========================= ADMIN HERO SLIDE CRUD ========================= */

router.get(
  '/admin/hero-slides',
  requirePermission(PERM.SLIDES_VIEW),
  asyncHandler(async (_req, res) => {
    const slides = await prisma.heroSlide.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ slides });
  })
);

router.post(
  '/admin/hero-slides',
  requirePermission(PERM.SLIDES_CREATE),
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    if (!body.title || !body.image) {
      return res.status(400).json({ error: 'title and image are required' });
    }
    const slide = await prisma.heroSlide.create({
      data: {
        badge: String(body.badge || ''),
        title: String(body.title),
        subtitle: String(body.subtitle || ''),
        ctaText: String(body.ctaText || 'Shop Now'),
        ctaCategory: String(body.ctaCategory || 'all'),
        ctaSubcategory: body.ctaSubcategory ? String(body.ctaSubcategory) : null,
        ctaBrand: body.ctaBrand ? String(body.ctaBrand) : null,
        image: String(body.image),
        accentColor: String(body.accentColor || '#D8232A'),
        tagline: String(body.tagline || ''),
        sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
        isActive: Boolean(body.isActive ?? true),
      },
    });
    res.status(201).json({ slide });
  })
);

router.patch(
  '/admin/hero-slides/:id',
  requirePermission(PERM.SLIDES_EDIT),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Slide not found' });

    const body = (req.body || {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    const textKeys = ['badge', 'title', 'subtitle', 'ctaText', 'ctaCategory', 'image', 'accentColor', 'tagline'];
    for (const key of textKeys) {
      if (body[key] !== undefined) data[key] = String(body[key]);
    }
    if (body.ctaSubcategory !== undefined) data.ctaSubcategory = body.ctaSubcategory ? String(body.ctaSubcategory) : null;
    if (body.ctaBrand !== undefined) data.ctaBrand = body.ctaBrand ? String(body.ctaBrand) : null;
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const slide = await prisma.heroSlide.update({ where: { id }, data });
    res.json({ slide });
  })
);

router.delete(
  '/admin/hero-slides/:id',
  requirePermission(PERM.SLIDES_DELETE),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Slide not found' });
    await prisma.heroSlide.delete({ where: { id } });
    res.json({ deleted: true });
  })
);

export default router;