import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

/**
 * One-off: point the storefront hero slides at the user's own banner images
 * in /public/images/slider (and one spare from /images/hero).
 */
const prisma = new PrismaClient();

const IMAGE_BY_EXACT_TITLE: Record<string, string> = {
  SHUDDHO: '/images/slider/Shuddho-1.jpg',
  'AKS CRAFT': '/images/slider/Craft-1.jpg',
  'AKS HOME': '/images/slider/Home-1.jpg',
  'AKS BEAUTY': '/images/slider/Beuty-1.jpg',
  'AKS PRINT': '/images/slider/Print-1.jpg',
};

async function main() {
  const slides = await prisma.heroSlide.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  console.log(`Found ${slides.length} hero slides.`);

  for (const s of slides) {
    const exact = IMAGE_BY_EXACT_TITLE[s.title];
    // Any extra slide beyond the five seeded ones gets a distinct image
    const extra = /shuddho/i.test(s.title) ? '/images/hero/Shuddho--2.jpg' : null;
    const next = exact ?? extra;
    if (!next) {
      console.log(`• "${s.title}" → no mapping, skipped`);
      continue;
    }
    if (s.image === next) {
      console.log(`= "${s.title}" already uses ${next}`);
      continue;
    }
    await prisma.heroSlide.update({ where: { id: s.id }, data: { image: next } });
    console.log(`✓ "${s.title}" → ${next}`);
  }
}

main()
  .catch((e) => {
    console.error('update-slider-images failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());