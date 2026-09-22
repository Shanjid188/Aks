import type { PrismaClient } from '@prisma/client';
import { DIVISIONS } from '../../src/data/aksMart.ts';

/**
 * Divisions / categories seeding — single source of truth for both `seed.ts`
 * (fresh installs) and `migrate-categories.ts` (existing databases).
 *
 * Storefront data lives in the database now; `src/data/aksMart.ts` is only the
 * seed input + offline fallback. Every value that product rows depend on is
 * preserved: `Category.slug` === `Product.category` and
 * `Subcategory.name` === `Product.subcategory`.
 */

/** "Rice & Staples" + parent "food" → "food-rice-staples" (same as the old seed). */
export function subcategorySlug(categorySlug: string, name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'sub';
  return `${categorySlug}-${base}`;
}

export interface SeedCategoriesResult {
  categories: number;
  subcategories: number;
  legacyRemoved: number;
}

export async function seedCategories(prisma: PrismaClient): Promise<SeedCategoriesResult> {
  let subcategories = 0;

  // 1) Upgrade legacy nesting: the first seed stored subcategories as Category
  //    rows carrying a `parentId`. They are real Subcategory rows now, and the
  //    slugs match exactly, so the upserts below re-use the same names/order.
  const legacyChildren = await prisma.category.findMany({ where: { parentId: { not: null } } });

  for (const [index, d] of DIVISIONS.entries()) {
    const fields = {
      name: d.brand,
      nameBn: d.titleBn ?? null,
      description: d.description,
      descriptionBn: d.descriptionBn ?? null,
      tagline: d.subtitle,
      taglineBn: d.subtitleBn ?? null,
      brand: d.brand,
      image: d.image,
      heroImage: d.sliderImage,
      gridImage: d.gridImage,
      badge: d.badge,
      accentColor: d.accent,
      isActive: true,
      sortOrder: index + 1,
    };

    const category = await prisma.category.upsert({
      where: { slug: d.slug },
      update: fields,
      create: { ...fields, slug: d.slug },
    });

    for (const [subIndex, name] of d.subcategories.entries()) {
      const slug = subcategorySlug(d.slug, name);
      const subFields = {
        categoryId: category.id,
        name,
        nameBn: d.subcategoriesBn?.[subIndex] ?? null,
        isActive: true,
        sortOrder: subIndex + 1,
      };
      await prisma.subcategory.upsert({
        where: { slug },
        update: subFields,
        create: { ...subFields, slug },
      });
      subcategories += 1;
    }
  }

  // 2) Drop the migrated legacy rows (nothing else references them).
  let legacyRemoved = 0;
  if (legacyChildren.length > 0) {
    const res = await prisma.category.deleteMany({ where: { parentId: { not: null } } });
    legacyRemoved = res.count;
  }

  // 3) Any other leftover categories (legacy garment taxonomy) are kept in the
  //    DB for auditing but hidden from the storefront.
  await prisma.category.updateMany({
    where: { NOT: { slug: { in: DIVISIONS.map((d) => d.slug) } } },
    data: { isActive: false },
  });

  return { categories: DIVISIONS.length, subcategories, legacyRemoved };
}
