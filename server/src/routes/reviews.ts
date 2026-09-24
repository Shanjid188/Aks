import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission, currentAdmin } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';

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

/**
 * Public: submit a review for a product (looked up by slug).
 *
 * Reviews land as `isApproved: false`, so nothing reaches the storefront until
 * an admin approves it in Admin → Reviews. The customer is told exactly that.
 */
router.post(
  '/products/:slug/reviews',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { slug: req.params.slug } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const body = (req.body || {}) as Record<string, unknown>;
    const author = String(body.author || '').trim();
    const comment = String(body.comment || '').trim();
    const rating = Math.round(Number(body.rating));

    if (!author || !comment) {
      return res.status(400).json({ error: 'Name and review text are required' });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    if (comment.length > 2000) {
      return res.status(400).json({ error: 'Review text is too long (2000 characters max)' });
    }

    const review = await prisma.review.create({
      data: {
        productId: product.id,
        author: author.slice(0, 60),
        city: String(body.city || '').trim().slice(0, 60) || null,
        rating,
        title: String(body.title || '').trim().slice(0, 120) || 'Customer review',
        comment: comment.slice(0, 2000),
        date: new Date().toISOString().slice(0, 10),
        // A storefront submission is not a verified purchase — an admin can
        // mark it verified after checking the order history.
        verified: false,
        helpfulCount: 0,
        fitFeedback: body.fitFeedback ? String(body.fitFeedback).slice(0, 40) : null,
        isApproved: false,
      },
      select: { id: true, isApproved: true },
    });

    res.status(201).json({ review, pending: true });
  })
);

/* =========================== ADMIN REVIEW MODERATION =========================== */

router.get(
  '/admin/reviews',
  requirePermission(PERM.REVIEWS_VIEW),
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
  requirePermission(PERM.REVIEWS_MODERATE),
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
  requirePermission(PERM.REVIEWS_MODERATE),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Review not found' });
    await prisma.review.delete({ where: { id } });
    await logAudit({
      admin: currentAdmin(req),
      action: 'review.deleted',
      entity: 'review',
      entityId: id,
      details: `${existing.title} by ${existing.author}`,
    });
    res.json({ deleted: true });
  })
);

export default router;