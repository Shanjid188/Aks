import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, WishlistItem, FilterState, Coupon, Order, Review, CurrencyMode, ProductColor, ProductSize } from '../types';
import { INITIAL_PRODUCTS, INITIAL_REVIEWS } from '../data/products';
import { VALID_COUPONS } from '../data/promos';

interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface StoreContextType {
  products: Product[];
  reviews: Review[];
  cart: CartItem[];
  wishlist: WishlistItem[];
  compareList: Product[];
  recentlyViewed: Product[];
  currency: CurrencyMode;
  setCurrency: (c: CurrencyMode) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  cartSubtotal: number;
  cartDiscount: number;
  shippingFee: number;
  cartTotal: number;
  freeShippingThreshold: number;
  // Cart Actions
  addToCart: (product: Product, color: ProductColor, size: ProductSize, quantity?: number) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => void;
  updateCartItemOptions: (cartItemId: string, color: ProductColor, size: ProductSize) => void;
  clearCart: () => void;
  // Wishlist Actions
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  // Compare Actions
  toggleCompare: (product: Product) => void;
  isInCompare: (productId: string) => boolean;
  clearCompare: () => void;
  // Modals & Navigation
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  isQuickViewOpen: boolean;
  setIsQuickViewOpen: (open: boolean) => void;
  quickViewProduct: Product | null;
  openQuickView: (product: Product) => void;
  closeQuickView: () => void;
  activeProductPage: Product | null;
  setActiveProductPage: (p: Product | null) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  isSizeGuideOpen: boolean;
  setIsSizeGuideOpen: (open: boolean) => void;
  isStoreLocatorOpen: boolean;
  setIsStoreLocatorOpen: (open: boolean) => void;
  isBataClubOpen: boolean;
  setIsBataClubOpen: (open: boolean) => void;
  isOrderTrackerOpen: boolean;
  setIsOrderTrackerOpen: (open: boolean) => void;
  isShoeFinderOpen: boolean;
  setIsShoeFinderOpen: (open: boolean) => void;
  isCompareModalOpen: boolean;
  setIsCompareModalOpen: (open: boolean) => void;
  // Orders & Reviews
  orders: Order[];
  createOrder: (orderData: Omit<Order, 'id' | 'createdAt' | 'trackingCode' | 'status'>) => Order;
  addReview: (review: Omit<Review, 'id' | 'date' | 'helpfulCount'>) => void;
  // Toast
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const initialFilters: FilterState = {
  category: 'all',
  subcategory: 'All',
  brand: [],
  priceRange: [0, 10000],
  sizes: [],
  colors: [],
  sortOption: 'featured',
  ratingMin: 0,
  inStockOnly: false,
  onSaleOnly: false,
  searchQuery: '',
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const FREE_SHIPPING_THRESHOLD = 2500; // ৳2,500
const STANDARD_SHIPPING_FEE = 120; // ৳120 standard delivery in BD

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = localStorage.getItem('aks_reviews') || localStorage.getItem('bata_reviews');
    return saved ? JSON.parse(saved) : INITIAL_REVIEWS;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('aks_cart') || localStorage.getItem('bata_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    const saved = localStorage.getItem('aks_wishlist') || localStorage.getItem('bata_wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  const [compareList, setCompareList] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>(() => {
    const saved = localStorage.getItem('aks_recent_viewed') || localStorage.getItem('bata_recent_viewed');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('aks_orders') || localStorage.getItem('bata_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [currency, setCurrency] = useState<CurrencyMode>('BDT');
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // Modals state
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [activeProductPage, setActiveProductPage] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isStoreLocatorOpen, setIsStoreLocatorOpen] = useState(false);
  const [isBataClubOpen, setIsBataClubOpen] = useState(false);
  const [isOrderTrackerOpen, setIsOrderTrackerOpen] = useState(false);
  const [isShoeFinderOpen, setIsShoeFinderOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('aks_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('aks_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem('aks_recent_viewed', JSON.stringify(recentlyViewed.slice(0, 8)));
  }, [recentlyViewed]);

  useEffect(() => {
    localStorage.setItem('aks_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('aks_reviews', JSON.stringify(reviews));
  }, [reviews]);

  // Calculations
  const cartSubtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  let cartDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percent') {
      if (appliedCoupon.code === 'FREESHIP') {
        cartDiscount = 0; // handled in shipping fee
      } else {
        cartDiscount = Math.round((cartSubtotal * appliedCoupon.value) / 100);
      }
    } else {
      cartDiscount = appliedCoupon.value;
    }
  }

  const isFreeShippingByAmount = cartSubtotal >= FREE_SHIPPING_THRESHOLD;
  const isFreeShippingByCoupon = appliedCoupon?.code === 'FREESHIP';
  const shippingFee = cart.length === 0 ? 0 : isFreeShippingByAmount || isFreeShippingByCoupon ? 0 : STANDARD_SHIPPING_FEE;
  const cartTotal = Math.max(0, cartSubtotal - cartDiscount + shippingFee);

  // Reset filters
  const resetFilters = () => {
    setFilters(initialFilters);
  };

  // Cart actions
  const addToCart = (product: Product, color: ProductColor, size: ProductSize, quantity = 1) => {
    const cartItemId = `${product.id}-${color.name}-${size.size}`;
    setCart((prev) => {
      const existing = prev.find((item) => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map((item) =>
          item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [
        ...prev,
        {
          cartItemId,
          product,
          selectedColor: color,
          selectedSize: size,
          quantity,
          addedAt: Date.now(),
        },
      ];
    });

    addToast({
      type: 'success',
      title: 'Added to Cart',
      message: `${product.name} (${size.size}) added to your shopping bag.`,
    });

    // Auto record in recently viewed
    addToRecentlyViewed(product);
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
    addToast({
      type: 'info',
      title: 'Item Removed',
      message: 'Item removed from your bag.',
    });
  };

  const updateCartQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.cartItemId === cartItemId ? { ...item, quantity } : item))
    );
  };

  const updateCartItemOptions = (cartItemId: string, color: ProductColor, size: ProductSize) => {
    setCart((prev) => {
      const target = prev.find((i) => i.cartItemId === cartItemId);
      if (!target) return prev;
      const newCartItemId = `${target.product.id}-${color.name}-${size.size}`;
      const filtered = prev.filter((i) => i.cartItemId !== cartItemId);
      const existingNew = filtered.find((i) => i.cartItemId === newCartItemId);
      if (existingNew) {
        return filtered.map((i) =>
          i.cartItemId === newCartItemId ? { ...i, quantity: i.quantity + target.quantity } : i
        );
      }
      return [
        ...filtered,
        {
          ...target,
          cartItemId: newCartItemId,
          selectedColor: color,
          selectedSize: size,
        },
      ];
    });
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  // Coupons
  const applyCoupon = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const coupon = VALID_COUPONS.find((c) => c.code === cleanCode);
    if (!coupon) {
      addToast({
        type: 'error',
        title: 'Invalid Coupon',
        message: `Promo code "${cleanCode}" is invalid or expired. Try AKS15 or WELCOME10.`,
      });
      return { success: false, message: 'Invalid promo code' };
    }
    if (cartSubtotal < coupon.minSpend) {
      addToast({
        type: 'warning',
        title: 'Minimum Spend Not Met',
        message: `Code "${cleanCode}" requires a minimum spend of ৳${coupon.minSpend.toLocaleString()}.`,
      });
      return {
        success: false,
        message: `Minimum spend of ৳${coupon.minSpend.toLocaleString()} required`,
      };
    }
    setAppliedCoupon(coupon);
    addToast({
      type: 'success',
      title: 'Coupon Applied!',
      message: `${coupon.description} applied successfully.`,
    });
    return { success: true, message: coupon.description };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    addToast({
      type: 'info',
      title: 'Coupon Removed',
      message: 'Promo discount removed from order.',
    });
  };

  // Wishlist actions
  const toggleWishlist = (product: Product) => {
    setWishlist((prev) => {
      const exists = prev.some((item) => item.productId === product.id);
      if (exists) {
        addToast({
          type: 'info',
          title: 'Removed from Wishlist',
          message: `${product.name} removed from your saved items.`,
        });
        return prev.filter((item) => item.productId !== product.id);
      } else {
        addToast({
          type: 'success',
          title: 'Saved to Wishlist',
          message: `${product.name} added to your wishlist.`,
        });
        return [...prev, { productId: product.id, product, addedAt: Date.now() }];
      }
    });
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some((item) => item.productId === productId);
  };

  // Compare actions
  const toggleCompare = (product: Product) => {
    setCompareList((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      }
      if (prev.length >= 4) {
        addToast({
          type: 'warning',
          title: 'Compare Limit Reached',
          message: 'You can compare up to 4 apparel items at once.',
        });
        return prev;
      }
      addToast({
        type: 'info',
        title: 'Added to Compare',
        message: `${product.name} added to apparel comparison chart.`,
      });
      return [...prev, product];
    });
  };

  const isInCompare = (productId: string) => {
    return compareList.some((p) => p.id === productId);
  };

  const clearCompare = () => {
    setCompareList([]);
  };

  const addToRecentlyViewed = (product: Product) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      return [product, ...filtered].slice(0, 8);
    });
  };

  // Quick view
  const openQuickView = (product: Product) => {
    setQuickViewProduct(product);
    setIsQuickViewOpen(true);
    addToRecentlyViewed(product);
  };

  const closeQuickView = () => {
    setIsQuickViewOpen(false);
    setQuickViewProduct(null);
  };

  // Orders
  const createOrder = (orderData: Omit<Order, 'id' | 'createdAt' | 'trackingCode' | 'status'>): Order => {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const trackingCode = `AKS-BD-${randomSuffix}`;
    const newOrder: Order = {
      ...orderData,
      id: `ORD-${Date.now()}`,
      createdAt: new Date().toISOString(),
      trackingCode,
      status: 'confirmed',
    };

    setOrders((prev) => [newOrder, ...prev]);
    clearCart();
    return newOrder;
  };

  // Reviews
  const addReview = (reviewData: Omit<Review, 'id' | 'date' | 'helpfulCount'>) => {
    const newReview: Review = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      helpfulCount: 0,
    };
    setReviews((prev) => [newReview, ...prev]);
    addToast({
      type: 'success',
      title: 'Review Submitted',
      message: 'Thank you for sharing your authentic review with the AKS community!',
    });
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        reviews,
        cart,
        wishlist,
        compareList,
        recentlyViewed,
        currency,
        setCurrency,
        filters,
        setFilters,
        resetFilters,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        cartSubtotal,
        cartDiscount,
        shippingFee,
        cartTotal,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        updateCartItemOptions,
        clearCart,
        toggleWishlist,
        isInWishlist,
        toggleCompare,
        isInCompare,
        clearCompare,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        isQuickViewOpen,
        setIsQuickViewOpen,
        quickViewProduct,
        openQuickView,
        closeQuickView,
        activeProductPage,
        setActiveProductPage,
        isCheckoutOpen,
        setIsCheckoutOpen,
        isSizeGuideOpen,
        setIsSizeGuideOpen,
        isStoreLocatorOpen,
        setIsStoreLocatorOpen,
        isBataClubOpen,
        setIsBataClubOpen,
        isOrderTrackerOpen,
        setIsOrderTrackerOpen,
        isShoeFinderOpen,
        setIsShoeFinderOpen,
        isCompareModalOpen,
        setIsCompareModalOpen,
        orders,
        createOrder,
        addReview,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
