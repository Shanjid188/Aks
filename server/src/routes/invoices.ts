import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { orderToApi } from './orders.ts';

const router = Router();

const INVOICE_STATUS = ['unpaid', 'partial', 'paid', 'refunded'] as const;

/**
 * Items carry the live product join so the invoice can show the product's MRP
 * (`originalPrice`) in its Discount column. The address/items JSON is parsed by
 * the shared `orderToApi`, so the printed customer address is real.
 */
const INVOICE_INCLUDE = {
  items: { include: { product: { select: { originalPrice: true } } } },
  payments: true,
};

/** Admin: invoice list — all orders that have (or can have) an invoice. */
router.get(
  '/admin/invoices',
  requirePermission(PERM.INVOICES_VIEW),
  asyncHandler(async (_req, res) => {
    const q = _req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (q.status && (INVOICE_STATUS as readonly string[]).includes(q.status)) {
      where.paymentStatus = q.status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: INVOICE_INCLUDE,
      orderBy: { createdAt: 'desc' as const },
      take: 300,
    });
    res.json({ invoices: orders.map((o) => orderToApi(o as unknown as { customerAddress: string; [k: string]: unknown })), count: orders.length });
  })
);

/** Admin: single invoice by order id (also usable for print). */
router.get(
  '/admin/invoices/:orderId',
  requirePermission(PERM.INVOICES_VIEW),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: INVOICE_INCLUDE,
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ invoice: orderToApi(order as unknown as { customerAddress: string; [k: string]: unknown }) });
  })
);

export default router;
