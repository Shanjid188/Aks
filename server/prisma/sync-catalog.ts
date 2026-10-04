/**
 * Import a LOCAL catalog snapshot into this (production) database.
 *
 * DRY RUN by default. `--apply` performs the write, and it always takes a
 * timestamped backup first and aborts if the backup fails.
 *
 * WHY UPSERT AND NEVER DELETE-AND-RECREATE
 *   OrderItem.productId, StockMovement.productId and ReturnRequest.productId all
 *   reference Product.id, and Subcategory.categoryId references Category.id.
 *   Recreating a row under a new id would silently orphan those rows and break
 *   order history. So every keyed record is matched on its natural key
 *   (Product.sku, Category.slug, Subcategory.slug) and UPDATED in place, which
 *   keeps the existing primary keys intact.
 *
 * NEVER TOUCHED: AdminUser, Role, RolePermission, Order, OrderItem, Customer,
 * Payment, StockMovement, Review, Coupon, settings. This tool only writes
 * catalog tables.
 *
 *   cd server && npm run sync:catalog                      # dry run
 *   cd server && npm run sync:catalog -- --apply           # write
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const SNAPSHOT = path.resolve(process.cwd(), 'prisma', 'catalog-snapshot.json');

interface Snap {
  categories: Array<Record<string, unknown> & { slug: string }>;
  subcategories: Array<Record<string, unknown> & { slug: string; categorySlug: string | null }>;
  products: Array<Record<string, unknown> & { sku: string }>;
  heroSlides: Array<Record<string, unknown> & { title: string }>;
  sideBanners: Array<Record<string, unknown>>;
  galleryBanners: Array<Record<string, unknown>>;
  offerBanners: Array<Record<string, unknown>>;
  loveBanners: Array<Record<string, unknown>>;
  imageRefs: string[];
}

function resolveImagesDir(): string | null {
  const c = [
    path.resolve(process.cwd(), '..', 'public', 'images'),
    path.resolve(process.cwd(), 'public', 'images'),
  ];
  return c.find((d) => fs.existsSync(d)) ?? null;
}

/** Timestamped copy of the SQLite file. Returns the new path, or null on failure. */
function backupDb(): string | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url?.startsWith('file:')) return null;
  const abs = path.resolve(process.cwd(), 'prisma', url.slice(5).replace(/^\.\//, ''));
  if (!fs.existsSync(abs)) return null;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const dest = `${abs}.backup-${stamp}`;
  fs.copyFileSync(abs, dest);
  return dest;
}

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  AKS MART — CATALOG SYNC  (LOCAL → PRODUCTION)');
  console.log(APPLY ? '  MODE: *** APPLY (writes enabled) ***' : '  MODE: DRY RUN (read-only)');
  console.log('════════════════════════════════════════════════════════════\n');

  if (!fs.existsSync(SNAPSHOT)) {
    console.error(`❌ Snapshot not found: ${SNAPSHOT}`);
    console.error('   Run `npm run export:catalog` on the LOCAL machine, then copy');
    console.error('   prisma/catalog-snapshot.json to the server.');
    return;
  }
  const snap = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8')) as Snap & { exportedAt?: string };
  console.log(`  snapshot : ${SNAPSHOT}`);
  console.log(`  exported : ${snap.exportedAt ?? 'unknown'}\n`);

  console.log('── 1. BACKUP ─────────────────────────────────────');
  let backupPath: string | null = null;
  if (APPLY) {
    backupPath = backupDb();
    console.log(backupPath ? `  ✅ ${backupPath}` : '  ❌ BACKUP FAILED — aborting.');
    if (!backupPath) return;
  } else {
    console.log('  (dry run — none taken yet) will become: server/prisma/dev.db.backup-<ts>');
  }

  const pCats = await prisma.category.count();
  const pSubs = await prisma.subcategory.count();
  const pProds = await prisma.product.count();

  console.log('\n── 2. COUNTS (local = source of truth) ───────────');
  const row = (n: string, l: number, p: number) =>
    console.log(`  ${n.padEnd(16)}${String(l).padStart(9)}${String(p).padStart(14)}`);
  row('Category', snap.categories.length, pCats);
  row('Subcategory', snap.subcategories.length, pSubs);
  row('Product', snap.products.length, pProds);
  row('HeroSlide', snap.heroSlides.length, await prisma.heroSlide.count());
  row('SideBanner', snap.sideBanners.length, await prisma.sideBanner.count());
  row('GalleryBanner', snap.galleryBanners.length, await prisma.galleryBanner.count());
  row('OfferBanner', snap.offerBanners.length, await prisma.offerBanner.count());
  row('LoveBanner', snap.loveBanners.length, await prisma.loveBanner.count());

  // ---------- CREATE / UPDATE / REMOVE PLANS ----------
  const exCat = await prisma.category.findMany({ select: { id: true, slug: true } });
  const exSub = await prisma.subcategory.findMany({ select: { id: true, slug: true } });
  const exProd = await prisma.product.findMany({ select: { id: true, sku: true, name: true } });
  const exSlide = await prisma.heroSlide.findMany({ select: { id: true, title: true } });

  const catSlugs = new Set(exCat.map((c) => c.slug));
  const subSlugs = new Set(exSub.map((s) => s.slug));
  const prodSkus = new Set(exProd.map((p) => p.sku));
  const slideTitles = new Set(exSlide.map((s) => s.title));
  const snapCatSlugs = new Set(snap.categories.map((c) => c.slug));

  const catNew = snap.categories.filter((c) => !catSlugs.has(c.slug));
  const catUpd = snap.categories.filter((c) => catSlugs.has(c.slug));
  const catGone = exCat.filter((c) => !snapCatSlugs.has(c.slug));

  const subNew = snap.subcategories.filter((s) => !subSlugs.has(s.slug));
  const subUpd = snap.subcategories.filter((s) => subSlugs.has(s.slug));
  const subGone = exSub.filter((s) => !snap.subcategories.some((x) => x.slug === s.slug));

  const prodNew = snap.products.filter((p) => !prodSkus.has(p.sku));
  const prodUpd = snap.products.filter((p) => prodSkus.has(p.sku));
  const prodGone = exProd.filter((p) => !snap.products.some((s) => s.sku === p.sku));

  const slideNew = snap.heroSlides.filter((s) => !slideTitles.has(s.title));
  const slideUpd = snap.heroSlides.filter((s) => slideTitles.has(s.title));

  console.log('\n── 3. CREATE / UPDATE / REMOVE ───────────────────');
  console.log(`  Category     +${catNew.length} new  ~${catUpd.length} update  -${catGone.length} remove`);
  console.log(`  Subcategory  +${subNew.length} new  ~${subUpd.length} update  -${subGone.length} remove`);
  console.log(`  Product      +${prodNew.length} new  ~${prodUpd.length} update  -${prodGone.length} deactivate`);
  console.log(`  HeroSlide    +${slideNew.length} new  ~${slideUpd.length} update`);
  console.log('  Banners      replaced by position (no FK dependents)');

  if (prodNew.length) { console.log('\n  products to CREATE:'); prodNew.forEach((p) => console.log(`    + ${p.name} [${p.sku}]`)); }
  if (prodUpd.length) { console.log('\n  products to UPDATE (primary key preserved):'); prodUpd.forEach((p) => console.log(`    ~ ${p.name} [${p.sku}]`)); }
  if (prodGone.length) {
    console.log('\n  ⚠️  in PRODUCTION only (will be DEACTIVATED, never deleted — orders keep working):');
    prodGone.forEach((p) => console.log(`    - ${p.name} [${p.sku}]`));
  }
  if (catGone.length) { console.log('\n  categories to REMOVE:'); catGone.forEach((c) => console.log(`    - ${c.slug}`)); }
  if (subGone.length) { console.log('\n  subcategories to REMOVE:'); subGone.forEach((s) => console.log(`    - ${s.slug}`)); }

  // ---------- CONFLICTS ----------
  console.log('\n── 4. CONFLICTS ──────────────────────────────────');
  const conflicts: string[] = [];
  const badSubs = snap.subcategories.filter((s) => s.categorySlug && !snapCatSlugs.has(s.categorySlug));
  if (badSubs.length) conflicts.push(`subcategories pointing at a category missing from snapshot: ${badSubs.length}`);
  const badProds = snap.products.filter((p) => !snapCatSlugs.has(String(p.category)));
  if (badProds.length) {
    conflicts.push(`products whose category is not in the snapshot: ${badProds.length}`);
    badProds.slice(0, 10).forEach((p) => console.log(`    ⚠️  "${p.name}" [${p.sku}] category="${p.category}"`));
  }
  const orphanAdmins = await prisma.adminUser.count({ where: { roleId: null } });
  if (orphanAdmins > 0) conflicts.push(`${orphanAdmins} admin account(s) have no role — login shows no permissions`);
  if (conflicts.length === 0) console.log('  none detected ✅');
  else conflicts.forEach((c) => console.log(`  ⚠️  ${c}`));

// ---------- IMAGES ----------
  console.log('\n── 5. IMAGES ─────────────────────────────────────');
  const dir = resolveImagesDir();
  if (!dir) {
    console.log('  ❌ public/images not found — cannot verify image files.');
  } else {
    const missing = snap.imageRefs.filter((ref) => {
      const rel = ref.replace(/^\/?(?:images\/)?/, '').split('?')[0];
      return !fs.existsSync(path.join(dir, rel));
    });
    console.log(`  images referenced : ${snap.imageRefs.length}`);
    console.log(`  missing on server : ${missing.length}${missing.length ? ' ❌' : ' ✅'}`);
    missing.slice(0, 15).forEach((m) => console.log(`    ⚠️  ${m}`));
    if (missing.length > 15) console.log(`    … and ${missing.length - 15} more`);
    if (missing.length) console.log('    (public/images is in git — run git pull if these are absent)');
  }

  console.log('\n── 6. UNTOUCHED BY THIS TOOL ─────────────────────');
  console.log(
    `  AdminUser ${await prisma.adminUser.count()} · Order ${await prisma.order.count()} · ` +
    `Customer ${await prisma.customer.count()} · Role ${await prisma.role.count()} (never written)`
  );

  if (!APPLY) {
    console.log('\n════════════════════════════════════════════════════════════');
    console.log('  DRY RUN COMPLETE — NOTHING CHANGED.');
    console.log('  Re-run with --apply to execute.');
    console.log('════════════════════════════════════════════════════════════');
    return;
  }

  await apply(snap, { catNew, catUpd, catGone, subNew, subUpd, subGone, prodNew, prodUpd, prodGone, slideNew, slideUpd }, backupPath);
}

