import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { INITIAL_PRODUCTS, INITIAL_REVIEWS } from '../../src/data/products.ts';
import { AKS_MART, DIVISIONS } from '../../src/data/aksMart.ts';
import { seedCategories } from './seed-categories.ts';
import { ALL_PERMISSIONS, PERM } from '../src/lib/permissions.ts';

const prisma = new PrismaClient();

/**
 * Storefront identity/content baseline — the storefront reads these through
 * GET /api/settings/public with `DEFAULT_STORE_INFO` (bundled AKS_MART) as
 * the per-field fallback, and the admin edits them in Settings. Seeded once
 * so a fresh install shows the right branding without any admin action.
 */
const DEFAULT_STORE_SETTINGS: Record<string, string> = {
  storeName: AKS_MART.name,
  storeTagline: AKS_MART.tagline,
  storeLogo: '/images/AKS.logo.jpg',
  favicon: '/AKS.logo.jpg',
  phone: AKS_MART.phone,
  email: AKS_MART.email,
  website: AKS_MART.site,
  address: AKS_MART.address,
  addressBn: AKS_MART.addressBn,
  mottoEn: AKS_MART.mottoEn,
  mottoBn: AKS_MART.mottoBn,
  currency: 'BDT',
  currencySymbol: '৳',
};

/** Seed store settings idempotently; admin edits are never overwritten. */
export async function seedStoreSettings(): Promise<number> {
  for (const [key, value] of Object.entries(DEFAULT_STORE_SETTINGS)) {
    await prisma.storeSetting.upsert({
      where: { key },
      update: {},
      create: { key, value: JSON.stringify(value) },
    });
  }
  return prisma.storeSetting.count({
    where: { key: { in: Object.keys(DEFAULT_STORE_SETTINGS) } },
  });
}

const COUPONS = [
  { code: 'AKS15', discountType: 'percent', value: 15, minSpend: 2500, description: '15% Off on orders above ৳2,500' },
  { code: 'WELCOME10', discountType: 'percent', value: 10, minSpend: 1500, description: '10% Off your first AKS Mart purchase' },
    { code: 'EID2026', discountType: 'fixed', value: 600, minSpend: 4000, description: '৳600 Flat Discount on orders above ৳4,000' },
  { code: 'FREESHIP', discountType: 'percent', value: 100, minSpend: 0, description: 'Free express courier delivery across Bangladesh' },
];

const DEFAULT_ADMIN_EMAIL = 'admin@aksgarments.com.bd';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123';

// Default RBAC roles seeded on every boot; Super Admin is immutable & full-access.
const DEFAULT_ROLES: { name: string; description: string; isSuper?: boolean; permissions: (keyof typeof PERM)[] | 'all' }[] = [
  {
    name: 'Super Admin',
    description: 'Full access to every module. This role cannot be deleted or edited.',
    isSuper: true,
    permissions: 'all',
  },
  {
    name: 'Admin',
    description: 'Full storefront control — orders, products, coupons, content and reports.',
    permissions: [
      'DASHBOARD_VIEW', 'DASHBOARD_ANALYTICS',
      'ORDERS_VIEW', 'ORDERS_DETAILS', 'ORDERS_EDIT', 'ORDERS_STATUS', 'ORDERS_CANCEL',
      'PRODUCTS_VIEW', 'PRODUCTS_CREATE', 'PRODUCTS_EDIT', 'PRODUCTS_DELETE', 'PRODUCTS_UPLOAD',
      'CATEGORIES_VIEW', 'CATEGORIES_CREATE', 'CATEGORIES_EDIT', 'CATEGORIES_DELETE',
      'CUSTOMERS_VIEW', 'CUSTOMERS_DETAILS', 'CUSTOMERS_EDIT',
      'COUPONS_VIEW', 'COUPONS_CREATE', 'COUPONS_EDIT', 'COUPONS_DELETE',
      'REVIEWS_VIEW', 'REVIEWS_MODERATE',
      'SLIDES_VIEW', 'SLIDES_CREATE', 'SLIDES_EDIT', 'SLIDES_DELETE',
      'ROLES_VIEW', 'SETTINGS_VIEW',
    ],
  },
  {
    name: 'Order Manager',
    description: 'Can manage customer orders but cannot modify products.',
    permissions: [
      'DASHBOARD_VIEW',
      'ORDERS_VIEW', 'ORDERS_DETAILS', 'ORDERS_EDIT', 'ORDERS_STATUS', 'ORDERS_CANCEL',
      'CUSTOMERS_VIEW', 'CUSTOMERS_DETAILS',
    ],
  },
  {
    name: 'Product Manager',
    description: 'Manages the catalog — products, divisions and their content.',
    permissions: [
      'DASHBOARD_VIEW',
      'PRODUCTS_VIEW', 'PRODUCTS_CREATE', 'PRODUCTS_EDIT', 'PRODUCTS_DELETE', 'PRODUCTS_UPLOAD',
      'CATEGORIES_VIEW', 'CATEGORIES_CREATE', 'CATEGORIES_EDIT', 'CATEGORIES_DELETE',
      'CUSTOMERS_VIEW',
    ],
  },
  {
    name: 'Content Manager',
    description: 'Curates hero slides and moderates customer reviews.',
    permissions: [
      'DASHBOARD_VIEW',
      'REVIEWS_VIEW', 'REVIEWS_MODERATE',
      'SLIDES_VIEW', 'SLIDES_CREATE', 'SLIDES_EDIT', 'SLIDES_DELETE',
      'CUSTOMERS_VIEW',
    ],
  },
  {
    name: 'Support Staff',
    description: 'Answers customer queries — can view orders and customers.',
    permissions: [
      'DASHBOARD_VIEW',
      'ORDERS_VIEW', 'ORDERS_DETAILS',
      'CUSTOMERS_VIEW', 'CUSTOMERS_DETAILS',
    ],
  },
  {
    name: 'Accountant',
    description: 'Reviews sales and revenue reports.',
    permissions: [
      'DASHBOARD_VIEW', 'DASHBOARD_ANALYTICS',
      'ORDERS_VIEW', 'ORDERS_DETAILS',
      'CUSTOMERS_VIEW',
    ],
  },
];

