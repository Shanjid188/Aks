import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission, currentAdmin } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';
import { applyStockDelta } from '../lib/stock.ts';

const router = Router();

/**
 * Allowed return status moves. Receiving is the only step that restocks and
 * can only be reached from approved, so a return is restocked at most once.
 * Refunds are recorded through POST /admin/returns/:id/refund.
 */
const RETURN_TRANSITIONS: Record<string, readonly string[]> = {
  requested: ['approved', 'rejected', 'cancelled'],
  approved: ['received', 'rejected', 'cancelled'],
  received: [], // refunded only through POST /admin/returns/:id/refund
  rejected: [],
  cancelled: [],
  refunded: [],
};

/** Returns that still claim goods from their order line. */
const OPEN_RETURN_STATUSES = ['requested', 'approved', 'received', 'refunded'];

/** Orders that have not been fulfilled (or were undone) have nothing to return. */
const NON_RETURNABLE_ORDER_STATUSES = ['pending', 'cancelled'];

/** Admin: list return requests. */
router.get(
  '/admin/returns',
  requirePermission(PERM.REFUNDS_VIEW),
  asyncHandler(async (_req, res) => {
    const q = _req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (q.status && q.status !== 'all') where.status = q.status;

    const returns = await prisma.returnRequest.findMany({
      where,
      include: { order: { select: { id: true, orderNumber: true } } },
      orderBy: { createdAt: 'desc' as const },
      take: 300,
    });
    res.json({ returns, count: returns.length });
  })
);

/** Admin: create a return request. */
router.post(
  '/admin/returns',
  requirePermission(PERM.REFUNDS_CREATE),
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    if (!body.orderId || !body.reason) {
      return res.status(400).json({ error: 'orderId and reason are required' });
    }
    const order = await prisma.order.findUnique({
      where: { id: String(body.orderId) },
      include: { items: { select: { productId: true, productName: true, quantity: true } } },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (NON_RETURNABLE_ORDER_STATUSES.includes(order.status)) {
      return res.status(400).json({ error: `A ${order.status} order cannot have a return` });
    }

    const rawQty = body.quantity === undefined ? 1 : Number(body.quantity);
    if (!Number.isInteger(rawQty) || rawQty < 1) {
      return res.status(400).json({ error: 'Quantity must be a whole number of at least 1' });
    }

    // A return of a product must match a line of the order, and cannot take
    // back more than was sold minus what earlier returns already claimed.
    const productId = body.productId ? String(body.productId) : null;
    let productName = body.productName ? String(body.productName) : null;
    if (productId) {
      const lines = order.items.filter((i) => i.productId === productId);
      if (lines.length === 0) {
        return res.status(400).json({ error: 'That product is not part of this order' });
      }
      const sold = lines.reduce((s, i) => s + i.quantity, 0);
      const earlier = await prisma.returnRequest.aggregate({
        where: { orderId: order.id, productId, status: { in: OPEN_RETURN_STATUSES } },
        _sum: { quantity: true },
      });
      const returnable = sold - (earlier._sum.quantity ?? 0);
      if (rawQty > returnable) {
        return res.status(400).json({
          error: returnable > 0
            ? `Only ${returnable} of this product can still be returned`
            : 'This product has already been fully returned',
        });
      }
      productName = productName ?? lines[0].productName;
    }

    const ret = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        customerName: String(body.customerName ?? order.customerName),
        customerPhone: String(body.customerPhone ?? order.customerPhone),
        productId,
        productName,
        variant: body.variant ? String(body.variant) : null,
        quantity: rawQty,
        reason: String(body.reason),
        customerNote: body.customerNote ? String(body.customerNote) : null,
        adminNote: body.adminNote ? String(body.adminNote) : null,
        refundAmount: Math.max(0, Number(body.refundAmount) || 0),
        refundMethod: String(body.refundMethod || 'store_credit'),
      },
    });

    await logAudit({
      admin: currentAdmin(req),
      action: 'return.requested',
      entity: 'return',
      entityId: ret.id,
      details: `${order.orderNumber}: ${String(body.reason)}`,
    });

    res.status(201).json({ returnRequest: ret });
  })
);

