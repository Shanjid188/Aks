import React from 'react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import { Bi } from './Bi';
import { X, Trash2, ShoppingBag, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Product } from '../types';

export const WishlistDrawer: React.FC = () => {
  const {
    isWishlistDrawerOpen,
    setIsWishlistDrawerOpen,
    wishlist,
    toggleWishlist,
    clearWishlist,
    addToCart,
    currency,
  } = useStore();

  if (!isWishlistDrawerOpen) return null;

  const handleMoveToBag = (product: Product) => {
    const size = product.sizes.find((s) => s.inStock) || product.sizes[0];
    if (!size) return;
    const color =
      product.colors[0] || { name: 'Default', hex: '#000000', image: product.images[0] };
    addToCart(product, color, size, 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsWishlistDrawerOpen(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
      />

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#D8232A]" />
            <h2 className="font-black text-base text-neutral-900 tracking-tight">
              <Bi en="My Wishlist" bn="আমার পছন্দের তালিকা" /> ({wishlist.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {wishlist.length > 0 && (
              <button
                onClick={clearWishlist}
                className="text-xs text-neutral-400 hover:text-red-600 font-semibold transition-colors mr-2 cursor-pointer"
              >
                <Bi en="Clear" bn="মুছুন" />
              </button>
            )}
            <button
              onClick={() => setIsWishlistDrawerOpen(false)}
              className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Items */}
        {wishlist.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 space-y-3">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">Your wishlist is empty</h3>
            <p className="text-xs text-neutral-500 max-w-xs">
              Tap the ♥ on any product to save it here for later.
            </p>
            <button
              onClick={() => setIsWishlistDrawerOpen(false)}
              className="mt-2 py-2.5 px-5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Bi en="Continue Shopping" bn="কেনাকাটা চালিয়ে যান" />
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
            <AnimatePresence initial={false}>
              {wishlist.map((item) => {
                const p = item.product;
                return (
                  <motion.div
                    key={item.productId}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    className="p-4 flex gap-4"
                  >
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-xl object-cover bg-neutral-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
                        {p.brand}
                      </span>
                      <h3 className="text-sm font-bold text-neutral-900 leading-snug line-clamp-1">
                        {p.name}
                      </h3>
                      <p className="text-sm font-black text-[#D8232A] mt-1">
                        {formatPrice(p.price, currency)}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleMoveToBag(p)}
                          className="flex items-center gap-1.5 py-1.5 px-3 bg-neutral-900 hover:bg-[#D8232A] text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <Bi en="Add to Bag" bn="ব্যাগে যোগ করুন" />
                        </button>
                        <button
                          onClick={() => toggleWishlist(p)}
                          title="Remove from wishlist"
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
};