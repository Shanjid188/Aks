import React, { useState } from 'react';
import { Product, ProductColor } from '../types';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import { Heart, Eye, ShoppingBag, Star, Check, SlidersHorizontal, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductCardProps {
  product: Product;
  layout?: 'grid' | 'list';
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, layout = 'grid' }) => {
  const {
    currency,
    addToCart,
    toggleWishlist,
    isInWishlist,
    toggleCompare,
    isInCompare,
    openQuickView,
    setActiveProductPage,
  } = useStore();

  const [selectedColor, setSelectedColor] = useState<ProductColor>(
    product.colors[0] || { name: 'Default', hex: '#000', image: product.images[0] }
  );
  const [isHovered, setIsHovered] = useState(false);
  const [showQuickSize, setShowQuickSize] = useState(false);

  const isFav = isInWishlist(product.id);
  const isCompared = isInCompare(product.id);

  // Handle Quick Add to Cart
  const handleQuickAdd = (sizeObj: (typeof product.sizes)[0], e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sizeObj.inStock) return;
    addToCart(product, selectedColor, sizeObj, 1);
    setShowQuickSize(false);
  };

  const handleCardClick = () => {
    setActiveProductPage(product);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Determine current display image
  const displayImage = isHovered && product.images[1] ? product.images[1] : selectedColor.image;

  if (layout === 'list') {
    return (
      <div
        onClick={handleCardClick}
        className="group bg-white rounded-2xl border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all p-4 flex flex-col sm:flex-row gap-5 cursor-pointer relative"
      >
        {/* Image Container */}
        <div className="relative w-full sm:w-56 h-56 bg-neutral-100 rounded-xl overflow-hidden shrink-0">
          <img
            src={displayImage}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.discountPercent && (
              <span className="bg-[#D8232A] text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                {product.discountPercent}% OFF
              </span>
            )}
            {product.isBestSeller && (
              <span className="bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
                Best Seller
              </span>
            )}
          </div>
        </div>

        {/* Content Info */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {product.brand}
              </span>
              <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{product.rating}</span>
                <span className="text-neutral-400 font-normal">({product.reviewsCount})</span>
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-neutral-900 mt-1 group-hover:text-[#D8232A] transition-colors">
              {product.name}
            </h3>

            <p className="text-xs text-neutral-500 mt-2 line-clamp-2 leading-relaxed">
              {product.description}
            </p>

            {product.cushionTech && (
              <div className="mt-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-[11px] font-medium text-neutral-700">
                <Sparkles className="w-3 h-3 text-[#D8232A]" />
                <span>{product.cushionTech}</span>
              </div>
            )}
          </div>

          {/* Price & Action Row */}
          <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-neutral-900">
                {formatPrice(product.price, currency)}
              </span>
              {product.originalPrice && (
                <span className="text-xs text-neutral-400 line-through">
                  {formatPrice(product.originalPrice, currency)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCompare(product);
                }}
                className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                  isCompared
                    ? 'bg-sky-50 border-sky-300 text-sky-700'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
                title="Compare"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden md:inline">{isCompared ? 'Comparing' : 'Compare'}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWishlist(product);
                }}
                className={`p-2 rounded-lg border transition-colors ${
                  isFav
                    ? 'bg-red-50 border-red-200 text-[#D8232A]'
                    : 'bg-white border-neutral-200 text-neutral-500 hover:text-[#D8232A]'
                }`}
                title="Save to Wishlist"
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-[#D8232A]' : ''}`} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openQuickView(product);
                }}
                className="px-3.5 py-2 bg-neutral-900 hover:bg-[#D8232A] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Select Size</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid Layout
  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowQuickSize(false);
      }}
      className="group bg-white rounded-2xl border border-neutral-200/90 hover:border-neutral-300 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer relative"
    >
      {/* Product Image Area */}
      <div className="relative aspect-4/3 sm:aspect-square bg-neutral-100 overflow-hidden">
        <img
          src={displayImage}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center group-hover:scale-104 transition-transform duration-500"
        />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          {product.discountPercent && (
            <span className="bg-[#D8232A] text-white text-[10px] font-black px-2 py-0.5 rounded-sm uppercase shadow-xs">
              {product.discountPercent}% OFF
            </span>
          )}
          {product.isBestSeller && (
            <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-sm uppercase shadow-xs">
              Bestseller
            </span>
          )}
          {product.isNewArrival && (
            <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-sm uppercase shadow-xs">
              New
            </span>
          )}
        </div>

        {/* Floating Quick Action Buttons */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product);
            }}
            className={`w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-all ${
              isFav
                ? 'bg-[#D8232A] text-white'
                : 'bg-white/90 backdrop-blur-md text-neutral-700 hover:text-[#D8232A] hover:bg-white'
            }`}
            title="Save to Wishlist"
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-white' : ''}`} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openQuickView(product);
            }}
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md text-neutral-700 hover:text-neutral-900 hover:bg-white shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            title="Quick View"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCompare(product);
            }}
            className={`w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 ${
              isCompared
                ? 'bg-sky-600 text-white opacity-100'
                : 'bg-white/90 backdrop-blur-md text-neutral-700 hover:text-sky-600'
            }`}
            title="Compare Specs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Add Size Overlay on Hover */}
        <div className="absolute bottom-2 left-2 right-2 z-20">
          {!showQuickSize ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowQuickSize(true);
              }}
              className="w-full py-2 px-3 bg-neutral-900/90 hover:bg-[#D8232A] text-white backdrop-blur-md rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>+ Quick Add Size</span>
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/95 backdrop-blur-md p-2 rounded-xl shadow-xl border border-neutral-200 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Select Garment Size:
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1">
                {product.sizes.map((s) => (
                  <button
                    key={s.size}
                    type="button"
                    disabled={!s.inStock}
                    onClick={(e) => handleQuickAdd(s, e)}
                    className={`px-2 py-1 rounded text-xs font-extrabold transition-all cursor-pointer ${
                      s.inStock
                        ? 'bg-neutral-100 hover:bg-[#D8232A] hover:text-white text-neutral-800'
                        : 'bg-neutral-50 text-neutral-300 line-through cursor-not-allowed'
                    }`}
                  >
                    {s.size}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Product Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand & Swatches */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
              {product.brand}
            </span>

            {/* Color swatches */}
            {product.colors.length > 1 && (
              <div className="flex items-center gap-1">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedColor(c);
                    }}
                    title={c.name}
                    className={`w-3.5 h-3.5 rounded-full border transition-all ${
                      selectedColor.name === c.name
                        ? 'ring-2 ring-[#D8232A] scale-110'
                        : 'border-neutral-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Name */}
          <h3 className="text-sm font-bold text-neutral-900 group-hover:text-[#D8232A] transition-colors line-clamp-1 leading-snug">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-neutral-500">
            <div className="flex items-center text-amber-500">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            </div>
            <span className="font-bold text-neutral-800">{product.rating}</span>
            <span className="text-neutral-400 text-[11px]">({product.reviewsCount})</span>
          </div>
        </div>

        {/* Price Row */}
        <div className="mt-3 pt-3 border-t border-neutral-100 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-black text-neutral-900">
              {formatPrice(product.price, currency)}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-neutral-400 line-through">
                {formatPrice(product.originalPrice, currency)}
              </span>
            )}
          </div>

          <span className="text-[11px] text-neutral-400 font-medium capitalize">
            {product.subcategory}
          </span>
        </div>
      </div>
    </div>
  );
};
