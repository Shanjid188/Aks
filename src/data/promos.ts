import { Coupon } from '../types';
import { DIVISIONS } from './aksMart';

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