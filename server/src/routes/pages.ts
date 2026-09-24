import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission, currentAdmin } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';

const router = Router();

/** Public fields — admin-only notes are never exposed. */
const PUBLIC_FIELDS = {
  slug: true,
  title: true,
  titleBn: true,
  body: true,
  bodyBn: true,
  showInFooter: true,
  contactForm: true,
  sortOrder: true,
} as const;

/** Public: published pages that appear in the footer navigation. */
router.get(
  '/pages',
  asyncHandler(async (_req, res) => {
    const pages = await prisma.contentPage.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: { ...PUBLIC_FIELDS, seoTitle: true, seoDescription: true },
    });
    res.json({ pages });
  })
);

/** Public: one published page by slug (storefront /:slug route). */
router.get(
  '/pages/:slug',
  asyncHandler(async (req, res) => {
    const page = await prisma.contentPage.findFirst({
      where: { slug: req.params.slug, isPublished: true },
    });
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json({ page });
  })
);

/* ============================ ADMIN PAGE CRUD ============================ */

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

router.get(
  '/admin/pages',
  requirePermission(PERM.STOREFRONT_VIEW),
  asyncHandler(async (_req, res) => {
    const pages = await prisma.contentPage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
    res.json({ pages });
  })
);

router.post(
  '/admin/pages',
  requirePermission(PERM.STOREFRONT_EDIT),
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const title = String(body.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const slug = slugify(String(body.slug || title));
    if (!slug) return res.status(400).json({ error: 'Slug is required' });

    try {
      const page = await prisma.contentPage.create({
        data: {
          slug,
          title,
          titleBn: String(body.titleBn || ''),
          body: String(body.body || ''),
          bodyBn: String(body.bodyBn || ''),
          seoTitle: String(body.seoTitle || ''),
          seoDescription: String(body.seoDescription || ''),
          isPublished: Boolean(body.isPublished ?? true),
          showInFooter: Boolean(body.showInFooter ?? true),
          contactForm: Boolean(body.contactForm ?? false),
          sortOrder: Number(body.sortOrder) || 0,
        },
      });
      await logAudit({
        admin: currentAdmin(req),
        action: 'page.created',
        entity: 'contentPage',
        entityId: page.id,
        details: page.slug,
      }).catch(() => undefined);
      res.status(201).json({ page });
    } catch {
      res.status(409).json({ error: 'A page with this slug already exists' });
    }
  })
);

router.patch(
  '/admin/pages/:id',
  requirePermission(PERM.STOREFRONT_EDIT),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.contentPage.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Page not found' });

    const body = (req.body || {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (body.slug !== undefined) {
      const slug = slugify(String(body.slug));
      if (!slug) return res.status(400).json({ error: 'Slug is required' });
      data.slug = slug;
    }
    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.titleBn !== undefined) data.titleBn = String(body.titleBn);
    if (body.body !== undefined) data.body = String(body.body);
    if (body.bodyBn !== undefined) data.bodyBn = String(body.bodyBn);
    if (body.seoTitle !== undefined) data.seoTitle = String(body.seoTitle);
    if (body.seoDescription !== undefined) data.seoDescription = String(body.seoDescription);
    if (body.isPublished !== undefined) data.isPublished = Boolean(body.isPublished);
    if (body.showInFooter !== undefined) data.showInFooter = Boolean(body.showInFooter);
    if (body.contactForm !== undefined) data.contactForm = Boolean(body.contactForm);
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;

    try {
      const page = await prisma.contentPage.update({ where: { id }, data });
      res.json({ page });
    } catch {
      res.status(409).json({ error: 'A page with this slug already exists' });
    }
  })
);

router.delete(
  '/admin/pages/:id',
  requirePermission(PERM.STOREFRONT_EDIT),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.contentPage.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Page not found' });

    await prisma.contentPage.delete({ where: { id } });
    await logAudit({
      admin: currentAdmin(req),
      action: 'page.deleted',
      entity: 'contentPage',
      entityId: id,
      details: existing.slug,
    }).catch(() => undefined);
    res.json({ deleted: true });
  })
);

export default router;
