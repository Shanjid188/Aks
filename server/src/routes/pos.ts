import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission, currentAdmin } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';
import { reserveStock } from '../lib/stock.ts';
import { createWithUniqueNumbers } from '../lib/numbers.ts';
import { HOLD_WHERE } from '../lib/holds.ts';

const router = Router();

/**
 * A held POS cart: an order row with a HOLD- number and no invoice yet. Matched
 * on that rather than `heldAt`, which older admin builds clear on resume —
 * that left resumed carts behind as pending orders nobody could remove.
 */


/** Remove a held cart once it has been sold or re-held; ignores anything that is not a hold. */
async function removeHold(holdId: unknown): Promise<void> {
  if (typeof holdId !== 'string' || !holdId) return;
  await prisma.order.deleteMany({ where: { id: holdId, ...HOLD_WHERE } });
}

export interface PosSaleItemInput {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
  /** Ignored: lines are always charged at the product's current price. */
  price?: number;
}

/**
 * Cash handed over beyond the amount due is change, not money kept. The
 * payment row stores what was applied; the tendered amount is kept in its note
 * (no schema change) so a reprinted receipt shows the same change.
 */
const TENDERED_NOTE = 'tendered:';

type PaymentRow = { amount: number; note: string | null; [k: string]: unknown };

/** Payment rows with `tendered` added: the cash handed over (= amount when no change was given). */
export function withTendered<T extends PaymentRow>(payments: T[]): (T & { tendered: number })[] {
  return payments.map((p) => {
    const fromNote = p.note?.startsWith(TENDERED_NOTE) ? Number(p.note.slice(TENDERED_NOTE.length)) : NaN;
    return { ...p, tendered: Number.isFinite(fromNote) ? fromNote : p.amount };
  });
}

/** Whole units ≥ 1, or null. */
function lineQuantity(raw: unknown): number | null {
  const qty = Math.trunc(Number(raw));
  return Number.isFinite(qty) && qty >= 1 ? qty : null;
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
      const qty = lineQuantity(it.quantity);
      if (qty === null) return res.status(400).json({ error: 'Invalid quantity in POS items' });
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

    // Every line is charged at the product's current price. A price sent by
    // the client is ignored: the POS screen has no price override, and trusting
    // it let a request sell at any price, including a negative one.
    let subtotal = 0;
    const orderItems = itemsRaw.map((it) => {
      const product = productMap.get(it.productId)!;
      const quantity = lineQuantity(it.quantity)!;
      const price = product.price;
      subtotal += price * quantity;
      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        unitCost: product.costPrice ?? null,
        size: String(it.size ?? '').trim() || 'Free Size',
        color: String(it.color ?? '').trim() || 'Default',
        quantity,
        price,
      };
    });

    // Discount + shipping + tax
    const discount = Math.max(0, Number(body.discount) || 0);
    const shippingFee = 0; // POS sales are in-store; no shipping
    const taxPercent = Math.min(100, Math.max(0, Number(body.taxPercent) || 0));
    const taxable = Math.max(0, subtotal - discount);
    const tax = Math.round(taxable * taxPercent) / 100;
    const total = Math.max(0, taxable) + tax + shippingFee;

    // Payment ledger
    const customerName = String((body as { customerName?: unknown }).customerName || 'Walk-in Customer');
    const customerPhone = String((body as { customerPhone?: unknown }).customerPhone || '');
    const customerEmail = String((body as { customerEmail?: unknown }).customerEmail || '');

    // Apply payments in order against what is still due. Only cash can be
    // over-tendered (the rest is change); a card or wallet payment is charged
    // exactly, so more than the amount due is a typing mistake.
    let remaining = total;
    const payments: { amount: number; method: string; note: string | null; receivedBy: string }[] = [];
    for (const p of paymentsRaw) {
      const tendered = Math.round((Number(p.amount) || 0) * 100) / 100;
      if (!(tendered > 0)) continue;
      const method = String(p.method ?? '').trim() || 'cash';
      const applied = Math.min(tendered, Math.round(remaining * 100) / 100);
      if (tendered > applied && method !== 'cash') {
        return res.status(400).json({
          error: `A ${method} payment cannot be more than the amount due (${Math.max(0, remaining).toFixed(2)})`,
        });
      }
      if (applied <= 0) continue;
      remaining -= applied;
      payments.push({
        amount: applied,
        method,
        note: tendered > applied ? `${TENDERED_NOTE}${tendered}` : null,
        receivedBy: admin.email,
      });
    }
    const paidAmount = Math.round((total - Math.max(0, remaining)) * 100) / 100;
    const dueAmount = Math.max(0, Math.round((total - paidAmount) * 100) / 100);
    const paymentStatus = dueAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'due';

    // Take the stock now, atomically per product; given back if the sale
    // cannot be saved.
    const reserved = await reserveStock(
      [...quantityByProduct]
        .filter(([pid]) => productMap.get(pid)!.trackStock)
        .map(([pid, qty]) => ({ productId: pid, name: productMap.get(pid)!.name, qty }))
    );
    if (!reserved.ok) return res.status(400).json({ error: reserved.error });

    const order = await createWithUniqueNumbers((n) =>
      prisma.order.create({
        data: {
          orderNumber: `POS-${n.stamp}`,
          trackingCode: `AKS-BD-${n.digits}`,
          invoiceNumber: `POS-INV-${n.stamp}`,
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
          payments: { create: payments },
        },
        include: { items: true, payments: true },
      })
    ).catch(async (err) => {
      await reserved.reservation.release();
      throw err;
    });

    await reserved.reservation.record({
      reason: 'pos.sale',
      referenceType: 'order',
      referenceId: order.id,
      createdBy: admin.email,
    });

    // A sale completed from a resumed hold replaces that hold.
    await removeHold(body.holdId);

    await logAudit({
      admin,
      action: 'pos.sale.completed',
      entity: 'order',
      entityId: order.id,
      details: `${order.orderNumber} — ${customerName}, total ${total}, paid ${paidAmount}`,
    });

    res.status(201).json({
      order: { ...order, payments: withTendered(order.payments) },
      sale: { subtotal, discount, tax, shippingFee, total, paidAmount, dueAmount, paymentStatus },
    });
  })
);

