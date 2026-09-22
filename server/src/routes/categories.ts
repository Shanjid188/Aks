import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission, currentAdmin } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';

const router = Router();

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** URL-safe slug from any label (Bangla-only labels fall back to "cat"). */
function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  return base || 'cat';
}

/** Category slug must stay globally unique (it mirrors Product.category). */
async function uniqueCategorySlug(base: string, ignoreId?: string): Promise<string> {
  let slug = base;
  let n = 2;
  for (;;) {
    const clash = await prisma.category.findUnique({ where: { slug } });
    if (!clash || clash.id === ignoreId) return slug;
    slug = `${base}-${n++}`;
  }
}

/** Subcategory slug is prefixed with its parent slug, e.g. "food-rice-staples". */
async function uniqueSubcategorySlug(categorySlug: string, base: string, ignoreId?: string): Promise<string> {
  let slug = `${categorySlug}-${base}`;
  let n = 2;
  for (;;) {
    const clash = await prisma.subcategory.findUnique({ where: { slug } });
    if (!clash || clash.id === ignoreId) return slug;
    slug = `${categorySlug}-${base}-${n++}`;
  }
}

const CATEGORY_ORDER = [{ sortOrder: 'asc' as const }, { name: 'asc' as const }];
const SUBCATEGORY_ORDER = [{ sortOrder: 'asc' as const }, { name: 'asc' as const }];

/** How many products still point at this category slug / subcategory name. */
const productsInCategory = (slug: string) => prisma.product.count({ where: { category: slug } });
const productsInSubcategory = (slug: string, name: string) =>
  prisma.product.count({ where: { category: slug, subcategory: name } });

/* ── Public storefront endpoint ──────────────────────────────────────────── */

/** Public: active divisions with their active subcategories (ordered). */
router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: CATEGORY_ORDER,
      include: { subcategories: { where: { isActive: true }, orderBy: SUBCATEGORY_ORDER } },
    });
    res.json({ categories });
  })
);

/* ── Admin: category list / create ───────────────────────────────────────── */

router.get(
  '/admin/categories',
  requirePermission(PERM.CATEGORIES_VIEW),
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: CATEGORY_ORDER,
      include: { subcategories: { orderBy: SUBCATEGORY_ORDER } },
    });
    res.json({ categories });
  })
);

router.post(
  '/admin/categories',
  requirePermission(PERM.CATEGORIES_CREATE),
  asyncHandler(async (req, res) => {
    const b = (req.body || {}) as Record<string, unknown>;
    const name = String(b.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });

    const slug = await uniqueCategorySlug(b.slug ? slugify(String(b.slug)) : slugify(name));
    const last = await prisma.category.findFirst({ orderBy: { sortOrder: 'desc' } });

    const category = await prisma.category.create({
      data: {
        name,
        nameBn: b.nameBn ? String(b.nameBn) : null,
        slug,
        description: String(b.description ?? ''),
        descriptionBn: b.descriptionBn ? String(b.descriptionBn) : null,
        tagline: String(b.tagline ?? ''),
        taglineBn: b.taglineBn ? String(b.taglineBn) : null,
        brand: String(b.brand ?? name),
        image: b.image ? String(b.image) : null,
        heroImage: b.heroImage ? String(b.heroImage) : null,
        gridImage: b.gridImage ? String(b.gridImage) : null,
        badge: String(b.badge ?? ''),
        accentColor: String(b.accentColor ?? '#D8232A'),
        isActive: b.isActive !== false,
        sortOrder: Number.isFinite(Number(b.sortOrder))
          ? Math.trunc(Number(b.sortOrder))
          : (last?.sortOrder ?? 0) + 1,
      },
      include: { subcategories: true },
    });

    await logAudit({
      admin: currentAdmin(req),
      action: 'category.created',
      entity: 'category',
      entityId: category.id,
      details: category.name,
    });
    res.status(201).json({ category });
  })
);

