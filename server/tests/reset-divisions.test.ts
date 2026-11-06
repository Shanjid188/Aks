// prisma/reset-divisions.ts against a throwaway database: non-canonical
// categories are removed only when no product still uses their slug (#21).
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { createTestDb, type TestDb } from './helpers/db.ts';
import { resetDivisions } from '../prisma/reset-divisions.ts';

let db: TestDb;
let prisma: PrismaClient;
const quiet = () => {};

before(async () => {
  db = await createTestDb();
  prisma = new PrismaClient({ datasources: { db: { url: db.url } } });

  // "legacy" is still used by a product; "empty" is not.
  for (const slug of ['legacy', 'empty']) {
    await prisma.category.create({
      data: { slug, name: `Stray ${slug}`, brand: 'STRAY', subcategories: { create: [{ name: 'Misc', slug: `${slug}-misc` }] } },
    });
  }
  await prisma.product.update({ where: { sku: 'TEST-BASKET' }, data: { category: 'legacy' } });
});

after(async () => {
  await prisma?.$disconnect();
  db?.cleanup();
});

const slugs = async () => (await prisma.category.findMany({ select: { slug: true } })).map((c) => c.slug);

describe('reset-divisions', () => {
  it('dry run deletes nothing and reports the in-use category as skipped', async () => {
    const res = await resetDivisions(prisma, { log: quiet });
    assert.deepEqual(res.deleted, ['empty']);
    assert.deepEqual(res.skipped, [{ slug: 'legacy', products: 1 }]);
    const all = await slugs();
    assert.ok(all.includes('legacy') && all.includes('empty'));
  });

  it('--apply keeps a category that products still use', async () => {
    const res = await resetDivisions(prisma, { apply: true, log: quiet });
    assert.deepEqual(res.deleted, ['empty']);
    assert.deepEqual(res.skipped, [{ slug: 'legacy', products: 1 }]);

    const all = await slugs();
    assert.ok(all.includes('legacy'), 'in-use category must survive');
    assert.ok(!all.includes('empty'), 'unused category is removed');
    assert.equal(await prisma.subcategory.count({ where: { slug: 'legacy-misc' } }), 1);
    assert.equal(await prisma.subcategory.count({ where: { slug: 'empty-misc' } }), 0);

    const basket = await prisma.product.findUniqueOrThrow({ where: { sku: 'TEST-BASKET' } });
    assert.ok(await prisma.category.findUnique({ where: { slug: basket.category } }), 'product is not orphaned');
  });

  it('removes the category once its products are reassigned', async () => {
    await prisma.product.update({ where: { sku: 'TEST-BASKET' }, data: { category: 'craft' } });
    const res = await resetDivisions(prisma, { apply: true, log: quiet });
    assert.deepEqual(res.deleted, ['legacy']);
    assert.deepEqual(res.skipped, []);
    assert.ok(!(await slugs()).includes('legacy'));
  });
});
