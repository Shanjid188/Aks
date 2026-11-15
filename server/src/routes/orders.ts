import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requireAuth, requirePermission, currentAdmin, hasPermission } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';
import { parseJsonSafe } from '../utils/json.ts';
import { applyStockDelta } from '../lib/stock.ts';
import { loadCheckoutConfig } from '../lib/checkout.ts';
import { parseCheckoutTracking, trackOrderPlaced } from '../lib/tracking/orders.ts';
import { changeOrderStatus, ITEM_INCLUDE, ORDER_STATUSES, StatusChangeError } from '../lib/orderStatus.ts';
import { attributionCreateInput, parseAttribution } from '../lib/attribution.ts';
import { convertSession } from '../lib/checkoutSessions.ts';

const router = Router();

/** Resolve a product row from an order-item payload (id or SKU). */
async function resolveOrderProduct(it: Record<string, unknown>) {
  const productObj = (it.product || {}) as Record<string, unknown>;
  const id = typeof it.productId === 'string' ? it.productId : (typeof productObj.id === 'string' ? productObj.id : null);
  const sku = typeof it.sku === 'string' && it.sku ? it.sku : (typeof productObj.sku === 'string' ? productObj.sku : null);
  if (!id && !sku) return null;
  if (id) {
    const p = await prisma.product.findUnique({ where: { id } });
    if (p) return p;
  }
  if (sku) return prisma.product.findUnique({ where: { sku } });
  return null;
}

/** Public: serialise an order for API responses (parses the address JSON + item images). */
export function orderToApi(order: { customerAddress: string; items?: unknown; [k: string]: unknown }) {
  let customerAddress: unknown = {};
  if (typeof order.customerAddress === 'string' && order.customerAddress) {
    try {
      customerAddress = JSON.parse(order.customerAddress);
    } catch {
      customerAddress = {};
    }
  }
  // SQLite stores images as TEXT; parse it back into an array for the UI.
  if (Array.isArray(order.items)) {
    return {
      ...order,
      customerAddress,
      items: order.items.map((it) => ({
        ...it,
        product: it.product
          ? { ...it.product, images: parseJsonSafe<string[]>(String(it.product.images ?? ''), []) }
          : it.product,
      })),
    };
  }
  return { ...order, customerAddress };
}

/** Server-side discount computation shared by checkout and admin item edits. */
function computeDiscount(
  subtotal: number,
  discountType: string,
  value: number
): number {
  if (discountType === 'percent' && value >= 100) return subtotal;
  if (discountType === 'percent') return Math.round((subtotal * value) / 100);
  return Math.min(value, subtotal);
}

/**
 * A free-delivery coupon is any coupon granting 100% off. Detected by data, not
 * by code name, so coupons created in Admin → Coupons behave correctly.
 */
function isFreeDeliveryCoupon(coupon: { discountType: string; value: number }): boolean {
  return coupon.discountType === 'percent' && coupon.value >= 100;
}

