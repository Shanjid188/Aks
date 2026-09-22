import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedCategories } from './seed-categories.ts';
import { PERM } from '../src/lib/permissions.ts';

/**
 * One-off migration for EXISTING databases (dev.db / production):
 *   1. fills the extended Category columns + creates the Subcategory rows
 *   2. converts the legacy nested Category rows (parentId) into subcategories
 *   3. grants the new category permissions to the roles that already manage products
 *
 * Everything is idempotent — run it as often as you like.
 *
 *   cd server
 *   node node_modules/tsx/dist/cli.mjs prisma/migrate-categories.ts
 */

const prisma = new PrismaClient();

const NEW_PERMISSIONS = [
  PERM.CATEGORIES_VIEW,
  PERM.CATEGORIES_CREATE,
  PERM.CATEGORIES_EDIT,
  PERM.CATEGORIES_DELETE,
];

/** Roles that can already edit products should also manage their divisions. */
async function grantCategoryPermissions(): Promise<{ roles: number; granted: number }> {
  const roles = await prisma.role.findMany({ where: { isSuper: false }, include: { permissions: true } });
  let rolesTouched = 0;
  let granted = 0;

  for (const role of roles) {
    const has = new Set(role.permissions.map((p) => p.permission));
    if (!has.has(PERM.PRODUCTS_EDIT)) continue;
    let added = 0;
    for (const permission of NEW_PERMISSIONS) {
      if (has.has(permission)) continue;
      await prisma.rolePermission.create({ data: { roleId: role.id, permission } });
      added += 1;
    }
    if (added > 0) {
      rolesTouched += 1;
      granted += added;
      console.log(`   + ${role.name}: ${added} permission(s)`);
    }
  }
  return { roles: rolesTouched, granted };
}

/** Products whose (category, subcategory) pair has no DB row — must stay empty. */
async function findOrphanProducts(): Promise<string[]> {
  const [categories, subcategories, products] = await Promise.all([
    prisma.category.findMany({ select: { slug: true } }),
    prisma.subcategory.findMany({ select: { name: true, category: { select: { slug: true } } } }),
    prisma.product.findMany({ select: { sku: true, category: true, subcategory: true } }),
  ]);
  const catSlugs = new Set(categories.map((c) => c.slug));
  const subPairs = new Set(subcategories.map((s) => `${s.category.slug}::${s.name}`));
  return products
    .filter((p) => !catSlugs.has(p.category) || !subPairs.has(`${p.category}::${p.subcategory}`))
    .map((p) => `${p.sku} (${p.category} / ${p.subcategory})`);
}

async function main() {
  console.log('🔄 Migrating categories → database-driven taxonomy\n');

  const result = await seedCategories(prisma);
  console.log(
    `✅ Divisions synced: ${result.categories} top-level` +
      `${result.legacyRemoved ? `, ${result.legacyRemoved} legacy nested rows migrated to Subcategory` : ''}`
  );

  const subCount = await prisma.subcategory.count();
  const activeSubCount = await prisma.subcategory.count({ where: { isActive: true } });
  console.log(`✅ Subcategories in DB: ${subCount} (${activeSubCount} active)`);

  console.log('🔐 Granting category permissions…');
  const perms = await grantCategoryPermissions();
  console.log(`✅ Roles updated: ${perms.roles} (${perms.granted} permissions granted)`);

  const byCategory = await prisma.product.groupBy({ by: ['category'], _count: { _all: true } });
  console.log('\n📊 Products per division:');
  for (const row of byCategory.sort((a, b) => a.category.localeCompare(b.category))) {
    console.log(`   ${row.category.padEnd(10)} ${row._count._all}`);
  }

  const orphans = await findOrphanProducts();
  console.log(`\n🔎 Products without a matching division/subcategory: ${orphans.length}`);
  for (const orphan of orphans.slice(0, 10)) console.log(`   - ${orphan}`);

  console.log('\n🎉 Category migration complete.');
}

main()
  .catch((e) => {
    console.error('Category migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
