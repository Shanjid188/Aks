/**
 * Report every image the database still references but the disk no longer has.
 *
 * The storefront can look fine while a record quietly points at a deleted file,
 * and the symptom (a blank tile) is indistinguishable from a CSS problem. This
 * walks the models that carry artwork, checks each referenced filename against
 * `public/images/uploads`, and prints a verdict per reference.
 *
 *   cd server && npm run check:image-files
 *
 * Strictly read-only: it never writes, never deletes and never updates a record.
 * Fix a row by re-uploading the artwork in Admin, or by pointing the record at a
 * file that still exists.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Every model/field that can hold an uploaded image reference. */
const TARGETS = [
  { model: 'product', label: 'Products', fields: ['image', 'images'] },
  { model: 'heroSlide', label: 'Hero slides', fields: ['image'] },
  { model: 'sideBanner', label: 'Side banners', fields: ['image'] },
  { model: 'galleryBanner', label: 'Gallery banners', fields: ['image'] },
  { model: 'offerBanner', label: 'Offer banners', fields: ['image'] },
  { model: 'loveBanner', label: 'Customer photos', fields: ['image'] },
  { model: 'category', label: 'Divisions', fields: ['image', 'heroImage', 'gridImage'] },
  { model: 'promotion', label: 'Promotions', fields: ['image'] },
] as const;

function uploadsDir(): string | null {
  const candidates = [
    path.resolve(process.cwd(), '..', 'public', 'images', 'uploads'),
    path.resolve(process.cwd(), 'public', 'images', 'uploads'),
  ];
  return candidates.find((d) => fs.existsSync(d)) ?? null;
}

/**
 * Pull `<filename>` out of an uploaded-image reference.
 *
 * Product artwork is stored in an `images` column that the API persists as a
 * JSON array *string* (`["/images/uploads/a.jpg"]`), so the value must be
 * unwrapped before it can be split — otherwise every entry ends in `"]` and
 * every product looks "missing" when it is not.
 */
function filenamesOf(value: unknown): string[] {
  let raw: unknown[] = Array.isArray(value) ? value : [value];
  // Unwrap the JSON-encoded array-string form (and any single JSON string).
  raw = raw.map((v) => {
    if (typeof v !== 'string') return v;
    const t = v.trim();
    if (t.startsWith('[') || t.startsWith('"')) {
      try {
        const parsed = JSON.parse(t);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return v;
      }
    }
    return v;
  }).flat();

  return (raw as unknown[])
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && !/^data:/i.test(v))
    .map((v) => v.split('?')[0].split('#')[0].split('/').pop() ?? '')
    .filter((v) => v.length > 0);
}

interface Missing {
  model: string;
  field: string;
  id: string;
  label: string;
  reference: string;
  filename: string;
}

async function main() {
  const dir = uploadsDir();
  console.log('════════════════════════════════════════════════════════════');
  console.log('  AKS MART — MISSING UPLOAD AUDIT (read-only)');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`uploads dir : ${dir ?? 'NOT FOUND'}\n`);

  if (!dir) {
    console.error('Cannot continue: public/images/uploads does not exist.');
    console.error('Run this from the server folder on the host that holds the files.');
    process.exitCode = 1;
    return;
  }

  const missing: Missing[] = [];
  let checked = 0;
  const models = prisma as unknown as Record<string, { findMany?: (a: unknown) => Promise<Record<string, unknown>[]> }>;

  for (const target of TARGETS) {
    const delegate = models[target.model];
    if (!delegate?.findMany) {
      console.log(`  … skipped ${target.label} (model ${target.model} not available)`);
      continue;
    }
    let rows: Record<string, unknown>[];
    try {
      rows = await delegate.findMany({});
    } catch {
      console.log(`  … skipped ${target.label} (model ${target.model} not queryable)`);
      continue;
    }

    let modelMissing = 0;
    for (const row of rows) {
      const id = String(row.id ?? '(no id)');
      const label = String(row.name ?? row.title ?? row.slug ?? id);
      for (const field of target.fields) {
        for (const filename of filenamesOf(row[field])) {
          checked++;
          if (!fs.existsSync(path.join(dir, filename))) {
            missing.push({ model: target.model, field, id, label, reference: `/images/uploads/${filename}`, filename });
            modelMissing++;
          }
        }
      }
    }
    console.log(`  ✓ ${target.label.padEnd(18)} ${String(rows.length).padStart(4)} record(s)${modelMissing ? `  —  ${modelMissing} MISSING` : ''}`);
  }

  console.log('\n────────────────────────────────────────────────────────────');
  if (missing.length === 0) {
    console.log(`  All ${checked} image reference(s) exist on disk. Nothing to repair.`);
    return;
  }

  console.log(`  ${missing.length} of ${checked} reference(s) point at a file that is GONE:\n`);
  for (const m of missing) {
    console.log(`   • [${m.model}.${m.field}] ${m.label}`);
    console.log(`     id        : ${m.id}`);
    console.log(`     reference : ${m.reference}`);
    console.log(`     file      : ${m.filename}  (absent from ${dir})`);
  }
  console.log('\n  These rows will render an empty tile. No data was changed.');
  console.log('  Fix: re-upload the artwork in Admin, or repoint the record.');
  process.exitCode = 2;
}

main()
  .catch((e) => {
    console.error('Audit failed:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());