/**
 * Public: place an order.
 * The server recomputes subtotal/total from the item snapshots it receives so
 * totals are trustworthy, and validates coupons against the DB.
 * New orders default to 'pending' — they appear in the admin Pending queue immediately.
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

    // Validate quantities up-front: reject invalid/negative values outright.
    for (const raw of items) {
      const it = (raw || {}) as Record<string, unknown>;
      const rawQty = Number(it.quantity);
      if (!Number.isFinite(rawQty) || Math.floor(rawQty) !== rawQty || rawQty < 1) {
        return res.status(400).json({ error: 'Invalid quantity: it must be a whole number of at least 1' });
      }
    }

    // Prices always come from the Product table. Any price or line total in the
    // request is ignored, and an item that does not match a real product is
    // rejected — otherwise it would be charged at whatever price the client sent.
    let subtotal = 0;
    const stockTargets: { productId: string; qty: number }[] = [];
    const orderItems = [];
    for (const raw of items) {
      const it = (raw || {}) as Record<string, unknown>;
      const qty = Math.floor(Number(it.quantity));

      const resolved = await resolveOrderProduct(it);
      if (!resolved) {
        return res.status(400).json({ error: 'An item in your cart is no longer available. Please refresh your cart.' });
      }
      subtotal += resolved.price * qty;
      stockTargets.push({ productId: resolved.id, qty });
      // Snapshot the name/sku/price so order history survives later catalog edits.
      orderItems.push({
        productId: resolved.id,
        productName: resolved.name,
        productSku: resolved.sku,
        size: String(it.size ?? (it.selectedSize as Record<string, unknown>)?.size ?? ''),
        color: String(it.color ?? (it.selectedColor as Record<string, unknown>)?.name ?? ''),
        quantity: qty,
        price: resolved.price,
        unitCost: resolved.costPrice ?? null,
      });
    }

    if (stockTargets.length > 0) {
      // For products that track stock, ensure enough quantity is available
      // before committing the order.
      const tracked = await prisma.product.findMany({
        where: { id: { in: stockTargets.map((s) => s.productId) }, trackStock: true },
      });
      for (const t of stockTargets) {
        const row = tracked.find((p) => p.id === t.productId);
        if (row && row.stockQuantity < t.qty) {
          return res.status(400).json({
            error: `${row.name} doesn't have enough stock (available: ${row.stockQuantity}, ordered: ${t.qty})`,
          });
        }
      }
    }

    // Coupon validation server-side
    let discount = 0;
    let couponCode: string | null = null;
    let freeDeliveryCoupon = false;
    if (body.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: String(body.couponCode).trim().toUpperCase() },
      });
      if (coupon && coupon.active && subtotal >= coupon.minSpend) {
        couponCode = coupon.code;
        // A free-delivery code is applied to the shipping fee, never to the
        // subtotal — otherwise a 100% coupon would give away the whole order.
        freeDeliveryCoupon = isFreeDeliveryCoupon(coupon);
        if (!freeDeliveryCoupon) {
          discount = computeDiscount(subtotal, coupon.discountType, coupon.value);
        }
        await prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
      }
    }

    const deliveryMethod = String(body.deliveryMethod || '');
    // The API owns the delivery charge: the configured fee for the chosen zone is
    // used and any shippingFee sent by the client is ignored, so a tampered or
    // stale request cannot ship an order for free.
    const checkoutConfig = await loadCheckoutConfig();
    const zone = checkoutConfig.zones.find((z) => z.id === deliveryMethod);
    if (deliveryMethod !== 'pickup' && !zone) {
      return res.status(400).json({ error: 'Please choose a valid delivery area' });
    }
    // Free delivery by amount uses the same rule the checkout page shows: the
    // pre-discount subtotal, which is built from catalog prices only (above).
    const freeByThreshold = subtotal >= checkoutConfig.freeShippingThreshold;
    const shippingFee =
      freeDeliveryCoupon || freeByThreshold || deliveryMethod === 'pickup' ? 0 : (zone?.fee ?? 0);
    const total = Math.max(0, subtotal - discount) + shippingFee;

    // Payment method must be one the merchant has enabled (and configured).
    const paymentMethod = checkoutConfig.paymentMethods.find(
      (m) => m.id === String(body.paymentMethod || 'cod')
    );
    if (!paymentMethod) {
      return res.status(400).json({ error: 'That payment method is not available' });
    }
    const paymentReference = String(body.paymentReference || '').trim();
    if (paymentMethod.manual && !paymentReference) {
      return res.status(400).json({ error: `${paymentMethod.label} needs the transaction ID` });
    }

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `ORD-${Date.now()}`;
    const trackingCode = `AKS-BD-${randomSuffix}`;
    // Marketing source (UTM / referrer always; ad click IDs only with
    // advertising consent). Written in the same statement as the order.
    const checkoutTracking = parseCheckoutTracking(body.tracking);
    const attributions = await attributionCreateInput(parseAttribution(body.attribution, checkoutTracking.marketing));
    const order = await prisma.order.create({
      data: {
        orderNumber,
        trackingCode,
        invoiceNumber: `INV-${Date.now()}`,
        status: 'pending',
        source: 'online', // storefront checkout — POS orders will set 'pos'
        customerName: String(customerAddress.fullName),
        customerPhone: String(customerAddress.phone),
        customerEmail: String(customerAddress.email || ''),
        customerAddress: JSON.stringify(customerAddress),
        deliveryMethod,
        pickupStore: deliveryMethod === 'pickup' ? String(body.pickupStore || '') : null,
        paymentMethod: paymentMethod.id,
        // Storefront orders start unpaid. A customer-declared transfer keeps the
        // order unpaid until an admin verifies it — we never claim money arrived.
        paymentStatus: 'unpaid',
        paidAmount: 0,
        dueAmount: total,
        // The customer's declared transaction ID for a manual transfer. The order
        // stays unpaid until an admin checks it against the account.
        paymentReference: paymentMethod.manual ? paymentReference : null,
        subtotal,
        discount,
        shippingFee,
        tax: Number(body.tax) || 0,
        total,
        couponCode,
        estimatedDelivery: 'Delivery time will be confirmed after your order is placed.',
        items: { create: orderItems },
        ...(attributions ? { attributions: { create: attributions } } : {}),
      },
      include: { items: true },
    });

    // Deduct stock for tracked products, logging each movement in the ledger.
    if (stockTargets.length > 0) {
      const tracked = await prisma.product.findMany({
        where: { id: { in: stockTargets.map((s) => s.productId) }, trackStock: true },
        select: { id: true, trackStock: true },
      });
      const trackedIds = new Set(tracked.map((t) => t.id));
      for (const t of stockTargets) {
        if (!trackedIds.has(t.productId)) continue;
        await applyStockDelta({
          productId: t.productId,
          change: -t.qty,
          reason: 'order.placed',
          referenceType: 'order',
          referenceId: order.id,
          createdBy: null,
        });
      }
    }

    // Purchase conversion (Meta CAPI + GA4 refund eligibility). Consent-gated
    // and fire-and-forget — it never delays or fails the order response.
    trackOrderPlaced(order, req, checkoutTracking);
    // Abandoned-cart analytics: mark the checkout session converted (never fails the order).
    await convertSession(body.checkoutSession, order.id);

    res.status(201).json({ order: orderToApi(order) });
  })
);

/** Public: fetch a single order by its database ID (order confirmation page).
 *  Returns the exact same shape as the POST /orders response so the storefront
 *  confirmation page can re-hydrate the order after a refresh or for guests.
 *  Order IDs are unguessable cuids, and the payload mirrors what POST already
 *  returns — no extra sensitive data is exposed. */
