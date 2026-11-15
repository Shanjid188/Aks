// Shared order status transition: the one place an order's lifecycle status
// changes after checkout. Used by the admin status PATCH (manual Delivery /
// Return / Cancel buttons) and by the courier webhook + status sync, so stock
// restoration, the concurrent-edit guard, audit logging and GA4 refunds behave
// identically no matter who moves the order.
import { prisma } from './prisma.ts';
import { logAudit } from './audit.ts';
import type { AdminPayload } from './auth.ts';
import { REVERSAL_STATUSES, trackOrderRefund } from './tracking/orders.ts';

/**
 * Order lifecycle (canonical): pending → confirmed → processing → packed → shipped → delivered / cancelled.
 * Phase-3 additions (packed, completed, returned, refunded) are accepted but legacy
 * 'out_for_delivery' remains recognised for rows created by older versions.
 */
export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'completed',
  'cancelled',
  'returned',
  'refunded',
] as const;

/** Statuses an order is still being fulfilled in; leaving `cancelled` for one of these is a reopen. */
export const ACTIVE_STATUSES: readonly string[] = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'completed',
];

/** Prisma include that joins the live product (with images) into every order item,
 *  so the admin item editor can show thumbnails and pick variants. */
export const ITEM_INCLUDE = {
  items: {
    include: {
      product: { select: { id: true, name: true, images: true, colors: true, sizes: true, originalPrice: true, weight: true } },
    },
  },
};

/** Thrown to reject a status change with an HTTP status (404 / 409 / 400). */
export class StatusChangeError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export function isOrderStatus(value: unknown): value is (typeof ORDER_STATUSES)[number] {
  return ORDER_STATUSES.includes(value as (typeof ORDER_STATUSES)[number]);
}

export interface ChangeOrderStatusInput {
  orderId: string;
  nextStatus: string;
  /** Admin who made the change; null for system actors (courier webhook / sync). */
  admin: AdminPayload | null;
  /** Shown as the audit actor when `admin` is null, e.g. "Steadfast (webhook)". */
  systemActor?: string;
  /** Only move the order if it is still in this status (defaults to its status when read). */
  expectedStatus?: string;
  /** Appended to the audit details, e.g. "courier status: delivered". */
  note?: string;
}

/**
 * Move an order to `nextStatus`. Cancelling restocks tracked products, reopening a
 * cancelled order takes them off the shelf again, and the status write is
 * conditional on the previous status so two simultaneous changes cannot both
 * apply. Throws StatusChangeError on a missing order, a conflict or a stock shortfall.
 */
export async function changeOrderStatus(input: ChangeOrderStatusInput) {
  const { orderId: id, nextStatus, admin } = input;
  if (!isOrderStatus(nextStatus)) {
    throw new StatusChangeError(400, `status must be one of: ${ORDER_STATUSES.join(', ')}`);
  }
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) throw new StatusChangeError(404, 'Order not found');
  if (input.expectedStatus !== undefined && existing.status !== input.expectedStatus) {
    throw new StatusChangeError(409, 'This order was just updated by someone else. Please refresh and try again.');
  }

  const isCancel = nextStatus === 'cancelled' && existing.status !== 'cancelled';

  // Cancelling puts the items back on the shelf; moving a cancelled order back
  // into the active lifecycle takes them off again, so cancel → reopen → cancel
  // restocks only once. Going from cancelled to refunded/returned is not a
  // reopen: the goods are already back on the shelf, so stock stays put.
  // Tracked products only, as at checkout.
  const isReopen = existing.status === 'cancelled' && ACTIVE_STATUSES.includes(nextStatus);
  const stockByProduct = new Map<string, number>();
  if (isCancel || isReopen) {
    const items = await prisma.orderItem.findMany({
      where: { orderId: id },
      select: { productId: true, quantity: true },
    });
    const tracked = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId ?? '').filter(Boolean) }, trackStock: true },
      select: { id: true },
    });
    const trackedIds = new Set(tracked.map((t) => t.id));
    for (const item of items) {
      if (item.productId && trackedIds.has(item.productId)) {
        stockByProduct.set(item.productId, (stockByProduct.get(item.productId) ?? 0) + item.quantity);
      }
    }
  }

  // The status move and every stock change commit together or not at all.
  await prisma.$transaction(async (tx) => {
    // Only move the order if nobody changed its status in the meantime, so
    // two simultaneous cancels cannot both restock it. This write comes
    // first so the transaction holds the lock for everything below.
    const moved = await tx.order.updateMany({
      where: { id, status: existing.status },
      data: { status: nextStatus },
    });
    if (moved.count === 0) {
      throw new StatusChangeError(409, 'This order was just updated by someone else. Please refresh and try again.');
    }

    for (const [productId, qty] of stockByProduct) {
      const change = isCancel ? qty : -qty;
      // A reopen only deducts what is actually on the shelf: the check and
      // the decrement are one conditional update, so a sale in between
      // cannot push stock below zero.
      const updated = await tx.product.updateMany({
        where: isCancel ? { id: productId } : { id: productId, stockQuantity: { gte: qty } },
        data: { stockQuantity: { increment: change } },
      });
      if (updated.count === 0) {
        const row = await tx.product.findUnique({ where: { id: productId }, select: { name: true, stockQuantity: true } });
        throw new StatusChangeError(
          400,
          `${row?.name ?? 'A product'} doesn't have enough stock to reopen this order (available: ${row?.stockQuantity ?? 0}, needed: ${qty})`
        );
      }
      await tx.stockMovement.create({
        data: {
          productId,
          change,
          reason: isCancel ? 'order.cancelled' : 'order.reopened',
          referenceType: 'order',
          referenceId: id,
          createdBy: admin?.email ?? input.systemActor ?? null,
        },
      });
    }
  });

  const order = await prisma.order.findUniqueOrThrow({ where: { id }, include: ITEM_INCLUDE });

  await logAudit({
    admin,
    ...(admin ? {} : { adminName: input.systemActor ?? 'System' }),
    action: isCancel ? 'order.cancelled' : 'order.status.changed',
    entity: 'order',
    entityId: id,
    details: `${existing.orderNumber}: ${existing.status} → ${nextStatus}${input.note ? ` (${input.note})` : ''}`,
  });

  // An online order that is cancelled/refunded/returned is a GA4 refund
  // (sent once per order, only if GA4 recorded the purchase).
  if (REVERSAL_STATUSES.includes(nextStatus) && !REVERSAL_STATUSES.includes(existing.status) && order.source === 'online') {
    trackOrderRefund(order);
  }

  return { order, previousStatus: existing.status, isCancel };
}
