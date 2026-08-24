import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requireAuth } from '../lib/auth.ts';

const router = Router();

function reviewToApi(r: { date: Date | string; [k: string]: unknown }) {
  return r;
}

/** Public: approved reviews for a product (looked up by slug). */
router.get(
  '/products/:slug/reviews',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { slug: req.params.slug } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const reviews = await prisma.review.findMany({
      where: { productId: product.id, isApproved: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ reviews: reviews.map(reviewToApi) });
  })
);

/* =========================== ADMIN REVIEW MODERATION =========================== */

router.get(
  '/admin/reviews',
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (q.approved === 'true') where.isApproved = true;
    if (q.approved === 'false') where.isApproved = false;
    if (q.productId) where.productId = q.productId;

    const reviews = await prisma.review.findMany({
      where,
      include: { product: { select: { id: true, name: true, slug: true, sku: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ reviews: reviews.map(reviewToApi) });
  })
);

router.patch(
  '/admin/reviews/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Review not found' });

    const body = (req.body || {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (body.isApproved !== undefined) data.isApproved = Boolean(body.isApproved);
    if (body.verified !== undefined) data.verified = Boolean(body.verified);

    const review = await prisma.review.update({ where: { id }, data });
    res.json({ review: reviewToApi(review) });
  })
);

router.delete(
  '/admin/reviews/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Review not found' });
    await prisma.review.delete({ where: { id } });
    res.json({ deleted: true });
  })
);

export default router;