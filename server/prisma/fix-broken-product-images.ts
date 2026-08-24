import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

/**
 * One-off: replace the dead Unsplash photo ID
 * (1596040033229-98253da36456 → 1567620905732-2d1ec7ab7445)
 * inside every Product.images array that still references it.
 */
const prisma = new PrismaClient();

const OLD = '1596040033229-98253da36456';
const NEW = '1567620905732-2d1ec7ab7445';

async function main() {
  const products = await prisma.product.findMany({ select: { id: true, name: true, images: true } });
  let fixed = 0;
  for (const p of products) {
    let arr: string[];
    try {
      arr = JSON.parse(p.images);
      if (!Array.isArray(arr)) continue;
    } catch {
      continue;
    }
    const next = arr.map((u) => (u.includes(OLD) ? u.replace(OLD, NEW) : u));
    if (next.some((u, i) => u !== arr[i])) {
      await prisma.product.update({ where: { id: p.id }, data: { images: JSON.stringify(next) } });
      fixed += 1;
      console.log(`✓ ${p.name}`);
    }
  }
  console.log(`Fixed ${fixed} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());