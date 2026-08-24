import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requireAuth } from '../lib/auth.ts';

const router = Router();

/** Public: validate a coupon code before checkout. */
router.post(
  '/coupons/validate',
  asyncHandler(async (req, res) => {
    const { code } = (req.body || {}) as Record<string, unknown>;
    if (!code) return res.status(400).json({ error: 'Coupon code is required' });

    const coupon = await prisma.coupon.findUnique({
      where: { code: String(code).trim().toUpperCase() },
    });

    if (!coupon || !coupon.active) {
      return res.json({ valid: false, message: 'Invalid or inactive coupon code' });
    }
    res.json({ valid: true, coupon });
  })
);

/* =========================== ADMIN COUPON CRUD =========================== */

router.get(
  '/admin/coupons',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ coupons });
  })
);

router.post(
  '/admin/coupons',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    if (!body.code || !body.discountType || typeof body.value === 'undefined') {
      return res.status(400).json({ error: 'code, discountType and value are required' });
    }

    const value = Number(body.value);
    const minSpend = Number(body.minSpend) || 0;
    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ error: 'value must be a positive number' });
    }

    try {
      const coupon = await prisma.coupon.create({
        data: {
          code: String(body.code).trim().toUpperCase(),
          discountType: String(body.discountType),
          value,
          minSpend,
          description: String(body.description || ''),
          active: Boolean(body.active ?? true),
        },
      });
      res.status(201).json({ coupon });
    } catch {
      res.status(409).json({ error: 'A coupon with this code already exists' });
    }
  })
);

router.patch(
  '/admin/coupons/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Coupon not found' });

    const body = (req.body || {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (body.description !== undefined) data.description = String(body.description);
    if (body.active !== undefined) data.active = Boolean(body.active);
    if (body.discountType !== undefined) data.discountType = String(body.discountType);
    if (body.value !== undefined) data.value = Number(body.value);
    if (body.minSpend !== undefined) data.minSpend = Number(body.minSpend);

    const coupon = await prisma.coupon.update({ where: { id }, data });
    res.json({ coupon });
  })
);

router.delete(
  '/admin/coupons/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Coupon not found' });
    await prisma.coupon.delete({ where: { id } });
    res.json({ deleted: true });
  })
);

export default router;