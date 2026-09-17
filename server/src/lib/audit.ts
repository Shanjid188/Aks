/** Audit-log helper shared by sensitive admin actions. */
import { prisma } from './prisma.ts';
import type { AdminPayload } from './auth.ts';

export interface AuditEntry {
  admin?: AdminPayload | null;
  action: string; // human-friendly e.g. "order.status.change"
  entity: string; // e.g. "order"
  entityId?: string | null;
  details?: string; // e.g. "Pending → Confirmed"
  adminId?: string;
  adminName?: string;
  adminEmail?: string;
}

export async function logAudit(input: AuditEntry): Promise<void> {
  try {
    const admin = input.admin;
    const adminId = input.adminId ?? admin?.id ?? null;
    const adminName = input.adminName ?? admin?.name ?? admin?.email ?? null;
    const adminEmail = input.adminEmail ?? admin?.email ?? null;
    await prisma.auditLog.create({
      data: {
        adminId,
        adminName,
        adminEmail,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        details: input.details ?? '',
      },
    });
  } catch (err) {
    console.warn('[audit] failed to write log:', err);
  }
}