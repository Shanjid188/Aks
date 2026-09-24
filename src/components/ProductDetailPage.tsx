import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { dataLoader } from '../lib/dataLoader';
import { formatPrice } from '../utils/format';
import { ProductColor, ProductSize, Product, Review } from '../types';
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
import { Bi } from './Bi';
import { navigate, useRouter } from '../lib/router';
import { applySeo, claimSeo } from '../lib/seo';
import { useSiteContent } from '../context/SiteContentContext';

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
    addToast,
  } = useStore();

  const { path } = useRouter();
  const { storeName } = useSiteContent();

  if (!product) return null;

  const [selectedColor, setSelectedColor] = useState<ProductColor>(
    product.colors[0] || { name: 'Default', hex: '#000', image: product.images[0] }
  );
  const [selectedSize, setSelectedSize] = useState<ProductSize>(
    product.sizes.find((s) => s.inStock) || product.sizes[0] || {
      size: 'One Size',
      inStock: true,
      stockCount: 0,
    }
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews' | 'care'>('details');

  // Review Form State
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewCity, setNewReviewCity] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewTitle, setNewReviewTitle] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewFit, setNewReviewFit] = useState<'runs_small' | 'true_to_size' | 'runs_large'>('true_to_size');

  // Approved reviews for this product are fetched from the API; the context
  // list is only a warm-up/offline fallback (it covers a few seeded products).
  const [apiReviews, setApiReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setApiReviews(null);
    dataLoader.loadProductReviews(product.slug).then((list) => {
      if (!cancelled) setApiReviews(list);
    });
    return () => {
      cancelled = true;
    };
  }, [product.slug]);

  // This route owns its meta tags — see src/lib/seo.ts.
  useEffect(() => {
    claimSeo(path);
    const description = (product.description || '').replace(/\s+/g, ' ').trim();
    applySeo({
      title: `${product.name} — ${storeName}`,
      description: description.length > 300 ? `${description.slice(0, 297)}…` : description,
      image: product.images[0],
      type: 'product',
    });
  }, [product, path, storeName]);

  const isFav = isInWishlist(product.id);

  // Gallery
  const galleryImages = [
    selectedColor.image,
    ...product.images.filter((img) => img !== selectedColor.image),
  ];

  // Reviews for this product
  const productReviews = apiReviews ?? reviews.filter((r) => r.productId === product.id);
  // Related products
  const relatedProducts = products
    .filter((p) => p.id !== product.id && (p.category === product.category || p.brand === product.brand))
    .slice(0, 4);

  // Real "goes well with" picks from the same category (beyond the related grid)
  const pairsWell = relatedProducts.slice(4, 7);

  // At-a-glance highlight chips — only shown when the data actually exists
  const highlights: string[] = [];
  const fabricLabel = product.materials?.fabric || product.materials?.upper || '';
  if (fabricLabel) highlights.push(fabricLabel);
  if (product.cushionTech) highlights.push(product.cushionTech);
  if (product.pattern) highlights.push(product.pattern);
  if (product.fit) highlights.push(product.fit);

  const handleAddToCart = () => {
    addToCart(product, selectedColor, selectedSize, quantity);
    setIsCartDrawerOpen(true);
  };

  // Quick-add a real companion product to the bag
  const handleQuickAddPair = (p: Product) => {
    const color = p.colors[0] || { name: 'Default', hex: '#000', image: p.images[0] };
    const size = p.sizes.find((s) => s.inStock) || p.sizes[0] || {
      size: 'One Size',
      inStock: true,
      stockCount: 0,
    };
    addToCart(p, color, size, 1);
    addToast({
      type: 'success',
      title: 'Added to Bag',
      message: `${p.name} has been added to your shopping bag.`,
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) {
      addToast({
        type: 'warning',
        title: 'Incomplete Review',
        message: 'Please fill in your name, rating, and feedback comment.',
      });
      return;
    }
    // Stored in the database as *pending* — it shows on the storefront once an
    // admin approves it, so keep the form open if the submission fails.
    const result = await addReview({
      slug: product.slug,
      productId: product.id,
      author: newReviewAuthor.trim(),
      city: newReviewCity.trim() || 'Dhaka',
      rating: newReviewRating,
      title: newReviewTitle.trim() || 'Customer review',
      comment: newReviewComment.trim(),
      fitFeedback: newReviewFit,
    });
    if (!result.success) return;
    setShowReviewForm(false);
    setNewReviewAuthor('');
    setNewReviewTitle('');
    setNewReviewComment('');
  };

  return (
    <div className="bg-neutral-50/60 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Breadcrumbs & Back Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 text-xs text-neutral-500 font-medium">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <button
              onClick={() => navigate('/')}
              className="hover:text-[#D8232A] transition-colors cursor-pointer"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <button
              onClick={() => navigate('/products')}
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
            onClick={() => navigate('/products')}
            className="self-start sm:self-auto flex items-center gap-1.5 font-bold text-neutral-700 hover:text-[#D8232A] transition-colors cursor-pointer bg-white px-3 py-1.5 rounded-full border border-neutral-200 shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Products</span>
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
              <div className="grid grid-cols-3 gap-3 pt-5 border-t border-neutral-100 text-center text-xs">
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
                  <p className="font-extrabold text-neutral-800">100% Authentic</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">AKS Mart Certified</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100">
                  <Truck className="w-5 h-5 text-sky-600 mx-auto mb-1.5" />
                  <p className="font-extrabold text-neutral-800">Express Delivery</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">24-48h in Dhaka</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100">
                  <RotateCcw className="w-5 h-5 text-rose-600 mx-auto mb-1.5" />
                  <p className="font-extrabold text-neutral-800">Easy Returns</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">30-Day Policy</p>
                </div>
              </div>
            </div>

            {/* Right: Purchase Controls & Specs (6 cols, sticky on desktop) */}
            <div className="lg:col-span-6 lg:sticky lg:top-24 self-start">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white bg-[#D8232A] px-2.5 py-1 rounded-full">
                    {product.brand}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-full">
                    SKU {product.sku}
                  </span>
                  {product.isNewArrival && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      New Arrival
                    </span>
                  )}
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
                    ({product.reviewsCount} customer ratings)
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

                {/* At-a-glance highlight chips (only when the data exists) */}
                {highlights.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {highlights.map((h) => (
                      <div
                        key={h}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-50 border border-neutral-200 text-xs font-semibold text-neutral-700"
                      >
                        <Sparkles className="w-3 h-3 text-[#D8232A]" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                )}

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
                      Select Size: <span className="font-normal text-neutral-500">{selectedSize.size}</span>
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
                    <span><Bi en="Add to Shopping Bag" bn="ব্যাগে যোগ করুন" /></span>
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
                    navigate('/checkout');
                  }}
                  className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-extrabold text-sm rounded-2xl transition-all shadow-sm cursor-pointer"
                >
                  <span><Bi en="Buy Now (Cash on Delivery)" bn="এখনই কিনুন (ক্যাশ অন ডেলিভারি)" /></span>
                </button>
              </div>
            </div>
          </div>

          {/* Goes well with — real companion products from the same category */}
          {pairsWell.length > 0 && (
            <div className="mt-10 p-6 rounded-3xl bg-neutral-50 border border-neutral-200/80">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="text-[10px] font-black uppercase tracking-widest bg-[#D8232A] text-white px-2.5 py-1 rounded-full">
                  PAIRS WELL WITH
                </span>
                <h3 className="text-base font-black text-neutral-900 tracking-tight">
                  Complete your order
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {pairsWell.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-neutral-200 hover:border-[#D8232A]/40 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/products/${p.slug}`)}
                      className="shrink-0 cursor-pointer"
                      aria-label={`View ${p.name}`}
                    >
                      <img
                        src={p.colors[0]?.image || p.images[0]}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 object-cover rounded-xl border border-neutral-100"
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/products/${p.slug}`)}
                        className="block w-full text-left text-xs font-bold text-neutral-900 truncate hover:text-[#D8232A] transition-colors cursor-pointer"
                      >
                        {p.name}
                      </button>
                      <p className="text-xs text-[#D8232A] font-bold mt-0.5">
                        {formatPrice(p.price, currency)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickAddPair(p)}
                      title="Quick add to bag"
                      className="shrink-0 p-2 rounded-full bg-neutral-900 text-white hover:bg-[#D8232A] transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deep Tabs (Specs, Customer Reviews, Care Guidelines) */}
          <div className="mt-12 border-t border-neutral-200 pt-8">
            <div className="inline-flex flex-wrap items-center gap-1 p-1.5 rounded-2xl bg-neutral-100 border border-neutral-200">
              {([
                { id: 'details' as const, label: 'Details & Specifications', count: undefined },
                { id: 'reviews' as const, label: 'Customer Reviews', count: productReviews.length },
                { id: 'care' as const, label: 'Care & Delivery', count: undefined },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                        activeTab === tab.id
                          ? 'bg-[#D8232A] text-white'
                          : 'bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="pt-6">
              {activeTab === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-3">
                                            Key Features
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
                      Specifications
                    </h4>
                    <div className="space-y-1 text-xs text-neutral-700 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                      {([
                        ['Material', product.materials?.fabric || product.materials?.upper || ''],
                        ['Finish / Craft', product.materials?.weave || product.pattern || ''],
                        ['Best for', product.occasion || ''],
                        ['Care', product.materials?.care || ''],
                        ['SKU', product.sku],
                      ])
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <div
                            key={k}
                            className="flex justify-between gap-6 py-1.5 border-b border-neutral-200/60 last:border-b-0"
                          >
                            <span className="font-bold shrink-0">{k}</span>
                            <span className="text-neutral-600 text-right">{v}</span>
                          </div>
                        ))}
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
                        Based on {product.reviewsCount} customer ratings •{' '}
                        {productReviews.length} written{' '}
                        {productReviews.length === 1 ? 'review' : 'reviews'}
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

                  {/* Rating breakdown from real customer reviews */}
                  {productReviews.length > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-neutral-200">
                      <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-3">
                        Rating breakdown
                      </h4>
                      <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = productReviews.filter((r) => r.rating === star).length;
                          const pct = Math.round((count / productReviews.length) * 100);
                          return (
                            <div key={star} className="flex items-center gap-3">
                              <span className="w-10 text-[11px] font-bold text-neutral-500 shrink-0">
                                {star} ★
                              </span>
                              <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-amber-400 transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-8 text-[11px] font-bold text-neutral-400 text-right shrink-0">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

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
                              Your Overall Feedback:
                            </label>
                            <select
                              value={newReviewFit}
                              onChange={(e) => setNewReviewFit(e.target.value as any)}
                              className="text-xs p-2 border border-neutral-300 rounded-lg w-full"
                            >
                              <option value="true_to_size">Excellent — would buy again</option>
                              <option value="runs_small">Good value for money</option>
                              <option value="runs_large">Could be better</option>
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
                        No customer reviews yet for this product. Be the first to share your thoughts!
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'care' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="p-5 rounded-2xl bg-white border border-neutral-200">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 mb-2" />
                    <h4 className="font-bold text-xs text-neutral-900 mb-2">Care & Storage</h4>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {product.materials?.care ||
                        'Keep dry goods airtight and store in a cool, dry place away from direct sunlight. Wipe crafted & jute items with a dry cloth only.'}
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-white border border-neutral-200">
                    <Truck className="w-5 h-5 text-sky-600 mb-2" />
                    <h4 className="font-bold text-xs text-neutral-900 mb-2">Delivery Information</h4>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      Express delivery within 24-48 hours inside Dhaka, 2-4 days nationwide.
                      Cash on Delivery available all over Bangladesh.
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-white border border-neutral-200">
                    <RotateCcw className="w-5 h-5 text-rose-600 mb-2" />
                    <h4 className="font-bold text-xs text-neutral-900 mb-2">Easy Returns</h4>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      Free returns within 30 days of delivery. If anything is not right,
                      we cover the return shipping — shop happy.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related recommendations (same category / brand, real catalog data) */}
        {relatedProducts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-black text-neutral-900 tracking-tight">
                  You May Also Like
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  More picks from {product.category} and {product.brand}
                </p>
              </div>
            </div>
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
