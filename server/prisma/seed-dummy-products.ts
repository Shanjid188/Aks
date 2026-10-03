/* One-off: seed 10 dummy products covering every homepage section.
 * Run: node --env-file=.env node_modules/tsx/dist/cli.mjs prisma/seed-dummy-products.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const img = (seed: string) => `https://picsum.photos/seed/${seed}/1200/1200`;

type Dummy = {
  name: string; slug: string; sku: string;
  brand: string; category: string; subcategory: string;
  price: number; originalPrice?: number; discountPercent?: number;
  rating: number; reviewsCount: number;
  isFeatured?: boolean; featuredOrder?: number;
  isNewArrival?: boolean; isBestSeller?: boolean; isTrending?: boolean;
  occasions?: string;
  tags: string[];
};

const DUMMIES: Dummy[] = [
  { name: 'Premium Miniket Rice 5kg', slug: 'premium-miniket-rice-5kg', sku: 'DUMMY-FOOD-001', brand: 'SHUDDHO', category: 'food', subcategory: 'Rice & Staples', price: 620, originalPrice: 680, discountPercent: 9, rating: 4.8, reviewsCount: 42, isFeatured: true, featuredOrder: 1, isBestSeller: true, isTrending: true, tags: ['rice', 'staple', 'dummy'] },
  { name: 'Cold-Pressed Mustard Oil 1L', slug: 'cold-pressed-mustard-oil-1l', sku: 'DUMMY-FOOD-002', brand: 'SHUDDHO', category: 'food', subcategory: 'Oils & Ghee', price: 350, rating: 4.6, reviewsCount: 18, isFeatured: true, featuredOrder: 2, isNewArrival: true, tags: ['mustard oil', 'dummy'] },
  { name: 'Nakshi Kantha Throw', slug: 'nakshi-kantha-throw', sku: 'DUMMY-CRAFT-001', brand: 'AKS CRAFT', category: 'craft', subcategory: 'Nakshi Kantha', price: 2450, originalPrice: 2900, discountPercent: 16, rating: 4.9, reviewsCount: 35, isFeatured: true, featuredOrder: 3, isBestSeller: true, isTrending: true, tags: ['kantha', 'handmade', 'dummy'] },
  { name: 'Eco Jute Shopping Tote', slug: 'eco-jute-shopping-tote', sku: 'DUMMY-CRAFT-002', brand: 'AKS CRAFT', category: 'craft', subcategory: 'Jute & Bamboo', price: 450, rating: 4.5, reviewsCount: 12, isFeatured: true, featuredOrder: 4, isNewArrival: true, tags: ['jute', 'tote', 'dummy'] },
  { name: 'King Cotton Bedsheet Set', slug: 'king-cotton-bedsheet-set', sku: 'DUMMY-HOME-001', brand: 'AKS HOME', category: 'home', subcategory: 'Bedding', price: 1850, originalPrice: 2200, discountPercent: 16, rating: 4.7, reviewsCount: 28, isFeatured: true, featuredOrder: 5, isBestSeller: true, tags: ['bedsheet', 'bedding', 'dummy'] },
  { name: 'Blackout Curtain Pair', slug: 'blackout-curtain-pair', sku: 'DUMMY-HOME-002', brand: 'AKS HOME', category: 'home', subcategory: 'Curtains', price: 1650, rating: 4.4, reviewsCount: 9, isFeatured: true, featuredOrder: 6, isNewArrival: true, tags: ['curtain', 'dummy'] },
  { name: 'Herbal Soap Combo 4pcs', slug: 'herbal-soap-combo-4pcs', sku: 'DUMMY-BEAUTY-001', brand: 'AKS BEAUTY', category: 'beauty', subcategory: 'Bath & Body', price: 380, originalPrice: 460, discountPercent: 17, rating: 4.6, reviewsCount: 22, isFeatured: true, featuredOrder: 7, isBestSeller: true, isTrending: true, tags: ['soap', 'herbal', 'dummy'] },
  { name: 'Aloe Face Wash 150ml', slug: 'aloe-face-wash-150ml', sku: 'DUMMY-BEAUTY-002', brand: 'AKS BEAUTY', category: 'beauty', subcategory: 'Skin Care', price: 420, rating: 4.3, reviewsCount: 7, isFeatured: true, featuredOrder: 8, isNewArrival: true, tags: ['face wash', 'dummy'] },
  { name: 'Custom Printed T-Shirt', slug: 'custom-printed-t-shirt', sku: 'DUMMY-PRINT-001', brand: 'AKS PRINT', category: 'print', subcategory: 'Custom Apparel', price: 550, originalPrice: 650, discountPercent: 15, rating: 4.8, reviewsCount: 31, isBestSeller: true, isTrending: true, tags: ['t-shirt', 'custom', 'dummy'] },
  { name: 'Custom Photo Mug', slug: 'custom-photo-mug', sku: 'DUMMY-PRINT-002', brand: 'AKS PRINT', category: 'print', subcategory: 'Mugs & Drinkware', price: 350, rating: 4.5, reviewsCount: 15, isNewArrival: true, isTrending: true, tags: ['mug', 'custom', 'dummy'] },
];

async function main() {
  let created = 0;
  for (const d of DUMMIES) {
    const image = img(d.slug);
    const data = {
      sku: d.sku,
      slug: d.slug,
      name: d.name,
      brand: d.brand,
      category: d.category,
      subcategory: d.subcategory,
      description: `Dummy product for testing: ${d.name}. Replace with real details before launch.`,
      price: d.price,
      originalPrice: d.originalPrice ?? null,
      discountPercent: d.discountPercent ?? null,
      rating: d.rating,
      reviewsCount: d.reviewsCount,
      isFeatured: d.isFeatured ?? false,
      featuredOrder: d.featuredOrder ?? null,
      isNewArrival: d.isNewArrival ?? false,
      isBestSeller: d.isBestSeller ?? false,
      isTrending: d.isTrending ?? false,
      isClearance: false,
      isActive: true,
      trackStock: false,
      stockQuantity: 100,
      lowStockThreshold: 5,
      features: JSON.stringify(['Dummy feature 1', 'Dummy feature 2']),
      materials: JSON.stringify({ fabric: 'Dummy', care: 'Handle with care' }),
      colors: JSON.stringify([{ name: 'Default', hex: '#888888', image }]),
      sizes: JSON.stringify([{ size: 'One Size', inStock: true, stockCount: 100 }]),
      images: JSON.stringify([image]),
      tags: JSON.stringify(d.tags),
      occasion: 'everyday',
    };
    await prisma.product.upsert({
      where: { slug: d.slug },
      update: data,
      create: data,
    });
    created += 1;
    console.log(`upserted: ${d.name}`);
  }
  const count = await prisma.product.count();
  console.log(`DONE — ${created} dummies upserted, total products now: ${count}`);
  console.log('Sections: Featured=8 (order 1-8) | NewArrivals=5 | BestSellers=5 | Trending=5 | Showcase=circle auto-picks from trending/bestsellers');
}

main()
  .catch((e) => {
    console.error('SEED FAILED:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
