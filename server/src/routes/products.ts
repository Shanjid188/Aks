import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import type { Prisma } from '@prisma/client';
import { productFromApi, productToApi } from '../utils/product.ts';
import { asyncHandler, requireAuth } from '../lib/auth.ts';

const router = Router();

type SimpleFilter = Record<string, unknown>;

/** Public product catalog — mirrors the storefront filter behaviour. */
router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const where: SimpleFilter = { isActive: true };

    if (q.category && q.category !== 'all') where.category = q.category;
    if (q.subcategory && q.subcategory !== 'All' && q.subcategory !== 'all') where.subcategory = q.subcategory;
    if (q.brand) {
      const brands = String(q.brand).split(',').map((b) => b.trim()).filter(Boolean);
      if (brands.length === 1) where.brand = brands[0];
      else if (brands.length > 1) where.brand = { in: brands };
    }
    if (q.minPrice || q.maxPrice) {
      where.price = {};
      if (q.minPrice) (where.price as Record<string, unknown>).gte = Number(q.minPrice);
      if (q.maxPrice) (where.price as Record<string, unknown>).lte = Number(q.maxPrice);
    }
    if (q.onSaleOnly === 'true') where.discountPercent = { gt: 0 };
    if (q.search && String(q.search).trim()) {
      const term = String(q.search).trim();
      where.OR = [
        { name: { contains: term } },
        { brand: { contains: term } },
        { subcategory: { contains: term } },
        { category: { contains: term } },
        { tags: { contains: term } },
        { sku: { contains: term } },
      ];
    }

    const sort = String(q.sort || 'featured');
    const orderBy =
      sort === 'price-low'
        ? [{ price: 'asc' as const }]
        : sort === 'price-high'
          ? [{ price: 'desc' as const }]
          : sort === 'rating'
            ? [{ rating: 'desc' as const }]
            : sort === 'newest'
              ? [{ createdAt: 'desc' as const }]
              : sort === 'bestseller'
                ? [{ isBestSeller: 'desc' as const }, { reviewsCount: 'desc' as const }]
                : [{ featuredOrder: 'asc' as const }, { rating: 'desc' as const }];

    const products = await prisma.product.findMany({ where, orderBy });
    res.json({ products: products.map(productToApi), count: products.length });
  })
);

/** Public: single product by slug. */
router.get(
  '/products/:slug',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: { reviews: { where: { isApproved: true }, orderBy: { createdAt: 'desc' } } },
    });
    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(productToApi(product));
  })
);

function parseBool(v: unknown, fallback = false): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v === 'true' || v === '1';
  return fallback;
}

/* =========================== ADMIN PRODUCT CRUD =========================== */

router.get(
  '/admin/products',
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const where: SimpleFilter = {};
    if (q.search) {
      const term = String(q.search).trim();
      where.OR = [
        { name: { contains: term } },
        { sku: { contains: term } },
        { brand: { contains: term } },
        { subcategory: { contains: term } },
      ];
    }
    if (q.all !== 'true') where.isActive = true;

    const products = await prisma.product.findMany({ where, orderBy: [{ updatedAt: 'desc' as const }] });
    res.json({ products: products.map(productToApi), count: products.length });
  })
);

router.post(
  '/admin/products',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    if (!body.name || !body.brand || !body.category || !body.subcategory || typeof body.price === 'undefined') {
      return res.status(400).json({ error: 'name, brand, category, subcategory and price are required' });
    }

    const slug = String(body.slug || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const sku = String(body.sku || `AKS-${Date.now().toString(36).toUpperCase()}`).toUpperCase();

    try {
      const createData = {
        ...productFromApi(body),
        sku,
        slug: slug || `${String(body.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`,
      } as Prisma.ProductUncheckedCreateInput;
      const product = await prisma.product.create({ data: createData });
      res.status(201).json({ product: productToApi(product) });
    } catch {
      return res.status(409).json({ error: 'A product with this SKU or slug already exists' });
    }
  })
);

router.patch(
  '/admin/products/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const data = productFromApi((req.body || {}) as Record<string, unknown>);
    // SKU / slug uniqueness should not be changed via PATCH in this version
    delete data.sku;
    delete data.slug;

    try {
      const product = await prisma.product.update({ where: { id }, data });
      res.json({ product: productToApi(product) });
    } catch {
      res.status(409).json({ error: 'Update failed — duplicate SKU or slug' });
    }
  })
);

/** Soft-delete: hides the product from the storefront but keeps order history valid. */
router.delete(
  '/admin/products/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const product = await prisma.product.update({ where: { id }, data: { isActive: false } });
    res.json({ product: productToApi(product), deleted: true });
  })
);

export default router;