import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, WishlistItem, FilterState, Coupon, Order, Review, CurrencyMode, ProductColor, ProductSize } from '../types';
import { INITIAL_PRODUCTS, INITIAL_REVIEWS } from '../data/products';
import { VALID_COUPONS } from '../data/promos';
import { dataLoader, USE_API } from '../lib/dataLoader';
import * as API from '../api';
import { adaptApiOrder } from '../lib/apiAdapter';

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
    applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
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
  clearWishlist: () => void;
  // Compare Actions
  toggleCompare: (product: Product) => void;
  isInCompare: (productId: string) => boolean;
  clearCompare: () => void;
  // Modals & Navigation
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  isWishlistDrawerOpen: boolean;
  setIsWishlistDrawerOpen: (open: boolean) => void;
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
    isAksMartClubOpen: boolean;
  setIsAksMartClubOpen: (open: boolean) => void;
  isOrderTrackerOpen: boolean;
  setIsOrderTrackerOpen: (open: boolean) => void;
  isShoeFinderOpen: boolean;
  setIsShoeFinderOpen: (open: boolean) => void;
  isCompareModalOpen: boolean;
  setIsCompareModalOpen: (open: boolean) => void;
  // Orders & Reviews
  orders: Order[];
    createOrder: (orderData: Omit<Order, 'id' | 'createdAt' | 'trackingCode' | 'status'>) => Promise<Order>;
  /** Look up an order in the local (persisted) order list. */
  getOrderById: (id: string) => Order | undefined;
  /** Fetch an order from the backend by its database ID (refresh-safe). */
  fetchOrderById: (id: string) => Promise<Order | null>;
  /** Fetch an order from the backend by its AKS-BD tracking code. */
  fetchOrderByTracking: (code: string) => Promise<Order | null>;
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

