// AKS Mart — central marketplace metadata.
// Single source of truth for divisions, labels, subcategories and copy.
// The storefront, admin taxonomy and DB seeding all read from here so every
// name/title/subtitle lives in one file and is trivially editable.
//
// NOTE: divisions/subcategories are DB-driven now (`/api/categories`, editable
// in Admin → Categories). This file is the SEED INPUT + offline fallback only.

import type { Category } from '../types';

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
  email: 'info@aksgarments.com.bd',
};

export interface AksDivision {
  slug: 'food' | 'craft' | 'home' | 'beauty' | 'print';
  brand: 'SHUDDHO' | 'AKS CRAFT' | 'AKS HOME' | 'AKS BEAUTY' | 'AKS PRINT';
  title: string; // e.g. "SHUDDHO"
  titleBn?: string; // optional Bangla title
  subtitle: string; // e.g. "Pure Food for Everyday Living"
  subtitleBn?: string;
  description: string; // longer marketing line (homepage / footer)
  descriptionBn?: string;
  accent: string;
  image: string;
  sliderImage: string; // dedicated hero slider image (different from grid + category)
  gridImage: string; // alternate image for the category grid (different from hero)
  badge: string; // small chip label
  badgeBn?: string;
  badgeClass: string; // tailwind chip color
  subcategories: string[];
  subcategoriesBn?: string[];
}

// Hero images are local assets under /public/images/hero/ (see SOURCES.md there).

