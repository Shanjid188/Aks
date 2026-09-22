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
  barcode: string | null;
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
  product?: { id: string; name: string; images: string[] } | null;
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
  /* ── Phase 2+ backend additions (all optional so legacy callers still compile) ── */
  source?: string | null;
  invoiceNumber?: string | null;
  paidAmount?: number | null;
  dueAmount?: number | null;
  paymentStatus?: string | null;
  tax?: number | null;
  internalNotes?: string | null;
  cashierId?: string | null;
  packedAt?: string | null;
  packedBy?: string | null;
  dispatchedAt?: string | null;
  deliveryStatus?: string | null;
  packagingStatus?: string | null;
  customerNote?: string | null;
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

/** Aggregated customer row — one per unique phone number (from real orders). */
export interface Customer {
  name: string;
  phone: string;
  email: string;
  division: string;
  district: string;
  totalSpent: number;
  ordersCount: number;
  lastOrderAt: string;
  firstOrderAt: string;
  lastOrderNumber: string;
}

/** Role returned by /admin/roles (permissions flattened to keys). */
export interface Role {
  id: string;
  name: string;
  description: string;
  isSuper: boolean;
  isSystem: boolean;
  permissions: string[];
  usersCount: number;
  createdAt: string;
}

/** Admin user row returned by /admin/admins. */
export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  role: { id: string | null; name: string; isSuper: boolean } | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Stats {
  revenue: number;
  revenueDeltaPercent: number | null;
  ordersCount: number;
  pendingOrdersCount: number;
  confirmedOrdersCount: number;
  activeOrdersCount: number;
  deliveredOrdersCount: number;
  shippedOrdersCount: number;
  cancelledOrdersCount: number;
  returnedOrdersCount: number;
  productsCount: number;
  customersCount: number;
  reviewsCount: number;
  couponsActive: number;
  lowStockProducts: { id: string; name: string; sku: string; image: string | null; lowestStock: number }[];
  topProducts: { name: string; category: string; image: string | null; qty: number; revenue: number }[];
  categoryPerformance: { category: string; categoryLabel: string; ordersCount: number; qty: number; revenue: number }[];
  recentlyCancelledOrders: Order[];
  recentOrders: Order[];
  lowStockLevel: number;
}

export interface SalesPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface SalesOverview {
  range: string;
  points: SalesPoint[];
  totalRevenue: number;
  totalOrders: number;
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
/** Inventory row (GET /admin/inventory). */
export interface InventoryItem {
  id: string; name: string; sku: string; barcode: string | null;
  category: string; subcategory: string; trackStock: boolean;
  stockQuantity: number; reserved: number; available: number;
  lowStockThreshold: number; isLow: boolean; isOut: boolean; updatedAt: string;
}

export interface StockMovementRow {
  id: string; productId: string; productName: string; sku: string; image: string | null;
  change: number; reason: string; referenceType: string | null; referenceId: string | null;
  createdBy: string | null; createdAt: string;
}

export interface Promotion {
  id: string; title: string; subtitle: string | null; image: string | null; link: string | null;
  startDate: string | null; endDate: string | null; isActive: boolean; sortOrder: number;
  createdAt: string; updatedAt: string;
}

export interface Announcement {
  id: string; text: string; textBn: string | null; link: string | null;
  bgColor: string; textColor: string; isActive: boolean; createdAt: string; updatedAt: string;
}

export interface Subcategory {
  id: string; categoryId: string; name: string; nameBn: string | null; slug: string;
  isActive: boolean; sortOrder: number;
}

export interface Category {
  id: string; name: string; nameBn: string | null; slug: string;
  description: string; descriptionBn: string | null;
  tagline: string; taglineBn: string | null;
  brand: string; image: string | null; heroImage: string | null; gridImage: string | null;
  badge: string; accentColor: string; isActive: boolean; sortOrder: number;
  subcategories: Subcategory[];
}

export interface Supplier {
  id: string; name: string; phone: string | null; email: string | null; address: string | null;
  company: string | null; notes: string | null; isActive: boolean; createdAt: string; updatedAt: string; _count?: { purchases: number };
}

export interface PurchaseItemRow {
  id: string; purchaseId: string; productId: string | null; productName: string; sku: string | null;
  quantity: number; costPrice: number; total: number;
}

export interface Purchase {
  id: string; purchaseNumber: string; supplierId: string | null; supplier: Supplier | null;
  status: string; totalCost: number; paidAmount: number; dueAmount: number;
  purchaseDate: string; notes: string | null; createdBy: string | null;
  createdAt: string; updatedAt: string; items: PurchaseItemRow[];
}

export interface Expense {
  id: string; title: string; category: string; amount: number; expenseDate: string;
  paymentMethod: string; note: string | null; createdBy: string | null; createdAt: string; updatedAt: string;
}

export interface ReturnRequest {
  id: string; returnNumber: string; orderId: string | null; order: { id: string; orderNumber: string } | null;
  customerName: string | null; customerPhone: string | null; productId: string | null; productName: string | null;
  variant: string | null; quantity: number; reason: string; customerNote: string | null; adminNote: string | null;
  status: string; refundAmount: number; refundMethod: string;
  approvedById: string | null; approvedAt: string | null; receivedAt: string | null; refundedAt: string | null;
  createdAt: string; updatedAt: string;
}

export interface ActivityLogRow {
  id: string; adminId: string | null; adminName: string | null; adminEmail: string | null;
  action: string; entity: string; entityId: string | null; details: string; createdAt: string;
}

export interface StoreSettings {
  storeName?: string; storeTagline?: string; storeLogo?: string; favicon?: string; phone?: string; email?: string;
  website?: string; address?: string; facebook?: string; whatsapp?: string; currency?: string; currencySymbol?: string;
  defaultShippingCharge?: number; freeShippingThreshold?: number; taxPercent?: number; invoiceFooter?: string;
  returnPolicy?: string; packagingNote?: string; thankYouMessage?: string; invoicePaperSize?: string; thermalWidth?: string;
  lowStockThreshold?: number; orderPrefix?: string; posPrefix?: string; timezone?: string; language?: string;
}

