import React, { useState } from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { navigate } from '../lib/router';

interface HomeProductCardProps {
  product: Product;
}

export const HomeProductCard: React.FC<HomeProductCardProps> = ({ product }) => {
  const { currency, addToCart, toggleWishlist, isInWishlist, openQuickView } = useStore();
  const [isHovered, setIsHovered] = useState(false);

  const isFav = isInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultSize = product.sizes.find((s) => s.inStock) || product.sizes[0] || { size: 'One Size', inStock: true, stockCount: 0 };
    const defaultColor = product.colors[0] || { name: 'Default', hex: '#000000', image: product.images[0] };
    addToCart(product, defaultColor, defaultSize, 1);
  };

  const handleCardClick = () => {
    navigate(`/products/${product.slug}`);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      className="group bg-white rounded-2xl border border-neutral-200/90 hover:border-neutral-300 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer relative"
    >
      <div className="relative aspect-square bg-neutral-100 overflow-hidden">
        <img
          src={product.images[0]}
          alt={product.name}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />

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
          {product.isNewArrival && !product.isBestSeller && (
            <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-sm uppercase shadow-xs">
              New
            </span>
          )}
        </div>

        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
            {product.brand}
          </span>
          <h3 className="text-base font-bold text-neutral-900 group-hover:text-[#D8232A] transition-colors line-clamp-1 leading-snug mt-1">
            {product.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 text-sm text-neutral-500">
            <div className="flex items-center text-amber-500">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            </div>
            <span className="font-bold text-neutral-800">{product.rating}</span>
            <span className="text-neutral-400 text-xs">({product.reviewsCount})</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-neutral-900">
              {formatPrice(product.price, currency)}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-neutral-400 line-through">
                {formatPrice(product.originalPrice, currency)}
              </span>
            )}
          </div>

          <motion.button
            type="button"
            onClick={handleAddToCart}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-[#D8232A] text-white transition-colors flex items-center justify-center"
            title="Add to Cart"
          >
            <ShoppingBag className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};
