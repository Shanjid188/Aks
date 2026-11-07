import type { Product } from '@prisma/client';
import { parseJsonSafe } from './json.ts';

/**
 * DB stores JSON-ish columns as TEXT; convert them back to real JS values
 * before sending products to any client.
 */
export function productToApi(p: Product) {
  return {
    ...p,
    features: parseJsonSafe<string[]>(p.features, []),
    materials: parseJsonSafe<Record<string, string>>(p.materials, {}),
    colors: parseJsonSafe<{ name: string; hex: string; image: string }[]>(p.colors, []),
    sizes: parseJsonSafe<
      { size: string; chestInches?: number; lengthInches?: number; inStock: boolean; stockCount: number }[]
    >(p.sizes, []),
    images: parseJsonSafe<string[]>(p.images, []),
    tags: parseJsonSafe<string[]>(p.tags, []),
  };
}

/**
 * Most units the storefront is ever told about. It only needs to know whether
 * a tracked product is sold out and how many one cart line may take; exact
 * stock levels above this stay private.
 */
export const PUBLIC_STOCK_CEILING = 100;

/** Remove merchant-only fields (cost, exact stock, reorder level) before a product goes public. */
export function toPublicProduct(p: Record<string, unknown>): Record<string, unknown> {
  const { costPrice: _cost, lowStockThreshold: _threshold, stockQuantity, ...rest } = p;
  if (!p.trackStock) return rest;
  return { ...rest, stockQuantity: Math.min(Math.max(0, Number(stockQuantity) || 0), PUBLIC_STOCK_CEILING) };
}

const JSON_FIELDS = ['features', 'materials', 'colors', 'sizes', 'images', 'tags'] as const;
const NUMBER_FIELDS = [
  'price',
  'originalPrice',
  'discountPercent',
  'rating',
  'reviewsCount',
  'featuredOrder',
  'costPrice',
  'stockQuantity',
  'lowStockThreshold',
] as const;
const BOOL_FIELDS = [
  'isNewArrival',
  'isBestSeller',
  'isTrending',
  'isClearance',
  'isFeatured',
  'isActive',
  'trackStock',
] as const;
const NULLABLE_FIELDS = [
  'originalPrice',
  'discountPercent',
  'featuredOrder',
  'cushionTech',
  'fit',
  'pattern',
  'sleeve',
  'barcode',
  'costPrice',
] as const;

/**
 * Accepts a raw request body (already containing JSON arrays/objects for the
 * JSON columns) and returns a plain object safe to write to the database.
 */
export function productFromApi(body: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;

    if ((JSON_FIELDS as readonly string[]).includes(key)) {
      data[key] = value === null || value === '' ? '[]' : JSON.stringify(value);
    } else if ((NUMBER_FIELDS as readonly string[]).includes(key)) {
      data[key] = value === null || value === '' ? null : Number(value);
    } else if ((BOOL_FIELDS as readonly string[]).includes(key)) {
      data[key] = Boolean(value);
    } else if ((NULLABLE_FIELDS as readonly string[]).includes(key)) {
      data[key] = value;
    } else if (typeof value === 'string') {
      data[key] = value;
    } else {
      data[key] = value;
    }
  }

  return data;
}