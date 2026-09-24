// Safe API wrapper with fallback - used for optional data like products.
// Order creation lives in StoreContext (it needs cart + state access).
import * as API from '../api';
import * as adapter from './apiAdapter';
import { INITIAL_PRODUCTS, INITIAL_REVIEWS } from '../data/products';
import { HERO_SLIDES, DEFAULT_ANNOUNCEMENTS, VALID_COUPONS } from '../data/promos';
import type { HeroSlide, Announcement } from '../data/promos';
import { AKS_MART } from '../data/aksMart';
import { FALLBACK_CATEGORIES } from '../data/aksMart';
import {
  DEFAULT_SITE_CONTENT,
  DEFAULT_SITE_SEO,
  DEFAULT_STORE_NAME,
  DEFAULT_TRENDING_SEARCHES,
  STORE_NAME_KEY,
  siteContentFromSettings,
  siteSeoFromSettings,
  trendingSearchesFromSettings,
} from '../data/siteContent';
import type { SiteContent, SiteSeo } from '../data/siteContent';
import { DEFAULT_COMMERCE } from '../data/commerce';
import type { CommerceSettings } from '../data/commerce';
import { DEFAULT_PAGES } from '../data/pages';
import type { ContentPageData } from '../data/pages';
import { Category, Coupon, Product, Review } from '../types';

const USE_API = import.meta.env.VITE_USE_API !== 'false';

/** Normalise an API content page into the storefront shape (nulls → ''). */
const mapContentPage = (p: API.ApiContentPage): ContentPageData => ({
  slug: p.slug,
  title: p.title,
  titleBn: p.titleBn ?? '',
  body: p.body,
  bodyBn: p.bodyBn ?? '',
  seoTitle: p.seoTitle ?? '',
  seoDescription: p.seoDescription ?? '',
  showInFooter: p.showInFooter,
  sortOrder: p.sortOrder,
});

