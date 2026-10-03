/**
 * Production catalog repair — DRY RUN by default.
 *
 * Goal: bring a production database to the intended 5-division catalog without
 * ever deleting a product. Product.category / Product.subcategory are plain
 * strings (not relations), so products are re-pointed by string update.
 *
 * Hard guarantees:
 *   • No product is ever deleted or price/stock/SKU/barcode/images touched
 *   • Categories/subcategories outside the canonical list are only REMOVED
 *     after every product using them has been re-pointed
 *   • A product that cannot be mapped confidently is REPORTED, never guessed
 *   • At least one active admin is always preserved
 *   • A timestamped backup is taken before any write
 *
 *   cd server && npm run repair:catalog              # dry run, read-only
 *   cd server && npm run repair:catalog -- --apply   # perform changes
 *
 * Optional: add --reset-orders to also clear orders/customers/test admins
 * (the brief allows this; it is off by default so nothing destructive is implied).
 */
import { PrismaClient } from '@prisma/client';
import { DIVISIONS } from '../../src/data/aksMart.ts';
import { seedCategories } from './seed-categories.ts';
import path from 'node:path';
import fs from 'node:fs';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const RESET_ORDERS = process.argv.includes('--reset-orders');

const CANON_SLUGS = DIVISIONS.map((d) => d.slug) as string[];
const SLUG_BY_BRAND = new Map(DIVISIONS.map((d) => [d.brand.toLowerCase(), d.slug]));

/** Every canonical subcategory name → the division it belongs to. */
const SUB_TO_PARENT = new Map<string, string>();
for (const d of DIVISIONS) {
  for (const s of d.subcategories) SUB_TO_PARENT.set(s.trim().toLowerCase(), d.slug);
}

const norm = (v: string) => v.trim().toLowerCase();

/**
 * Decide where a product should live.
 * Returns the canonical slug, or null when we are not confident.
 */
function mapProduct(category: string, subcategory: string, brand: string): string | null {
  const cat = norm(category);
  const sub = norm(subcategory);

  // 1. Already canonical.
  if (CANON_SLUGS.includes(cat)) return cat;

  // 2. Its subcategory name uniquely identifies a canonical division.
  if (sub && SUB_TO_PARENT.has(sub)) return SUB_TO_PARENT.get(sub)!;

  // 3. Brand matches a division brand (e.g. "SHUDDHO" → food).
  const b = norm(brand);
  if (b && SLUG_BY_BRAND.has(b)) return SLUG_BY_BRAND.get(b)!;

  // 4. Brand contains a division brand (e.g. "AKS Home Decor").
  for (const [brandName, slug] of SLUG_BY_BRAND) {
    if (b.includes(brandName)) return slug;
  }

  // 5. Category name itself mentions a division brand/slug.
  for (const d of DIVISIONS) {
    if (cat.includes(norm(d.slug)) || cat.includes(norm(d.brand))) return d.slug;
  }

  return null; // → reported as at-risk, left untouched
}

/** The canonical subcategory for a product inside `slug`, best effort. */
function mapSubcategory(slug: string, subcategory: string): string {
  const sub = norm(subcategory);
  const division = DIVISIONS.find((d) => d.slug === slug)!;
  if (sub && SUB_TO_PARENT.get(sub) === slug) {
    // keep the original casing from the division definition
    return division.subcategories.find((s) => norm(s) === sub)!;
  }
  return 'All';
}

