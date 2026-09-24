import type { Product } from '@prisma/client';
import { prisma } from './prisma.ts';
import { productToApi } from '../utils/product.ts';

/**
 * Products carry a merchant-editable `rating` / `reviewsCount` (set in
 * Admin → Products). Once a product has *approved* reviews, the live figures
 * from the review table win — so approving, hiding or deleting a review is
 * reflected on the storefront immediately, and nothing is ever written back to
 * the product row (the merchant's own numbers are never overwritten).
 *
 * Products with no approved reviews keep exactly what the admin entered.
 */
export async function withLiveRatings<T extends Product>(products: T[]): Promise<Record<string, unknown>[]> {
  if (products.length === 0) return [];

  const grouped = await prisma.review.groupBy({
    by: ['productId'],
    where: { isApproved: true, productId: { in: products.map((p) => p.id) } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const live = new Map(grouped.map((g) => [g.productId, g]));

  return products.map((product) => {
    const api = productToApi(product) as Record<string, unknown>;
    const stats = live.get(product.id);
    const count = stats?._count._all ?? 0;
    if (!stats || count === 0) return api;
    return {
      ...api,
      rating: Math.round((stats._avg.rating ?? 0) * 10) / 10,
      reviewsCount: count,
    };
  });
}