export const DIVISIONS: AksDivision[] = [
  {
    slug: 'food',
    brand: 'SHUDDHO',
    title: 'SHUDDHO',
    titleBn: 'শুদ্ধ',
    subtitle: 'Pure Food for Everyday Living',
    subtitleBn: 'দৈনন্দিন জীবনের জন্য বিশুদ্ধ খাবার',
    description:
      'Carefully selected food essentials and traditional products for everyday meals — rice, oils, dal, spices, honey, ghee and more.',
    descriptionBn:
      'দৈনন্দিন খাবারের জন্য যত্ন করে নির্বাচিত খাদ্যপণ্য ও ঐতিহ্যবাহী পণ্য — চাল, তেল, ডাল, মসলা, মধু, ঘি এবং আরও অনেক কিছু।',
    accent: '#047857',
    image: '/images/hero/shuddho-hero.jpg',
    sliderImage: '/images/slider/Shuddho-1.jpg',
    gridImage: '/images/hero/Shuddho--2.jpg',
    badge: 'Food & Staples',
    badgeBn: 'খাবার ও মসলা',
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
    subcategoriesBn: [
      'চাল ও শস্য',
      'তেল ও ঘি',
      'ডাল ও বীজ',
      'মসলা',
      'মধু ও মিষ্টি',
      'আচার ও ঐতিহ্যবাহী',
      'শুকনো খাবার ও প্রয়োজনীয়',
    ],
  },
  {
    slug: 'craft',
    brand: 'AKS CRAFT',
    title: 'AKS CRAFT',
    titleBn: 'একেএস ক্রাফট',
    subtitle: 'Crafted with Tradition',
    subtitleBn: 'ঐতিহ্যের সাথে হাতে তৈরি',
    description:
      'Handmade treasures by Bangladeshi artisans — nakshi kantha, paposh, shital pati, jute, bamboo and hand-crafted décor.',
    descriptionBn:
      'বাংলাদেশী কারিগদের হাতে তৈরি সম্পদ — নকশী কাঁথা, পাপোশ, শীতল পাটি, পাট, বাঁশ এবং হাতে তৈরি সজ্জা।',
    accent: '#B45309',
    image: '/images/hero/aks-craft-hero.jpg',
    sliderImage: '/images/slider/Craft-1.jpg',
    gridImage: '/images/hero/Craft-2.jpg',
    badge: 'Artisan Handmade',
    badgeBn: 'কারিগরি হস্তনির্মিত',
    badgeClass: 'bg-amber-700',
    subcategories: [
      'Nakshi Kantha',
      'Paposh & Shotoronji',
      'Jute Products',
      'Bamboo Products',
      'Handmade Bags',
      'Handmade Décor',
    ],
    subcategoriesBn: [
      'নকশী কাঁথা',
      'পাপোশ ও শতরঞ্জি',
      'পাটের পণ্য',
      'বাঁশের পণ্য',
      'হাতে তৈরি ব্যাগ',
      'হাতে তৈরি সজ্জা',
    ],
  },
  {
    slug: 'home',
    brand: 'AKS HOME',
    title: 'AKS HOME',
    titleBn: 'একেএস হোম',
    subtitle: 'Comfort for Every Corner',
    subtitleBn: 'প্রতি কোণায় আরাম',
    description:
      'Bedding, curtains, cushions, rugs, kitchenware and home décor that make everyday living comfortable and organized.',
    descriptionBn:
      'বিছানা, পর্দা, কুশন, কার্পেট, রান্নাঘরের পণ্য এবং গৃহসজ্জা যা দৈনন্দিন জীবনকে আরাদ্দ ও সংগঠিত করে।',
    accent: '#155E75',
    image: '/images/hero/aks-home-hero.jpg',
    sliderImage: '/images/slider/Home-1.jpg',
    gridImage: '/images/hero/Home-2.jpg',
    badge: 'Home & Living',
    badgeBn: 'গৃহ ও জীবনযাপন',
    badgeClass: 'bg-cyan-700',
    subcategories: [
      'Bedding & Linens',
      'Curtains & Drapery',
      'Cushions & Carpets',
      'Kitchen Essentials',
      'Storage & Organization',
      'Home Décor',
    ],
    subcategoriesBn: [
      'বিছানা ও লিনেন',
      'পর্দা ও ড্রেপারি',
      'কুশন ও কার্পেট',
      'রান্নাঘরের প্রয়োজনীয়',
      'সংরক্ষণ ও সংগঠন',
      'গৃহসজ্জা',
    ],
  },
  {
    slug: 'beauty',
    brand: 'AKS BEAUTY',
    title: 'AKS BEAUTY',
    titleBn: 'একেএস বিউটি',
    subtitle: 'Everyday Care, Made Simple',
    subtitleBn: 'সহজ দৈনন্দিন যত্ন',
    description:
      'Soap, shampoo, face wash, hair care and personal care essentials for fresh, healthy everyday routines.',
    descriptionBn:
      'সাবান, শ্যাম্পু, ফেসওয়াশ, চুলের যত্ন এবং ব্যক্তিগত যত্নের প্রয়োজনীয় পণ্য তাজা, স্বাস্থ্যকর দৈনন্দিন রুটিনের জন্য।',
    accent: '#BE185D',
    image: '/images/hero/aks-beauty-hero.jpg',
    sliderImage: '/images/slider/Beuty-1.jpg',
    gridImage: '/images/hero/Beauty-2.jpg',
    badge: 'Personal Care',
    badgeBn: 'ব্যক্তিগত যত্ন',
    badgeClass: 'bg-rose-600',
    subcategories: [
      'Soap & Body Care',
      'Hair Care',
      'Face Care',
      'Personal Care',
      'Beauty Accessories',
    ],
    subcategoriesBn: [
      'সাবান ও শরীরের যত্ন',
      'চুলের যত্ন',
      'মুখের যত্ন',
      'ব্যক্তিগত যত্ন',
      'সৌন্দর্য সম্পর্কিত',
    ],
  },
  {
    slug: 'print',
    brand: 'AKS PRINT',
    title: 'AKS PRINT',
    titleBn: 'একেএস প্রিন্ট',
    subtitle: 'Your Ideas, Your Print',
    subtitleBn: 'আপনার ধারণা, আপনার প্রিন্ট',
    description:
      'Custom t-shirt, mug, card, poster, flyer, sticker and corporate print services with design support.',
    descriptionBn:
      'কাস্টম টি-শার্ট, মাগ, কার্ড, পোস্টার, ফ্লায়ার, স্টিকার এবং কর্পোরেট প্রিন্ট সেবা ডিজাইন সহায়তার সাথে।',
    accent: '#4338CA',
    image: '/images/hero/aks-print-hero.jpg',
    sliderImage: '/images/slider/Print-1.jpg',
    gridImage: '/images/hero/Print-2.jpg',
    badge: 'Custom Printing',
    badgeBn: 'কাস্টম প্রিন্টিং',
    badgeClass: 'bg-indigo-600',
    subcategories: [
      'Custom Apparel',
      'Mugs & Drinkware',
      'Cards & Stationery',
      'Posters & Signage',
      'Corporate & Packaging',
      'Custom Design',
    ],
    subcategoriesBn: [
      'কাস্টম পোশাক',
      'মাগ ও পানীয়পত্র',
      'কার্ড ও স্টেশনারি',
      'পোস্টার ও সাইনেজ',
      'কর্পোরেট ও প্যাকেজিং',
      'কাস্টম ডিজাইন',
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
    W('1512621776951-a57141f2eefd'),
    W('1567620905732-2d1ec7ab7445'),
    W('1586201375761-83865001e31c'),
    W('1504674900247-0877df9cc836'),
  ],
  craft: [
    W('1519710164239-da123dc03ef4'),
    W('1523381210434-271e8be1f52b'),
    W('1528459801416-a9e53bbf4e17'),
  ],
  home: [
    W('1554995207-c18c203602cb'),
    W('1522771739844-6a9f6d5f14af'),
    W('1618221195710-dd6b41faaea6'),
  ],
  beauty: [
    W('1556228720-195a672e8a03'),
    W('1571781926291-c477ebfd024b'),
    W('1596462502278-27bfdc403348'),
  ],
  print: [
    W('1563906267088-b029e7101114'),
    W('1522542550221-31fd19575a2d'),
  ],
};

/** Same slug rule the API/seed use — keeps fallback ids stable. */
const fallbackSlug = (categorySlug: string, name: string) =>
  `${categorySlug}-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}`;

/**
 * Offline fallback for the DB-driven taxonomy — identical shape to
 * `GET /api/categories`, used when the API is unreachable (dev without API).
 */
export const FALLBACK_CATEGORIES: Category[] = DIVISIONS.map((d, i) => ({
  id: `fallback-${d.slug}`,
  name: d.title,
  nameBn: d.titleBn ?? null,
  slug: d.slug,
  description: d.description,
  descriptionBn: d.descriptionBn ?? null,
  tagline: d.subtitle,
  taglineBn: d.subtitleBn ?? null,
  brand: d.brand,
  image: d.image,
  heroImage: d.sliderImage,
  gridImage: d.gridImage,
  badge: d.badge,
  accentColor: d.accent,
  isActive: true,
  sortOrder: i + 1,
  subcategories: d.subcategories.map((name, j) => ({
    id: `fallback-${d.slug}-${j}`,
    categoryId: `fallback-${d.slug}`,
    name,
    nameBn: d.subcategoriesBn?.[j] ?? null,
    slug: fallbackSlug(d.slug, name),
    isActive: true,
    sortOrder: j + 1,
  })),
}));