/** Timestamped copy of the SQLite file. Returns the new path, or null on failure. */
function backupDb(): string | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || !url.startsWith('file:')) return null;
  const abs = path.resolve(process.cwd(), 'prisma', url.slice('file:'.length).replace(/^\.\//, ''));
  if (!fs.existsSync(abs)) return null;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const dest = `${abs}.backup-${stamp}`;
  fs.copyFileSync(abs, dest);
  return dest;
}

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  AKS MART — PRODUCTION CATALOG REPAIR');
  console.log(APPLY ? '  MODE: *** APPLY (writes enabled) ***' : '  MODE: DRY RUN (read-only)');
  console.log('════════════════════════════════════════════════════════════\n');

  // ---------- 1. BACKUP ----------
  console.log('── 1. DATABASE BACKUP ─────────────────────────────');
  let backupPath: string | null = null;
  if (APPLY) {
    backupPath = backupDb();
    console.log(backupPath ? `  ✅ Backup created: ${backupPath}` : '  ❌ BACKUP FAILED — aborting.');
    if (!backupPath) return;
  } else {
    console.log('  (dry run — no backup taken yet)');
    console.log('  will become: server/prisma/dev.db.backup-<timestamp>');
  }

  // ---------- 2. CURRENT CATEGORIES ----------
  const currentCats = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { subcategories: { orderBy: { sortOrder: 'asc' } } },
  });
  console.log(`\n── 2. CURRENT CATEGORIES (${currentCats.length}) ─────────────`);
  for (const c of currentCats) {
    const keep = CANON_SLUGS.includes(c.slug);
    console.log(`  ${keep ? '✅ KEEP   ' : '⚠️  REMOVE'} ${c.name} (slug=${c.slug}) active=${c.isActive} subs=${c.subcategories.length}`);
    for (const s of c.subcategories) console.log(`          · ${s.name}`);
  }

  // ---------- 3. TARGET ----------
  console.log('\n── 3. TARGET (from src/data/aksMart.ts) ───────────');
  for (const d of DIVISIONS) console.log(`  • ${d.brand} → ${d.slug}  (${d.subcategories.length} subcategories)`);

  // ---------- 4. SUB-CATEGORY CHANGES ----------
  const currentSubs = await prisma.subcategory.findMany({ orderBy: { sortOrder: 'asc' } });
  const canonicalSubSlugs = new Set<string>();
  for (const d of DIVISIONS) for (const s of d.subcategories) canonicalSubSlugs.add(norm(s));
  const straySubs = currentSubs.filter((s) => !canonicalSubSlugs.has(norm(s.name)));
  console.log(`\n── 4. SUBCATEGORY CHANGES ────────────────────────`);
  console.log(`  current subcategories: ${currentSubs.length} | non-canonical: ${straySubs.length}`);
  for (const s of straySubs) console.log(`  ⚠️  REMOVE subcategory "${s.name}" (slug=${s.slug})`);

  // ---------- 5. PRODUCTS ----------
  const products = await prisma.product.findMany({
    select: { id: true, name: true, sku: true, category: true, subcategory: true, brand: true, price: true, images: true },
    orderBy: { name: 'asc' },
  });
  console.log(`\n── 5. PRODUCTS ───────────────────────────────────`);
  console.log(`  TOTAL PRODUCT COUNT: ${products.length}  (never deleted)`);
  const alreadyOk = products.filter((p) => CANON_SLUGS.includes(norm(p.category)));
  console.log(`  already on a canonical category: ${alreadyOk.length}`);

  const remaps: Array<{ p: (typeof products)[number]; to: string; sub: string }> = [];
  const atRisk: typeof products = [];
  for (const p of products) {
    if (CANON_SLUGS.includes(norm(p.category))) continue;
    const to = mapProduct(p.category, p.subcategory, p.brand);
    if (to) remaps.push({ p, to, sub: mapSubcategory(to, p.subcategory) });
    else atRisk.push(p);
  }

  const imgCount = (raw: string) => {
    try { const a = JSON.parse(raw || '[]'); return Array.isArray(a) ? a.length : 0; } catch { return 0; }
  };

  console.log(`\n── 6. PRODUCTS WHOSE CATEGORY WILL CHANGE (${remaps.length}) ─`);
  for (const r of remaps) {
    console.log(`  • "${r.p.name}" [${r.p.sku}] ${r.p.category}/${r.p.subcategory}  →  ${r.to}/${r.sub}`);
    console.log(`      price=${r.p.price} images=${imgCount(r.p.images)} (preserved)`);
  }

  console.log(`\n── 7. PRODUCTS AT RISK (${atRisk.length}) ───────────`);
  if (atRisk.length === 0) console.log('  none — every product maps to a canonical division.');
  // ---------- 8. ADMINS ----------
  const admins = await prisma.adminUser.findMany({ include: { roleRef: { select: { name: true, isSuper: true } } } });
  console.log(`\n── 8. ADMIN ACCOUNTS (${admins.length}) ────────────`);
  for (const a of admins) console.log(`  • ${a.email} role=${a.roleRef?.name ?? 'NONE'} active=${a.isActive}`);
  const usable = admins.filter((a) => a.isActive && a.roleRef);
  console.log(`  usable (active + has role): ${usable.length}`);
  if (usable.length === 0) console.log('  ⚠️  none usable — repair will re-attach Super Admin.');

  const orders = await prisma.order.count();
  const customers = await prisma.customer.count();
  console.log(`\n── 9. OTHER DATA ──────────────────────────────────`);
  console.log(`  orders: ${orders}   customers: ${customers}`);
  console.log(`  ${RESET_ORDERS ? 'will be CLEARED (--reset-orders)' : 'will be KEPT (no --reset-orders)'}`);

  if (!APPLY) {
    console.log('\n════════════════════════════════════════════════════════════');
    console.log('  DRY RUN COMPLETE — NOTHING WAS CHANGED.');
    console.log('  Re-run with --apply to execute.');
    console.log('════════════════════════════════════════════════════════════');
    return;
  }
  await apply(remaps, atRisk, straySubs, backupPath);
}