/** Strip fields Prisma manages itself so a snapshot row can be written directly. */
function clean(row: Record<string, unknown>) {
  const { id, createdAt, updatedAt, categoryId, ...rest } = row as Record<string, unknown>;
  void id; void createdAt; void updatedAt; void categoryId;
  return rest;
}

type Plan = {
  catNew: Array<Record<string, unknown> & { slug: string }>;
  catUpd: Array<Record<string, unknown> & { slug: string }>;
  catGone: Array<{ id: string; slug: string }>;
  subNew: Array<Record<string, unknown> & { slug: string; categorySlug: string | null }>;
  subUpd: Array<Record<string, unknown> & { slug: string; categorySlug: string | null }>;
  subGone: Array<{ id: string; slug: string }>;
  prodNew: Array<Record<string, unknown> & { sku: string }>;
  prodUpd: Array<Record<string, unknown> & { sku: string }>;
  prodGone: Array<{ id: string; sku: string; name: string }>;
  slideNew: Array<Record<string, unknown> & { title: string }>;
  slideUpd: Array<Record<string, unknown> & { title: string }>;
};

async function apply(snap: Snap, p: Plan, backupPath: string | null) {
  console.log('\n── APPLYING ────────────────────────────────────');

  // ORDER MATTERS: Category -> Subcategory -> Product -> Slide -> Banner.
  for (const c of p.catNew) await prisma.category.create({ data: clean(c) as never });
  for (const c of p.catUpd) await prisma.category.update({ where: { slug: c.slug }, data: clean(c) as never });
  console.log(`  categories    +${p.catNew.length} ~${p.catUpd.length}`);

  const catBySlug = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id])
  );
  let subAdded = 0;
  for (const s of p.subNew) {
    const { categorySlug, ...rest } = s;
    if (!categorySlug || !catBySlug.has(categorySlug)) continue;
    await prisma.subcategory.create({ data: { ...clean(rest), categoryId: catBySlug.get(categorySlug)! } as never });
    subAdded += 1;
  }
  for (const s of p.subUpd) {
    const { categorySlug, ...rest } = s;
    const cid = categorySlug ? catBySlug.get(categorySlug) : undefined;
    await prisma.subcategory.update({
      where: { slug: s.slug },
      data: { ...clean(rest), ...(cid ? { categoryId: cid } : {}) } as never,
    });
  }
  console.log(`  subcategories +${subAdded} ~${p.subUpd.length}`);

  // Upsert by SKU: the primary key survives, so OrderItem/StockMovement links
  // stay valid and order history is never broken.
  for (const row of p.prodNew) await prisma.product.create({ data: clean(row) as never });
  for (const row of p.prodUpd) await prisma.product.update({ where: { sku: row.sku }, data: clean(row) as never });
  console.log(`  products     +${p.prodNew.length} ~${p.prodUpd.length}`);

  // Production-only products are hidden, never deleted.
  for (const row of p.prodGone) await prisma.product.update({ where: { id: row.id }, data: { isActive: false } });
  if (p.prodGone.length) console.log(`  products      ${p.prodGone.length} deactivated (kept for order history)`);

  for (const s of p.slideNew) await prisma.heroSlide.create({ data: clean(s) as never });
  for (const s of p.slideUpd) {
    const first = await prisma.heroSlide.findFirst({ where: { title: s.title } });
    if (first) await prisma.heroSlide.update({ where: { id: first.id }, data: clean(s) as never });
  }
  console.log(`  hero slides  +${p.slideNew.length} ~${p.slideUpd.length}`);

  // Banners have no natural key and no FK dependents: replace wholesale.
  await prisma.sideBanner.deleteMany({});
  await prisma.galleryBanner.deleteMany({});
  await prisma.offerBanner.deleteMany({});
  await prisma.loveBanner.deleteMany({});
  for (const b of snap.sideBanners) await prisma.sideBanner.create({ data: clean(b) as never });
  for (const b of snap.galleryBanners) await prisma.galleryBanner.create({ data: clean(b) as never });
  for (const b of snap.offerBanners) await prisma.offerBanner.create({ data: clean(b) as never });
  for (const b of snap.loveBanners) await prisma.loveBanner.create({ data: clean(b) as never });
  console.log('  banners      replaced from snapshot');

  // Catalog rows no longer in the snapshot.
  if (p.subGone.length) await prisma.subcategory.deleteMany({ where: { id: { in: p.subGone.map((s) => s.id) } } });
  if (p.catGone.length) await prisma.category.deleteMany({ where: { id: { in: p.catGone.map((c) => c.id) } } });
  if (p.subGone.length || p.catGone.length) {
    console.log(`  removed ${p.catGone.length} category(ies), ${p.subGone.length} subcategory(ies)`);
  }

  console.log('\n  ✅ DONE — Orders, Customers, Admins and Roles untouched.');
  console.log(`  Restore point: ${backupPath}`);
}

main()
  .catch((e) => {
    console.error('❌ Sync failed:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());