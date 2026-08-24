import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { INITIAL_PRODUCTS, INITIAL_REVIEWS } from '../../src/data/products.ts';
import { STORE_LOCATIONS } from '../../src/data/stores.ts';
import { DIVISIONS } from '../../src/data/aksMart.ts';

const prisma = new PrismaClient();

const COUPONS = [
  { code: 'AKS15', discountType: 'percent', value: 15, minSpend: 2500, description: '15% Off on orders above ৳2,500' },
  { code: 'WELCOME10', discountType: 'percent', value: 10, minSpend: 1500, description: '10% Off your first AKS Mart purchase' },
    { code: 'EID2026', discountType: 'fixed', value: 600, minSpend: 4000, description: '৳600 Flat Discount on orders above ৳4,000' },
  { code: 'FREESHIP', discountType: 'percent', value: 100, minSpend: 0, description: 'Free express courier delivery across Bangladesh' },
];

const DEFAULT_ADMIN_EMAIL = 'admin@aksgarments.com.bd';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123';

async function main() {
  console.log('🔄 Seeding AKS database...\n');

  // ---------- Admin users ----------
  const existingAdmin = await prisma.adminUser.findUnique({ where: { email: DEFAULT_ADMIN_EMAIL } });
  if (!existingAdmin) {
    await prisma.adminUser.create({
      data: {
        email: DEFAULT_ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10),
        name: 'AKS Super Admin',
        role: 'superadmin',
      },
    });
    console.log(`✅ Admin created → ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD}`);
  } else {
    console.log('ℹ️  Admin already exists, skipping.');
  }

  // ---------- Categories (parent category + subcategory children) ----------
  const categoryRows = DIVISIONS.map((d) => ({ name: d.brand, slug: d.slug, children: d.subcategories }));
  for (const row of categoryRows) {
    const parent = await prisma.category.upsert({
      where: { slug: row.slug },
      update: { name: row.name },
      create: { name: row.name, slug: row.slug, sortOrder: 0 },
    });
    for (let i = 0; i < row.children.length; i += 1) {
      const child = row.children[i];
      const childSlug = `${row.slug}-${child.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
      await prisma.category.upsert({
        where: { slug: childSlug },
        update: { name: child, parentId: parent.id, sortOrder: i },
        create: { name: child, slug: childSlug, parentId: parent.id, sortOrder: i },
      });
    }
  }
  console.log(`✅ Categories synced (${categoryRows.length} top-level)`);

  // ---------- Products ----------
  let productCreated = 0;
  let productUpdated = 0;
  for (const p of INITIAL_PRODUCTS) {
    const data = {
      legacyId: p.id,
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      category: p.category,
      subcategory: p.subcategory,
      price: p.price,
      originalPrice: p.originalPrice ?? null,
      discountPercent: p.discountPercent ?? null,
      rating: p.rating,
      reviewsCount: p.reviewsCount,
      isNewArrival: p.isNewArrival ?? false,
      isBestSeller: p.isBestSeller ?? false,
      isTrending: p.isTrending ?? false,
      isClearance: p.isClearance ?? false,
      featuredOrder: p.featuredOrder ?? null,
      description: p.description,
      features: JSON.stringify(p.features),
      materials: JSON.stringify(p.materials),
      colors: JSON.stringify(p.colors),
      sizes: JSON.stringify(p.sizes),
      images: JSON.stringify(p.images),
      tags: JSON.stringify(p.tags),
      fit: p.fit ?? null,
      pattern: p.pattern ?? null,
      sleeve: p.sleeve ?? null,
      occasion: p.occasion,
      cushionTech: p.cushionTech ?? null,
    };

    const found = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (found) {
      await prisma.product.update({ where: { slug: p.slug }, data });
      productUpdated += 1;
    } else {
      await prisma.product.create({ data: { ...data, slug: p.slug } });
      productCreated += 1;
    }
  }
  console.log(`✅ Products → ${productCreated} created, ${productUpdated} updated (${INITIAL_PRODUCTS.length} total)`);

  // Keep any legacy garment products preserved in the DB but hidden from the storefront.
  await prisma.product.updateMany({
    where: { NOT: { category: { in: DIVISIONS.map((d) => d.slug) } } },
    data: { isActive: false },
  });
  console.log('✅ Legacy catalog preserved (kept in DB, hidden from storefront)');

  // ---------- Reviews (only on first seed so we never clobber user-submitted reviews) ----------
  const existingReviews = await prisma.review.count();
  if (existingReviews === 0) {
    let reviewCount = 0;
    for (const r of INITIAL_REVIEWS) {
      const product = await prisma.product.findUnique({ where: { legacyId: r.productId } });
      if (!product) continue;
      await prisma.review.create({
        data: {
          productId: product.id,
          author: r.author,
          city: r.city,
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          date: r.date,
          verified: r.verified,
          helpfulCount: r.helpfulCount,
          fitFeedback: r.fitFeedback,
          isApproved: true,
        },
      });
      reviewCount += 1;
    }
    console.log(`✅ Reviews seeded (${reviewCount})`);
  } else {
    console.log('ℹ️  Reviews already present, skipping');
  }

  // ---------- Coupons ----------
  for (const c of COUPONS) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: { discountType: c.discountType, value: c.value, minSpend: c.minSpend, description: c.description, active: true },
      create: { ...c, active: true },
    });
  }
  console.log(`✅ Coupons synced (${COUPONS.length})`);

  // ---------- Store locations ----------
  let storesCreated = 0;
  for (const s of STORE_LOCATIONS) {
    const data = {
      name: s.name,
      division: s.division,
      district: s.district,
      area: s.area,
      address: s.address,
      phone: s.phone,
      openingHours: s.openingHours,
      features: JSON.stringify(s.features),
      lat: s.lat,
      lng: s.lng,
      isFlagship: s.isFlagship ?? false,
    };
    const found = await prisma.store.findUnique({ where: { name: s.name } });
    if (found) {
      await prisma.store.update({ where: { name: s.name }, data });
    } else {
      await prisma.store.create({ data });
      storesCreated += 1;
    }
  }
  console.log(`✅ Stores synced (${STORE_LOCATIONS.length}) [${storesCreated} created]`);

  // ---------- Hero slides (storefront carousel) ----------
  // Images are served from /public/images so they work in dev and production.
    const HERO_SLIDES_SEED = DIVISIONS.map((d, i) => ({
    badge: d.badge.toUpperCase(),
    title: d.title,
    subtitle: d.description,
    ctaText: `Shop ${d.title}`,
    ctaCategory: d.slug,
    ctaSubcategory: null as string | null,
    ctaBrand: d.brand,
    image: d.image,
    accentColor: d.accent,
    tagline: d.subtitle,
    sortOrder: i + 1,
  }));


  let slidesCreated = 0;
  for (const s of HERO_SLIDES_SEED) {
    // Upsert by (title + image) uniqueness approximation: reuse row when a slide
    // with the same title exists, otherwise create. Deletions in admin are never re-created.
    const found = await prisma.heroSlide.findFirst({ where: { title: s.title } });
    if (found) {
      await prisma.heroSlide.update({
        where: { id: found.id },
        data: {
          badge: s.badge,
          subtitle: s.subtitle,
          ctaText: s.ctaText,
          ctaCategory: s.ctaCategory,
          ctaSubcategory: s.ctaSubcategory,
          ctaBrand: s.ctaBrand,
          image: s.image,
          accentColor: s.accentColor,
          tagline: s.tagline,
          sortOrder: s.sortOrder,
        },
      });
    } else {
      await prisma.heroSlide.create({ data: s });
      slidesCreated += 1;
    }
  }
  console.log(`✅ Hero slides synced (${HERO_SLIDES_SEED.length}) [${slidesCreated} created]`);

  console.log('\n🎉 Seed complete.');
  console.log('   Admin login →', DEFAULT_ADMIN_EMAIL, '/', DEFAULT_ADMIN_PASSWORD);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());