// Safe API wrapper with fallback - used for optional data like products/stores.
// Order creation lives in StoreContext (it needs cart + state access).
import * as API from '../api';
import * as adapter from './apiAdapter';
import { INITIAL_PRODUCTS, INITIAL_REVIEWS } from '../data/products';
import { STORE_LOCATIONS } from '../data/stores';
import { HERO_SLIDES } from '../data/promos';
import type { HeroSlide } from '../data/promos';
import { Product, Review, StoreLocation } from '../types';

const USE_API = import.meta.env.VITE_USE_API !== 'false';

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

  /** Load stores from API, falling back to bundled data on any failure */
  async loadStores(): Promise<StoreLocation[]> {
    if (!USE_API) return STORE_LOCATIONS;
    try {
      const { stores } = await API.fetchStores();
      return stores.map(adapter.adaptStore);
    } catch (e) {
      console.warn('[dataLoader] API stores failed, falling back:', e);
      return STORE_LOCATIONS;
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
};

export { USE_API };