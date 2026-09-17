import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { asyncHandler, requirePermission } from '../lib/auth.ts';
import { PERM } from '../lib/permissions.ts';

const router = Router();

/** Admin: activity logs (from the existing AuditLog model). */
router.get(
  '/admin/activity',
  requirePermission(PERM.ACTIVITY_LOGS_VIEW),
  asyncHandler(async (_req, res) => {
    const q = _req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (q.action) where.action = { contains: String(q.action) };
    if (q.admin) where.adminName = { contains: String(q.admin) };
    if (q.entity) where.entity = String(q.entity);
    if (q.entityId) where.entityId = String(q.entityId);

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' as const },
      take: 500,
    });
    res.json({ logs, count: logs.length });
  })
);

export default router;
