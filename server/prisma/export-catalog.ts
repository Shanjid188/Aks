/**
 * Export the LOCAL catalog to a portable JSON snapshot.
 *
 * Run this on the machine that holds the source of truth (local), then copy the
 * single snapshot file to the server and import it there with sync-catalog.ts.
 *
 * Deliberately excluded: Order, Customer, AdminUser, Role, RolePermission,
 * Coupon, Review, settings — everything that is not storefront catalog.
 *
 * The snapshot keys each row by its stable natural key so an import can upsert
 * without ever changing a primary key:
 *   Category    -> slug      (@unique)
 *   Subcategory -> slug      (@unique)
 *   Product     -> sku       (@unique)   ← ids are preserved on import
 *   HeroSlide   -> title     (no other unique key)
 *   Banners     -> replaced by position (no natural key, no FK dependents)
 *
 *   cd server && npm run export:catalog
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();
const OUT = path.resolve(process.cwd(), 'prisma', 'catalog-snapshot.json');

async function main() {
  console.log('📦 Exporting LOCAL catalog snapshot…\n');

  const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  const subcategories = await prisma.subcategory.findMany({ orderBy: { sortOrder: 'asc' } });
  const products = await prisma.product.findMany({ orderBy: { sku: 'asc' } });
  const heroSlides = await prisma.heroSlide.findMany({ orderBy: { sortOrder: 'asc' } });
  const sideBanners = await prisma.sideBanner.findMany({ orderBy: { sortOrder: 'asc' } });
  const galleryBanners = await prisma.galleryBanner.findMany({ orderBy: { sortOrder: 'asc' } });
  const offerBanners = await prisma.offerBanner.findMany({ orderBy: { sortOrder: 'asc' } });
  const loveBanners = await prisma.loveBanner.findMany({ orderBy: { sortOrder: 'asc' } });

  // category slug by id, so a subcategory can carry its parent as a slug.
  const catSlugById = new Map(categories.map((c) => [c.id, c.slug]));

  // Every image path the snapshot depends on, so the importer can verify the
  // files actually exist on the target server.
  const imageRefs = new Set<string>();
  const addRef = (v: unknown) => {
    if (typeof v !== 'string') return;
    if (/^(https?:)?\/\//i.test(v) || v.startsWith('data:')) return;
    if (!/\.(jpe?g|png|webp|gif|avif|svg)$/i.test(v)) return;
    imageRefs.add(v);
  };
  for (const c of categories) { addRef(c.image); addRef(c.heroImage); addRef(c.gridImage); }
  for (const s of heroSlides) addRef(s.image);
  for (const b of sideBanners) addRef(b.image);
  for (const b of galleryBanners) addRef(b.image);
  for (const b of offerBanners) addRef(b.image);
  for (const b of loveBanners) addRef(b.image);
  for (const p of products) {
    try {
      const arr = JSON.parse(p.images || '[]');
      if (Array.isArray(arr)) arr.forEach(addRef);
    } catch { /* ignore malformed JSON; importer re-checks */ }
  }

  const snapshot = {
    exportedAt: new Date().toISOString(),
    source: 'local',
    categories: categories.map(({ id, createdAt, updatedAt, parentId, ...rest }) => {
      void id; void createdAt; void updatedAt; void parentId;
      return rest;
    }),
    subcategories: subcategories.map((s) => ({
      categorySlug: catSlugById.get(s.categoryId) ?? null,
      slug: s.slug,
      name: s.name,
      nameBn: s.nameBn,
      isActive: s.isActive,
      sortOrder: s.sortOrder,
    })),
    products: products.map(({ id, createdAt, updatedAt, ...rest }) => {
      void id; void createdAt; void updatedAt;
      return rest;
    }),
    heroSlides: heroSlides.map(({ id, createdAt, updatedAt, ...rest }) => {
      void id; void createdAt; void updatedAt;
      return rest;
    }),
    sideBanners: sideBanners.map(({ id, createdAt, updatedAt, ...rest }) => {
      void id; void createdAt; void updatedAt;
      return rest;
    }),
    galleryBanners: galleryBanners.map(({ id, createdAt, updatedAt, ...rest }) => {
      void id; void createdAt; void updatedAt;
      return rest;
    }),
    offerBanners: offerBanners.map(({ id, createdAt, updatedAt, ...rest }) => {
      void id; void createdAt; void updatedAt;
      return rest;
    }),
    loveBanners: loveBanners.map(({ id, createdAt, updatedAt, ...rest }) => {
      void id; void createdAt; void updatedAt;
      return rest;
    }),
    imageRefs: [...imageRefs].sort(),
  };

  fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2));
  const kb = Math.round(fs.statSync(OUT).size / 1024);

  console.log('── LOCAL COUNTS (source of truth) ─────────────────');
  console.log(`  categories    : ${snapshot.categories.length}`);
  console.log(`  subcategories : ${snapshot.subcategories.length}`);
  console.log(`  products      : ${snapshot.products.length}`);
  console.log(`  hero slides   : ${snapshot.heroSlides.length}`);
  console.log(`  side banners  : ${snapshot.sideBanners.length}`);
  console.log(`  gallery       : ${snapshot.galleryBanners.length}`);
  console.log(`  offer banners : ${snapshot.offerBanners.length}`);
  console.log(`  love banners  : ${snapshot.loveBanners.length}`);
  console.log(`  image refs    : ${snapshot.imageRefs.length}`);
  console.log(`\n✅ Snapshot written: ${OUT} (${kb} KB)`);
  console.log('   Copy that ONE file to the server, then run:');
  console.log('   npm run sync:catalog');
}

main()
  .catch((e) => {
    console.error('❌ Export failed:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());