router.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: ITEM_INCLUDE,
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order: orderToApi(order) });
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
    // Courier booking errors are internal (admin-only); the courier's own
    // tracking code/link and status are what the customer tracking page shows.
    const { courierError: _courierError, ...publicOrder } = order;
    res.json({ order: orderToApi(publicOrder) });
  })
);

/* =========================== ADMIN ORDER ROUTES =========================== */

router.get(
  '/admin/orders',
  requirePermission(PERM.ORDERS_VIEW),
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (q.status) where.status = q.status;
    // Marketing filters (last non-direct touch).
    if (q.channel === 'direct') where.attributions = { none: {} };
    else if (q.channel || q.campaignId) {
      where.attributions = {
        some: { touch: 'last', ...(q.channel ? { channel: String(q.channel) } : {}), ...(q.campaignId ? { campaignId: String(q.campaignId) } : {}) },
      };
    }
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
      include: ITEM_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ orders: orders.map(orderToApi), count: orders.length });
  })
);

/** Admin: single order detail (with joined products for the item editor). */
router.get(
  '/admin/orders/:id',
  requirePermission(PERM.ORDERS_DETAILS),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: ITEM_INCLUDE,
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Marketing source: first/last non-direct touch. The raw ad click ID is
    // never shown — only whether one was captured.
    const touches = await prisma.orderAttribution.findMany({
      where: { orderId: order.id },
      include: { campaign: { select: { id: true, name: true, status: true } } },
    });
    const attribution = touches.map(({ clickId, ...t }) => ({ ...t, hasClickId: clickId !== null }));
    res.json({ order: { ...orderToApi(order), attribution } });
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

    // Cancelling an order needs its own permission; every other transition is
    // a plain status change. Enforced here (not in middleware) because the
    // required permission depends on the submitted status.
    const nextStatus = String(status);
    const isCancel = nextStatus === 'cancelled' && existing.status !== 'cancelled';
    const allowed = await hasPermission(req, isCancel ? PERM.ORDERS_CANCEL : PERM.ORDERS_STATUS);
    if (!allowed) {
      return res.status(403).json({ error: "You don't have permission to perform this action" });
    }

    // Stock restoration, the concurrent-edit guard, audit and GA4 refund live in
    // the shared transition (also used by the courier webhook/sync).
    let order;
    try {
      ({ order } = await changeOrderStatus({
        orderId: id,
        nextStatus,
        admin: currentAdmin(req),
        expectedStatus: existing.status,
      }));
    } catch (err) {
      if (err instanceof StatusChangeError) return res.status(err.status).json({ error: err.message });
      throw err;
    }

    res.json({ order: orderToApi(order) });
  })
);

