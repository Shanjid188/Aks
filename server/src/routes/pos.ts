import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission, currentAdmin } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';
import { applyStockDelta } from '../lib/stock.ts';

const router = Router();

export interface PosSaleItemInput {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
  price?: number;
}

/**
 * POS: complete a physical-store sale.
 * Creates an order (source: 'pos'), records payment(s), deducts stock for
 * tracked products and writes StockMovement records. Returns the full order so
 * the frontend can print the receipt immediately.
 */
router.post(
  '/pos/sales',
  requirePermission(PERM.POS_SALE),
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const admin = currentAdmin(req);

    const itemsRaw = Array.isArray(body.items) ? (body.items as PosSaleItemInput[]) : [];
    const paymentsRaw = Array.isArray(body.payments) ? (body.payments as { method: string; amount: number }[]) : [];

    if (itemsRaw.length === 0) return res.status(400).json({ error: 'POS sale requires at least one item' });

    const quantityByProduct = new Map<string, number>();
    for (const it of itemsRaw) {
      const qty = Math.trunc(Number(it.quantity));
      if (!Number.isFinite(qty) || qty < 1) return res.status(400).json({ error: 'Invalid quantity in POS items' });
      quantityByProduct.set(it.productId, (quantityByProduct.get(it.productId) || 0) + qty);
    }

    const products = await prisma.product.findMany({ where: { id: { in: [...quantityByProduct.keys()] } } });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const missing = [...quantityByProduct.keys()].filter((id) => !productMap.has(id));
    if (missing.length > 0) return res.status(400).json({ error: `Unknown product(s): ${missing.join(', ')}` });

    // Guard against selling more than available stock for tracked products.
    for (const [pid, qty] of quantityByProduct) {
      const p = productMap.get(pid)!;
      if (p.trackStock && p.stockQuantity < qty) {
        return res.status(400).json({
          error: `${p.name} doesn't have enough stock (available: ${p.stockQuantity}, requested: ${qty})`,
        });
      }
    }

    // Build order items, computing subtotal from live product price unless the
    // client supplied an explicit price for the variant.
    let subtotal = 0;
    const orderItems = itemsRaw.map((it) => {
      const product = productMap.get(it.productId)!;
      const price = Number(it.price ?? product.price) || product.price;
      subtotal += price * it.quantity;
      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        unitCost: product.costPrice ?? null,
        size: String(it.size ?? '').trim() || 'Free Size',
        color: String(it.color ?? '').trim() || 'Default',
        quantity: it.quantity,
        price,
      };
    });

    // Discount + shipping + tax
    const discount = Math.max(0, Number(body.discount) || 0);
    const shippingFee = 0; // POS sales are in-store; no shipping
    const taxPercent = body.taxPercent !== undefined ? Number(body.taxPercent) || 0 : 0;
    const taxable = Math.max(0, subtotal - discount);
    const tax = Math.round(taxable * taxPercent) / 100;
    const total = Math.max(0, taxable) + tax + shippingFee;

    // Payment ledger
    const customerName = String((body as { customerName?: unknown }).customerName || 'Walk-in Customer');
    const customerPhone = String((body as { customerPhone?: unknown }).customerPhone || '');
    const customerEmail = String((body as { customerEmail?: unknown }).customerEmail || '');

    const paidAmount = Math.min(
      total,
      paymentsRaw.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    );
    const dueAmount = Math.max(0, Math.round((total - paidAmount) * 100) / 100);
    const paymentStatus = dueAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'due';

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const order = await prisma.order.create({
      data: {
        orderNumber: `POS-${Date.now()}`,
        trackingCode: `AKS-BD-${randomSuffix}`,
        invoiceNumber: `POS-INV-${Date.now()}`,
        status: 'confirmed', // POS sales are paid on the spot (or partial due)
        source: 'pos',
        customerName,
        customerPhone,
        customerEmail,
        customerAddress: JSON.stringify({ fullName: customerName, phone: customerPhone, email: customerEmail }),
        deliveryMethod: 'pickup',
        pickupStore: null,
        paymentMethod: paymentsRaw[0]?.method ?? 'cash',
        paymentStatus,
        paidAmount,
        dueAmount,
        cashierId: admin.id,
        subtotal,
        discount,
        shippingFee,
        tax,
        total,
        customerNote: String(body.note ?? '') || null,
        packedStatus: 'not_packed',
        items: { create: orderItems },
        payments: {
          create: paymentsRaw
            .filter((p) => (Number(p.amount) || 0) > 0)
            .map((p) => ({
              amount: Number(p.amount),
              method: String(p.method).trim() || 'cash',
              receivedBy: admin.email,
            })),
        },
      },
      include: { items: true, payments: true },
    });


    // Deduct stock for tracked products.
    for (const [pid, qty] of quantityByProduct) {
      const p = productMap.get(pid)!;
      if (!p.trackStock) continue;
      await applyStockDelta({
        productId: pid,
        change: -qty,
        reason: 'pos.sale',
        referenceType: 'order',
        referenceId: order.id,
        createdBy: admin.email,
      });
    }

    await logAudit({
      admin,
      action: 'pos.sale.completed',
      entity: 'order',
      entityId: order.id,
      details: `${order.orderNumber} — ${customerName}, total ${total}, paid ${paidAmount}`,
    });

    res.status(201).json({
      order,
      sale: { subtotal, discount, tax, shippingFee, total, paidAmount, dueAmount, paymentStatus },
    });
  })
);

