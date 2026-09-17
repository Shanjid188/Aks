// Adapters: convert API response shapes ↔ storefront types
import { ApiOrder, ApiProduct } from '../api';
import { CartItem, Order, Product, ShippingAddress } from '../types';

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

/** Map a backend order (POST /orders response or GET /orders/:id) into the
 *  storefront `Order` shape used by the confirmation page and order tracker. */
export const adaptApiOrder = (o: ApiOrder): Order => {
  const address = (o.customerAddress || {}) as Record<string, unknown>;
  const items: CartItem[] = (o.items || []).map((it) => {
    const joined = (it as { product?: { id?: string; name?: string; images?: unknown } }).product;
    const images = Array.isArray(joined?.images) ? (joined?.images as string[]) : [];
    const product = {
      id: joined?.id ?? it.productId ?? it.id,
      name: joined?.name ?? it.productName,
      sku: it.productSku,
      price: it.price,
      images,
      colors: [],
      sizes: [],
    } as unknown as Product;
    return {
      cartItemId: it.id,
      product,
      selectedColor: { name: it.color || 'Default', hex: '#000000', image: images[0] ?? '' },
      selectedSize: { size: it.size ?? '', inStock: true, stockCount: 0 },
      quantity: it.quantity,
      addedAt: 0,
    };
  });
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    items,
    shippingAddress: address as unknown as ShippingAddress,
    deliveryMethod: (o.deliveryMethod || 'standard') as Order['deliveryMethod'],
    paymentMethod: (o.paymentMethod || 'cod') as Order['paymentMethod'],
    subtotal: o.subtotal,
    discount: o.discount,
    shippingFee: o.shippingFee,
    total: o.total,
    status: (o.status || 'pending') as Order['status'],
    createdAt: o.createdAt,
    trackingCode: o.trackingCode,
    estimatedDelivery: o.estimatedDelivery || '',
    // Optional Phase 2+ fields — pass through as-is when present.
    customerAddress: address,
    source: (o.source ?? undefined) as Order['source'],
    isPos: o.source === 'pos' ? true : undefined,
    paidAmount: o.paidAmount ?? undefined,
    dueAmount: o.dueAmount ?? undefined,
    invoiceNumber: o.invoiceNumber ?? null,
    paymentStatus: o.paymentStatus ?? undefined,
    deliveryStatus: o.deliveryStatus ?? undefined,
    packagingStatus: o.packagingStatus ?? undefined,
    internalNotes: o.internalNotes ?? null,
  };
};