/**
 * Admin: replace the items of an order and recompute every total server-side.
 *
 * Body: { items: [{ productId, quantity?, size?, color? }] }
 *
 * - Product names/prices always come from the live Product table (no client prices).
 * - Quantities must be positive whole numbers; quantity is additionally clamped
 *   to [1, stockCount] when the chosen size exposes a real stock count.
 */
router.put(
  '/admin/orders/:id/items',
  requirePermission(PERM.ORDERS_EDIT),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const rawItems = Array.isArray((req.body || {}).items) ? (req.body as { items: unknown[] }).items : [];
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    const normalized: { productId: string; quantity: number; size: string; color: string }[] = [];
    for (const raw of rawItems) {
      const it = (raw || {}) as Record<string, unknown>;
      const productId = typeof it.productId === 'string' ? it.productId : '';
      if (!productId) return res.status(400).json({ error: 'Every item requires a valid product' });
      // Quantities must be positive whole numbers — reject invalid/negative
      // values outright instead of silently clamping them.
      const rawQty = Number(it.quantity);
      if (!Number.isFinite(rawQty) || Math.floor(rawQty) !== rawQty || rawQty < 1) {
        return res.status(400).json({ error: 'Invalid quantity: it must be a whole number of at least 1' });
      }
      normalized.push({ productId, quantity: rawQty, size: String(it.size ?? ''), color: String(it.color ?? '') });
    }

    // Load live products for every requested id (also validates ids).
    const ids = [...new Set(normalized.map((n) => n.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: ids } } });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const missingIds = ids.filter((pid) => !productMap.has(pid));
    if (missingIds.length > 0) {
      return res.status(400).json({ error: `Unknown product(s): ${missingIds.join(', ')}` });
    }

    let subtotal = 0;
    let orderItems: {
      productId: string;
      productName: string;
      productSku: string;
      size: string;
      color: string;
      quantity: number;
      price: number;
    }[];
    try {
      orderItems = normalized.map((n) => {
        const product = productMap.get(n.productId)!;
        const sizes = parseJsonSafe<{ size: string; inStock?: boolean; stockCount?: number }[]>(product.sizes, []);
        const sizeInfo = sizes.find((s) => s.size === n.size);

        let quantity = n.quantity;
        if (sizeInfo) {
          if (sizeInfo.inStock === false) {
            throw new Error(`out of stock: ${product.name} (${n.size})`);
          }
          if (typeof sizeInfo.stockCount === 'number' && sizeInfo.stockCount > 0) {
            quantity = Math.max(1, Math.min(n.quantity, sizeInfo.stockCount));
          }
        }

        const price = product.price;
        subtotal += price * quantity;
        return {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          size: n.size,
          color: n.color,
          quantity,
          price,
        };
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(400).json({ error: /out of stock/i.test(message) ? message : `Invalid item: ${message}` });
    }

    // Recompute discount using the same coupon rules as checkout when the order still has a coupon.
    let discount = 0;
    let freeDeliveryCoupon = false;
    if (existing.couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: existing.couponCode } });
      if (coupon && coupon.active && subtotal >= coupon.minSpend) {
        freeDeliveryCoupon = isFreeDeliveryCoupon(coupon);
        if (!freeDeliveryCoupon) {
          discount = computeDiscount(subtotal, coupon.discountType, coupon.value);
        }
      }
    }

    const shippingFee =
      freeDeliveryCoupon || existing.deliveryMethod === 'pickup' ? 0 : existing.shippingFee;
    const total = Math.max(0, subtotal - discount) + shippingFee;
    // Keep the payment ledger consistent when item edits change the total:
    // never reduce the already-paid amount, only re-derive what is still due.
    const paidAmount = Math.max(0, existing.paidAmount);
    const dueAmount = Math.max(0, total - paidAmount);

    try {
      // Compute stock deltas for tracked products: restore old quantities, then
      // deduct re-added quantities so inventory stays correct after item edits.
      const oldItems = await prisma.orderItem.findMany({ where: { orderId: id } });
      const oldMap = new Map<string, number>();
      for (const o of oldItems) {
        if (o.productId) oldMap.set(o.productId, (oldMap.get(o.productId) || 0) + o.quantity);
      }
      const newMap = new Map<string, number>();
      for (const oi of orderItems) {
        if (oi.productId) newMap.set(oi.productId, (newMap.get(oi.productId) || 0) + oi.quantity);
      }
      const productIds = [...new Set([...oldMap.keys(), ...newMap.keys()])];
      const tracked = await prisma.product.findMany({
        where: { id: { in: productIds }, trackStock: true },
        select: { id: true },
      });
      const trackedIds = new Set(tracked.map((t) => t.id));

      await prisma.$transaction([
        prisma.orderItem.deleteMany({ where: { orderId: id } }),
        prisma.order.update({
          where: { id },
          data: { subtotal, discount, shippingFee, total, paidAmount, dueAmount, items: { create: orderItems } },
        }),
      ]);

      for (const pid of productIds) {
        if (!trackedIds.has(pid)) continue;
        const before = oldMap.get(pid) || 0;
        const after = newMap.get(pid) || 0;
        await applyStockDelta({
          productId: pid,
          change: before - after, // + when items were removed, - when added
          reason: 'order.items.edited',
          referenceType: 'order',
          referenceId: id,
          createdBy: currentAdmin(req)?.email,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (/out of stock/i.test(message)) {
        return res.status(400).json({ error: message });
      }
      return res.status(400).json({ error: `Could not update the order items: ${message}` });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: ITEM_INCLUDE,
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order: orderToApi(order) });
  })
);