/** Admin: a stored POS sale for receipt (re)printing — includes payments + cashier. */
router.get(
  '/admin/pos/receipt/:orderId',
  requirePermission(PERM.POS_VIEW),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: {
        items: true,
        payments: true,
        cashier: { select: { name: true, email: true } },
      },
    });
    if (!order || order.source !== 'pos') return res.status(404).json({ error: 'POS sale not found' });
    res.json({ order: { ...order, payments: withTendered(order.payments) } });
  })
);

/** Admin: held POS carts (persisted as orders whose heldAt is set). */
router.get(
  '/pos/holds',
  requirePermission(PERM.POS_VIEW),
  asyncHandler(async (_req, res) => {
    const held = await prisma.order.findMany({
      where: HOLD_WHERE,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ holds: held.map((h) => ({ ...h, heldAt: h.heldAt ?? h.createdAt })) });
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
      if (lineQuantity(it.quantity) === null) return res.status(400).json({ error: 'Invalid quantity in held items' });
    }

    const products = await prisma.product.findMany({ where: { id: { in: itemsRaw.map((i) => i.productId) } } });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const missing = itemsRaw.map((i) => i.productId).filter((id) => !productMap.has(id));
    if (missing.length > 0) return res.status(400).json({ error: `Unknown product(s): ${missing.join(', ')}` });

    // Same pricing rule as a sale: the product's current price.
    let subtotal = 0;
    const orderItems = itemsRaw.map((it) => {
      const product = productMap.get(it.productId)!;
      const quantity = lineQuantity(it.quantity)!;
      const price = product.price;
      subtotal += price * quantity;
      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        unitCost: product.costPrice ?? null,
        size: String(it.size ?? '').trim() || 'Free Size',
        color: String(it.color ?? '').trim() || 'Default',
        quantity,
        price,
      };
    });

    const discount = Math.max(0, Number(body.discount) || 0);
    const total = Math.max(0, subtotal - discount);
    const customerName = String(body.customerName ?? '').trim() || 'Walk-in Customer';
    const customerPhone = String(body.customerPhone ?? '').trim();

    const order = await createWithUniqueNumbers((n) =>
      prisma.order.create({
        data: {
          orderNumber: `HOLD-${n.stamp}`,
          trackingCode: `AKS-${n.digits}`,
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
      })
    );

    await logAudit({
      admin: currentAdmin(req),
      action: 'pos.sale.held',
      entity: 'order',
      entityId: order.id,
      details: `${order.orderNumber} — held for ${customerName}, total ${total}`,
    });
    // Holding a resumed cart again replaces the earlier hold.
    await removeHold(body.holdId);

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
    // Only held carts can be touched here; any other order is not found.
    const updated = await prisma.order.updateMany({
      where: { id, ...HOLD_WHERE },
      data: { heldAt: held === false ? null : new Date() },
    });
    if (updated.count === 0) return res.status(404).json({ error: 'Held sale not found' });
    const order = await prisma.order.findUniqueOrThrow({ where: { id }, include: { items: true, payments: true } });
    res.json({ order });
  })
);

/** Admin: discard a held POS cart. Safe — held carts never touch stock. */
router.delete(
  '/pos/holds/:id',
  requirePermission(PERM.POS_HOLD),
  asyncHandler(async (req, res) => {
    const existing = await prisma.order.findFirst({ where: { id: req.params.id, ...HOLD_WHERE } });
    if (!existing) {
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