/** Admin: held POS carts (persisted as orders whose heldAt is set). */
router.get(
  '/pos/holds',
  requirePermission(PERM.POS_VIEW),
  asyncHandler(async (_req, res) => {
    const held = await prisma.order.findMany({
      where: { source: 'pos', heldAt: { not: null }, status: { in: ['pending', 'held'] } },
      include: { items: true },
      orderBy: { heldAt: 'desc' },
    });
    res.json({ holds: held });
  })
);

/** Admin: hold the current POS cart — persisted as a pending, non-stock-deducted
 *  order with `heldAt` set, resumable later via PATCH /pos/holds/:id. */
router.post(
  '/pos/holds',
  requirePermission(PERM.POS_HOLD),
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const itemsRaw = Array.isArray(body.items) ? (body.items as PosSaleItemInput[]) : [];
    if (itemsRaw.length === 0) return res.status(400).json({ error: 'Nothing to hold' });
    for (const it of itemsRaw) {
      const qty = Math.trunc(Number(it.quantity));
      if (!Number.isFinite(qty) || qty < 1) return res.status(400).json({ error: 'Invalid quantity in held items' });
    }

    const products = await prisma.product.findMany({ where: { id: { in: itemsRaw.map((i) => i.productId) } } });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const missing = itemsRaw.map((i) => i.productId).filter((id) => !productMap.has(id));
    if (missing.length > 0) return res.status(400).json({ error: `Unknown product(s): ${missing.join(', ')}` });

    let subtotal = 0;
    const orderItems = itemsRaw.map((it) => {
      const product = productMap.get(it.productId)!;
      const price = Number(it.price ?? product.price) || product.price;
      subtotal += price * it.quantity;
      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        unitCost: product.costPrice ?? null,
        size: String(it.size ?? '').trim() || 'Free Size',
        color: String(it.color ?? '').trim() || 'Default',
        quantity: it.quantity,
        price,
      };
    });

    const discount = Math.max(0, Number(body.discount) || 0);
    const total = Math.max(0, subtotal - discount);
    const customerName = String(body.customerName ?? '').trim() || 'Walk-in Customer';
    const customerPhone = String(body.customerPhone ?? '').trim();

    const order = await prisma.order.create({
      data: {
        orderNumber: `HOLD-${Date.now()}`,
        trackingCode: `AKS-${Math.floor(100000 + Math.random() * 900000)}`,
        invoiceNumber: null,
        status: 'pending',
        source: 'pos',
        heldAt: new Date(),
        customerName,
        customerPhone,
        customerEmail: String(body.customerEmail ?? '').trim(),
        customerAddress: JSON.stringify({ fullName: customerName, phone: customerPhone }),
        deliveryMethod: 'pickup',
        paymentMethod: String(body.paymentMethod ?? 'cash'),
        paymentStatus: 'due',
        paidAmount: 0,
        dueAmount: total,
        subtotal,
        discount,
        shippingFee: 0,
        tax: 0,
        total,
        packedStatus: 'not_packed',
        items: { create: orderItems },
      },
      include: { items: true },
    });

    await logAudit({
      admin: currentAdmin(req),
      action: 'pos.sale.held',
      entity: 'order',
      entityId: order.id,
      details: `${order.orderNumber} — held for ${customerName}, total ${total}`,
    });

    res.status(201).json({ order });
  })
);

/** Admin: release (or update) a held order so it can be resumed or cancelled. */
router.patch(
  '/pos/holds/:id',
  requirePermission(PERM.POS_HOLD),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const { held } = (req.body || {}) as { held?: boolean };
    const order = await prisma.order.update({
      where: { id },
      data: { heldAt: held === false ? null : new Date(), status: 'pending' },
      include: { items: true, payments: true },
    });
    res.json({ order });
  })
);

/** Admin: discard a held POS cart. Safe — held carts never touch stock. */
router.delete(
  '/pos/holds/:id',
  requirePermission(PERM.POS_HOLD),
  asyncHandler(async (req, res) => {
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.source !== 'pos' || !existing.heldAt) {
      return res.status(404).json({ error: 'Held sale not found' });
    }
    await prisma.order.delete({ where: { id: existing.id } });
    await logAudit({
      admin: currentAdmin(req),
      action: 'pos.sale.hold_cancelled',
      entity: 'order',
      entityId: existing.id,
      details: `${existing.orderNumber} — held cart discarded`,
    });
    res.json({ ok: true });
  })
);

export default router;