async function seedRoles() {
  let rolesCreated = 0;
  for (const def of DEFAULT_ROLES) {
    const existing = await prisma.role.findUnique({ where: { name: def.name } });
    const perms = def.permissions === 'all' ? ALL_PERMISSIONS : def.permissions.map((key) => PERM[key]);
    if (existing) {
      // Refresh permissions on every seed (idempotent), but never touch Super Admin.
      if (!(def.isSuper ?? false)) {
        await prisma.$transaction([
          prisma.rolePermission.deleteMany({ where: { roleId: existing.id } }),
          prisma.rolePermission.createMany({
            data: perms.map((permission) => ({ roleId: existing.id, permission })),
          }),
        ]);
      }
    } else {
      await prisma.role.create({
        data: {
          name: def.name,
          description: def.description,
          isSuper: def.isSuper ?? false,
          isSystem: true,
          permissions: { create: perms.map((permission) => ({ permission })) },
        },
      });
      rolesCreated += 1;
    }
  }
  console.log(`✅ Roles synced (${DEFAULT_ROLES.length}) [${rolesCreated} created]`);
}

async function main() {
  console.log('🔄 Seeding AKS database...\n');

  await seedRoles();

  const superRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });

  // ---------- Admin users ----------
  const existingAdmin = await prisma.adminUser.findUnique({ where: { email: DEFAULT_ADMIN_EMAIL } });
  if (!existingAdmin) {
    await prisma.adminUser.create({
      data: {
        email: DEFAULT_ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10),
        name: 'AKS Super Admin',
        role: 'superadmin',
        roleId: superRole?.id ?? null,
      },
    });
    console.log(`✅ Admin created → ${DEFAULT_ADMIN_EMAIL} (password not shown — set your own via prisma/set-admin-password.ts)`);
  } else {
    await prisma.adminUser.update({
      where: { id: existingAdmin.id },
      data: { roleId: superRole?.id ?? null },
    });
    console.log('ℹ️  Admin already exists, skipping.');
  }

  // ---------- Categories & subcategories (divisions) ----------
  // Storefront divisions/subcategories now live in the DB and are editable from
  // Admin → Categories. src/data/aksMart.ts is only the seed input + fallback.
  const catResult = await seedCategories(prisma);
  console.log(
    `✅ Categories synced (${catResult.categories} divisions, ${catResult.subcategories} subcategories` +
      `${catResult.legacyRemoved ? `, ${catResult.legacyRemoved} legacy nested rows migrated` : ''})`
  );

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

  // ---------- Hero slides (storefront carousel) ----------
  // Images are served from /public/images so they work in dev and production.
  const settingsCount = await seedStoreSettings();
  console.log(`✅ Store settings present (${settingsCount})`);
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
  console.log('   Set your real admin password →');
  console.log('   ADMIN_EMAIL="..." ADMIN_PASSWORD="..." node node_modules/tsx/dist/cli.mjs prisma/set-admin-password.ts');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());