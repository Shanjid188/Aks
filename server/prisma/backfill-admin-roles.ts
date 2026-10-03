/**
 * Repair script: make sure admins that predate RBAC are not stranded.
 *
 * `AdminUser.roleId` is optional, so an account created before the Role tables
 * existed stays `NULL` forever. `loadAdminAuth()` then reports isSuper=false
 * with zero permissions and the admin logs in successfully but sees
 * "No modules assigned to your role" with an empty sidebar.
 *
 * This script is idempotent and only ever ADDS the missing link:
 *   1. creates the "Super Admin" role if it is missing
 *   2. attaches it to superadmin-labelled accounts whose roleId is still NULL
 *
 * It never changes a password, never edits products, and never reassigns an
 * admin that already has a role — so it is safe to run on every deploy.
 *
 *   cd server && npm run backfill:roles
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const SUPER_ROLE = 'Super Admin';

  // 1) Guarantee the Super Admin role exists.
  const role = await prisma.role.upsert({
    where: { name: SUPER_ROLE },
    update: { isSuper: true },
    create: {
      name: SUPER_ROLE,
      description: 'Full access to every module. This role cannot be deleted or edited.',
      isSuper: true,
      isSystem: true,
    },
  });

  // 2) Re-attach the role to superadmin accounts that lost it.
  const orphaned = await prisma.adminUser.findMany({
    where: { roleId: null, role: 'superadmin' },
    select: { id: true, email: true },
  });

  if (orphaned.length === 0) {
    console.log('✅ No orphaned superadmin accounts — nothing to repair.');
    return;
  }

  const updated = await prisma.adminUser.updateMany({
    where: { id: { in: orphaned.map((a) => a.id) } },
    data: { roleId: role.id },
  });

  console.log(`🔧 Re-attached "${SUPER_ROLE}" to ${updated.count} admin account(s):`);
  for (const a of orphaned) console.log(`   • ${a.email}`);
  console.log('   They must sign in again to refresh their stored permissions.');
}

main()
  .catch((err) => {
    console.error('❌ Role backfill failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());