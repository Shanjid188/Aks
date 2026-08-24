// Lightweight API response types (mirror the server routes) — for the admin panel.

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface ProductSize {
  size: string;
  chestInches?: number;
  lengthInches?: number;
  inStock: boolean;
  stockCount: number;
}

export interface Product {
  id: string;
  legacyId: string | null;
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
  featuredOrder: number | null;
  description: string;
  features: string[];
  materials: Record<string, string>;
  colors: { name: string; hex: string; image: string }[];
  sizes: ProductSize[];
  images: string[];
  tags: string[];
  fit: string | null;
  pattern: string | null;
  sleeve: string | null;
  occasion: string;
  cushionTech: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  productSku: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email: string;
  division: string;
  district: string;
  thana: string;
  streetAddress: string;
  postalCode: string;
  deliveryInstructions?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  trackingCode: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: ShippingAddress | Record<string, unknown>;
  deliveryMethod: string;
  pickupStore: string | null;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  couponCode: string | null;
  estimatedDelivery: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface Coupon {
  id: string;
  code: string;
  discountType: string;
  value: number;
  minSpend: number;
  description: string;
  active: boolean;
  usedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  id: string;
  name: string;
  division: string;
  district: string;
  area: string;
  address: string;
  phone: string;
  openingHours: string;
  features: string[];
  lat: number;
  lng: number;
  isFlagship: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  product: { id: string; name: string; slug: string; sku: string } | null;
  author: string;
  city: string | null;
  rating: number;
  title: string;
  comment: string;
  date: string;
  verified: boolean;
  helpfulCount: number;
  fitFeedback: string | null;
  isApproved: boolean;
  createdAt: string;
}

export interface Stats {
  revenue: number;
  ordersCount: number;
  pendingOrdersCount: number;
  deliveredOrdersCount: number;
  productsCount: number;
  reviewsCount: number;
  couponsActive: number;
  lowStockProducts: { id: string; name: string; sku: string; image: string | null; lowestStock: number }[];
  recentOrders: Order[];
}

export interface HeroSlide {
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
  createdAt: string;
  updatedAt: string;
}