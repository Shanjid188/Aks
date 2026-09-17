import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission, currentAdmin } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';
import { logAudit } from '../lib/audit.ts';

const router = Router();

/** Admin: list suppliers (with purchase counts). */
router.get(
  '/admin/suppliers',
  requirePermission(PERM.SUPPLIERS_VIEW),
  asyncHandler(async (_req, res) => {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { createdAt: 'desc' as const },
      include: { _count: { select: { purchases: true } } },
    });
    res.json({ suppliers });
  })
);

/** Admin: create supplier. */
router.post(
  '/admin/suppliers',
  requirePermission(PERM.SUPPLIERS_CREATE),
  asyncHandler(async (req, res) => {
    const b = (req.body || {}) as Record<string, unknown>;
    if (!b.name) return res.status(400).json({ error: 'Supplier name is required' });
    const supplier = await prisma.supplier.create({
      data: {
        name: String(b.name),
        phone: b.phone ? String(b.phone) : null,
        email: b.email ? String(b.email) : null,
        address: b.address ? String(b.address) : null,
        company: b.company ? String(b.company) : null,
        notes: b.notes ? String(b.notes) : null,
        isActive: b.isActive !== false,
      },
    });
    await logAudit({
      admin: currentAdmin(req),
      action: 'supplier.created',
      entity: 'supplier',
      entityId: supplier.id,
      details: supplier.name,
    });
    res.status(201).json({ supplier });
  })
);

/** Admin: update supplier. */
router.patch(
  '/admin/suppliers/:id',
  requirePermission(PERM.SUPPLIERS_EDIT),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const b = (req.body || {}) as Record<string, unknown>;
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Supplier not found' });
    const data: Record<string, unknown> = {};
    for (const k of ['name', 'phone', 'email', 'address', 'company', 'notes']) {
      if (b[k] !== undefined) data[k] = String(b[k]);
    }
    if (b.isActive !== undefined) data.isActive = Boolean(b.isActive);
    const supplier = await prisma.supplier.update({ where: { id }, data });
    res.json({ supplier });
  })
);

/** Admin: delete supplier (soft — hides it). */
router.delete(
  '/admin/suppliers/:id',
  requirePermission(PERM.SUPPLIERS_DELETE),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const supplier = await prisma.supplier.update({ where: { id }, data: { isActive: false } });
    await logAudit({
      admin: currentAdmin(req),
      action: 'supplier.deleted',
      entity: 'supplier',
      entityId: id,
      details: supplier.name,
    });
    res.json({ supplier, deleted: true });
  })
);

export default router;
