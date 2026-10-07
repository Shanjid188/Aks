import React, { useState } from 'react';
import { Product, ProductColor } from '../types';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import { isOutOfStock } from '../utils/stock';
import { Heart, Eye, ShoppingBag, Star, Check, Sparkles } from 'lucide-react';
import { navigate } from '../lib/router';
import { flyToCart } from '../lib/flyToCart';
import { useLocalized } from './Localized';

interface ProductCardProps {
  product: Product;
  layout?: 'grid' | 'list';
}

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
    openQuickView,
    setActiveProductPage,
  } = useStore();

  const [selectedColor, setSelectedColor] = useState<ProductColor>(
    product.colors[0] || { name: 'Default', hex: '#000', image: product.images[0] }
  );
  const [isHovered, setIsHovered] = useState(false);
  const isFav = isInWishlist(product.id);
  /** Admin → Products stock tracking: a tracked product with no units left is
   *  unbuyable (the API refuses the order), so the card says so up front. */
  const outOfStock = isOutOfStock(product);
  // Single-line bilingual copy (EN / BN) for the hover CTA.
  const t = useLocalized();

  const handleCardClick = () => {
    navigate(`/products/${product.slug}`);
  };

  // Determine current display image (never blank — always fall back to the first image)
  const displayImage =
    (isHovered && product.images[1]) || selectedColor.image || product.images[0] || '';

  // Hover CTA — replaces the old quick-add size overlay. One tap adds the
  // default in-stock size (same rule as HomeProductCard) and the product
  // image flies into the bag on the right edge, so the card never asks
  // for a size.
  const handleAddToBag = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (outOfStock) return;
    const defaultSize =
      product.sizes.find((s) => s.inStock) ||
      product.sizes[0] ||
      { size: 'One Size', inStock: true, stockCount: 0 };
    addToCart(product, selectedColor, defaultSize, 1);
    flyToCart(e.currentTarget, displayImage);
  };

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
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {outOfStock && (
              <span className="bg-neutral-900 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                Out of stock
              </span>
            )}
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
      onMouseLeave={() => setIsHovered(false)}
      className="group bg-white rounded-2xl border border-neutral-200/90 hover:border-neutral-300 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer relative"
    >
      {/* Product Image Area */}
      <div className="relative aspect-4/3 sm:aspect-square bg-neutral-100 overflow-hidden">
        <img
          src={displayImage}
          alt={product.name}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover object-center group-hover:scale-104 transition-transform duration-500"
        />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          {outOfStock && (
            <span className="bg-neutral-900 text-white text-[10px] font-black px-2 py-0.5 rounded-sm uppercase shadow-xs">
              Out of stock
            </span>
          )}
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

        {/* Floating Quick Action Buttons.
            The circles stay 32px so the card visuals are unchanged; the
            ::after pseudo-element extends the tappable area to 44px without
            affecting layout. Quick View was hover-only, which on touch
            devices left an invisible (yet still clickable) button, so it
            now stays visible below the `sm` breakpoint. */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product);
            }}
            aria-label={`Save ${product.name} to wishlist`}
            aria-pressed={isFav}
            className={`relative w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-all after:absolute after:-inset-1.5 after:content-[''] ${
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
            aria-label={`Quick view ${product.name}`}
            className="relative w-8 h-8 rounded-full bg-white/90 backdrop-blur-md text-neutral-700 hover:text-neutral-900 hover:bg-white shadow-md flex items-center justify-center transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 after:absolute after:-inset-1.5 after:content-['']"
            title="Quick View"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Hover "Add to Bag" — replaces the old quick-add size overlay: one
            tap adds the default in-stock size and the product image flies into
            the bag on the right edge. Always visible on phones (no hover
            there); hover-revealed on sm+ so the card art stays clean. */}
        <div className="absolute bottom-2 left-2 right-2 z-20">
          <button
            type="button"
            onClick={handleAddToBag}
            disabled={outOfStock}
            className="w-full py-2.5 px-3 bg-neutral-900/90 hover:bg-[#D8232A] text-white backdrop-blur-md rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-y-2 sm:group-hover:translate-y-0 disabled:cursor-not-allowed disabled:bg-neutral-500/90"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{outOfStock ? 'Out of stock' : t('Add to Bag', 'ব্যাগে যোগ করুন')}</span>
          </button>
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
        <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
          <div className="flex items-baseline gap-2 shrink-0">
            <span className="text-base font-black text-neutral-900">
              {formatPrice(product.price, currency)}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-neutral-400 line-through">
                {formatPrice(product.originalPrice, currency)}
              </span>
            )}
          </div>

          <span className="text-[11px] text-neutral-400 font-medium capitalize truncate min-w-0">
            {product.subcategory}
          </span>
        </div>
      </div>
    </div>
  );
};