/** Admin: approve / reject / cancel a return. */
router.patch(
  '/admin/returns/:id',
  requirePermission(PERM.REFUNDS_APPROVE),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const { status, adminNote } = (req.body || {}) as { status?: string; adminNote?: string };
    const existing = await prisma.returnRequest.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Return not found' });

    const next = String(status || '');
    if (!(next in RETURN_TRANSITIONS)) {
      return res.status(400).json({ error: 'Invalid return status' });
    }
    // Same status: only the note can change.
    if (next === existing.status) {
      const ret = adminNote === undefined
        ? existing
        : await prisma.returnRequest.update({ where: { id }, data: { adminNote: String(adminNote) } });
      return res.json({ returnRequest: ret });
    }
    if (!RETURN_TRANSITIONS[existing.status]?.includes(next)) {
      return res.status(400).json({ error: `A return cannot move from ${existing.status} to ${next}` });
    }

    const data: Record<string, unknown> = { status: next };
    if (adminNote !== undefined) data.adminNote = String(adminNote);
    if (next === 'approved' && !existing.approvedAt) data.approvedAt = new Date();
    if (next === 'received') data.receivedAt = new Date();
    if (next === 'refunded' && !existing.refundedAt) data.refundedAt = new Date();

    // Only move the return if nobody changed it in the meantime; receivedAt
    // marks a return that has already been restocked, so it never is twice.
    const moved = await prisma.returnRequest.updateMany({
      where: { id, status: existing.status, ...(next === 'received' ? { receivedAt: null } : {}) },
      data,
    });
    if (moved.count === 0) {
      return res.status(409).json({ error: 'This return was just updated by someone else. Please refresh and try again.' });
    }
    const ret = await prisma.returnRequest.findUniqueOrThrow({ where: { id } });

    // When a return is RECEIVED, add the returned stock back for the product.
    if (next === 'received' && existing.productId) {
      await applyStockDelta({
        productId: existing.productId,
        change: existing.quantity,
        reason: 'return.received',
        referenceType: 'return',
        referenceId: id,
        createdBy: currentAdmin(req)?.email,
      });
    }

    await logAudit({
      admin: currentAdmin(req),
      action: `return.${next}`,
      entity: 'return',
      entityId: id,
      details: `${existing.returnNumber || id}: status → ${next}`,
    });

    res.json({ returnRequest: ret });
  })
);

/** Admin: record an actual refund against a return. */
router.post(
  '/admin/returns/:id/refund',
  requirePermission(PERM.REFUNDS_REFUND),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = (req.body || {}) as Record<string, unknown>;
    const ret = await prisma.returnRequest.findUnique({ where: { id } });
    if (!ret) return res.status(404).json({ error: 'Return not found' });

    // Goods come back first: refund a received return, or an approved one
    // that has no product to send back. Each return is refunded once.
    const refundableFrom = ret.productId ? ['received'] : ['approved', 'received'];
    if (!refundableFrom.includes(ret.status)) {
      return res.status(400).json({
        error: ret.status === 'refunded' ? 'This return has already been refunded' : `A ${ret.status} return cannot be refunded`,
      });
    }

    const amount = body.amount === undefined || body.amount === null || body.amount === '' ? ret.refundAmount : Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Refund amount must be more than 0' });
    }

    // Never refund more than the customer paid for the returned goods, nor
    // more than is left of what the order collected after earlier refunds.
    const order = ret.orderId
      ? await prisma.order.findUnique({ where: { id: ret.orderId }, include: { items: true } })
      : null;
    let collected = 0;
    if (order) {
      // A delivered or completed order was paid in full (cash on delivery is
      // collected by the courier even when the order was never marked paid).
      collected = ['delivered', 'completed'].includes(order.status)
        ? Math.max(order.paidAmount, order.total)
        : order.paidAmount;
      const earlier = await prisma.refund.aggregate({ where: { orderId: order.id }, _sum: { amount: true } });
      const remaining = Math.max(0, collected - (earlier._sum.amount ?? 0));
      const line = ret.productId ? order.items.find((i) => i.productId === ret.productId) : undefined;
      const cap = line ? Math.min(remaining, line.price * ret.quantity) : remaining;
      if (amount > cap) {
        return res.status(400).json({ error: `The most that can be refunded for this return is ${cap}` });
      }
    }

    // Claim the return before paying out, so two clicks cannot both refund it.
    const claimed = await prisma.returnRequest.updateMany({
      where: { id, status: ret.status },
      data: { status: 'refunded', refundAmount: amount, refundedAt: new Date() },
    });
    if (claimed.count === 0) {
      return res.status(409).json({ error: 'This return was just updated by someone else. Please refresh and try again.' });
    }

    const refund = await prisma.refund.create({
      data: {
        returnId: ret.id,
        orderId: ret.orderId,
        amount,
        method: String(body.method ?? ret.refundMethod ?? 'store_credit'),
        note: body.note ? String(body.note) : null,
        refundedBy: currentAdmin(req)?.email ?? null,
      },
    });

    // Only a refund of everything the order collected marks the whole order
    // refunded; a partial refund leaves the order as it is.
    if (order) {
      const refunded = await prisma.refund.aggregate({ where: { orderId: order.id }, _sum: { amount: true } });
      if ((refunded._sum.amount ?? 0) >= collected) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'refunded', paymentStatus: 'refunded', dueAmount: 0 },
        });
      }
    }

    await logAudit({
      admin: currentAdmin(req),
      action: 'refund.processed',
      entity: 'return',
      entityId: id,
      details: `${ret.returnNumber || id}: refund ${amount} via ${refund.method}`,
    });

    res.status(201).json({ refund, returnRequest: { ...ret, status: 'refunded', refundAmount: amount } });
  })
);

export default router;
