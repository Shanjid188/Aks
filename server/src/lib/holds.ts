import type { Prisma } from '@prisma/client';

/**
 * A held POS cart: saved as an Order so it can be resumed, but nothing has been
 * sold. Matches rows written by every admin build (older ones also used
 * status 'held').
 */
export const HOLD_WHERE = {
  source: 'pos',
  orderNumber: { startsWith: 'HOLD-' },
  invoiceNumber: null,
  status: { in: ['pending', 'held'] },
} satisfies Prisma.OrderWhereInput;

/** Every order except held carts: use in revenue, counts, customers and invoices. */
export const NOT_HELD = { NOT: HOLD_WHERE } satisfies Prisma.OrderWhereInput;
