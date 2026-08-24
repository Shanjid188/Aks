import { Coupon } from '../types';
import { DIVISIONS } from './aksMart';

export interface HeroSlide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaCategory: string;
  ctaSubcategory?: string;
  ctaBrand?: string;
  image: string;
  accentColor: string;
  tagline: string;
}

export const HERO_SLIDES: HeroSlide[] = DIVISIONS.map((d, i) => ({
  id: `slide-${i + 1}`,
  badge: d.badge.toUpperCase(),
  title: d.title,
  subtitle: d.description,
  ctaText: `Shop ${d.title}`,
  ctaCategory: d.slug,
  ctaBrand: d.brand,
  image: d.image,
  accentColor: d.accent,
  tagline: d.subtitle,
}));

export const VALID_COUPONS: Coupon[] = [
  {
    code: 'AKS15',
    discountType: 'percent',
    value: 15,
    minSpend: 2500,
    description: '15% Off on orders above ৳2,500',
  },
  {
    code: 'WELCOME10',
    discountType: 'percent',
    value: 10,
    minSpend: 1500,
    description: '10% Off your first AKS Mart purchase',
  },
  {
    code: 'EID2026',
    discountType: 'fixed',
    value: 600,
    minSpend: 4000,
        description: '৳600 Flat Discount on orders above ৳4,000',
  },
  {
    code: 'FREESHIP',
    discountType: 'percent',
    value: 100,
    minSpend: 0,
    description: 'Free express courier delivery across Bangladesh',
  },
];

export const BRAND_INFOS = DIVISIONS.map((d) => ({
  name: d.brand,
  tag: d.subtitle,
  desc: d.description,
  logoText: d.title,
  accent: d.accent,
}));