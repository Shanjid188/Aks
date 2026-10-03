/**
 * Repair script: restore the catalog to exactly the 5 canonical divisions.
 *
 * Categories are editable from Admin → Categories, so stray ones can pile up.
 * `seedCategories()` only *deactivates* leftovers (kept for auditing), which
 * leaves them visible in the admin table. This script instead hard-removes
 * anything outside the canonical DIVISIONS list in src/data/aksMart.ts, so the
 * catalog matches the seed input exactly.
 *
 * Safety:
 *   • dry-run by default — pass --apply to actually delete
 *   • only touches categories whose slug is NOT one of the 5 divisions
 *   • Product.category is a plain slug string (not a relation), so products
 *     are never cascaded; any product pointing at a removed slug is REPORTED
 *     so it can be reassigned by hand
 *   • Subcategory rows cascade with their category (schema onDelete: Cascade)
 *   • hero slide CTA targets are REPORTED, never silently rewritten
 *
 *   cd server && npm run reset:divisions           # preview only
 *   cd server && npm run reset:divisions -- --apply # actually delete
 */
import { PrismaClient } from '@prisma/client';
import { DIVISIONS } from '../../src/data/aksMart.ts';
import { seedCategories } from './seed-categories.ts';

const prisma = new PrismaClient();
const CANONICAL: string[] = DIVISIONS.map((d) => d.slug);
const APPLY = process.argv.includes('--apply');

async function main() {
  // 1) Make sure the 5 canonical divisions (and their subcategories) exist and
  //    are active. This is the same code path a fresh install uses.
  const synced = await seedCategories(prisma);
  console.log(
    `✅ Synced ${synced.categories} divisions / ${synced.subcategories} subcategories from src/data/aksMart.ts`
  );

  // 2) Everything that is not a canonical division.
  const extras = await prisma.category.findMany({
    where: { NOT: { slug: { in: CANONICAL } } },
    include: { subcategories: { select: { id: true, name: true } } },
  });

  if (extras.length === 0) {
    console.log(`✅ Catalog is already clean — exactly ${CANONICAL.length} divisions.`);
  } else {
    console.log(`\n⚠️  ${extras.length} non-canonical categor${extras.length === 1 ? 'y' : 'ies'} found:\n`);
    for (const c of extras) {
      const subs = c.subcategories.map((s) => s.name).join(', ') || '—';
      console.log(`   • "${c.name}" (slug=${c.slug}, active=${c.isActive})`);
      console.log(`     subcategories: ${subs}`);

      const affected = await prisma.product.count({ where: { category: c.slug } });
      if (affected > 0) {
        console.log(`     ⚠️  ${affected} product(s) reference this slug — reassign them first!`);
      }
    }

    if (!APPLY) {
      console.log('\n(DRY RUN — nothing was deleted. Re-run with --apply to remove them.)');
      return;
    }

    const subCount = extras.reduce((n, c) => n + c.subcategories.length, 0);
    await prisma.category.deleteMany({ where: { id: { in: extras.map((c) => c.id) } } });
    console.log(
      `\n🧹 Deleted ${extras.length} categor${extras.length === 1 ? 'y' : 'ies'} ` +
        `(+ ${subCount} subcategories via cascade).`
    );
  }

  // 3) Report hero slides whose CTA points at a slug that no longer exists.
  const slides = await prisma.heroSlide.findMany({
    select: { id: true, title: true, ctaCategory: true },
  });
  const dangling = slides.filter((s) => s.ctaCategory && !CANONICAL.includes(s.ctaCategory) && s.ctaCategory !== 'all');
  if (dangling.length > 0) {
    console.log(`\n⚠️  ${dangling.length} hero slide(s) link to a removed category — fix in Admin → Hero Slides:`);
    for (const s of dangling) console.log(`   • "${s.title}" → ${s.ctaCategory}`);
  } else {
    console.log('✅ Hero slide CTA targets all resolve to a real division.');
  }
}

main()
  .catch((err) => {
    console.error('❌ Division reset failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());