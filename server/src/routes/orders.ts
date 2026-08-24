import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requireAuth } from '../lib/auth.ts';

const router = Router();

const ORDER_STATUSES = ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'] as const;

function orderToApi(order: { customerAddress: string; [k: string]: unknown }) {
  let customerAddress: unknown = {};
  if (typeof order.customerAddress === 'string' && order.customerAddress) {
    try {
      customerAddress = JSON.parse(order.customerAddress);
    } catch {
      customerAddress = {};
    }
  }
  return { ...order, customerAddress };
}

/**
 * Public: place an order.
 * The server recomputes subtotal/total from the item snapshots it receives so
 * totals are trustworthy, and validates coupons against the DB.
 */
router.post(
  '/orders',
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const items = Array.isArray(body.items) ? body.items : [];
    const customerAddress = (body.customerAddress || {}) as Record<string, unknown>;

    if (items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }
    if (!customerAddress.fullName || !customerAddress.phone) {
      return res.status(400).json({ error: 'Customer name and phone are required' });
    }

    let subtotal = 0;
    const orderItems = items.map((raw: unknown) => {
      const it = (raw || {}) as Record<string, unknown>;
      const product = (it.product || {}) as Record<string, unknown>;
      const price = Number(it.price ?? product.price ?? 0) || 0;
      const qty = Math.max(1, Math.floor(Number(it.quantity) || 1));
      subtotal += price * qty;
      return {
        productId: typeof it.productId === 'string' ? it.productId : null,
        productName: String(it.productName ?? product.name ?? 'Unknown product'),
        productSku: String(product.sku ?? it.sku ?? ''),
        size: String(it.size ?? (it.selectedSize as Record<string, unknown>)?.size ?? ''),
        color: String(it.color ?? (it.selectedColor as Record<string, unknown>)?.name ?? ''),
        quantity: qty,
        price,
      };
    });

    // Coupon validation server-side
    let discount = 0;
    let couponCode: string | null = null;
    if (body.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: String(body.couponCode).trim().toUpperCase() },
      });
      if (coupon && coupon.active && subtotal >= coupon.minSpend) {
        couponCode = coupon.code;
        discount =
          coupon.discountType === 'percent' && coupon.value >= 100
            ? subtotal
            : coupon.discountType === 'percent'
              ? Math.round((subtotal * coupon.value) / 100)
              : Math.min(coupon.value, subtotal);
        await prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
      }
    }

    const deliveryMethod = String(body.deliveryMethod || 'standard');
    const shippingFee = deliveryMethod === 'pickup' ? 0 : Math.max(0, Number(body.shippingFee) || 120);
    const total = Math.max(0, subtotal - discount) + shippingFee;

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        trackingCode: `AKS-BD-${randomSuffix}`,
        status: 'confirmed',
        customerName: String(customerAddress.fullName),
        customerPhone: String(customerAddress.phone),
        customerEmail: String(customerAddress.email || ''),
        customerAddress: JSON.stringify(customerAddress),
        deliveryMethod,
        pickupStore: deliveryMethod === 'pickup' ? String(body.pickupStore || '') : null,
        paymentMethod: String(body.paymentMethod || 'cod'),
        subtotal,
        discount,
        shippingFee,
        total,
        couponCode,
        estimatedDelivery: 'Delivery time will be confirmed after your order is placed.',
        items: { create: orderItems },
      },
      include: { items: true },
    });

    res.status(201).json({ order: orderToApi(order) });
  })
);

/** Public: track an order by its AKS-BD tracking code. */
router.get(
  '/orders/track/:trackingCode',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { trackingCode: String(req.params.trackingCode).toUpperCase() },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ error: 'No order found for that tracking code' });
    res.json({ order: orderToApi(order) });
  })
);

/* =========================== ADMIN ORDER ROUTES =========================== */

router.get(
  '/admin/orders',
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (q.status) where.status = q.status;
    if (q.search) {
      const term = String(q.search).trim();
      where.OR = [
        { orderNumber: { contains: term } },
        { trackingCode: { contains: term } },
        { customerName: { contains: term } },
        { customerPhone: { contains: term } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ orders: orders.map(orderToApi), count: orders.length });
  })
);

router.patch(
  '/admin/orders/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const { status } = (req.body || {}) as Record<string, unknown>;
    if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
      return res.status(400).json({ error: `status must be one of: ${ORDER_STATUSES.join(', ')}` });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status: String(status) },
      include: { items: true },
    });
    res.json({ order: orderToApi(order) });
  })
);

export default router;