export const dataLoader = {
  /** Load products from API, falling back to bundled data on any failure */
  async loadProducts(): Promise<Product[]> {
    if (!USE_API) return INITIAL_PRODUCTS;
    try {
      const { products: apiProducts } = await API.fetchProducts();
      return adapter.adaptProducts(apiProducts);
    } catch (e) {
      console.warn('[dataLoader] API products failed, falling back to local data:', e);
      return INITIAL_PRODUCTS;
    }
  },

  /** Load hero carousel slides from API, falling back to bundled slides */
  async loadHeroSlides(): Promise<HeroSlide[]> {
    if (!USE_API) return HERO_SLIDES;
    try {
      const { slides } = await API.fetchHeroSlides();
      if (slides.length === 0) return HERO_SLIDES;
      return slides.map((s) => ({
        id: s.id,
        badge: s.badge,
        title: s.title,
        subtitle: s.subtitle,
        ctaText: s.ctaText,
        ctaCategory: s.ctaCategory,
        ctaSubcategory: s.ctaSubcategory ?? undefined,
        ctaBrand: s.ctaBrand ?? undefined,
        image: s.image,
        accentColor: s.accentColor,
        tagline: s.tagline,
      }));
    } catch (e) {
      console.warn('[dataLoader] API hero slides failed, falling back:', e);
      return HERO_SLIDES;
    }
  },

  /** Load reviews from API, falling back to bundled data on any failure */
  async loadReviews(): Promise<Review[]> {
    if (!USE_API) return INITIAL_REVIEWS;
    try {
      const reviews: Review[] = [];
      for (const p of INITIAL_PRODUCTS.slice(0, 3)) {
        try {
          const { reviews: apiReviews } = await API.fetchProductReviews(p.slug);
          reviews.push(...apiReviews.map((r) => ({ ...r, date: r.date.split('T')[0] }) as Review));
        } catch {
          // skip this product's reviews, continue others
        }
      }
      return reviews.length > 0 ? reviews : INITIAL_REVIEWS;
    } catch {
      return INITIAL_REVIEWS;
    }
  },

  /** Published content pages (About, Contact, policies) for the footer and the
   *  /:slug routes — API first, bundled draft as the offline fallback. */
  async loadPages(): Promise<ContentPageData[]> {
    if (!USE_API) return DEFAULT_PAGES;
    try {
      const { pages } = await API.fetchPages();
      if (pages.length === 0) return DEFAULT_PAGES;
      return pages.map(mapContentPage);
    } catch (e) {
      console.warn('[dataLoader] API pages failed, falling back to bundled pages:', e);
      return DEFAULT_PAGES;
    }
  },

  /** A single published page by slug (storefront /:slug). Returns null when the
   *  page does not exist, so the caller can show a proper "not found" state. */
  async loadPage(slug: string): Promise<ContentPageData | null> {
    const bundled = DEFAULT_PAGES.find((p) => p.slug === slug) ?? null;
    if (!USE_API) return bundled;
    try {
      const { page } = await API.fetchPage(slug);
      return mapContentPage(page);
    } catch (e) {
      console.warn('[dataLoader] API page failed, falling back to bundled page:', e);
      return bundled;
    }
  },

  /** Commerce numbers (free-shipping threshold + standard delivery charge)
   *  that Admin → Settings controls, falling back to the bundled defaults. */
  async loadCommerce(): Promise<CommerceSettings> {
    if (!USE_API) return DEFAULT_COMMERCE;
    try {
      const { settings } = await API.fetchPublicSettings();
      const num = (value: unknown, fallback: number) =>
        typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
      return {
        freeShippingThreshold: num(settings.freeShippingThreshold, DEFAULT_COMMERCE.freeShippingThreshold),
        defaultShippingCharge: num(settings.defaultShippingCharge, DEFAULT_COMMERCE.defaultShippingCharge),
      };
    } catch (e) {
      console.warn('[dataLoader] API commerce settings failed, falling back to bundled defaults:', e);
      return DEFAULT_COMMERCE;
    }
  },

  /** Approved reviews for a single product (storefront product page). An empty
   *  list is a real answer here — it means nobody has reviewed it yet. */
  async loadProductReviews(slug: string): Promise<Review[]> {
    if (!USE_API) return INITIAL_REVIEWS;
    try {
      const { reviews: apiReviews } = await API.fetchProductReviews(slug);
      return apiReviews.map((r) => ({ ...r, date: r.date.split('T')[0] }) as Review);
    } catch (e) {
      console.warn('[dataLoader] API product reviews failed, falling back to bundled reviews:', e);
      return INITIAL_REVIEWS;
    }
  },

  /** Active announcement ticker from the DB, falling back to the original
   *  hardcoded header strings if the API fails or returns nothing. */
  async loadAnnouncements(): Promise<Announcement[]> {
    if (!USE_API) return DEFAULT_ANNOUNCEMENTS;
    try {
      const { announcements } = await API.fetchAnnouncements();
      if (announcements.length === 0) return DEFAULT_ANNOUNCEMENTS;
      return announcements.map((a) => ({
        id: a.id,
        text: a.text,
        textBn: a.textBn ?? undefined,
        link: a.link ?? undefined,
        bgColor: a.bgColor,
        textColor: a.textColor,
      }));
    } catch (e) {
      console.warn('[dataLoader] API announcements failed, falling back to hardcoded strings:', e);
      return DEFAULT_ANNOUNCEMENTS;
    }
  },

  /** Active promotions from the DB. No bundled promotion data exists, so an
   *  API failure falls back to an empty list (the banner section is hidden). */
  async loadPromotions(): Promise<API.ApiPromotion[]> {
    if (!USE_API) return [];
    try {
      const { promotions } = await API.fetchPromotions();
      return promotions;
    } catch (e) {
      console.warn('[dataLoader] API promotions failed (no bundled fallback — hiding banner):', e);
      return [];
    }
  },

  /** Divisions/subcategories taxonomy from the DB (Admin → Categories),
   *  falling back to the bundled division list when unavailable. */
  async loadCategories(): Promise<Category[]> {
    if (!USE_API) return FALLBACK_CATEGORIES;
    try {
      const { categories } = await API.fetchCategories();
      if (categories.length === 0) return FALLBACK_CATEGORIES;
      return categories as Category[];
    } catch (e) {
      console.warn('[dataLoader] API categories failed, falling back to bundled divisions:', e);
      return FALLBACK_CATEGORIES;
    }
  },

  /** Homepage/header copy from store settings (Admin → Storefront → Homepage).
   *  Every field falls back to the bundled copy, so nothing ever renders empty. */
  async loadSiteContent(): Promise<SiteContentBundle> {
    const fallback: SiteContentBundle = {
      content: DEFAULT_SITE_CONTENT,
      trendingSearches: DEFAULT_TRENDING_SEARCHES,
      seo: DEFAULT_SITE_SEO,
      storeName: DEFAULT_STORE_NAME,
    };
    if (!USE_API) return fallback;
    try {
      const { settings } = await API.fetchPublicSettings();
      const raw = settings as unknown as Record<string, unknown>;
      return {
        content: siteContentFromSettings(raw),
        trendingSearches: trendingSearchesFromSettings(raw),
        seo: siteSeoFromSettings(raw),
        storeName:
          typeof raw[STORE_NAME_KEY] === 'string' && String(raw[STORE_NAME_KEY]).trim() !== ''
            ? String(raw[STORE_NAME_KEY])
            : DEFAULT_STORE_NAME,
      };
    } catch (e) {
      console.warn('[dataLoader] API site content failed, falling back to bundled copy:', e);
      return fallback;
    }
  },

  /** Active coupons for the storefront "Active Offers" section (Admin → Coupons),
   *  falling back to the bundled coupon list when the API is unavailable. */
  async loadCoupons(): Promise<Coupon[]> {
    if (!USE_API) return VALID_COUPONS;
    try {
      const { coupons } = await API.fetchCoupons();
      if (coupons.length === 0) return VALID_COUPONS;
      return coupons.map((c) => ({
        code: c.code,
        discountType: c.discountType === 'fixed' ? 'fixed' : 'percent',
        value: c.value,
        minSpend: c.minSpend,
        description: c.description,
        descriptionBn: c.descriptionBn ?? undefined,
        image: c.image ?? undefined,
      }));
    } catch (e) {
      console.warn('[dataLoader] API coupons failed, falling back to bundled offers:', e);
      return VALID_COUPONS;
    }
  },

  /** Public store info for the storefront (footer/contact) — API values win,
   *  every field falls back to the bundled AKS_MART defaults. */
  async loadStoreInfo(): Promise<StoreInfo> {
    const fallback: StoreInfo = DEFAULT_STORE_INFO;
    if (!USE_API) return fallback;
    try {
      const { settings } = await API.fetchPublicSettings();
      return {
        name: settings.storeName ?? fallback.name,
        tagline: settings.storeTagline ?? fallback.tagline,
        logo: settings.storeLogo ?? fallback.logo,
        favicon: settings.favicon ?? fallback.favicon,
        phone: settings.phone ?? fallback.phone,
        phoneRaw: settings.phone ? settings.phone.replace(/[^+\d]/g, '') : fallback.phoneRaw,
        email: settings.email ?? fallback.email,
        address: settings.address ?? fallback.address,
        addressBn: settings.addressBn ?? fallback.addressBn,
        site: settings.website ?? fallback.site,
        mottoEn: settings.mottoEn ?? fallback.mottoEn,
        mottoBn: settings.mottoBn ?? fallback.mottoBn,
      };
    } catch (e) {
      console.warn('[dataLoader] API store settings failed, falling back to bundled store info:', e);
      return fallback;
    }
  },
};

