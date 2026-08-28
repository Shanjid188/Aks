import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Set (or reset) an admin password from the command line — run this ON THE VPS:
 *
 *   ADMIN_EMAIL="owner@aksmartbd.com" ADMIN_PASSWORD="YourStrongPass123" \
 *     node --env-file=.env node_modules/tsx/dist/cli.mjs prisma/set-admin-password.ts
 *
 * Creates the admin as "superadmin" if the email doesn't exist yet,
 * otherwise updates only that account's password hash.
 */
const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || !password) {
    console.error('✗ ADMIN_EMAIL and ADMIN_PASSWORD are required.');
    console.error('  Example:');
    console.error('  ADMIN_EMAIL="you@yourdomain.com" ADMIN_PASSWORD="StrongPass@123" \\');
    console.error('    node --env-file=.env node_modules/tsx/dist/cli.mjs prisma/set-admin-password.ts');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('✗ ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, isActive: true },
    create: {
      email,
      passwordHash,
      name: 'Store Owner',
      role: 'superadmin',
    },
  });

  console.log(`✅ Password updated for admin: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error('set-admin-password failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());