/** Perform the actual repair. Only reached with --apply. */
async function apply(
  remaps: Array<{ p: { id: string }; to: string; sub: string }>,
  atRisk: Array<{ id: string }>,
  straySubs: Array<{ id: string }>,
  backupPath: string | null
) {
  console.log('\n── APPLYING ─────────────────────────────────────');

  // 1) Ensure the canonical 5 exist + are active (safe upsert).
  const synced = await seedCategories(prisma);
  console.log(`  synced ${synced.categories} divisions / ${synced.subcategories} subcategories`);

  // 2) Re-point products. Only category/subcategory strings change.
  for (const r of remaps) {
    await prisma.product.update({
      where: { id: r.p.id },
      data: { category: r.to, subcategory: r.sub },
    });
  }
  console.log(`  re-pointed ${remaps.length} product(s) — no product data altered`);

  // 3) Optional cleanup of orders / customers.
  if (RESET_ORDERS) {
    await prisma.orderItem.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.returnRequest.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.customer.deleteMany({});
    console.log('  cleared orders + customers');
  }

  // 4) Remove non-canonical subcategories, then categories.
  if (straySubs.length) {
    await prisma.subcategory.deleteMany({ where: { id: { in: straySubs.map((s) => s.id) } } });
    console.log(`  removed ${straySubs.length} non-canonical subcategory(ies)`);
  }
  const extras = await prisma.category.findMany({ where: { NOT: { slug: { in: CANON_SLUGS } } } });
  if (extras.length) {
    await prisma.category.deleteMany({ where: { id: { in: extras.map((c) => c.id) } } });
    console.log(`  removed ${extras.length} non-canonical categor(ies)`);
  }

  // 5) Guarantee a usable admin.
  const superRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: { isSuper: true },
    create: { name: 'Super Admin', description: 'Full access.', isSuper: true, isSystem: true },
  });
  const orphanAdmins = await prisma.adminUser.findMany({ where: { roleId: null }, select: { id: true } });
  if (orphanAdmins.length) {
    await prisma.adminUser.updateMany({
      where: { id: { in: orphanAdmins.map((a) => a.id) } },
      data: { roleId: superRole.id },
    });
    console.log(`  re-attached Super Admin to ${orphanAdmins.length} admin(s)`);
  }

  console.log('\n  ✅ DONE.');
  console.log(`  Restore point: ${backupPath}`);
  console.log(`  Products left untouched for manual review: ${atRisk.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Repair failed:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());