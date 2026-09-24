import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_PAGES } from '../../src/data/pages.ts';

/**
 * Fill in the Bangla body of every content page that does not have one yet,
 * using the bundled drafts in src/data/pages.ts.
 *
 * Only empty values are touched, so a translation written in
 * Admin → Content Pages is never overwritten. Idempotent: running it again
 * does nothing.
 */
const prisma = new PrismaClient();

let filled = 0;
let skipped = 0;

for (const draft of DEFAULT_PAGES) {
  const row = await prisma.contentPage.findUnique({ where: { slug: draft.slug } });
  if (!row) {
    console.log(`- ${draft.slug}: not in this database, nothing to do`);
    continue;
  }
  if (row.bodyBn.trim() !== '') {
    skipped += 1;
    continue;
  }
  if (draft.bodyBn.trim() === '') {
    console.log(`- ${draft.slug}: no bundled Bangla body either`);
    continue;
  }
  await prisma.contentPage.update({
    where: { id: row.id },
    data: { bodyBn: draft.bodyBn, titleBn: row.titleBn || draft.titleBn },
  });
  filled += 1;
  console.log(`- ${draft.slug}: Bangla body filled in (${draft.bodyBn.length} chars)`);
}

const pages = await prisma.contentPage.findMany({
  select: { slug: true, bodyBn: true },
  orderBy: { sortOrder: 'asc' },
});
console.log(`\nfilled ${filled}, kept ${skipped} existing translation(s)`);
for (const p of pages) console.log(`  ${p.slug}: bodyBn ${p.bodyBn.trim() ? 'present' : 'EMPTY'}`);
await prisma.$disconnect();
