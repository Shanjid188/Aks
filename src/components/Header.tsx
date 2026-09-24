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
  Sparkle,
  Award,
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
    compareList,
    cartSubtotal,
    currency,
    setCurrency,
    setIsCartDrawerOpen,
    setIsWishlistDrawerOpen,
        setIsAksMartClubOpen,
    setIsShoeFinderOpen,
    setIsCompareModalOpen,
    setIsSizeGuideOpen,
    filters,
    setFilters,
    products,
    categories,
    subcategoriesFor,
    openQuickView,
    setActiveProductPage,
  } = useStore();

  const { language, setLanguage } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Announcement rotation — DB-driven; hardcoded strings remain as offline fallback.
  const [announcements, setAnnouncements] = useState<Announcement[]>(DEFAULT_ANNOUNCEMENTS);
  const [announcementIndex, setAnnouncementIndex] = useState(0);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setAnnouncementIndex((prev) => (prev + 1) % announcements.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [announcements.length]);

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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-xs">
      {/* Top Utility Announcement Bar */}
      <div className="bg-neutral-900 text-white text-[10px] py-0.5 px-4 border-b border-neutral-800/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1">
          {/* Rotating ticker — DB-driven announcements, hardcoded strings as offline fallback */}
          <div className="flex items-center gap-2 font-medium tracking-wide">
            <span className="inline-flex items-center justify-center p-0.5 rounded bg-[#D8232A] text-white text-[10px]">
              {ANNOUNCEMENT_ICONS[announcementIndex % ANNOUNCEMENT_ICONS.length]}
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={announcementIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
                className="text-neutral-200"
                onClick={
                  announcements[announcementIndex % announcements.length]?.link
                    ? () => {
                        const link = announcements[announcementIndex % announcements.length].link!;
                        if (link.startsWith('/')) navigate(link);
                        else window.open(link, '_blank');
                      }
                    : undefined
                }
              >
                {announcements[announcementIndex % announcements.length]
                  ? language === 'bn' && announcements[announcementIndex % announcements.length].textBn
                    ? announcements[announcementIndex % announcements.length].textBn
                    : announcements[announcementIndex % announcements.length].text
                  : ''}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Quick links & Currency */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 sm:gap-x-4 text-neutral-300">
            <Link
              to="/track-order"
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{content.headerQuickTrack}</span>
            </Link>

            <span className="w-px h-2.5 bg-neutral-700" />

            <button
                    onClick={() => setIsAksMartClubOpen(true)}
              className="flex items-center gap-1 hover:text-white transition-colors text-amber-400 font-semibold cursor-pointer"
            >
              <Award className="w-3 h-3" />
              <span>{content.headerQuickClub}</span>
            </button>

            <span className="w-px h-3 bg-neutral-700" />
             {/* Currency & Language toggles */}
             <div className="flex items-center gap-2">
               <button
                 onClick={() => setCurrency(currency === 'BDT' ? 'USD' : 'BDT')}
                 className={`flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                   currency === 'BDT'
                     ? 'bg-[#D8232A] text-white'
                     : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                 }`}
                 title="Toggle currency"
               >
                 {currency === 'BDT' ? '৳ BDT' : '$ USD'}
               </button>
               <button
                 onClick={() => {
                   const next = language === 'en' ? 'bn' : 'en';
                   setLanguage(next);
                 }}
                 className={`flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                   language === 'bn'
                     ? 'bg-[#D8232A] text-white'
                     : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                 }`}
                 title="Toggle language"
               >
                 {language === 'en' ? 'EN' : 'বাং'}
               </button>
             </div>

          </div>
        </div>
      </div>

      {/* Main Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
        <div className="flex items-center justify-between gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-neutral-700 hover:bg-neutral-100 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* AKS Mart Logo → home */}
          <Link
            to="/"
            onClick={() => {
              setActiveProductPage(null);
              setFilters((prev) => ({ ...prev, category: 'all', subcategory: 'All', searchQuery: '', brand: [] }));
            }}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <Logo className="h-7 w-7 rounded-md shadow-sm ring-1 ring-neutral-200 shrink-0 group-hover:scale-[1.02] transition-transform" />
            <div className="hidden sm:flex flex-col justify-center">
              <span className="text-xs uppercase tracking-[0.15em] font-extrabold text-neutral-900 leading-tight">
                AKS MART
              </span>
              <span className="text-[9px] text-neutral-500 font-medium tracking-tight leading-tight">
                One Mart. Many Choices.
              </span>
            </div>
          </Link>

          {/* Smart Live Search Bar */}
          <div ref={searchRef} className="relative flex-1 max-w-lg hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder={content.headerSearchPlaceholder}
                className="w-full pl-10 pr-24 py-2 bg-white hover:bg-neutral-50 focus:bg-white text-sm text-neutral-900 placeholder:text-neutral-400 rounded-full border-2 border-neutral-200 focus:border-[#D8232A] focus:ring-2 focus:ring-[#D8232A]/20 transition-all outline-none leading-none"
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
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#D8232A] text-white px-3.5 py-1.5 rounded-full text-xs font-bold hover:bg-[#b51c22] transition-colors"
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
                          {content.headerTrendingLabel}
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

          {/* Action Icons (Compare, Wishlist, Cart) */}
          <div className="flex items-center gap-1">
            {/* Style & Fit Matcher */}
            <button
              onClick={() => setIsShoeFinderOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200/80 text-amber-900 text-xs font-bold hover:shadow-sm transition-all hover:scale-102 cursor-pointer"
            >
              <Sparkle className="w-3.5 h-3.5 text-amber-600 fill-amber-500 animate-pulse" />
              <span>{content.headerOutfitMatcher}</span>
            </button>

            {/* Compare */}
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="relative p-2 rounded-full text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Compare Products"
            >
              <SlidersHorizontal className="w-5 h-5" />
              {compareList.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-sky-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {compareList.length}
                </span>
              )}
            </button>

            {/* Wishlist */}
            <button
              onClick={() => setIsWishlistDrawerOpen(true)}
              className="relative p-2.5 rounded-full text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Saved Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#D8232A] text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-scale">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Cart Drawer Trigger */}
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="flex items-center gap-2 bg-[#D8232A] hover:bg-[#b51c22] text-white pl-3 pr-3.5 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer group"
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
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={content.headerSearchPlaceholderMobile}
              className="w-full pl-10 pr-20 py-2 bg-neutral-100 text-xs rounded-full border border-neutral-200 outline-none focus:border-[#D8232A]"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#D8232A] text-white px-2.5 py-1 rounded-full text-[11px] font-semibold"
            >
              Go
            </button>
          </form>
        </div>
      </div>

      {/* Main Department Navigation & Mega Menu */}
      <nav className="border-t border-neutral-100 bg-white hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="flex items-center gap-1 text-sm font-semibold text-neutral-800">
            {/* All Departments */}
            <li>
              <button
                onClick={() => handleSelectCategory('all', 'All')}
                className={`px-3 py-2 hover:text-[#D8232A] transition-colors flex items-center gap-1 cursor-pointer ${
                  filters.category === 'all' && filters.subcategory === 'All' ? 'text-[#D8232A] border-b-2 border-[#D8232A]' : ''
                }`}
              >
                {content.headerAllDepartments}
              </button>
            </li>

            {/* Division categories — fully API-driven (Admin → Categories) */}
            {categories.map((cat) => (
              <li
                key={cat.id}
                className="relative"
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
                    className="absolute left-0 top-full w-[620px] bg-white rounded-2xl shadow-xl border border-neutral-100 p-6 grid grid-cols-3 gap-6 z-50"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                        {cat.name} {content.headerCategoriesSuffix}
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
                        {content.headerOtherDivisions}
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
                        {content.headerShopPrefix} {cat.name} <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
            ))}

            {/* Brands Dropdown */}
            <li
              className="relative"
              onMouseEnter={() => setActiveMegaMenu('brands')}
              onMouseLeave={() => setActiveMegaMenu(null)}
            >
              <button
                className="px-3.5 py-3 hover:text-[#D8232A] transition-colors flex items-center gap-1 cursor-pointer"
              >
                {content.headerDivisions} <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              <AnimatePresence>
                {activeMegaMenu === 'brands' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 top-full w-[650px] bg-white rounded-2xl shadow-xl border border-neutral-100 p-6 grid grid-cols-2 gap-4 z-50"
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
                {content.headerSaleChip}
              </button>
            </li>
          </ul>
        </div>
      </nav>

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
                {content.headerAllDepartments}
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
                {content.headerSaleChipShort}
              </button>
            </div>

            <div className="border-t border-neutral-100 pt-3">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                {content.headerMobileShopBy}
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
                  setIsShoeFinderOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 py-2 text-amber-700 font-bold"
              >
                <Sparkle className="w-4 h-4 text-amber-600" />
                Launch Outfit & Style Matcher
              </button>
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
  );
};
