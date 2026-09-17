import { prisma } from './prisma.ts';

export interface StockDeltaInput {
  productId: string;
  change: number; // + in / - out
  reason: string;
  referenceType?: string | null;
  referenceId?: string | null;
  createdBy?: string | null;
}

/**
 * Apply a stock change to a product and record it in the StockMovement ledger.
 * Runs safely inside a transaction so product stock + history stay in sync.
 * Positive `change` = stock in, negative = stock out.
 */
export async function applyStockDelta(input: StockDeltaInput): Promise<void> {
  const change = Math.trunc(input.change);
  if (change === 0) return;

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        productId: input.productId,
        change,
        reason: input.reason,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        createdBy: input.createdBy ?? null,
      },
    }),
    prisma.product.update({
      where: { id: input.productId },
      data: { stockQuantity: { increment: change } },
    }),
  ]);
}
