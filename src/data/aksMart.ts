// AKS Mart — central marketplace metadata.
// Single source of truth for divisions, labels, subcategories and copy.
// The storefront, admin taxonomy and DB seeding all read from here so every
// name/title/subtitle lives in one file and is trivially editable.

export const AKS_MART = {
  name: 'AKS Mart',
  tagline: 'One Mart. Many Choices.',
  site: 'aksmartbd.com',
  // Owner-provided business details (verified)
  phone: '+8801728-843503',
  phoneRaw: '+8801728843503', // digits only — for tel:/wa.me links
  address: 'Paltan Tower, 87 Purana Paltan Line, Dhaka',
  addressBn: 'পল্টন টাওয়ার, ৮৭ পুরানা পল্টন লাইন, ঢাকা',
  mottoEn: 'Uncompromising in Quality, Committed to Humanity.',
  mottoBn: 'গুণগত মানে আপসহীন, মানবিকতায় অঙ্গীকারবদ্ধ।',
};

export interface AksDivision {
  slug: 'food' | 'craft' | 'home' | 'beauty' | 'print';
  brand: 'SHUDDHO' | 'AKS CRAFT' | 'AKS HOME' | 'AKS BEAUTY' | 'AKS PRINT';
  title: string; // e.g. "SHUDDHO"
  subtitle: string; // e.g. "Pure Food for Everyday Living"
  description: string; // longer marketing line (homepage / footer)
  accent: string;
  image: string;
  badge: string; // small chip label
  badgeClass: string; // tailwind chip color
  subcategories: string[];
}

// Hero images are local assets under /public/images/hero/ (see SOURCES.md there).

export const DIVISIONS: AksDivision[] = [
  {
    slug: 'food',
    brand: 'SHUDDHO',
    title: 'SHUDDHO',
    subtitle: 'Pure Food for Everyday Living',
    description:
      'Carefully selected food essentials and traditional products for everyday meals — rice, oils, dal, spices, honey, ghee and more.',
    accent: '#047857',
        image: '/images/hero/shuddho-hero.jpg',
    badge: 'Food & Staples',
    badgeClass: 'bg-emerald-600',
    subcategories: [
      'Rice & Staples',
      'Oils & Ghee',
      'Dal & Pulses',
      'Spices',
      'Honey & Sweet',
      'Pickles & Traditional',
      'Dry Food & Essentials',
    ],
  },
  {
    slug: 'craft',
    brand: 'AKS CRAFT',
    title: 'AKS CRAFT',
    subtitle: 'Crafted with Tradition',
    description:
      'Handmade treasures by Bangladeshi artisans — nakshi kantha, paposh, shital pati, jute, bamboo and hand-crafted décor.',
    accent: '#B45309',
        image: '/images/hero/aks-craft-hero.jpg',
    badge: 'Artisan Handmade',
    badgeClass: 'bg-amber-700',
    subcategories: [
      'Nakshi Kantha',
      'Paposh & Shotoronji',
      'Jute Products',
      'Bamboo Products',
      'Handmade Bags',
      'Handmade Décor',
    ],
  },
  {
    slug: 'home',
    brand: 'AKS HOME',
    title: 'AKS HOME',
    subtitle: 'Comfort for Every Corner',
    description:
      'Bedding, curtains, cushions, rugs, kitchenware and home décor that make everyday living comfortable and organized.',
    accent: '#155E75',
        image: '/images/hero/aks-home-hero.jpg',
    badge: 'Home & Living',
    badgeClass: 'bg-cyan-700',
    subcategories: [
      'Bedding & Linens',
      'Curtains & Drapery',
      'Cushions & Carpets',
      'Kitchen Essentials',
      'Storage & Organization',
      'Home Décor',
    ],
  },
  {
    slug: 'beauty',
    brand: 'AKS BEAUTY',
    title: 'AKS BEAUTY',
    subtitle: 'Everyday Care, Made Simple',
    description:
      'Soap, shampoo, face wash, hair care and personal care essentials for fresh, healthy everyday routines.',
    accent: '#BE185D',
        image: '/images/hero/aks-beauty-hero.jpg',
    badge: 'Personal Care',
    badgeClass: 'bg-rose-600',
    subcategories: [
      'Soap & Body Care',
      'Hair Care',
      'Face Care',
      'Personal Care',
      'Beauty Accessories',
    ],
  },
  {
    slug: 'print',
    brand: 'AKS PRINT',
    title: 'AKS PRINT',
    subtitle: 'Your Ideas, Your Print',
    description:
      'Custom t-shirt, mug, card, poster, flyer, sticker and corporate print services with design support.',
    accent: '#4338CA',
        image: '/images/hero/aks-print-hero.jpg',
    badge: 'Custom Printing',
    badgeClass: 'bg-indigo-600',
    subcategories: [
      'Custom Apparel',
      'Mugs & Drinkware',
      'Cards & Stationery',
      'Posters & Signage',
      'Corporate & Packaging',
      'Custom Design',
    ],
  },
];

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  DIVISIONS.map((d) => [d.slug, d.brand])
);

export const SUBCATEGORIES_BY_CATEGORY: Record<string, string[]> = Object.fromEntries(
  DIVISIONS.map((d) => [d.slug, d.subcategories])
);

/** Curated per-division product image pools (free stock, "for now"). */
const W = (id: string) => `/images/products/${id}.jpg`;

export const DIVISION_IMAGES: Record<string, string[]> = {
  food: [
    W('1504674900247-0877df9cc836'),
    W('1512621776951-a57141f2eefd'),
    W('1567620905732-2d1ec7ab7445'),
    W('1586201375761-83865001e31c'),
  ],
  craft: [
    W('1528459801416-a9e53bbf4e17'),
    W('1519710164239-da123dc03ef4'),
    W('1523381210434-271e8be1f52b'),
  ],
  home: [
    W('1618221195710-dd6b41faaea6'),
    W('1554995207-c18c203602cb'),
    W('1522771739844-6a9f6d5f14af'),
  ],
  beauty: [
    W('1596462502278-27bfdc403348'),
    W('1556228720-195a672e8a03'),
    W('1571781926291-c477ebfd024b'),
  ],
  print: [
    W('1522542550221-31fd19575a2d'),
    W('1563906267088-b029e7101114'),
  ],
};