/**
 * Shared rollback helper for the verification scripts (`smoke.ts`,
 * `verify-order-flow.ts`).
 *
 * Those scripts must place a real order to exercise the checkout flow, and
 * placing an order deducts stock and bumps the coupon usage counter. The API
 * deliberately has no "delete order" route (orders are cancelled, never
 * erased), so a test order would otherwise sit in the owner's dashboard
 * forever and leave inventory short. This helper deletes the throwaway order
 * straight from the database and puts back everything it touched: product
 * stock, the stock-movement ledger and the coupon counter.
 *
 * Safety: it only runs when the scripts point at a local API, so a verification
 * run against a remote server never deletes data.
 */
// Load DATABASE_URL before the Prisma client is constructed: the verification
// scripts are run straight through tsx (unlike `npm run seed`, which passes
// --env-file), so `.env` has to be read here.
import 'dotenv/config';
import { prisma } from '../src/lib/prisma.ts';

const API_BASE = process.env.API_URL || 'http://localhost:4000';

/** True when the test scripts talk to the local API (safe to clean the local DB). */
export const isLocalApi = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(API_BASE);

export interface RollbackResult {
  removed: boolean;
  restoredUnits: number;
}

/**
 * Remove a test order and reverse its side effects. Stock movements reference
 * the order by id (no foreign key), so they have to be undone by hand before
 * the order row is deleted.
 */
export async function rollbackTestOrder(orderId: string): Promise<RollbackResult> {
  if (!isLocalApi) return { removed: false, restoredUnits: 0 };

  const [movements, order] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { referenceType: 'order', referenceId: orderId },
      select: { id: true, productId: true, change: true },
    }),
    prisma.order.findUnique({ where: { id: orderId }, select: { couponCode: true } }),
  ]);

  if (!order) return { removed: false, restoredUnits: 0 };

  await prisma.$transaction(async (tx) => {
    // Put every unit the order took back into stock.
    for (const move of movements) {
      await tx.product.update({
        where: { id: move.productId },
        data: { stockQuantity: { increment: -move.change } },
      });
    }
    if (movements.length > 0) {
      await tx.stockMovement.deleteMany({ where: { id: { in: movements.map((m) => m.id) } } });
    }

    // Give the coupon its usage slot back.
    if (order.couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: order.couponCode }, select: { id: true, usedCount: true } });
      if (coupon && coupon.usedCount > 0) {
        await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: coupon.usedCount - 1 } });
      }
    }

    // Items + payments cascade with the order (see prisma/schema.prisma).
    await tx.order.delete({ where: { id: orderId } });
  });

  return { removed: true, restoredUnits: movements.reduce((sum, m) => sum + Math.abs(m.change), 0) };
}
