import { CartItem, Product } from '../types';

/**
 * Live stock truth for the storefront.
 *
 * Products can be stock-tracked in Admin → Products. A tracked product with no
 * units left can never be ordered — the API refuses the order at checkout — so
 * the storefront must know about it *before* the customer fills in the whole
 * address form and presses "Place order".
 */
export const stockLeft = (product: Product): number | null =>
  product.trackStock ? Math.max(0, Math.floor(Number(product.stockQuantity ?? 0)) || 0) : null;

/** True when the catalog is tracking this product and nothing is left. */
export const isOutOfStock = (product: Product): boolean => stockLeft(product) === 0;

/** Largest quantity of one cart line the catalog can still ship (∞ if untracked). */
export const maxOrderableQty = (item: CartItem): number => stockLeft(item.product) ?? Infinity;
