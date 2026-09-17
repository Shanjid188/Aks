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