// Adapters: convert API response shapes ↔ storefront types
import { ApiProduct, ApiStore } from '../api';
import { Product, StoreLocation } from '../types';

export const adaptProduct = (p: ApiProduct): Product =>
  ({
    ...p,
    originalPrice: p.originalPrice ?? undefined,
    discountPercent: p.discountPercent ?? undefined,
    isNewArrival: p.isNewArrival || undefined,
    isBestSeller: p.isBestSeller || undefined,
    isTrending: p.isTrending || undefined,
    isClearance: p.isClearance || undefined,
    featuredOrder: p.featuredOrder ?? undefined,
    fit: (p.fit ?? undefined) as Product['fit'],
    pattern: (p.pattern ?? undefined) as Product['pattern'],
    sleeve: (p.sleeve ?? undefined) as Product['sleeve'],
    cushionTech: p.cushionTech ?? undefined,
    materials: p.materials as unknown as Product['materials'],
  }) as Product;

export const adaptProducts = (products: ApiProduct[]): Product[] => products.map(adaptProduct);

export const adaptStore = (s: ApiStore): StoreLocation => s as unknown as StoreLocation;