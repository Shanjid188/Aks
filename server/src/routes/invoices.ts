import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { parseJsonSafe } from '../utils/json.ts';

const router = Router();

const INVOICE_STATUS = ['unpaid', 'partial', 'paid', 'refunded'] as const;

function orderInvoiceView(order: Record<string, unknown>) {
  // Customer address + items come JSON-ish / nested; keep it light here since the
  // same data is already served by orders.ts orderToApi.
  return order;
}

/** Admin: invoice list — all orders that have (or can have) an invoice. */
router.get(
  '/admin/invoices',
  requirePermission(PERM.INVOICES_VIEW),
  asyncHandler(async (_req, res) => {
    const q = _req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (q.status) where.paymentStatus = q.status;

    const orders = await prisma.order.findMany({
      where,
      include: { items: true, payments: true },
      orderBy: { createdAt: 'desc' as const },
      take: 300,
    });
    res.json({ invoices: orders.map(orderInvoiceView), count: orders.length });
  })
);

/** Admin: single invoice by order id (also usable for print). */
router.get(
  '/admin/invoices/:orderId',
  requirePermission(PERM.INVOICES_VIEW),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: { items: true, payments: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ invoice: orderInvoiceView(order as unknown as Record<string, unknown>) });
  })
);

export default router;
