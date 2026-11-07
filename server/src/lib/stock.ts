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

export interface StockReservation {
  /** Put everything back (the sale could not be saved). */
  release(): Promise<void>;
  /** Write the ledger rows for what was taken, once the sale exists. */
  record(ref: Omit<StockDeltaInput, 'productId' | 'change'>): Promise<void>;
}

/**
 * Take `qty` of each tracked product off the shelf, only while that much is
 * there. Each product is one conditional UPDATE, so two simultaneous sales
 * cannot both take the last units (SQLite deadlocks concurrent read-then-write
 * transactions, so this avoids one). If any product is short, everything
 * already taken is put back and the error says which.
 */
export async function reserveStock(
  lines: { productId: string; name: string; qty: number }[]
): Promise<{ ok: true; reservation: StockReservation } | { ok: false; error: string }> {
  const taken: { productId: string; qty: number }[] = [];
  const release = async () => {
    for (const t of taken) {
      await prisma.product.update({ where: { id: t.productId }, data: { stockQuantity: { increment: t.qty } } });
    }
  };

  for (const line of lines) {
    const updated = await prisma.product.updateMany({
      where: { id: line.productId, trackStock: true, stockQuantity: { gte: line.qty } },
      data: { stockQuantity: { decrement: line.qty } },
    });
    if (updated.count === 1) {
      taken.push({ productId: line.productId, qty: line.qty });
      continue;
    }
    const now = await prisma.product.findUnique({
      where: { id: line.productId },
      select: { name: true, stockQuantity: true, trackStock: true },
    });
    // Stock tracking was switched off meanwhile: nothing to deduct.
    if (now && !now.trackStock) continue;
    await release();
    return {
      ok: false,
      error: `${now?.name ?? line.name} doesn't have enough stock (available: ${now?.stockQuantity ?? 0}, requested: ${line.qty})`,
    };
  }

  return {
    ok: true,
    reservation: {
      release,
      async record(ref) {
        if (taken.length === 0) return;
        await prisma.stockMovement.createMany({
          data: taken.map((t) => ({
            productId: t.productId,
            change: -t.qty,
            reason: ref.reason,
            referenceType: ref.referenceType ?? null,
            referenceId: ref.referenceId ?? null,
            createdBy: ref.createdBy ?? null,
          })),
        });
      },
    },
  };
}
