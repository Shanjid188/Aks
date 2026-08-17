import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import { ProductColor, ProductSize } from '../types';
import {
  X,
  Star,
  ShoppingBag,
  Heart,
  Truck,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  SlidersHorizontal,
  Plus,
  Minus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ProductDetailModal: React.FC = () => {
  const {
    isQuickViewOpen,
    closeQuickView,
    quickViewProduct: product,
    currency,
    addToCart,
    toggleWishlist,
    isInWishlist,
    setIsCartDrawerOpen,
    setIsSizeGuideOpen,
    setIsCheckoutOpen,
    setActiveProductPage,
  } = useStore();

  if (!isQuickViewOpen || !product) return null;

  const [selectedColor, setSelectedColor] = useState<ProductColor>(
    product.colors[0] || { name: 'Default', hex: '#000', image: product.images[0] }
  );
  const [selectedSize, setSelectedSize] = useState<ProductSize>(
    product.sizes.find((s) => s.inStock) || product.sizes[0]
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const isFav = isInWishlist(product.id);

  // Determine current image pool
  const galleryImages = [
    selectedColor.image,
    ...product.images.filter((img) => img !== selectedColor.image),
  ];

  const handleAddToCart = () => {
    addToCart(product, selectedColor, selectedSize, quantity);
    closeQuickView();
    setIsCartDrawerOpen(true);
  };

  const handleBuyNow = () => {
    addToCart(product, selectedColor, selectedSize, quantity);
    closeQuickView();
    setIsCheckoutOpen(true);
  };

  const handleViewFullPage = () => {
    setActiveProductPage(product);
    closeQuickView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeQuickView}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden z-10 my-auto max-h-[92vh] flex flex-col md:flex-row"
      >
        {/* Close Button */}
        <button
          onClick={closeQuickView}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/80 hover:bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 transition-colors shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: Image Gallery */}
        <div className="w-full md:w-1/2 p-6 bg-neutral-50 flex flex-col justify-between border-b md:border-b-0 md:border-r border-neutral-200">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-neutral-200 shadow-xs mb-4">
            <img
              src={galleryImages[activeImageIndex] || selectedColor.image}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
            />
            {product.discountPercent && (
              <span className="absolute top-3 left-3 bg-[#D8232A] text-white text-xs font-black px-2.5 py-1 rounded uppercase shadow-sm">
                {product.discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Thumbnails */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  activeImageIndex === idx
                    ? 'border-[#D8232A] shadow-md scale-105'
                    : 'border-neutral-200 opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={img}
                  alt="thumbnail"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Product Details & Purchase Form */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto max-h-[85vh]">
          <div>
            {/* Brand & SKU */}
            <div className="flex items-center justify-between text-xs text-neutral-400 font-bold uppercase tracking-wider mb-1">
              <span>{product.brand}</span>
              <span>SKU: {product.sku}</span>
            </div>

            {/* Product Title */}
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight leading-tight">
              {product.name}
            </h2>

            {/* Rating & Reviews */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(product.rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-neutral-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-neutral-800">{product.rating}</span>
              <span className="text-xs text-neutral-400">({product.reviewsCount} verified reviews)</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-2xl sm:text-3xl font-black text-neutral-900">
                {formatPrice(product.price, currency)}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-neutral-400 line-through font-semibold">
                  {formatPrice(product.originalPrice, currency)}
                </span>
              )}
              {product.discountPercent && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Save {formatPrice(product.originalPrice! - product.price, currency)}
                </span>
              )}
            </div>

            {/* Colorways */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-neutral-700">
                  Colorway: <span className="font-normal text-neutral-500">{selectedColor.name}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => {
                      setSelectedColor(c);
                      setActiveImageIndex(0);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                      selectedColor.name === c.name
                        ? 'border-[#D8232A] bg-red-50/50 text-neutral-900 shadow-xs'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: c.hex }} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selector */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-neutral-700">
                  Select Size: <span className="font-normal text-neutral-500">{selectedSize.size}</span>
                </span>
                <button
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="text-xs font-bold text-[#D8232A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3 h-3" /> Size Guide & Fit Calculator
                </button>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {product.sizes.map((s) => (
                  <button
                    key={s.size}
                    disabled={!s.inStock}
                    onClick={() => setSelectedSize(s)}
                    className={`py-2 px-1 rounded-xl text-xs font-extrabold transition-all border text-center cursor-pointer ${
                      selectedSize.size === s.size
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                        : s.inStock
                        ? 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-400'
                        : 'bg-neutral-100 text-neutral-300 border-neutral-200 line-through cursor-not-allowed'
                    }`}
                  >
                    {s.size}
                  </button>
                ))}
              </div>

              {/* Stock Warning */}
              {selectedSize.stockCount && selectedSize.stockCount < 10 && (
                <p className="text-[11px] font-semibold text-amber-600 mt-2">
                  ⚡ Only {selectedSize.stockCount} pieces left in boutique inventory!
                </p>
              )}
            </div>

            {/* Quantity Stepper */}
            <div className="mt-5 flex items-center gap-4">
              <span className="text-xs font-bold text-neutral-700">Quantity:</span>
              <div className="flex items-center border border-neutral-200 rounded-xl bg-neutral-50 p-1">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-1 rounded-lg hover:bg-white text-neutral-600 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-xs font-extrabold text-neutral-900">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="p-1 rounded-lg hover:bg-white text-neutral-600 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t border-neutral-100 space-y-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddToCart}
                className="flex-1 py-3.5 px-4 bg-[#D8232A] hover:bg-[#b51c22] text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Shopping Bag</span>
              </button>

              <button
                onClick={() => toggleWishlist(product)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isFav
                    ? 'bg-red-50 border-red-200 text-[#D8232A]'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:text-[#D8232A]'
                }`}
                title="Wishlist"
              >
                <Heart className={`w-5 h-5 ${isFav ? 'fill-[#D8232A]' : ''}`} />
              </button>
            </div>

            <button
              onClick={handleBuyNow}
              className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Instant Buy Now (bKash / COD)
            </button>

            <button
              onClick={handleViewFullPage}
              className="w-full text-center text-xs font-bold text-neutral-500 hover:text-[#D8232A] pt-1 flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>View Full Specs, Reviews & Care Tips</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
