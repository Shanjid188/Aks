export type CategoryType = 'all' | 'men' | 'women' | 'kids' | 'festive' | 'accessories';

export type SubcategoryType =
  | 'All'
  | 'Panjabis & Kabli'
  | 'Formal Shirts'
  | 'Casual Shirts & Polos'
  | 'Denim & Trousers'
  | 'Kurtis & Tunics'
  | 'Salwar Kameez & Suits'
  | 'Sarees & Festive'
  | 'Tops & Western'
  | 'T-Shirts & Polos'
  | 'Blazers & Waistcoats'
  | 'Kids Garments'
  | 'Accessories & Shawls';

export type BrandName =
  | 'AKS Heritage'
  | 'AKS Studio'
  | 'AKS Signature'
  | 'AKS Riva'
  | 'AKS Denim Co.'
  | 'AKS Junior'
  | 'AKS Essentials';

export interface ProductColor {
  name: string;
  hex: string;
  image: string;
}

export interface ProductSize {
  size: string;
  chestInches?: number;
  lengthInches?: number;
  waistInches?: number;
  eu?: number;
  uk?: number;
  us?: number;
  inStock: boolean;
  stockCount: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand: BrandName;
  category: CategoryType;
  subcategory: SubcategoryType | string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  rating: number;
  reviewsCount: number;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isTrending?: boolean;
  isClearance?: boolean;
  featuredOrder?: number;
  description: string;
  features: string[];
  materials: {
    fabric: string;
    weave?: string;
    lining?: string;
    care: string;
    upper?: string;
    sole?: string;
    insole?: string;
  };
  fit?: 'Slim Fit' | 'Regular Fit' | 'Relaxed Fit' | 'Tailored Fit' | 'Classic Fit';
  pattern?: 'Solid' | 'Embroidered' | 'Printed' | 'Striped' | 'Checked' | 'Jacquard' | 'Textured';
  sleeve?: 'Full Sleeve' | 'Half Sleeve' | 'Three-Quarter' | 'Sleeveless';
  colors: ProductColor[];
  sizes: ProductSize[];
  images: string[];
  tags: string[];
  occasion: string;
  cushionTech?: string; // fabric tech or weave specialty
  sku: string;
}

export interface CartItem {
  cartItemId: string;
  product: Product;
  selectedColor: ProductColor;
  selectedSize: ProductSize;
  quantity: number;
  addedAt: number;
}

export interface WishlistItem {
  productId: string;
  product: Product;
  addedAt: number;
}

export interface FilterState {
  category: CategoryType;
  subcategory: string;
  brand: string[];
  priceRange: [number, number];
  sizes: (string | number)[];
  colors: string[];
  sortOption: 'featured' | 'bestseller' | 'price-low' | 'price-high' | 'rating' | 'newest';
  ratingMin: number;
  inStockOnly: boolean;
  onSaleOnly: boolean;
  searchQuery: string;
}

export interface Review {
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
  fitFeedback: 'runs_small' | 'true_to_size' | 'runs_large';
}

export interface StoreLocation {
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
  isFlagship?: boolean;
}

export interface Coupon {
  code: string;
  discountType: 'percent' | 'fixed';
  value: number;
  minSpend: number;
  description: string;
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
  items: CartItem[];
  shippingAddress: ShippingAddress;
  deliveryMethod: 'standard' | 'express' | 'pickup';
  pickupStore?: string;
  paymentMethod: 'bkash' | 'nagad' | 'card' | 'cod';
  subtotal: number;
  discount: number;
  shippingFee: number;
  couponApplied?: Coupon;
  total: number;
  status: 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered';
  createdAt: string;
  trackingCode: string;
  estimatedDelivery: string;
}

export type CurrencyMode = 'BDT' | 'USD';