const FREE_SHIPPING_THRESHOLD = 2500; // à§³2,500
const STANDARD_SHIPPING_FEE = 120; // à§³120 standard delivery in BD

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = localStorage.getItem('aks_reviews');
    return saved ? JSON.parse(saved) : INITIAL_REVIEWS;
  });

  // Load products and reviews from API (falls back to local data on any error)
  useEffect(() => {
    let cancelled = false;
    Promise.all([dataLoader.loadProducts(), dataLoader.loadReviews()]).then(([prods, revs]) => {
      if (cancelled) return;
      setProducts(prods);
      setReviews(revs);
    });
    return () => { cancelled = true; };
  }, []);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('aks_cart');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      // Validate/normalize restored items — stale or malformed entries (e.g.
      // from an older data shape) must never crash checkout later.
      return parsed
        .filter((it) => it && typeof it === 'object' && it.product && typeof it.product === 'object' && it.product.name)
        .map((it) => ({
          ...it,
          product: it.product,
          selectedColor:
            it.selectedColor && typeof it.selectedColor === 'object'
              ? it.selectedColor
              : { name: 'Default', hex: '#000000', image: it.product?.images?.[0] ?? '' },
          selectedSize:
            typeof it.selectedSize === 'string'
              ? { size: it.selectedSize, inStock: true, stockCount: 0 }
              : it.selectedSize && typeof it.selectedSize === 'object'
                ? it.selectedSize
                : { size: '', inStock: true, stockCount: 0 },
          quantity: Number.isFinite(Number(it.quantity)) && Number(it.quantity) >= 1 ? Math.floor(Number(it.quantity)) : 1,
          addedAt: it.addedAt ?? Date.now(),
        })) as CartItem[];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    const saved = localStorage.getItem('aks_wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  const [compareList, setCompareList] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>(() => {
    const saved = localStorage.getItem('aks_recent_viewed');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('aks_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [currency, setCurrency] = useState<CurrencyMode>('BDT');
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // Modals state
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isWishlistDrawerOpen, setIsWishlistDrawerOpen] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [activeProductPage, setActiveProductPage] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
    const [isAksMartClubOpen, setIsAksMartClubOpen] = useState(false);
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
    // Normalize inputs - a broken variant from any caller must never produce a
    // cart item that crashes checkout later.
    const safeColor: ProductColor =
      color && typeof color === 'object' && color.name
        ? color
        : { name: 'Default', hex: '#000000', image: product.images?.[0] ?? '' };
    const safeSize: ProductSize =
      size && typeof size === 'object' && size.size
        ? size
        : { size: '', inStock: true, stockCount: 0 };
    const safeQty = Number.isFinite(quantity) && quantity >= 1 ? Math.floor(quantity) : 1;
    const cartItemId = `${product.id}-${safeColor.name}-${safeSize.size}`;
    setCart((prev) => {
      const existing = prev.find((item) => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map((item) =>
          item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + safeQty } : item
        );
      }
      return [
        ...prev,
        {
          cartItemId,
          product,
          selectedColor: safeColor,
          selectedSize: safeSize,
          quantity: safeQty,
          addedAt: Date.now(),
        },
      ];
    });

    addToast({
      type: 'success',
      title: 'Added to Cart',
      message: `${product.name}${safeSize.size ? ` (${safeSize.size})` : ''} added to your shopping bag.`,
    });

    // Auto-remove from wishlist â€” the item now lives in the bag instead.
    setWishlist((prev) =>
      prev.some((item) => item.productId === product.id)
        ? prev.filter((item) => item.productId !== product.id)
        : prev
    );

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

      // Coupons â€” validates against the backend API, falls back to local list
  const applyCoupon = async (code: string): Promise<{ success: boolean; message: string }> => {
    const cleanCode = code.trim().toUpperCase();

    // Local fallback validation (used when API is off or fails)
    const applyLocalCoupon = (): { success: boolean; message: string } => {
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
          message: `Code "${cleanCode}" requires a minimum spend of à§³${coupon.minSpend.toLocaleString()}.`,
        });
        return {
          success: false,
          message: `Minimum spend of à§³${coupon.minSpend.toLocaleString()} required`,
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

    // When the API toggle is off, use local validation
    if (!USE_API) return applyLocalCoupon();

    // Otherwise validate on the backend
    try {
      const { valid, coupon: apiCoupon, message } = await API.validateCoupon(cleanCode);
      if (!valid) {
        addToast({
          type: 'error',
          title: 'Invalid Coupon',
          message: message ?? `Promo code "${cleanCode}" is invalid or expired.`,
        });
        return { success: false, message: message ?? 'Invalid promo code' };
      }
      setAppliedCoupon({
        code: apiCoupon.code,
        discountType: apiCoupon.discountType,
        value: apiCoupon.value,
        minSpend: apiCoupon.minSpend,
        description: apiCoupon.description ?? '',
      });
      addToast({
        type: 'success',
        title: 'Coupon Applied!',
        message: `${apiCoupon.description ?? cleanCode} applied successfully.`,
      });
      return { success: true, message: apiCoupon.description ?? '' };
    } catch (e) {
      console.warn('[applyCoupon] API failed, using local fallback:', e);
      return applyLocalCoupon();
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    addToast({
      type: 'info',
      title: 'Coupon Removed',
      message: 'Promo discount removed from order.',
    });
  };

  // Wishlist actions â€” side effects kept out of the state updater so toasts
  // never fire twice and the toggle stays predictable.
  const toggleWishlist = (product: Product) => {
    const exists = wishlist.some((item) => item.productId === product.id);
    if (exists) {
      setWishlist((prev) => prev.filter((item) => item.productId !== product.id));
      addToast({
        type: 'info',
        title: 'Removed from Wishlist',
        message: `${product.name} removed from your saved items.`,
      });
    } else {
      setWishlist((prev) => [...prev, { productId: product.id, product, addedAt: Date.now() }]);
      addToast({
        type: 'success',
        title: 'Saved to Wishlist',
        message: `${product.name} added to your wishlist.`,
      });
    }
  };

  const clearWishlist = () => {
    setWishlist([]);
    addToast({
      type: 'info',
      title: 'Wishlist Cleared',
      message: 'All saved items removed.',
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

    // Orders — POSTs to the backend API; falls back to local-only order generation
  // if the API is unreachable so the checkout flow never breaks.
  const createOrder = async (
    orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'trackingCode' | 'status'>
  ): Promise<Order> => {
    const cartItems = orderData.items;

    // Optimistic local fallback order (so receipt still renders even if API fails)
    const fallbackOrder: Order = {
      ...orderData,
      items: cartItems,
      id: `ORD-${Date.now()}`,
      orderNumber: `ORD-${Date.now()}`,
      createdAt: new Date().toISOString(),
      trackingCode: `AKS-BD-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'pending',
    };

    // If we're off the API or the call fails, fall back to local behaviour.
    if (!USE_API) {
      setOrders((prev) => [fallbackOrder, ...prev]);
      clearCart();
      return fallbackOrder;
    }

    try {
      const body: API.ApiCreateOrderBody = {
        items: cartItems.map((item) => ({
          product: item.product as unknown as API.ApiProduct,
          price: item.product.price,
          quantity: item.quantity,
          selectedSize: {
            size:
              typeof item.selectedSize === 'string'
                ? item.selectedSize
                : item.selectedSize?.size ?? '',
          },
          selectedColor: { name: item.selectedColor?.name ?? 'Default' },
        })),
        customerAddress: orderData.shippingAddress as unknown as Record<string, string>,
        deliveryMethod: orderData.deliveryMethod,
        pickupStore: orderData.pickupStore,
        paymentMethod: orderData.paymentMethod,
        shippingFee: orderData.shippingFee,
        couponCode: orderData.couponApplied?.code,
      };

      const { order: apiOrder } = await API.createOrderAPI(body);

      // Map the API response into the frontend Order shape used by the receipt/tracker.
      const mappedOrder: Order = {
        ...orderData,
        items: cartItems,
        id: apiOrder.id,
        orderNumber: apiOrder.orderNumber,
        trackingCode: apiOrder.trackingCode,
        status: apiOrder.status as Order['status'],
        createdAt: apiOrder.createdAt,
      };

            setOrders((prev) => [mappedOrder, ...prev]);
      clearCart();
      return mappedOrder;
    } catch (e) {
      console.warn('[createOrder] Order API failed:', e);
      // Surface the failure to checkout so the customer sees an honest error and can
      // retry â€” no fake local "success" receipts when the backend call fails.
      throw new Error("We couldn't place your order right now. Please try again.");
    }
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

  const getOrderById = (id: string): Order | undefined => {
    return orders.find((o) => o.id === id);
  };

  // Fetch an order straight from the backend — used by the confirmation page
  // and order tracking so lookups survive refreshes and work for guests.
  const fetchOrderById = async (id: string): Promise<Order | null> => {
    const q = id.trim();
    if (!q) return null;
    if (!USE_API) return getOrderById(q) ?? null;
    try {
      const { order } = await API.fetchOrderById(q);
      return adaptApiOrder(order);
    } catch {
      return null;
    }
  };

  // Track an order by its AKS-BD-XXXXXX tracking code via the public API.
  const fetchOrderByTracking = async (code: string): Promise<Order | null> => {
    const q = code.trim();
    if (!q) return null;
    if (!USE_API) return getOrderById(q) ?? null;
    try {
      const { order } = await API.trackOrder(q);
      return adaptApiOrder(order);
    } catch {
      return null;
    }
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
        clearWishlist,
        toggleCompare,
        isInCompare,
        clearCompare,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        isWishlistDrawerOpen,
        setIsWishlistDrawerOpen,
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
                isAksMartClubOpen,
        setIsAksMartClubOpen,
        isOrderTrackerOpen,
        setIsOrderTrackerOpen,
        isShoeFinderOpen,
        setIsShoeFinderOpen,
        isCompareModalOpen,
        setIsCompareModalOpen,
        orders,
        getOrderById,
        fetchOrderById,
        fetchOrderByTracking,
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
