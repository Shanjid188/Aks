import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import { ProductColor, ProductSize } from '../types';
import { ProductCard } from './ProductCard';
import {
  Star,
  ShoppingBag,
  Heart,
  Truck,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  Plus,
  Minus,
  CheckCircle2,
  MessageSquarePlus,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ProductDetailPage: React.FC = () => {
  const {
    activeProductPage: product,
    setActiveProductPage,
    products,
    reviews,
    addReview,
    currency,
    addToCart,
    toggleWishlist,
    isInWishlist,
    setIsCartDrawerOpen,
    setIsSizeGuideOpen,
    setIsCheckoutOpen,
    addToast,
  } = useStore();

  if (!product) return null;

  const [selectedColor, setSelectedColor] = useState<ProductColor>(
    product.colors[0] || { name: 'Default', hex: '#000', image: product.images[0] }
  );
  const [selectedSize, setSelectedSize] = useState<ProductSize>(
    product.sizes.find((s) => s.inStock) || product.sizes[0]
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews' | 'care'>('details');

  // Bundle Add-on State (Stole & Cufflinks)
  const [bundleIncluded, setBundleIncluded] = useState<{ stole: boolean; accessory: boolean }>({
    stole: true,
    accessory: true,
  });

  // Review Form State
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewCity, setNewReviewCity] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewTitle, setNewReviewTitle] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewFit, setNewReviewFit] = useState<'runs_small' | 'true_to_size' | 'runs_large'>('true_to_size');

  const isFav = isInWishlist(product.id);

  // Gallery
  const galleryImages = [
    selectedColor.image,
    ...product.images.filter((img) => img !== selectedColor.image),
  ];

  // Reviews for this product
  const productReviews = reviews.filter((r) => r.productId === product.id);

  // Related products
  const relatedProducts = products
    .filter((p) => p.id !== product.id && (p.category === product.category || p.brand === product.brand))
    .slice(0, 4);

  // Bundle pricing
  const stolePrice = 1450;
  const accessoryPrice = 850;
  const bundleDiscountPercent = 10;
  let bundleSubtotal = product.price;
  if (bundleIncluded.stole) bundleSubtotal += stolePrice;
  if (bundleIncluded.accessory) bundleSubtotal += accessoryPrice;
  const bundleTotal = Math.round(bundleSubtotal * (1 - bundleDiscountPercent / 100));

  const handleAddToCart = () => {
    addToCart(product, selectedColor, selectedSize, quantity);
    setIsCartDrawerOpen(true);
  };

  const handleAddBundleToCart = () => {
    // Add main product
    addToCart(product, selectedColor, selectedSize, 1);
    // Add bundle items if found
    const stoleProd = products.find((p) => p.id === 'prod-acc-01');
    const accProd = products.find((p) => p.id === 'prod-acc-02');
    if (bundleIncluded.stole && stoleProd) {
      addToCart(stoleProd, stoleProd.colors[0], stoleProd.sizes[0], 1);
    }
    if (bundleIncluded.accessory && accProd) {
      addToCart(accProd, accProd.colors[0], accProd.sizes[0], 1);
    }
    addToast({
      type: 'success',
      title: 'Ensemble Added to Bag!',
      message: 'Complete Festive Ensemble & Matching Accents added with 10% combo discount.',
    });
    setIsCartDrawerOpen(true);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) {
      addToast({
        type: 'warning',
        title: 'Incomplete Review',
        message: 'Please fill in your name, rating, and feedback comment.',
      });
      return;
    }
    addReview({
      productId: product.id,
      author: newReviewAuthor.trim(),
      city: newReviewCity.trim() || 'Dhaka',
      rating: newReviewRating,
      title: newReviewTitle.trim() || 'Verified AKS Garments Purchase',
      comment: newReviewComment.trim(),
      verified: true,
      fitFeedback: newReviewFit,
    });
    setShowReviewForm(false);
    setNewReviewAuthor('');
    setNewReviewTitle('');
    setNewReviewComment('');
  };

  return (
    <div className="bg-neutral-50/60 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Breadcrumbs & Back Navigation */}
        <div className="flex items-center justify-between mb-6 text-xs text-neutral-500 font-medium">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveProductPage(null)}
              className="hover:text-[#D8232A] transition-colors cursor-pointer"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <button
              onClick={() => setActiveProductPage(null)}
              className="hover:text-[#D8232A] transition-colors capitalize cursor-pointer"
            >
              {product.category}
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-neutral-400 capitalize">{product.subcategory}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-neutral-900 font-bold truncate max-w-xs">{product.name}</span>
          </div>

          <button
            onClick={() => setActiveProductPage(null)}
            className="flex items-center gap-1.5 font-bold text-neutral-700 hover:text-[#D8232A] transition-colors cursor-pointer bg-white px-3 py-1.5 rounded-full border border-neutral-200 shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Collection</span>
          </button>
        </div>

        {/* Main Product Presentation Card */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-md p-6 sm:p-10 mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left: Gallery (6 cols) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="relative aspect-4/3 sm:aspect-[4/5] bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-200 shadow-xs">
                <img
                  src={galleryImages[activeImageIndex] || selectedColor.image}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center"
                />

                {product.discountPercent && (
                  <span className="absolute top-4 left-4 bg-[#D8232A] text-white text-xs font-black px-3 py-1 rounded-sm uppercase shadow-sm">
                    {product.discountPercent}% OFF
                  </span>
                )}
                {product.isBestSeller && (
                  <span className="absolute top-4 right-4 bg-amber-500 text-white text-xs font-black px-3 py-1 rounded-sm uppercase shadow-sm">
                    Bestseller
                  </span>
                )}
              </div>

              {/* Thumbnails */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      activeImageIndex === idx
                        ? 'border-[#D8232A] shadow-md scale-105'
                        : 'border-neutral-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt="view"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* Trust highlights */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-neutral-100 text-center text-xs">
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <p className="font-bold text-neutral-800">100% Authentic</p>
                  <p className="text-[10px] text-neutral-400">AKS Atelier Certified</p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                  <Truck className="w-5 h-5 text-sky-600 mx-auto mb-1" />
                  <p className="font-bold text-neutral-800">Express Delivery</p>
                  <p className="text-[10px] text-neutral-400">24-48h in Dhaka</p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                  <RotateCcw className="w-5 h-5 text-rose-600 mx-auto mb-1" />
                  <p className="font-bold text-neutral-800">Bespoke Alterations</p>
                  <p className="text-[10px] text-neutral-400">At Any AKS Boutique</p>
                </div>
              </div>
            </div>

            {/* Right: Purchase Controls & Specs (6 cols) */}
            <div className="lg:col-span-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-neutral-400 font-bold uppercase tracking-wider mb-2">
                  <span className="text-[#D8232A] font-black">{product.brand}</span>
                  <span>SKU: {product.sku}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-neutral-900 tracking-tight leading-tight">
                  {product.name}
                </h1>

                {/* Rating Bar */}
                <div className="flex items-center gap-3 mt-3">
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
                  <span className="text-sm font-bold text-neutral-900">{product.rating}</span>
                  <span className="text-xs text-neutral-400">
                    ({product.reviewsCount} verified customer ratings)
                  </span>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline gap-3 mt-5 pb-5 border-b border-neutral-100">
                  <span className="text-3xl sm:text-4xl font-black text-neutral-900">
                    {formatPrice(product.price, currency)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-base text-neutral-400 line-through font-semibold">
                      {formatPrice(product.originalPrice, currency)}
                    </span>
                  )}
                  {product.discountPercent && (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                      Save {formatPrice(product.originalPrice! - product.price, currency)}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-neutral-600 leading-relaxed mt-4">
                  {product.description}
                </p>

                {/* Fabric & Fit Pill */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/60 text-xs font-bold text-amber-900">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Fabric: {product.materials.fabric || product.materials.upper}</span>
                  </div>
                  {product.fit && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 text-xs font-bold text-neutral-800">
                      <span>Cut: {product.fit}</span>
                    </div>
                  )}
                </div>

                {/* Colorway Picker */}
                <div className="mt-6">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-neutral-800">
                      Colorway: <span className="font-normal text-neutral-500">{selectedColor.name}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {product.colors.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => {
                          setSelectedColor(c);
                          setActiveImageIndex(0);
                        }}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          selectedColor.name === c.name
                            ? 'border-[#D8232A] bg-red-50 text-neutral-900 shadow-xs'
                            : 'border-neutral-200 text-neutral-700 hover:border-neutral-300'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full border shadow-2xs" style={{ backgroundColor: c.hex }} />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size Selector */}
                <div className="mt-6">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-neutral-800">
                      Select Garment Size: <span className="font-normal text-neutral-500">{selectedSize.size}</span>
                    </span>
                    <button
                      onClick={() => setIsSizeGuideOpen(true)}
                      className="text-xs font-bold text-[#D8232A] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" /> AKS Tailoring & Fit Guide
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {product.sizes.map((s) => (
                      <button
                        key={s.size}
                        disabled={!s.inStock}
                        onClick={() => setSelectedSize(s)}
                        className={`py-3 rounded-xl text-xs font-black transition-all border text-center cursor-pointer ${
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

                  {selectedSize.stockCount && selectedSize.stockCount < 10 && (
                    <p className="text-xs font-bold text-amber-600 mt-2 flex items-center gap-1">
                      <span>⚡ Only {selectedSize.stockCount} pieces left in size {selectedSize.size}!</span>
                    </p>
                  )}
                </div>

                {/* Quantity */}
                <div className="mt-6 flex items-center gap-4">
                  <span className="text-xs font-bold text-neutral-700">Quantity:</span>
                  <div className="flex items-center border border-neutral-300 rounded-xl bg-white p-1">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-black text-neutral-900">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="mt-8 pt-6 border-t border-neutral-100 space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 py-4 px-6 bg-[#D8232A] hover:bg-[#b51c22] text-white font-extrabold text-base rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    <span>Add to Shopping Bag</span>
                  </button>

                  <button
                    onClick={() => toggleWishlist(product)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isFav
                        ? 'bg-red-50 border-red-200 text-[#D8232A]'
                        : 'bg-white border-neutral-300 text-neutral-600 hover:text-[#D8232A]'
                    }`}
                    title="Save to Wishlist"
                  >
                    <Heart className={`w-6 h-6 ${isFav ? 'fill-[#D8232A]' : ''}`} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    addToCart(product, selectedColor, selectedSize, quantity);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-extrabold text-sm rounded-2xl transition-all shadow-sm cursor-pointer"
                >
                  Instant Buy (bKash / Cash on Delivery)
                </button>
              </div>
            </div>
          </div>

          {/* "Frequently Bought Together" Bundle Box */}
          <div className="mt-12 p-6 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                  COMPLETE THE LOOK
                </span>
                <h3 className="text-base font-black text-neutral-900 tracking-tight">
                  Frequently Styled Together
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-700">Save 10% on Ensemble</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Bundle items list (8 cols) */}
              <div className="md:col-span-8 flex flex-col sm:flex-row items-center gap-4">
                {/* Main Product */}
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-neutral-200 flex-1 w-full">
                  <img
                    src={selectedColor.image}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 object-cover rounded-lg border shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-900 truncate">{product.name}</p>
                    <p className="text-xs text-[#D8232A] font-bold mt-0.5">
                      {formatPrice(product.price, currency)}
                    </p>
                  </div>
                </div>

                <Plus className="w-5 h-5 text-neutral-400 shrink-0 hidden sm:block" />

                {/* Stole / Shawl */}
                <label className="flex items-center gap-3 bg-white p-3 rounded-xl border border-neutral-200 flex-1 w-full cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bundleIncluded.stole}
                    onChange={(e) =>
                      setBundleIncluded((prev) => ({ ...prev, stole: e.target.checked }))
                    }
                    className="rounded text-[#D8232A] focus:ring-[#D8232A]"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-900 truncate">AKS Handloom Silk Stole</p>
                    <p className="text-xs text-neutral-500 font-semibold mt-0.5">
                      {formatPrice(stolePrice, currency)}
                    </p>
                  </div>
                </label>

                <Plus className="w-5 h-5 text-neutral-400 shrink-0 hidden sm:block" />

                {/* Cufflinks / Brooch */}
                <label className="flex items-center gap-3 bg-white p-3 rounded-xl border border-neutral-200 flex-1 w-full cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bundleIncluded.accessory}
                    onChange={(e) =>
                      setBundleIncluded((prev) => ({ ...prev, accessory: e.target.checked }))
                    }
                    className="rounded text-[#D8232A] focus:ring-[#D8232A]"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-900 truncate">Brass Brooch & Cufflink Set</p>
                    <p className="text-xs text-neutral-500 font-semibold mt-0.5">
                      {formatPrice(accessoryPrice, currency)}
                    </p>
                  </div>
                </label>
              </div>

              {/* Bundle Checkout (4 cols) */}
              <div className="md:col-span-4 bg-white p-4 rounded-xl border border-neutral-200 text-center sm:text-right">
                <div className="text-xs text-neutral-500">Combo Total:</div>
                <div className="text-xl font-black text-neutral-900 mt-0.5">
                  {formatPrice(bundleTotal, currency)}
                  <span className="text-xs text-neutral-400 line-through ml-2 font-normal">
                    {formatPrice(bundleSubtotal, currency)}
                  </span>
                </div>
                <button
                  onClick={handleAddBundleToCart}
                  className="mt-2.5 w-full py-2 px-4 bg-neutral-900 hover:bg-[#D8232A] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Add Ensemble to Bag
                </button>
              </div>
            </div>
          </div>

          {/* Deep Tabs (Specs, Customer Reviews, Care Guidelines) */}
          <div className="mt-12 border-t border-neutral-200 pt-8">
            <div className="flex items-center gap-4 border-b border-neutral-200 pb-2">
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-2 text-sm font-extrabold transition-all cursor-pointer ${
                  activeTab === 'details'
                    ? 'text-[#D8232A] border-b-2 border-[#D8232A]'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Garment Specifications & Craft
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`pb-2 text-sm font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'reviews'
                    ? 'text-[#D8232A] border-b-2 border-[#D8232A]'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <span>Customer Reviews</span>
                <span className="text-xs bg-neutral-200 px-2 py-0.5 rounded-full font-bold">
                  {productReviews.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('care')}
                className={`pb-2 text-sm font-extrabold transition-all cursor-pointer ${
                  activeTab === 'care'
                    ? 'text-[#D8232A] border-b-2 border-[#D8232A]'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Fabric Care & Alterations
              </button>
            </div>

            <div className="pt-6">
              {activeTab === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-3">
                      Atelier Craft Details
                    </h4>
                    <ul className="space-y-2 text-xs text-neutral-700">
                      {product.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-3">
                      Fabric & Tailoring Specifications
                    </h4>
                    <div className="space-y-2 text-xs text-neutral-700 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                      <div className="flex justify-between py-1 border-b border-neutral-200/60">
                        <span className="font-bold">Fabric Composition</span>
                        <span className="text-neutral-600">{product.materials.fabric || product.materials.upper}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60">
                        <span className="font-bold">Weave & Finish</span>
                        <span className="text-neutral-600">{product.materials.weave || product.pattern || 'Jacquard / 2-Ply'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60">
                        <span className="font-bold">Tailored Fit</span>
                        <span className="text-neutral-600">{product.fit || 'Regular Fit'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-200/60">
                        <span className="font-bold">Collar / Neck Style</span>
                        <span className="text-neutral-600">{product.collar || 'Mandarin / Band Collar'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="font-bold">Occasion</span>
                        <span className="text-neutral-600">{product.occasion}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  {/* Reviews Header & CTA */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-neutral-900">{product.rating}</span>
                        <div className="flex items-center text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Based on {product.reviewsCount} customer ratings • 98% true to size
                      </p>
                    </div>

                    <button
                      onClick={() => setShowReviewForm(!showReviewForm)}
                      className="px-5 py-2.5 bg-neutral-900 hover:bg-[#D8232A] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquarePlus className="w-4 h-4" />
                      <span>Write a Review</span>
                    </button>
                  </div>

                  {/* Review Submission Form */}
                  <AnimatePresence>
                    {showReviewForm && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleReviewSubmit}
                        className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4"
                      >
                        <h4 className="font-bold text-sm text-neutral-900">
                          Share Your Experience with {product.name}
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-neutral-700 mb-1">
                              Your Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={newReviewAuthor}
                              onChange={(e) => setNewReviewAuthor(e.target.value)}
                              placeholder="e.g. Asif Karim"
                              className="w-full text-xs p-2.5 border border-neutral-300 rounded-lg outline-none focus:border-[#D8232A]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-neutral-700 mb-1">
                              Your City (e.g. Gulshan, Dhaka)
                            </label>
                            <input
                              type="text"
                              value={newReviewCity}
                              onChange={(e) => setNewReviewCity(e.target.value)}
                              placeholder="e.g. Banani, Dhaka"
                              className="w-full text-xs p-2.5 border border-neutral-300 rounded-lg outline-none focus:border-[#D8232A]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-neutral-700 mb-1">
                              Rating:
                            </label>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setNewReviewRating(star)}
                                  className="p-1 cursor-pointer"
                                >
                                  <Star
                                    className={`w-5 h-5 ${
                                      star <= newReviewRating
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-neutral-300'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-neutral-700 mb-1">
                              Fit Assessment:
                            </label>
                            <select
                              value={newReviewFit}
                              onChange={(e) => setNewReviewFit(e.target.value as any)}
                              className="text-xs p-2 border border-neutral-300 rounded-lg w-full"
                            >
                              <option value="true_to_size">True to Size (Tailored Fit)</option>
                              <option value="runs_small">Runs Slightly Small</option>
                              <option value="runs_large">Relaxed / Loose Fit</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 mb-1">
                            Review Title
                          </label>
                          <input
                            type="text"
                            value={newReviewTitle}
                            onChange={(e) => setNewReviewTitle(e.target.value)}
                            placeholder="e.g. Exceptional fabric quality and stitching!"
                            className="w-full text-xs p-2.5 border border-neutral-300 rounded-lg outline-none focus:border-[#D8232A]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 mb-1">
                            Detailed Review *
                          </label>
                          <textarea
                            required
                            rows={3}
                            value={newReviewComment}
                            onChange={(e) => setNewReviewComment(e.target.value)}
                            placeholder="How is the fabric drape, embroidery detail, and comfort during wear?"
                            className="w-full text-xs p-2.5 border border-neutral-300 rounded-lg outline-none focus:border-[#D8232A]"
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowReviewForm(false)}
                            className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 bg-[#D8232A] text-white text-xs font-bold rounded-lg hover:bg-[#b51c22] cursor-pointer"
                          >
                            Submit Review
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Reviews List */}
                  <div className="space-y-4">
                    {productReviews.length > 0 ? (
                      productReviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-neutral-900">{rev.author}</span>
                              <span className="text-[11px] text-neutral-400">• {rev.city}</span>
                              {rev.verified && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                  <CheckCircle2 className="w-3 h-3" /> Verified Buyer
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-neutral-400">{rev.date}</span>
                          </div>

                          <div className="flex items-center gap-1 text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'
                                }`}
                              />
                            ))}
                          </div>

                          <h5 className="font-bold text-xs text-neutral-900">{rev.title}</h5>
                          <p className="text-xs text-neutral-600 leading-relaxed">{rev.comment}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-neutral-500 text-center py-6">
                        No customer reviews yet for this garment. Be the first to share your thoughts!
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'care' && (
                <div className="space-y-4 text-xs text-neutral-700 bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
                  <h4 className="font-bold text-sm text-neutral-900">
                    AKS Garments Artisanal Care & Fabric Preservation Guide
                  </h4>
                  <ul className="space-y-2 list-disc list-inside text-neutral-600 leading-relaxed">
                    <li>For pure silk, raw silk, and Jamdani handloom ensembles: Professional dry clean only.</li>
                    <li>For 100% Egyptian cotton and formal shirts: Machine wash cold with mild detergent, hang dry inside out in the shade.</li>
                    <li>Steam iron on medium setting for crisp finishes; avoid direct high-heat iron over metallic zari embroidery.</li>
                    <li>Complimentary bespoke tailoring and alterations are provided within 30 days of purchase at any AKS Boutique.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Garments Recommendations */}
        {relatedProducts.length > 0 && (
          <div className="mb-12">
            <h3 className="text-xl font-black text-neutral-900 mb-6">
              Complete Your Wardrobe with Related Garments
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
