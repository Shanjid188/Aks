import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

/**
 * One-off: point every Product.images entry and every colors[].image at the
 * locally-served copies under /images/products/<id>.jpg. Also repairs the
 * malformed legacy URLs that are missing the "photo-" prefix.
 */
const prisma = new PrismaClient();

function toLocal(u: unknown): unknown {
  if (typeof u !== 'string') return u;
  const m = /images\.unsplash\.com\/(?:photo-)?([0-9a-f][0-9a-f-]{13,})/.exec(u);
  return m ? `/images/products/${m[1]}.jpg` : u;
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, images: true, colors: true },
  });
  console.log(`Checking ${products.length} products…`);

  let updated = 0;
  for (const p of products) {
    let images = null;
    let colors = null;
    let changed = false;

    try {
      const arr = JSON.parse(p.images);
      if (Array.isArray(arr)) {
        const next = arr.map(toLocal);
        if (next.some((u, i) => u !== arr[i])) {
          images = JSON.stringify(next);
          changed = true;
        }
      }
    } catch {
      // ignore
    }

    try {
      const arr = JSON.parse(p.colors);
      if (Array.isArray(arr)) {
        const next = arr.map((c) => ({ ...c, image: toLocal(c.image) }));
        if (next.some((c, i) => c.image !== arr[i].image)) {
          colors = JSON.stringify(next);
          changed = true;
        }
      }
    } catch {
      // ignore
    }

    if (!changed) continue;
    await prisma.product.update({
      where: { id: p.id },
      data: {
        ...(images ? { images } : {}),
        ...(colors ? { colors } : {}),
      },
    });
    updated += 1;
    console.log(`✓ ${p.name}`);
  }
  console.log(`Updated ${updated} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());