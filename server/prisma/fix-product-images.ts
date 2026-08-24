import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

/**
 * One-off: fix malformed Unsplash product image URLs.
 * The seed data used https://images.unsplash.com/<id>… which 404s — the correct
 * public format is https://images.unsplash.com/photo-<id>… This script rewrites
 * every Product.images JSON array in place.
 */
const prisma = new PrismaClient();

function fixUrl(u: string): string {
  if (!u.includes('images.unsplash.com/')) return u;
  return u.replace(/images\.unsplash\.com\/(?!photo-)/, 'images.unsplash.com/photo-');
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, images: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Checking ${products.length} products for broken Unsplash URLs…`);

  let fixedProducts = 0;
  let fixedUrls = 0;
  for (const p of products) {
    let arr: string[];
    try {
      arr = JSON.parse(p.images) as string[];
      if (!Array.isArray(arr)) continue;
    } catch {
      continue;
    }
    const next = arr.map(fixUrl);
    const changed = next.some((u, i) => u !== arr[i]);
    if (changed) {
      await prisma.product.update({ where: { id: p.id }, data: { images: JSON.stringify(next) } });
      fixedProducts += 1;
      fixedUrls += next.filter((u, i) => u !== arr[i]).length;
      console.log(`✓ ${p.name}`);
    }
  }
  console.log(`\nDone. ${fixedProducts} products updated, ${fixedUrls} URLs repaired.`);
}

main()
  .catch((e) => {
    console.error('fix-product-images failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());