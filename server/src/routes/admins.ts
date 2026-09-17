import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { PERM } from '../lib/permissions.ts';
import { asyncHandler, currentAdmin, hashPassword, requirePermission } from '../lib/auth.ts';
import { logAudit } from '../lib/audit.ts';

const router = Router();

const ROLE_SELECT = { select: { id: true, name: true, isSuper: true } };

function adminToApi(a: {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  roleRef?: { id: string; name: string; isSuper: boolean } | null;
}) {
  return {
    id: a.id,
    email: a.email,
    name: a.name,
    role: a.roleRef?.name ?? a.role,
    roleId: a.roleRef?.id ?? null,
    isSuperAdmin: a.roleRef?.isSuper ?? false,
    isActive: a.isActive,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

router.get(
  '/admin/admins',
  requirePermission(PERM.ADMINS_VIEW),
  asyncHandler(async (_req, res) => {
    const admins = await prisma.adminUser.findMany({
      orderBy: { createdAt: 'asc' },
      include: { roleRef: ROLE_SELECT },
    });
    res.json({ admins: admins.map(adminToApi) });
  })
);

router.post(
  '/admin/admins',
  requirePermission(PERM.ADMINS_CREATE),
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').trim();
    const password = String(body.password || '');
    const roleId = body.roleId ? String(body.roleId) : null;

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (roleId) {
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role) return res.status(400).json({ error: 'Unknown role' });
    }

    try {
      const admin = await prisma.adminUser.create({
        data: {
          email,
          name,
          passwordHash: await hashPassword(password),
          role: 'admin',
          roleId,
          isActive: Boolean(body.isActive ?? true),
        },
        include: { roleRef: ROLE_SELECT },
      });
      await logAudit({
        admin: currentAdmin(req),
        action: 'admin.created',
        entity: 'admin',
        entityId: admin.id,
        details: `${admin.name} <${admin.email}>`,
      });
      res.status(201).json({ admin: adminToApi(admin) });
    } catch {
      res.status(409).json({ error: 'An admin with this email already exists' });
    }
  })
);

/** Edit name / role assignment of an admin user. */
router.patch(
  '/admin/admins/:id',
  requirePermission(PERM.ADMINS_EDIT),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.adminUser.findUnique({
      where: { id },
      include: { roleRef: ROLE_SELECT },
    });
    if (!existing) return res.status(404).json({ error: 'Admin not found' });

    const me = currentAdmin(req);
    const targetIsSuper = existing.roleRef?.isSuper ?? false;
    if (targetIsSuper && !me.isSuper) {
      return res.status(403).json({ error: 'Only a Super Admin can modify Super Admin accounts' });
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return res.status(400).json({ error: 'Name is required' });
      data.name = name;
    }
    if (body.roleId !== undefined) {
      const roleId = body.roleId ? String(body.roleId) : null;
      if (roleId) {
        const role = await prisma.role.findUnique({ where: { id: roleId } });
        if (!role) return res.status(400).json({ error: 'Unknown role' });
      }
      if (targetIsSuper) {
        return res.status(403).json({ error: 'The Super Admin role cannot be changed' });
      }
      data.roleId = roleId;
    }

    const admin = await prisma.adminUser.update({
      where: { id },
      data,
      include: { roleRef: ROLE_SELECT },
    });
    await logAudit({
      admin: me,
      action: 'admin.updated',
      entity: 'admin',
      entityId: id,
      details: `${admin.name} <${admin.email}>`,
    });
    res.json({ admin: adminToApi(admin) });
  })
);

/** Enable / disable an admin. Disabled admins cannot log in. */
router.patch(
  '/admin/admins/:id/status',
  requirePermission(PERM.ADMINS_DISABLE),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const body = (req.body || {}) as Record<string, unknown>;
    const isActive = Boolean(body.isActive);

    const existing = await prisma.adminUser.findUnique({
      where: { id },
      include: { roleRef: ROLE_SELECT },
    });
    if (!existing) return res.status(404).json({ error: 'Admin not found' });

    const me = currentAdmin(req);
    if (id === me.id && !isActive) {
      return res.status(400).json({ error: 'You cannot disable your own account' });
    }
    const targetIsSuper = existing.roleRef?.isSuper ?? false;
    if (targetIsSuper && !me.isSuper) {
      return res.status(403).json({ error: 'Only a Super Admin can modify Super Admin accounts' });
    }

    const admin = await prisma.adminUser.update({
      where: { id },
      data: { isActive },
      include: { roleRef: ROLE_SELECT },
    });
    await logAudit({
      admin: me,
      action: isActive ? 'admin.enabled' : 'admin.disabled',
      entity: 'admin',
      entityId: id,
      details: `${admin.name} <${admin.email}>`,
    });
    res.json({ admin: adminToApi(admin) });
  })
);

/** Reset an admin's password. */
router.put(
  '/admin/admins/:id/password',
  requirePermission(PERM.ADMINS_EDIT),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const password = String((req.body || {}).password || '');
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const existing = await prisma.adminUser.findUnique({
      where: { id },
      include: { roleRef: ROLE_SELECT },
    });
    if (!existing) return res.status(404).json({ error: 'Admin not found' });
    const me = currentAdmin(req);
    if ((existing.roleRef?.isSuper ?? false) && !me.isSuper) {
      return res.status(403).json({ error: 'Only a Super Admin can modify Super Admin accounts' });
    }
    await prisma.adminUser.update({
      where: { id },
      data: { passwordHash: await hashPassword(password) },
    });
    await logAudit({
      admin: me,
      action: 'admin.password_reset',
      entity: 'admin',
      entityId: id,
      details: existing.email,
    });
    res.json({ ok: true });
  })
);

router.delete(
  '/admin/admins/:id',
  requirePermission(PERM.ADMINS_DELETE),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.adminUser.findUnique({
      where: { id },
      include: { roleRef: ROLE_SELECT },
    });
    if (!existing) return res.status(404).json({ error: 'Admin not found' });

    const me = currentAdmin(req);
    if (id === me.id) return res.status(400).json({ error: 'You cannot delete your own account' });
    if (existing.roleRef?.isSuper) {
      return res.status(403).json({ error: 'Super Admin accounts cannot be deleted' });
    }

    await prisma.adminUser.delete({ where: { id } });
    await logAudit({
      admin: me,
      action: 'admin.deleted',
      entity: 'admin',
      entityId: id,
      details: `${existing.name} <${existing.email}>`,
    });
    res.json({ deleted: true });
  })
);

export default router;
