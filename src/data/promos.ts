import { Coupon } from '../types';
import { DIVISIONS } from './aksMart';

/** Storefront announcement ticker item — DB-driven, with offline fallback below. */
export interface Announcement {
  id: string;
  text: string;
  textBn?: string;
  link?: string;
  bgColor?: string;
  textColor?: string;
}

/** Offline fallback announcements — the original hardcoded header ticker strings. */
export const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'fallback-free-delivery',
    text: 'Free delivery across Bangladesh on orders above ৳2,500',
  },
  {
    id: 'fallback-akm',
    text: 'AKS Mart — Food · Craft · Home · Beauty · Print',
  },
  {
    id: 'fallback-cod',
    text: 'Cash on Delivery — pay when your order arrives',
  },
];

export interface HeroSlide {
  id: string;
  badge: string;
  badgeBn?: string;
  title: string;
  titleBn?: string;
  subtitle: string;
  subtitleBn?: string;
  ctaText: string;
  ctaTextBn?: string;
  ctaCategory: string;
  ctaSubcategory?: string;
  ctaBrand?: string;
  image: string;
  accentColor: string;
  tagline: string;
  taglineBn?: string;
}

export const HERO_SLIDES: HeroSlide[] = DIVISIONS.map((d, i) => ({
  id: `slide-${i + 1}`,
  badge: d.badge.toUpperCase(),
  badgeBn: d.badgeBn?.toUpperCase(),
  title: d.title,
  titleBn: d.titleBn,
  subtitle: d.description,
  subtitleBn: d.descriptionBn,
  ctaText: `Shop ${d.title}`,
  ctaTextBn: `${d.titleBn} দেখুন`,
  ctaCategory: d.slug,
  ctaBrand: d.brand,
  image: d.sliderImage,
  accentColor: d.accent,
  tagline: d.subtitle,
  taglineBn: d.subtitleBn,
}));

/**
 * Promotional tile for the hero's side column on the homepage.
 *
 * The live tiles are the merchant's own rows (Admin → Storefront → Promotions);
 * the bundled entries below are the fallback the storefront tops the column up
 * with, so the hero never sits next to an empty panel. They only describe real
 * store policies (free delivery, cash on delivery) and a real service (custom
 * printing) — no invented discounts.
 */
export interface SideBanner {
  id: string;
  /** Small chip above the title, e.g. "Free Delivery". */
  eyebrow: string;
  eyebrowBn?: string;
  title: string;
  titleBn?: string;
  subtitle: string;
  subtitleBn?: string;
  /** Background artwork — tiles without one render a branded gradient. */
  image?: string;
  /** Gradient start colour for tiles without artwork (defaults to brand red). */
  accentColor?: string;
  /** Watermark icon (mapped to a lucide component in HeroSideBanners). */
  icon?: SideBannerIcon;
  /** Internal SPA route, e.g. "/category/print". */
  to?: string;
  /** External URL — opens in a new tab. */
  href?: string;
}

export type SideBannerIcon = 'truck' | 'printer' | 'wallet' | 'megaphone';

export const SIDE_BANNERS: SideBanner[] = [
  {
    id: 'fallback-custom-printing',
    eyebrow: 'Print Service',
    eyebrowBn: 'প্রিন্ট সার্ভিস',
    title: 'Custom printing',
    titleBn: 'কাস্টম প্রিন্টিং',
    subtitle: 'T-shirts, mugs, cards, posters & flyers.',
    subtitleBn: 'টি-শার্ট, মগ, কার্ড, পোস্টার ও ফ্লায়ার।',
    image: '/images/hero/Print-2.jpg',
    icon: 'printer',
    to: '/category/print',
  },
  {
    id: 'fallback-free-delivery',
    eyebrow: 'Free Delivery',
    eyebrowBn: 'ফ্রি ডেলিভারি',
    title: 'Free delivery over ৳2,500',
    titleBn: '৳২,৫০০ এর উপরে ফ্রি ডেলিভারি',
    subtitle: 'Across Bangladesh, straight to your door.',
    subtitleBn: 'সারা বাংলাদেশে, আপনার দরজায়।',
    accentColor: '#0F766E',
    icon: 'truck',
    to: '/products',
  },
  {
    id: 'fallback-cash-on-delivery',
    eyebrow: 'Cash on Delivery',
    eyebrowBn: 'ক্যাশ অন ডেলিভারি',
    title: 'Pay when it arrives',
    titleBn: 'পণ্য হাতে পেয়ে টাকা দিন',
    subtitle: 'bKash, Nagad & cash on delivery.',
    subtitleBn: 'বিকাশ, নগদ ও ক্যাশ অন ডেলিভারি।',
    accentColor: '#B45309',
    icon: 'wallet',
    to: '/products',
  },
];

