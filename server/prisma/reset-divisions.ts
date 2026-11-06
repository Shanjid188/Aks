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
 *   • Product.category is a plain slug string (not a relation), so deleting a
 *     category would silently orphan its products. A category that any product
 *     still points at is therefore SKIPPED, never deleted — the same rule the
 *     admin API applies (DELETE /admin/categories/:id → 409). Reassign those
 *     products and re-run to remove it.
 *   • Subcategory rows cascade with their category (schema onDelete: Cascade)
 *   • hero slide CTA targets are REPORTED, never silently rewritten
 *
 *   cd server && npm run reset:divisions           # preview only
 *   cd server && npm run reset:divisions -- --apply # actually delete
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { DIVISIONS } from '../../src/data/aksMart.ts';
import { seedCategories } from './seed-categories.ts';

const CANONICAL: string[] = DIVISIONS.map((d) => d.slug);

export interface ResetDivisionsResult {
  /** Slugs removed (with --apply) or that would be removed (dry run). */
  deleted: string[];
  /** Slugs left in place because products still reference them. */
  skipped: { slug: string; products: number }[];
}

export async function resetDivisions(
  prisma: PrismaClient,
  { apply = false, log = console.log }: { apply?: boolean; log?: (msg: string) => void } = {}
): Promise<ResetDivisionsResult> {
  const result: ResetDivisionsResult = { deleted: [], skipped: [] };

  // 1) Make sure the 5 canonical divisions (and their subcategories) exist and
  //    are active. This is the same code path a fresh install uses.
  const synced = await seedCategories(prisma);
  log(`✅ Synced ${synced.categories} divisions / ${synced.subcategories} subcategories from src/data/aksMart.ts`);

  // 2) Everything that is not a canonical division.
  const extras = await prisma.category.findMany({
    where: { NOT: { slug: { in: CANONICAL } } },
    include: { subcategories: { select: { id: true, name: true } } },
  });

  if (extras.length === 0) {
    log(`✅ Catalog is already clean — exactly ${CANONICAL.length} divisions.`);
  } else {
    log(`\n⚠️  ${extras.length} non-canonical categor${extras.length === 1 ? 'y' : 'ies'} found:\n`);
    const removable: typeof extras = [];
    for (const c of extras) {
      const subs = c.subcategories.map((s) => s.name).join(', ') || '—';
      log(`   • "${c.name}" (slug=${c.slug}, active=${c.isActive})`);
      log(`     subcategories: ${subs}`);

      const affected = await prisma.product.count({ where: { category: c.slug } });
      if (affected > 0) {
        log(`     ⛔ ${affected} product(s) still use this slug — SKIPPED. Reassign them, then re-run.`);
        result.skipped.push({ slug: c.slug, products: affected });
      } else {
        removable.push(c);
      }
    }

    if (!apply) {
      result.deleted = removable.map((c) => c.slug);
      log(`\n(DRY RUN — nothing was deleted. Re-run with --apply to remove ${removable.length} unused categor${removable.length === 1 ? 'y' : 'ies'}.)`);
    } else {
      let subCount = 0;
      for (const c of removable) {
        // Re-check inside the transaction so a product assigned to this slug
        // after the scan above still blocks the delete.
        const removed = await prisma.$transaction(async (tx) => {
          if ((await tx.product.count({ where: { category: c.slug } })) > 0) return false;
          await tx.category.delete({ where: { id: c.id } });
          return true;
        });
        if (removed) {
          result.deleted.push(c.slug);
          subCount += c.subcategories.length;
        } else {
          log(`   ⛔ "${c.name}" gained products during the run — SKIPPED.`);
          result.skipped.push({ slug: c.slug, products: await prisma.product.count({ where: { category: c.slug } }) });
        }
      }
      log(
        `\n🧹 Deleted ${result.deleted.length} categor${result.deleted.length === 1 ? 'y' : 'ies'} ` +
          `(+ ${subCount} subcategories via cascade).`
      );
    }

    if (result.skipped.length > 0) {
      log(`⚠️  Kept ${result.skipped.length} categor${result.skipped.length === 1 ? 'y' : 'ies'} that products still use: ${result.skipped.map((s) => s.slug).join(', ')}`);
    }
  }

  // 3) Report hero slides whose CTA points at a slug that is not a division.
  const slides = await prisma.heroSlide.findMany({
    select: { id: true, title: true, ctaCategory: true },
  });
  const dangling = slides.filter((s) => s.ctaCategory && !CANONICAL.includes(s.ctaCategory) && s.ctaCategory !== 'all');
  if (dangling.length > 0) {
    log(`\n⚠️  ${dangling.length} hero slide(s) link to a non-canonical category — fix in Admin → Hero Slides:`);
    for (const s of dangling) log(`   • "${s.title}" → ${s.ctaCategory}`);
  } else {
    log('✅ Hero slide CTA targets all resolve to a real division.');
  }

  return result;
}

// Run only when executed directly (npm run reset:divisions), not when imported by tests.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const prisma = new PrismaClient();
  resetDivisions(prisma, { apply: process.argv.includes('--apply') })
    .catch((err) => {
      console.error('❌ Division reset failed:', err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
