import heroImg from '../assets/images/hero_footwear_showcase_1786895779693.jpg';
import panjabiImg from '../assets/images/marie_claire_chic_1786895817363.jpg';
import rivaImg from '../assets/images/leather_craft_banner_1786895833994.jpg';
import studioImg from '../assets/images/power_athletic_banner_1786895795947.jpg';
import { Coupon } from '../types';

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

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-1',
    badge: 'FESTIVE COLLECTION 2026',
    title: 'Drape in Timeless Heritage & Modern Craft',
    subtitle: 'Explore Bangladesh’s finest collection of handcrafted silk panjabis, festive salwar kameez, breathable linen shirts, and tailored apparel.',
    ctaText: 'Shop New Arrivals',
    ctaCategory: 'all',
    image: heroImg,
    accentColor: '#D8232A',
    tagline: 'Pure Fabrics • Master Tailoring • Heritage Weaves',
  },
  {
    id: 'slide-2',
    badge: 'AKS HERITAGE MENSWEAR',
    title: 'Regal Silk & Fine Cotton Embroidered Panjabis',
    subtitle: 'Exquisite jacquard weaves, intricate zardozi collar embroidery, and semi-fitted silhouettes crafted for Eid, weddings, and special celebrations.',
    ctaText: 'Explore Panjabi Collection',
    ctaCategory: 'men',
    ctaSubcategory: 'Panjabis & Kabli',
    ctaBrand: 'AKS Heritage',
    image: panjabiImg,
    accentColor: '#0f172a',
    tagline: '100% Egyptian Giza Cotton & Mulberry Silk',
  },
  {
    id: 'slide-3',
    badge: 'AKS RIVA WOMEN COUTURE',
    title: 'Exquisite Lawn, Organza & Festive Sarees',
    subtitle: 'Artisan hand-embroidered 3-piece suits, pure muslin Jamdani sarees, and contemporary chic kurtis designed for effortless grace.',
    ctaText: 'Discover Women’s Couture',
    ctaCategory: 'women',
    ctaBrand: 'AKS Riva',
    image: rivaImg,
    accentColor: '#831843',
    tagline: 'Intricate Schiffli Work • Pure Chiffon Dupattas',
  },
  {
    id: 'slide-4',
    badge: 'AKS STUDIO & DENIM CO.',
    title: 'Contemporary Smart Casuals & Selvedge Denim',
    subtitle: 'Breathable washed linen button-downs, double-mercerized Supima polos, and Japanese weave stretch denim for modern everyday luxury.',
    ctaText: 'Shop Studio Casuals',
    ctaCategory: 'men',
    ctaSubcategory: 'Casual Shirts & Polos',
    ctaBrand: 'AKS Studio',
    image: studioImg,
    accentColor: '#047857',
    tagline: 'Breathable Pure Linen • 12.5oz Japanese Selvedge',
  },
];

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
    description: '10% Off your first fashion purchase',
  },
  {
    code: 'EID2026',
    discountType: 'fixed',
    value: 600,
    minSpend: 4000,
    description: '৳600 Flat Discount on festive orders above ৳4,000',
  },
  {
    code: 'FREESHIP',
    discountType: 'percent',
    value: 100,
    minSpend: 0,
    description: 'Free express courier delivery across Bangladesh',
  },
];

export const BRAND_INFOS = [
  {
    name: 'AKS Heritage',
    tag: 'Traditional & Festive',
    desc: 'Signature hand-embroidered panjabis, festive kablis, and heirloom Jamdani sarees.',
    logoText: 'HERITAGE',
    accent: '#D8232A',
  },
  {
    name: 'AKS Studio',
    tag: 'Smart Casual & Linen',
    desc: 'Pure European linen shirts, Supima cotton polos, and lightweight modern resortwear.',
    logoText: 'STUDIO',
    accent: '#047857',
  },
  {
    name: 'AKS Signature',
    tag: 'Formal & Tailored',
    desc: 'Precision bespoke formal shirts, 2-ply Egyptian cotton, and Italian wool blazers.',
    logoText: 'SIGNATURE',
    accent: '#0f172a',
  },
  {
    name: 'AKS Riva',
    tag: 'Women’s Luxury Couture',
    desc: 'Premium lawn 3-pieces, organza festive ensembles, and contemporary fusion kurtis.',
    logoText: 'RIVA',
    accent: '#831843',
  },
  {
    name: 'AKS Denim Co.',
    tag: 'Authentic Denim',
    desc: '13oz Japanese weave selvedge jeans, heavy twill overshirts, and utility jackets.',
    logoText: 'DENIM CO.',
    accent: '#1d4ed8',
  },
  {
    name: 'AKS Junior',
    tag: 'Kids Festive & Casual',
    desc: 'Hypoallergenic organic cotton sets, boys festive panjabis, and girls party frocks.',
    logoText: 'JUNIOR',
    accent: '#d97706',
  },
  {
    name: 'AKS Essentials',
    tag: 'Daily Basics & Accs',
    desc: 'Combed cotton crewnecks, premium leather belts, and pure silk zari dupattas.',
    logoText: 'ESSENTIALS',
    accent: '#52525b',
  },
];
