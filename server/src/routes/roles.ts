import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { ALL_PERMISSIONS, PERMISSION_CATALOG, PERM } from '../lib/permissions.ts';
import { asyncHandler, currentAdmin, requireAuth, requirePermission } from '../lib/auth.ts';
import { logAudit } from '../lib/audit.ts';

const router = Router();

/** Shape returned for a role (permissions flattened into a string[]). */
function roleToApi(r: {
  id: string;
  name: string;
  description: string;
  isSuper: boolean;
  isSystem: boolean;
  createdAt: Date;
  permissions: { permission: string }[];
  _count?: { users: number };
}) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    isSuper: r.isSuper,
    isSystem: r.isSystem,
    permissions: r.permissions.map((p) => p.permission),
    usersCount: r._count?.users ?? 0,
    createdAt: r.createdAt,
  };
}

/** Validate + normalize a permissions array against the catalog. Null when invalid. */
function cleanPermissions(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const seen = new Set<string>();
  for (const entry of input) {
    const key = String(entry);
    if (!ALL_PERMISSIONS.includes(key)) return null; // unknown permission key → reject
    seen.add(key);
  }
  return [...seen];
}

/**
 * Permission catalog — grouped module/action definitions that drive the role
 * editor checkbox UI. Read-only, available to every authenticated admin.
 */
router.get('/admin/roles/catalog', requireAuth, (_req, res) => {
  res.json({ modules: PERMISSION_CATALOG });
});

router.get(
  '/admin/roles',
  requirePermission(PERM.ROLES_VIEW),
  asyncHandler(async (_req, res) => {
    const roles = await prisma.role.findMany({
      orderBy: [{ isSuper: 'desc' }, { createdAt: 'asc' }],
      include: {
        permissions: { select: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    res.json({ roles: roles.map(roleToApi) });
  })
);
router.post(
  '/admin/roles',
  requirePermission(PERM.ROLES_CREATE),
  asyncHandler(async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const name = String(body.name || '').trim();
    const description = String(body.description || '').trim();
    const permissions = cleanPermissions(body.permissions);

    if (!name) return res.status(400).json({ error: 'Role name is required' });
    if (permissions === null) {
      return res.status(400).json({ error: 'permissions must be a list of valid permission keys' });
    }

    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) return res.status(409).json({ error: 'A role with this name already exists' });

    const role = await prisma.role.create({
      data: {
        name,
        description,
        isSuper: false,
        isSystem: false,
        permissions: { create: permissions.map((permission) => ({ permission })) },
      },
      include: { permissions: { select: { permission: true } }, _count: { select: { users: true } } },
    });

    await logAudit({
      admin: currentAdmin(req),
      action: 'role.created',
      entity: 'role',
      entityId: role.id,
      details: `${role.name} (${permissions.length} permissions)`,
    });

    res.status(201).json({ role: roleToApi(role) });
  })
);

router.put(
  '/admin/roles/:id',
  requirePermission(PERM.ROLES_EDIT),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.role.findUnique({ where: { id }, include: { permissions: true } });
    if (!existing) return res.status(404).json({ error: 'Role not found' });
    if (existing.isSuper) {
      return res.status(403).json({ error: 'The Super Admin role cannot be edited' });
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return res.status(400).json({ error: 'Role name is required' });
      const dupe = await prisma.role.findFirst({ where: { name, id: { not: id } } });
      if (dupe) return res.status(409).json({ error: 'A role with this name already exists' });
      data.name = name;
    }
    if (body.description !== undefined) data.description = String(body.description).trim();

    let newPermissions: string[] | null = null;
    if (body.permissions !== undefined) {
      newPermissions = cleanPermissions(body.permissions);
      if (newPermissions === null) {
        return res.status(400).json({ error: 'permissions must be a list of valid permission keys' });
      }
    }

    const role = await prisma.$transaction(async (tx) => {
      await tx.role.update({ where: { id }, data });
      if (newPermissions) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (newPermissions.length > 0) {
          await tx.rolePermission.createMany({
            data: newPermissions.map((permission) => ({ roleId: id, permission })),
          });
        }
      }
      return tx.role.findUnique({
        where: { id },
        include: { permissions: { select: { permission: true } }, _count: { select: { users: true } } },
      });
    });

    await logAudit({
      admin: currentAdmin(req),
      action: 'role.updated',
      entity: 'role',
      entityId: id,
      details: newPermissions ? `${existing.name} → ${newPermissions.length} permissions` : existing.name,
    });

    res.json({ role: role ? roleToApi(role) : null });
  })
);

router.delete(
  '/admin/roles/:id',
  requirePermission(PERM.ROLES_DELETE),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existing = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Role not found' });
    if (existing.isSuper) {
      return res.status(403).json({ error: 'The Super Admin role cannot be deleted' });
    }
    if (existing._count.users > 0) {
      return res.status(409).json({
        error: `This role is assigned to ${existing._count.users} admin user(s) — reassign them first`,
      });
    }

    await prisma.role.delete({ where: { id } });
    await logAudit({
      admin: currentAdmin(req),
      action: 'role.deleted',
      entity: 'role',
      entityId: id,
      details: existing.name,
    });
    res.json({ deleted: true });
  })
);

export default router;
