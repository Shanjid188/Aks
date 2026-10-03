/**
 * Diagnostic: find every image the database references that is missing on disk.
 *
 * The admin panel lets you point a slide / banner / product at an uploaded
 * file. Those uploads live in public/images/uploads and are gitignored, so a
 * deploy (git pull) can leave a database row pointing at a file the server
 * never received — the page then renders a broken image with no explanation.
 *
 * This walks every image-bearing model and reports each reference that cannot
 * be resolved to a real file. It only reads; nothing is modified.
 *
 *   cd server && npm run check:images
 *
 * Exits non-zero when something is broken, so it can gate a deploy if wanted.
 */
import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import fs from 'node:fs';

const prisma = new PrismaClient();

/** Same resolution as server/src/index.ts and routes/uploads.ts. */
function resolveImagesDir(): string {
  const candidates = [
    path.resolve(process.cwd(), '..', 'public', 'images'),
    path.resolve(process.cwd(), 'public', 'images'),
  ];
  const found = candidates.find((dir) => fs.existsSync(dir));
  if (!found) throw new Error('public/images not found — run this from the server/ directory');
  return found;
}

/**
 * Resolve a stored reference to a real path.
 * Returns 'remote' for absolute URLs (off-host, cannot be checked from here).
 */
function verify(raw: string | null | undefined, imagesDir: string) {
  const url = (raw ?? '').trim();
  if (!url) return { url, status: 'empty' as const };
  if (/^(https?:)?\/\//i.test(url) || /^data:/i.test(url)) {
    return { url, status: 'remote' as const };
  }
  // Strip the public prefix so `/images/uploads/x.jpg` and `uploads/x.jpg`
  // both resolve against public/images/.
  const rel = url.replace(/^\/?(?:images\/)?/, '').split('?')[0].split('#')[0];
  const abs = path.join(imagesDir, rel);
  // Guard against a crafted path escaping public/images/.
  if (!path.resolve(abs).startsWith(path.resolve(imagesDir))) {
    return { url, status: 'outside' as const };
  }
  return { url, status: fs.existsSync(abs) ? ('ok' as const) : ('missing' as const) };
}

type Verdict = ReturnType<typeof verify>['status'];

async function main() {
  const imagesDir = resolveImagesDir();
  console.log(`📁 Checking images under ${imagesDir}\n`);

  const missing: Array<{ model: string; label: string; field: string; url: string }> = [];
  const remote: Array<{ model: string; field: string; url: string }> = [];
  const counts: Record<string, number> = {};

  /** Verify one field of a row and tally the outcome. */
  const check = (
    model: string,
    field: string,
    label: string,
    raw: string | null | undefined
  ): Verdict => {
    const r = verify(raw, imagesDir);
    counts[r.status] = (counts[r.status] ?? 0) + 1;
    if (r.status === 'missing') missing.push({ model, label, field, url: r.url });
    if (r.status === 'remote') remote.push({ model, field, url: r.url });
    return r.status;
  };

  // ---- Hero slides (the storefront carousel) ----
  for (const s of await prisma.heroSlide.findMany({ orderBy: { sortOrder: 'asc' } })) {
    check('HeroSlide', 'image', s.title || `(id ${s.id})`, s.image);
  }

  // ---- Side / gallery / offer / love banners (no `title` column — label by id) ----
  for (const b of await prisma.sideBanner.findMany()) {
    check('SideBanner', 'image', `(id ${b.id})`, b.image);
  }
  for (const b of await prisma.galleryBanner.findMany()) {
    check('GalleryBanner', 'image', `(id ${b.id})`, b.image);
  }
  for (const b of await prisma.offerBanner.findMany()) {
    check('OfferBanner', 'image', `(id ${b.id})`, b.image);
  }
  for (const b of await prisma.loveBanner.findMany()) {
    check('LoveBanner', 'image', `(id ${b.id})`, b.image);
  }

  // ---- Categories (division card + hero + grid art) ----
  for (const c of await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } })) {
    check('Category', 'image', c.name, c.image);
    check('Category', 'heroImage', c.name, c.heroImage);
    check('Category', 'gridImage', c.name, c.gridImage);
  }

  // ---- Coupons artwork ----
  for (const c of await prisma.coupon.findMany()) {
    check('Coupon', 'image', c.code || `(id ${c.id})`, c.image);
  }

  // ---- Products (images is a JSON string[]) ----
  for (const p of await prisma.product.findMany()) {
    let list: string[] = [];
    try {
      const parsed = JSON.parse(p.images || '[]');
      if (Array.isArray(parsed)) list = parsed.filter((x) => typeof x === 'string');
    } catch {
      /* images column is JSON; a malformed value is reported separately below */
    }
    for (const img of list) check('Product', 'images', p.name || p.sku, img);
  }

  // ---- Summary ----
  console.log(`✅ ok      : ${counts.ok ?? 0}`);
  console.log(`🌐 remote  : ${counts.remote ?? 0} (absolute URLs — served by another host)`);
  console.log(`➖ empty   : ${counts.empty ?? 0}`);
  console.log(`❌ missing : ${counts.missing ?? 0}\n`);

  if (remote.length > 0) {
    console.log('Remote images (not stored on this server):');
    for (const r of remote) console.log(`   • ${r.model}.${r.field} → ${r.url}`);
    console.log('');
  }

  if (missing.length === 0) {
    console.log('🎉 Every local image reference resolves to a real file.');
    return;
  }

  console.log('❌ BROKEN image references:\n');
  for (const m of missing) {
    console.log(`   • ${m.model}.${m.field} — "${m.label}"`);
    console.log(`     → ${m.url}`);
  }
  console.log(
    '\nFix by re-uploading in the admin panel, or restore the file into\n' +
      'public/images/. Files under public/images/uploads/ are gitignored, so a\n' +
      'deploy cannot recreate them — copy them across from the old server.'
  );
  process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error('❌ Image check failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());