router.patch(
  '/admin/categories/:id',
  requirePermission(PERM.CATEGORIES_EDIT),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    const b = (req.body || {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};

    if (b.name !== undefined) {
      const name = String(b.name).trim();
      if (!name) return res.status(400).json({ error: 'name cannot be empty' });
      data.name = name;
    }
    for (const key of ['nameBn', 'descriptionBn', 'taglineBn']) {
      if (b[key] !== undefined) data[key] = b[key] ? String(b[key]) : null;
    }
    for (const key of ['description', 'tagline', 'brand', 'badge', 'accentColor']) {
      if (b[key] !== undefined) data[key] = String(b[key]);
    }
    for (const key of ['image', 'heroImage', 'gridImage']) {
      if (b[key] !== undefined) data[key] = b[key] ? String(b[key]) : null;
    }
    if (b.isActive !== undefined) data.isActive = Boolean(b.isActive);
    if (b.sortOrder !== undefined) data.sortOrder = Math.trunc(Number(b.sortOrder) || 0);

    // The slug is what every product row stores — changing it while products
    // reference it would silently detach the whole division from the catalog.
    if (b.slug !== undefined) {
      const next = slugify(String(b.slug));
      if (next !== existing.slug) {
        const used = await productsInCategory(existing.slug);
        if (used > 0) {
          return res.status(409).json({
            error: `Slug "${existing.slug}" is used by ${used} product(s). Keep the slug, or re-assign those products first.`,
            count: used,
          });
        }
        data.slug = await uniqueCategorySlug(next, id);
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data,
      include: { subcategories: { orderBy: SUBCATEGORY_ORDER } },
    });
    await logAudit({
      admin: currentAdmin(req),
      action: 'category.updated',
      entity: 'category',
      entityId: id,
      details: category.name,
    });
    res.json({ category });
  })
);

router.delete(
  '/admin/categories/:id',
  requirePermission(PERM.CATEGORIES_DELETE),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.category.findUnique({ where: { id }, include: { subcategories: true } });
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    const used = await productsInCategory(existing.slug);
    if (used > 0) {
      return res.status(409).json({
        error: `Cannot delete "${existing.name}" — ${used} product(s) still use this division. Move or delete those products first.`,
        count: used,
      });
    }

    // Safe: nothing references it, so its subcategories cascade away too.
    const subCount = existing.subcategories.length;
    await prisma.category.delete({ where: { id } });
    await logAudit({
      admin: currentAdmin(req),
      action: 'category.deleted',
      entity: 'category',
      entityId: id,
      details: `${existing.name} (+${subCount} subcategories)`,
    });
    res.json({ deleted: true, subcategoriesDeleted: subCount });
  })
);

/* ── Admin: subcategory list / create ────────────────────────────────────── */

router.get(
  '/admin/subcategories',
  requirePermission(PERM.CATEGORIES_VIEW),
  asyncHandler(async (req, res) => {
    const categoryId = req.query.categoryId ? String(req.query.categoryId) : undefined;
    const subcategories = await prisma.subcategory.findMany({
      where: categoryId ? { categoryId } : {},
      orderBy: SUBCATEGORY_ORDER,
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
    res.json({ subcategories });
  })
);

router.post(
  '/admin/subcategories',
  requirePermission(PERM.CATEGORIES_CREATE),
  asyncHandler(async (req, res) => {
    const b = (req.body || {}) as Record<string, unknown>;
    const categoryId = String(b.categoryId ?? '');
    const name = String(b.name ?? '').trim();
    if (!categoryId || !name) return res.status(400).json({ error: 'categoryId and name are required' });

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const dupe = await prisma.subcategory.findFirst({ where: { categoryId, name } });
    if (dupe) return res.status(409).json({ error: `"${name}" already exists in ${category.name}` });

    const last = await prisma.subcategory.findFirst({ where: { categoryId }, orderBy: { sortOrder: 'desc' } });
    const subcategory = await prisma.subcategory.create({
      data: {
        categoryId,
        name,
        nameBn: b.nameBn ? String(b.nameBn) : null,
        slug: await uniqueSubcategorySlug(category.slug, slugify(name)),
        isActive: b.isActive !== false,
        sortOrder: Number.isFinite(Number(b.sortOrder))
          ? Math.trunc(Number(b.sortOrder))
          : (last?.sortOrder ?? 0) + 1,
      },
    });

    await logAudit({
      admin: currentAdmin(req),
      action: 'subcategory.created',
      entity: 'subcategory',
      entityId: subcategory.id,
      details: `${category.name} → ${subcategory.name}`,
    });
    res.status(201).json({ subcategory });
  })
);

export default router;