/**
 * Tile for the promo gallery that closes the homepage (Admin → Storefront →
 * Promotions).
 *
 * Every tile is pure artwork — no copy is drawn over the merchant's image — so
 * the gallery shows the active promotions that actually carry a banner, in
 * promotion order. The bundled entries below are the fallback the storefront
 * uses until such artwork exists, and they only show real divisions.
 *
 * Position matters: tile 1 is the wide banner, tiles 2-3 the squares beside it
 * and tile 4 the full-height column, which reads best with a portrait image.
 */
export interface PromoGalleryItem {
  id: string;
  image: string;
  /** Describes the artwork — rendered as the image alt text. */
  alt: string;
  /** Internal SPA route, e.g. "/category/craft". */
  to?: string;
  /** External URL — opens in a new tab. */
  href?: string;
}

export const PROMO_GALLERY: PromoGalleryItem[] = [
  {
    id: 'gallery-craft',
    image: '/images/hero/aks-craft-hero.jpg',
    alt: 'AKS CRAFT — handmade crafts by Bangladeshi artisans',
    to: '/category/craft',
  },
  {
    id: 'gallery-print',
    image: '/images/hero/aks-print-hero.jpg',
    alt: 'AKS PRINT — custom printing on mugs, t-shirts and more',
    to: '/category/print',
  },
  {
    id: 'gallery-home',
    image: '/images/hero/aks-home-hero.jpg',
    alt: 'AKS HOME — bedding, cushions and home décor',
    to: '/category/home',
  },
  {
    id: 'gallery-beauty',
    image: '/images/hero/aks-beauty-hero.jpg',
    alt: 'AKS BEAUTY — everyday personal care',
    to: '/category/beauty',
  },
];

/**
 * Offline fallback offers only — the storefront "Active Offers" section reads
 * the live list from `GET /api/coupons` (Admin → Coupons) and falls back to
 * these bundled entries when the API is unreachable.
 */
export const VALID_COUPONS: Coupon[] = [
  {
    code: 'AKS15',
    discountType: 'percent',
    value: 15,
    minSpend: 2500,
    description: '15% Off on orders above ৳2,500',
    descriptionBn: '৳২,৫০০ এর উপরে অর্ডারে ১৫% ছাড়',
    image: '/images/hero/aks-craft-hero.jpg',
  },
  {
    code: 'WELCOME10',
    discountType: 'percent',
    value: 10,
    minSpend: 1500,
    description: '10% Off your first AKS Mart purchase',
    descriptionBn: 'আপনার প্রথম একেএস মার্ট কেনাকাটায় ১০% ছাড়',
    image: '/images/hero/aks-beauty-hero.jpg',
  },
  {
    code: 'EID2026',
    discountType: 'fixed',
    value: 600,
    minSpend: 4000,
    description: '৳600 Flat Discount on orders above ৳4,000',
    descriptionBn: '৳৪,০০০ এর উপরে অর্ডারে ৳৬০০ ফ্ল্যাট ছাড়',
    image: '/images/hero/aks-home-hero.jpg',
  },
  {
    code: 'FREESHIP',
    discountType: 'percent',
    value: 100,
    minSpend: 0,
    description: 'Free express courier delivery across Bangladesh',
    descriptionBn: 'সারা বাংলাদেশে ফ্রি এক্সপ্রেস কুরিয়ার ডেলিভারি',
    image: '/images/hero/aks-print-hero.jpg',
  },
];

export const BRAND_INFOS = DIVISIONS.map((d) => ({
  name: d.brand,
  tag: d.subtitle,
  desc: d.description,
  logoText: d.title,
  accent: d.accent,
}));