// AKS Garments — typed API client
type ApiOpts = { method?: string; body?: unknown };

export async function api<T>(path: string, opts: ApiOpts = {}): Promise<T> {
  const res = await fetch(`${import.meta.env.VITE_API_BASE ?? '/api'}${path}`, {
    method: opts.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.body ? {} : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  });

  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);

  return (await res.json()) as T;
}

// ── Public storefront endpoints ────────────────────────────────────────────
export interface ApiProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  subcategory: string;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  rating: number;
  reviewsCount: number;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  isClearance: boolean;
  isActive: boolean;
  featuredOrder: number | null;
  description: string;
  features: string[];
  materials: Record<string, string>;
  colors: { name: string; hex: string; image: string }[];
  sizes: { size: string; chestInches?: number; lengthInches?: number; inStock: boolean; stockCount: number }[];
  images: string[];
  tags: string[];
  occasion: string;
  fit: string | null;
  pattern: string | null;
  sleeve: string | null;
  cushionTech: string | null;
}

export interface ApiReview {
  id: string;
  productId: string;
  author: string;
  city: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  verified: boolean;
  helpfulCount: number;
  isApproved: boolean;
  fitFeedback: string | null;
}

export interface ApiCoupon {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  value: number;
  minSpend: number;
  description: string | null;
  active: boolean;
  usedCount: number;
}

export interface ApiOrder {
  id: string;
  orderNumber: string;
  trackingCode: string;
  status: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  couponCode: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: Record<string, unknown>;
  deliveryMethod: string;
  pickupStore: string | null;
  paymentMethod: string;
  estimatedDelivery: string;
  createdAt: string;
  updatedAt: string;
  /* ── Phase 2+ backend fields (optional — older clients keep working) ── */
  source?: string | null;
  invoiceNumber?: string | null;
  paidAmount?: number | null;
  dueAmount?: number | null;
  paymentStatus?: string | null;
  deliveryStatus?: string | null;
  packagingStatus?: string | null;
  internalNotes?: string | null;
  items: {
    id: string;
    productId: string | null;
    productName: string;
    productSku: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
  }[];
}

// ── Public routes (no auth needed) ───────────────────────────────────────────
export const fetchProducts = (params?: Record<string, string>) => {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  return api<{ products: ApiProduct[]; count: number }>(`/products${q}`);
};

export const fetchProductBySlug = (slug: string) => api<ApiProduct>(`/products/${slug}`);

export interface ApiHeroSlide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaCategory: string;
  ctaSubcategory: string | null;
  ctaBrand: string | null;
  image: string;
  accentColor: string;
  tagline: string;
  sortOrder: number;
  isActive: boolean;
}

export const fetchHeroSlides = () => api<{ slides: ApiHeroSlide[] }>('/hero-slides');

export const fetchProductReviews = (slug: string) =>
  api<{ reviews: ApiReview[] }>(`/products/${slug}/reviews`);

export const validateCoupon = (code: string) =>
  api<{ valid: boolean; message?: string; coupon: ApiCoupon }>(`/coupons/validate`, {
    method: 'POST',
    body: { code },
  });

export const trackOrder = (trackingCode: string) =>
  api<{ order: ApiOrder }>(`/orders/track/${trackingCode.toUpperCase()}`);

/** Public: fetch a single order by its database ID (order confirmation page). */
export const fetchOrderById = (id: string) => api<{ order: ApiOrder }>(`/orders/${id}`);

// ── Place order ─────────────────────────────────────────────────────────────
export interface ApiCreateOrderBody {
  items: { product: ApiProduct; price: number; quantity: number; selectedSize: { size: string }; selectedColor: { name: string } }[];
  customerAddress: Record<string, string>;
  deliveryMethod: string;
  pickupStore?: string;
  paymentMethod: string;
  shippingFee: number;
  couponCode?: string;
}

export const createOrderAPI = (body: ApiCreateOrderBody) =>
  api<{ order: ApiOrder }>('/orders', { method: 'POST', body });
