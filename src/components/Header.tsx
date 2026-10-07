import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { useSiteContent } from '../context/SiteContentContext';
import { formatPrice } from '../utils/format';
import { CategoryType } from '../types';
import Logo from './Logo';
import {
  Search,
  ShoppingBag,
  Heart,
  Sparkles,
  Truck,
  RotateCcw,
  SlidersHorizontal,
  Menu,
  X,
  ChevronDown,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_ANNOUNCEMENTS } from '../data/promos';
import type { Announcement } from '../data/promos';
import { dataLoader } from '../lib/dataLoader';
import { Bi } from './Bi';
import { Link, navigate } from '../lib/router';
import { useLanguage } from '../context/LanguageContext';
import { useLocalized } from './Localized';

/** Icon cycle for the announcement ticker — DB announcements carry no icon,
 *  so the header rotates through a small curated set. */
const ANNOUNCEMENT_ICONS = [
  <Truck className="w-3.5 h-3.5" key="truck" />,
  <Sparkles className="w-3.5 h-3.5" key="sparkles" />,
  <ShieldCheck className="w-3.5 h-3.5" key="shield" />,
];


export const Header: React.FC = () => {
  const { content, trendingSearches } = useSiteContent();
  const {
    cart,
    wishlist,
    cartSubtotal,
    currency,
    setCurrency,
    setIsCartDrawerOpen,
    setIsWishlistDrawerOpen,
    setIsSizeGuideOpen,
    filters,
    setFilters,
    products,
    categories,
    subcategoriesFor,
    openQuickView,
    setActiveProductPage,
    // Mobile bottom bar ↔ header bridge (shared Menu drawer + search focus).
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    mobileSearchFocusNonce,
  } = useStore();

  const { language, setLanguage } = useLanguage();
  // Header copy follows the shopper's language (Admin → Storefront → Homepage).
  const t = useLocalized();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  // Search boxes the bottom bar's Search tab can hand focus to. Which one is
  // on screen depends on the breakpoint: the compact bar lives below md, the
  // full search box from md up (the bottom bar itself stops at lg).
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const desktopSearchRef = useRef<HTMLInputElement>(null);

  // Announcements scroll continuously — DB-driven; hardcoded strings remain as offline fallback.
  const [announcements, setAnnouncements] = useState<Announcement[]>(DEFAULT_ANNOUNCEMENTS);

  // Load active announcements from the API (falls back to the bundled strings).
  useEffect(() => {
    let cancelled = false;
    dataLoader.loadAnnouncements().then((loaded) => {
      if (!cancelled && loaded.length > 0) setAnnouncements(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Click outside to close search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Bottom bar → Search tab: the header sits above the fold, so scroll back to
  // the top first, then focus whichever search box is actually visible at this
  // width. `preventScroll` keeps the focus from fighting the smooth scroll.
  // The nonce starts at 0 and only ever increases, so every tap re-runs this.
  useEffect(() => {
    if (mobileSearchFocusNonce === 0) return undefined;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const timer = window.setTimeout(() => {
      const compact = mobileSearchRef.current;
      const target = compact && compact.offsetParent !== null ? compact : desktopSearchRef.current;
      target?.focus({ preventScroll: true });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [mobileSearchFocusNonce]);

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Filtered search results
  const searchResults = searchQuery.trim()
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.subcategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .slice(0, 5)
    : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setFilters((prev) => ({
        ...prev,
        searchQuery: searchQuery.trim(),
        category: 'all',
        subcategory: 'All',
      }));
      setIsSearchFocused(false);
      setIsMobileMenuOpen(false);
      navigate('/products');
    }
  };

  const handleSelectCategory = (cat: CategoryType, sub = 'All') => {
    setActiveProductPage(null);
    setFilters((prev) => ({
      ...prev,
      category: cat,
      subcategory: sub,
      searchQuery: '',
      brand: [],
    }));
    setActiveMegaMenu(null);
    setIsMobileMenuOpen(false);
    navigate('/products');
  };

  const handleSelectBrand = (brandName: string) => {
    setActiveProductPage(null);
    setFilters((prev) => ({
      ...prev,
      category: 'all',
      subcategory: 'All',
      brand: [brandName],
      searchQuery: '',
    }));
    setActiveMegaMenu(null);
    setIsMobileMenuOpen(false);
    navigate('/products');
  };

  return (
    <>
      <header>
        {/* Top Utility Announcement Bar */}
        <div className="bg-neutral-900 text-white text-[10px] py-0.5 px-4 border-b border-neutral-800/50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1">
            {/* Scrolling ticker — every message follows the previous one, side to side */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <div
                key={language}
                className="marquee-track flex w-max items-center gap-10 pr-10 font-medium tracking-wide"
                style={{ animationDuration: `${Math.max(announcements.length * 5, 15)}s` }}
              >
                {[...announcements, ...announcements].map((a, i) => (
                  <span key={i} className="flex items-center gap-2 whitespace-nowrap">
                    <span className="inline-flex items-center justify-center p-0.5 rounded bg-[#D8232A] text-white text-[10px]">
                      {ANNOUNCEMENT_ICONS[i % ANNOUNCEMENT_ICONS.length]}
                    </span>
                    <span className="text-neutral-200">
                      {language === 'bn' && a.textBn ? a.textBn : a.text}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Brand Bar (logo + search + actions) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-neutral-700 hover:bg-neutral-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* AKS Mart brand mark → home. Premium lockup: the photographic logo
                sits in a brand-gradient tile with a soft halo, beside a two-tone
                wordmark (dark "AKS" + brand-red "MART", matching the invoices)
                and a wide-tracked tagline. */}
            <Link
              to="/"
              onClick={() => {
                setActiveProductPage(null);
                setFilters((prev) => ({ ...prev, category: 'all', subcategory: 'All', searchQuery: '', brand: [] }));
              }}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none"
            >
              <span className="relative shrink-0">
                {/* soft brand halo — fades in on hover */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-1 rounded-2xl bg-[#D8232A]/25 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100"
                />
                {/* gradient ring keeps the photographic JPG logo crisp and intentional */}
                <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D8232A] via-[#B91C1C] to-[#7F1D1D] p-[2px] shadow-[0_4px_14px_-6px_rgba(216,35,42,0.6)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.03]">
                  <Logo className="h-full w-full rounded-[14px] bg-white object-cover" />
                </span>
              </span>
              {/* Wordmark: the store NAME sits beside the logo at every width —
                it used to be hidden below `sm`, which left phones showing a bare
                logo with no idea what the shop was called. */}
            <div className="flex min-w-0 flex-col justify-center">
              <span className="truncate text-[13px] font-extrabold uppercase leading-none tracking-[0.13em] text-neutral-900 sm:text-[15px]">
                AKS{' '}
                <span className="text-[#D8232A] transition-colors duration-300 group-hover:text-[#B91C1C]">MART</span>
              </span>
              <span className="mt-1 hidden text-[9px] font-semibold uppercase leading-none tracking-[0.18em] text-neutral-400 transition-colors duration-300 md:block group-hover:text-neutral-500">
                One Mart. Many Choices.
              </span>
            </div>
            </Link>

            {/* Smart Live Search Bar */}
            <div ref={searchRef} className="relative flex-1 max-w-lg hidden md:block">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  ref={desktopSearchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder={t(content.headerSearchPlaceholder, content.headerSearchPlaceholderBn)}
                  className="w-full pl-10 pr-24 py-2.5 bg-white hover:bg-neutral-50 focus:bg-white text-sm text-neutral-900 placeholder:text-neutral-400 rounded-xl border-2 border-neutral-200 focus:border-[#D8232A] focus:ring-2 focus:ring-[#D8232A]/20 transition-all outline-none leading-none"
                />
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-20 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-xs p-1 leading-none"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#D8232A] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#b51c22] transition-colors"
                >
                  Search
                </button>
              </form>

              {/* Autocomplete dropdown */}
              <AnimatePresence>
                {isSearchFocused && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-neutral-100 p-4 z-50 overflow-hidden"
                  >
                    {searchQuery.trim() ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                            Matching products ({searchResults.length})
                          </span>
                          <button
                            onClick={handleSearchSubmit}
                            className="text-xs font-semibold text-[#D8232A] hover:underline flex items-center gap-1"
                          >
                            View all matches <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>

                        {searchResults.length > 0 ? (
                          <div className="divide-y divide-neutral-100">
                            {searchResults.map((product) => (
                              <div
                                key={product.id}
                                onClick={() => {
                                  openQuickView(product);
                                  setIsSearchFocused(false);
                                }}
                                className="py-2.5 px-2 rounded-lg hover:bg-neutral-50 flex items-center gap-3 cursor-pointer transition-colors"
                              >
                                <img
                                  src={product.colors[0]?.image || product.images[0]}
                                  alt={product.name}
                                  referrerPolicy="no-referrer"
                                  className="w-12 h-12 object-cover rounded-lg border border-neutral-200 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                    {product.brand}
                                  </p>
                                  <p className="text-sm font-semibold text-neutral-900 truncate">
                                    {product.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs font-bold text-[#D8232A]">
                                      {formatPrice(product.price, currency)}
                                    </span>
                                    {product.originalPrice && (
                                      <span className="text-[11px] text-neutral-400 line-through">
                                        {formatPrice(product.originalPrice, currency)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-6 text-center text-neutral-500 text-sm">
                            No exact products found for "{searchQuery}". Try exploring our collections!
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="mb-3">
                          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                            {t(content.headerTrendingLabel, content.headerTrendingLabelBn)}
                          </span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {trendingSearches.map((kw) => (
                              <button
                                key={kw}
                                onClick={() => {
                                  setSearchQuery(kw);
                                  setFilters((prev) => ({ ...prev, searchQuery: kw, category: 'all', subcategory: 'All' }));
                                  setIsSearchFocused(false);
                                }}
                                className="text-xs bg-neutral-100 hover:bg-[#D8232A]/10 hover:text-[#D8232A] text-neutral-700 px-3 py-1.5 rounded-full font-medium transition-colors"
                              >
                                {kw}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-neutral-100 pt-3 flex items-center justify-between text-xs text-neutral-500">
                          <span className="flex items-center gap-1 text-emerald-700 font-medium">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Quality checked products from every AKS Mart division
                          </span>
                          <button
                            onClick={() => {
                              setIsSizeGuideOpen(true);
                              setIsSearchFocused(false);
                            }}
                            className="text-[#D8232A] font-semibold hover:underline"
                          >
                            Size Chart &amp; Fit Guide
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Icons (Track, Currency, Language, Wishlist, Cart) */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Track Order — sits left of the wishlist */}
              <Link
                to="/track-order"
                className="hidden sm:flex flex-col items-center gap-0.5 p-2.5 rounded-lg text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                ariaLabel={t(content.headerQuickTrack, content.headerQuickTrackBn)}
              >
                <Clock className="w-5 h-5" />
                <span className="text-[10px] font-semibold leading-none whitespace-nowrap">
                  {t(content.headerQuickTrack, content.headerQuickTrackBn)}
                </span>
              </Link>

              {/* Currency toggle */}
              <button
                onClick={() => setCurrency(currency === 'BDT' ? 'USD' : 'BDT')}
                className="flex flex-col items-center gap-0.5 p-2.5 rounded-lg text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="Toggle currency"
              >
                <span className="text-sm font-black leading-none">{currency === 'BDT' ? '৳' : '$'}</span>
                <span className="text-[10px] font-semibold leading-none">{currency}</span>
              </button>

              {/* Language toggle */}
              <button
                onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
                className="flex flex-col items-center gap-0.5 p-2.5 rounded-lg text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="Toggle language"
              >
                <span className="text-sm font-black leading-none">{language === 'en' ? 'EN' : 'বাং'}</span>
                <span className="text-[10px] font-semibold leading-none">
                  {language === 'en' ? 'বাংলা' : 'English'}
                </span>
              </button>

              <span className="w-px h-8 bg-neutral-200 mx-1 hidden sm:block" />

              {/* Wishlist */}
              <button
                onClick={() => setIsWishlistDrawerOpen(true)}
                className="relative p-2.5 rounded-lg text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="Wishlist"
                aria-label={`Open wishlist${wishlist.length > 0 ? `, ${wishlist.length} saved` : ''}`}
              >
                <span className="flex flex-col items-center gap-0.5">
                  <Heart className="w-5 h-5" />
                  <span className="text-[10px] font-semibold leading-none">Wishlist</span>
                </span>
                {wishlist.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[#D8232A] text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-scale">
                    {wishlist.length}
                  </span>
                )}
              </button>

              {/* Cart Drawer Trigger — desktop only: below lg the sticky bottom
                  bar's Cart tab owns this, so the mobile top bar stays clean. */}
              <button
                data-header-cart=""
                onClick={() => setIsCartDrawerOpen(true)}
                aria-label={`Open shopping bag${totalCartCount > 0 ? `, ${totalCartCount} item${totalCartCount === 1 ? '' : 's'}` : ''}`}
                className="hidden lg:flex items-center gap-2 bg-[#D8232A] hover:bg-[#b51c22] text-white pl-3.5 pr-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="relative">
                  <ShoppingBag className="w-5 h-5 group-hover:rotate-6 transition-transform" />
                  {totalCartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-neutral-900 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
                      {totalCartCount}
                    </span>
                  )}
                </div>
                {/* Price label hides on very narrow phones so the row always fits;
                    the bag icon + count badge above stay visible and functional. */}
                <div className="hidden min-[400px]:flex flex-col text-left leading-none">
                  <span className="text-[10px] font-medium text-red-100 uppercase tracking-tight">Bag</span>
                  <span className="text-xs font-extrabold tracking-tight mt-0.5">
                    {formatPrice(cartSubtotal, currency)}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Search input */}
          <div className="mt-2 md:hidden">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                ref={mobileSearchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(content.headerSearchPlaceholderMobile, content.headerSearchPlaceholderMobileBn)}
                className="w-full pl-10 pr-20 py-2.5 bg-neutral-100 text-xs rounded-xl border border-neutral-200 outline-none focus:border-[#D8232A]"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#D8232A] text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold"
              >
                Go
              </button>
            </form>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-neutral-200 bg-white px-4 py-4 space-y-4 shadow-lg overflow-y-auto max-h-[80vh]"
            >
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSelectCategory('all', 'All')}
                  className="text-left font-bold text-sm py-2 px-3 rounded-lg bg-neutral-100 text-neutral-900"
                >
                  {t(content.headerAllDepartments, content.headerAllDepartmentsBn)}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.slug, 'All')}
                    className="text-left font-bold text-sm py-2 px-3 rounded-lg hover:bg-neutral-100 text-neutral-900"
                  >
                    {cat.name}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, onSaleOnly: true }));
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-left font-bold text-sm py-2 px-3 rounded-lg bg-red-50 text-[#D8232A]"
                >
                  {t(content.headerSaleChipShort, content.headerSaleChipShortBn)}
                </button>
              </div>

              <div className="border-t border-neutral-100 pt-3">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  {t(content.headerMobileShopBy, content.headerMobileShopByBn)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleSelectBrand(cat.brand)}
                      className="text-xs font-medium bg-neutral-100 hover:bg-[#D8232A] hover:text-white px-2.5 py-1 rounded-full text-neutral-800 transition-colors"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-3 flex flex-col gap-2 text-xs font-semibold text-neutral-700">
                <button
                  onClick={() => {
                    navigate('/track-order');
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 py-2"
                >
                  <Clock className="w-4 h-4 text-neutral-500" />
                  Track My Order
                </button>
                <button
                  onClick={() => {
                    setIsSizeGuideOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 py-2"
                >
                  <SlidersHorizontal className="w-4 h-4 text-neutral-500" />
                  Product &amp; Fit Guides
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Department Navigation & Mega Menu — the category strip is the only
          sticky part: it pins to the top while the header scrolls away. */}
      <nav className="sticky top-0 z-40 bg-white border-t border-neutral-100 border-b border-neutral-200/80 shadow-xs hidden lg:block">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="flex items-center gap-1 text-sm font-semibold text-neutral-800">
            {/* All Products (clears the division filter) */}
            <li>
              <button
                onClick={() => handleSelectCategory('all', 'All')}
                className={`px-3 py-2 hover:text-[#D8232A] transition-colors flex items-center gap-1 cursor-pointer ${
                  filters.category === 'all' && filters.subcategory === 'All' ? 'text-[#D8232A] border-b-2 border-[#D8232A]' : ''
                }`}
              >
                {t(content.headerAllDepartments, content.headerAllDepartmentsBn)}
              </button>
            </li>

            {/* Division categories — fully API-driven (Admin → Categories) */}
            {categories.map((cat) => (
              <li
                key={cat.id}
                onMouseEnter={() => setActiveMegaMenu(cat.slug)}
                onMouseLeave={() => setActiveMegaMenu(null)}
              >
                <button
                  onClick={() => handleSelectCategory(cat.slug, 'All')}
                  className={`px-3.5 py-3 hover:text-[#D8232A] transition-colors flex items-center gap-1 cursor-pointer ${
                  filters.category === cat.slug ? 'text-[#D8232A] border-b-2 border-[#D8232A]' : ''
                }`}
              >
                {cat.name} <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {/* Mega Dropdown — subcategories + sibling divisions from the API */}
              <AnimatePresence>
                {activeMegaMenu === cat.slug && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 right-0 top-full bg-white rounded-2xl shadow-xl border border-neutral-100 p-6 grid grid-cols-3 gap-6 z-50"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                        {cat.name} {t(content.headerCategoriesSuffix, content.headerCategoriesSuffixBn)}
                      </h4>
                      <ul className="space-y-2 text-sm text-neutral-700 font-medium">
                        {subcategoriesFor(cat.slug)
                          .slice(0, 6)
                          .map((sub) => (
                            <li key={sub.id}>
                              <button
                                onClick={() => handleSelectCategory(cat.slug, sub.name)}
                                className="hover:text-[#D8232A] transition-colors"
                              >
                                {sub.name}
                              </button>
                            </li>
                          ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                        {t(content.headerOtherDivisions, content.headerOtherDivisionsBn)}
                      </h4>
                      <ul className="space-y-2 text-sm text-neutral-700 font-medium">
                        {categories
                          .filter((c) => c.slug !== cat.slug)
                          .slice(0, 4)
                          .map((other) => (
                            <li key={other.id}>
                              <button onClick={() => handleSelectCategory(other.slug, 'All')} className="hover:text-[#D8232A]">
                                {other.name}
                              </button>
                            </li>
                          ))}
                      </ul>
                    </div>

                    <div className="bg-neutral-50 p-4 rounded-xl flex flex-col justify-between">
                      <div>
                        <span
                          className="text-[10px] font-extrabold uppercase tracking-widest text-white px-2 py-0.5 rounded"
                          style={{ backgroundColor: cat.accentColor }}
                        >
                          {cat.badge || cat.name}
                        </span>
                        <h5 className="font-bold text-neutral-900 text-sm mt-2">{cat.name}</h5>
                        <p className="text-xs text-neutral-500 mt-1">{cat.tagline}</p>
                      </div>
                      <button
                        onClick={() => handleSelectCategory(cat.slug, 'All')}
                        className="text-xs font-bold text-[#D8232A] flex items-center gap-1 mt-3"
                      >
                        {t(content.headerShopPrefix, content.headerShopPrefixBn)} {cat.name} <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
            ))}

            {/* Brands Dropdown */}
            <li
              onMouseEnter={() => setActiveMegaMenu('brands')}
              onMouseLeave={() => setActiveMegaMenu(null)}
            >
              <button
                className="px-3.5 py-3 hover:text-[#D8232A] transition-colors flex items-center gap-1 cursor-pointer"
              >
                {t(content.headerDivisions, content.headerDivisionsBn)} <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              <AnimatePresence>
                {activeMegaMenu === 'brands' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 right-0 top-full bg-white rounded-2xl shadow-xl border border-neutral-100 p-6 grid grid-cols-2 xl:grid-cols-3 gap-4 z-50"
                  >
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        onClick={() => handleSelectBrand(cat.brand)}
                        className="p-3 rounded-xl hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-all cursor-pointer flex items-start gap-3"
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0"
                          style={{ backgroundColor: cat.accentColor }}
                        >
                          {cat.name.substring(0, 3)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-neutral-900">{cat.name}</span>
                            <span className="text-[10px] text-neutral-400 font-semibold">{cat.tagline}</span>
                          </div>
                          <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{cat.description}</p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </li>

            {/* Sale / Clearance */}
            <li className="ml-auto">
              <button
                onClick={() => {
                  setActiveProductPage(null);
                  setFilters((prev) => ({
                    ...prev,
                    category: 'all',
                    subcategory: 'All',
                    onSaleOnly: true,
                    brand: [],
                    searchQuery: '',
                  }));
                  const catalogEl = document.getElementById('product-catalog-section');
                  if (catalogEl) catalogEl.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-3.5 py-1.5 rounded-full bg-red-50 text-[#D8232A] hover:bg-[#D8232A] hover:text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {t(content.headerSaleChip, content.headerSaleChipBn)}
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
};