/**
 * Admin: update the customer info (name / phone / email / full shipping address)
 * of an order. Additive route used by the POS-style Manage Order screen.
 *
 * Body: { customerName?, customerPhone?, customerEmail?,
 *         customerAddress?: { fullName?, phone?, email?, streetAddress?, thana?, district?, division?, postalCode? } }
 *
 * - Name and phone are always required (same rule as order creation).
 * - Unspecified address fields keep their previous values.
 */
router.put(
  '/admin/orders/:id/customer',
  requirePermission(PERM.ORDERS_EDIT),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    if (existing.status === 'cancelled') {
      return res.status(400).json({ error: 'Cancelled orders cannot be edited' });
    }

    const body = (req.body || {}) as {
      customerName?: unknown;
      customerPhone?: unknown;
      customerEmail?: unknown;
      customerAddress?: Record<string, unknown>;
    };

    // Merge the submitted address over the previous one so partial updates keep old fields.
    const prevAddr = parseJsonSafe<Record<string, unknown>>(existing.customerAddress, {});
    const nextAddr: Record<string, unknown> = { ...prevAddr, ...(body.customerAddress || {}) };

    const fullName = String(body.customerName ?? nextAddr.fullName ?? existing.customerName ?? '').trim();
    const phone = String(body.customerPhone ?? nextAddr.phone ?? existing.customerPhone ?? '').trim();
    if (!fullName || !phone) {
      return res.status(400).json({ error: 'Customer name and phone are required' });
    }
    const email = String(body.customerEmail ?? nextAddr.email ?? existing.customerEmail ?? '').trim();

    const order = await prisma.order.update({
      where: { id },
      data: {
        customerName: fullName,
        customerPhone: phone,
        customerEmail: email,
        customerAddress: JSON.stringify({ ...nextAddr, fullName, phone, email }),
      },
      include: ITEM_INCLUDE,
    });

    await logAudit({
      admin: currentAdmin(req),
      action: 'order.customer.updated',
      entity: 'order',
      entityId: id,
      details: `${existing.orderNumber}: customer info updated (${fullName})`,
    });

    res.json({ order: orderToApi(order) });
  })
);

export default router;