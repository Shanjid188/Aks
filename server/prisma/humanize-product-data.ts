import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

/**
 * One-off: replace the uniform demo values on products (rating 4.5,
 * reviewsCount 12, identical stock decay, "Standard" colour) with
 * deterministic, plausible variation matching the storefront bundle logic in
 * src/data/products.ts. Stable across runs — no randomness at runtime.
 */
const prisma = new PrismaClient();

const seededFrac = (n: number) => {
  const x = Math.sin(n * 9973) * 43758.5453;
  return x - Math.floor(x);
};
const seededInt = (n: number, min: number, max: number) => min + Math.floor(seededFrac(n) * (max - min + 1));

const COLOR_DEFAULTS: Record<string, { name: string; hex: string }> = {
  food: { name: 'Natural', hex: '#efeadd' },
  craft: { name: 'Handwoven Natural', hex: '#d9c7a7' },
  home: { name: 'Ivory', hex: '#f3efe6' },
  beauty: { name: 'Original', hex: '#f7f4ef' },
  print: { name: 'White', hex: '#ffffff' },
};

interface SizeEntry {
  size: string;
  inStock: boolean;
  stockCount?: number;
}
interface ColorEntry {
  name: string;
  hex: string;
  image?: string;
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, category: true, sizes: true, colors: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Humanizing ${products.length} products…`);

  let updated = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const seq = i + 1;

    const rating = Math.round((3.8 + seededFrac(seq) * 1.1) * 10) / 10;
    const reviewsCount = seededInt(seq * 7 + 3, 3, 46);

    // Varied per-size stock (keep inStock flags as-is).
    let sizesData: SizeEntry[] | null = null;
    try {
      const parsed = JSON.parse(p.sizes as unknown as string);
      if (Array.isArray(parsed)) {
        sizesData = (parsed as SizeEntry[]).map((s, idx) => ({ ...s, stockCount: seededInt(seq * 13 + idx, 5, 60) }));
      }
    } catch {
      // leave untouched
    }

    // Category-appropriate colour naming instead of "Standard" everywhere.
    const colorDefault = COLOR_DEFAULTS[p.category] ?? { name: 'Standard', hex: '#f5f5f4' };
    let colorsData: ColorEntry[] | null = null;
    try {
      const parsed = JSON.parse(p.colors as unknown as string);
      if (Array.isArray(parsed) && parsed.length > 0) {
        colorsData = (parsed as ColorEntry[]).map((c) => ({ ...c, name: colorDefault.name, hex: colorDefault.hex }));
      }
    } catch {
      // leave untouched
    }

    await prisma.product.update({
      where: { id: p.id },
      data: {
        rating,
        reviewsCount,
        ...(sizesData ? { sizes: JSON.stringify(sizesData) } : {}),
        ...(colorsData ? { colors: JSON.stringify(colorsData) } : {}),
      },
    });
    updated += 1;
    console.log(`  ✓ ${p.name} — ${rating}★ (${reviewsCount} reviews)`);
  }

  console.log(`✅ Updated ${updated} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