/** Homepage / header copy + trending keywords + SEO defaults for the storefront. */
export interface SiteContentBundle {
  content: SiteContent;
  trendingSearches: string[];
  seo: SiteSeo;
  /** Store name from settings — used to build page titles. */
  storeName: string;
}

/** Store info surfaced on the storefront (footer / contact block). */
export interface StoreInfo {
  name: string;
  tagline: string;
  logo: string;
  favicon: string;
  phone: string;
  phoneRaw: string;
  email: string;
  address: string;
  addressBn: string;
  site: string;
  mottoEn: string;
  mottoBn: string;
}

/** Bundled defaults used when the API is unavailable. */
export const DEFAULT_STORE_INFO: StoreInfo = {
  name: AKS_MART.name,
  tagline: AKS_MART.tagline ?? '',
  logo: AKS_MART.site ? `${AKS_MART.site}/AKS.logo.jpg` : '',
  favicon: '',
  phone: AKS_MART.phone,
  phoneRaw: AKS_MART.phoneRaw,
  email: AKS_MART.email ?? '',
  address: AKS_MART.address,
  addressBn: AKS_MART.addressBn,
  site: AKS_MART.site,
  mottoEn: AKS_MART.mottoEn,
  mottoBn: AKS_MART.mottoBn,
};

export { USE_API };