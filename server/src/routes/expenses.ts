import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission, currentAdmin } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';

const router = Router();

export const EXPENSE_CATEGORIES = [
  'Delivery', 'Packaging', 'Rent', 'Electricity', 'Internet',
  'Salary', 'Marketing', 'Office', 'Other',
] as const;

/** Admin: list expenses (with category filter + date range). */
router.get(
  '/admin/expenses',
  requirePermission(PERM.EXPENSES_VIEW),
  asyncHandler(async (_req, res) => {
    const q = _req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (q.category && q.category !== 'All') where.category = q.category;
    if (q.from || q.to) {
      where.expenseDate = {};
      if (q.from) (where.expenseDate as Record<string, unknown>).gte = new Date(String(q.from));
      if (q.to) (where.expenseDate as Record<string, unknown>).lte = new Date(String(q.to));
    }
    const expenses = await prisma.expense.findMany({ where, orderBy: { expenseDate: 'desc' as const }, take: 500 });
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    res.json({ expenses, total, count: expenses.length });
  })
);

/** Admin: create expense. */
router.post(
  '/admin/expenses',
  requirePermission(PERM.EXPENSES_CREATE),
  asyncHandler(async (req, res) => {
    const b = (req.body || {}) as Record<string, unknown>;
    if (!b.title || !b.amount) return res.status(400).json({ error: 'title and amount are required' });
    const category = String(b.category || 'Other');
    if (!EXPENSE_CATEGORIES.includes(category as (typeof EXPENSE_CATEGORIES)[number])) {
      return res.status(400).json({ error: `Invalid category: ${category}` });
    }
    const expense = await prisma.expense.create({
      data: {
        title: String(b.title),
        category,
        amount: Math.max(0, Number(b.amount) || 0),
        expenseDate: b.expenseDate ? new Date(String(b.expenseDate)) : new Date(),
        paymentMethod: String(b.paymentMethod || 'cash'),
        note: b.note ? String(b.note) : null,
        createdBy: currentAdmin(req)?.email ?? null,
      },
    });
    await logAudit({
      admin: currentAdmin(req),
      action: 'expense.created',
      entity: 'expense',
      entityId: expense.id,
      details: `${expense.title} — ${expense.amount} (${expense.category})`,
    });
    res.status(201).json({ expense });
  })
);

/** Admin: update expense. */
router.patch(
  '/admin/expenses/:id',
  requirePermission(PERM.EXPENSES_EDIT),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const b = (req.body || {}) as Record<string, unknown>;
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Expense not found' });
    const data: Record<string, unknown> = {};
    if (b.title !== undefined) data.title = String(b.title);
    if (b.category !== undefined) data.category = String(b.category);
    if (b.amount !== undefined) data.amount = Math.max(0, Number(b.amount) || 0);
    if (b.expenseDate !== undefined) data.expenseDate = new Date(String(b.expenseDate));
    if (b.paymentMethod !== undefined) data.paymentMethod = String(b.paymentMethod);
    if (b.note !== undefined) data.note = String(b.note);
    const expense = await prisma.expense.update({ where: { id }, data });
    res.json({ expense });
  })
);

/** Admin: delete expense. */
router.delete(
  '/admin/expenses/:id',
  requirePermission(PERM.EXPENSES_DELETE),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.expense.findUnique({ where: { id } });
    await prisma.expense.delete({ where: { id } });
    if (existing) {
      await logAudit({
        admin: currentAdmin(req),
        action: 'expense.deleted',
        entity: 'expense',
        entityId: id,
        details: existing.title,
      });
    }
    res.json({ deleted: true });
  })
);

export default router;
