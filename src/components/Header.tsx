import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import {
  Search,
  ShoppingBag,
  Heart,
  MapPin,
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
import { BRAND_INFOS } from '../data/promos';

export const Header: React.FC = () => {
  const {
    cart,
    wishlist,
    compareList,
    cartSubtotal,
    currency,
    setCurrency,
    setIsCartDrawerOpen,
    setIsStoreLocatorOpen,
    setIsBataClubOpen,
    setIsOrderTrackerOpen,
    setIsShoeFinderOpen,
    setIsCompareModalOpen,
    setIsSizeGuideOpen,
    filters,
    setFilters,
    products,
    openQuickView,
    setActiveProductPage,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Announcement rotation
  const announcements = [
    { icon: <Truck className="w-3.5 h-3.5" />, text: 'Free Express Courier Across Bangladesh on Orders Above ৳2,500' },
    { icon: <Sparkles className="w-3.5 h-3.5" />, text: 'Festive Season Offer: Flat 15% OFF with Code AKS15 at Checkout' },
    { icon: <RotateCcw className="w-3.5 h-3.5" />, text: '30-Day Hassle-Free Exchange & Alterations at Any AKS Flagship Boutique' },
  ];
  const [announcementIndex, setAnnouncementIndex] = useState(0);

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
      const catalogEl = document.getElementById('product-catalog-section');
      if (catalogEl) {
        catalogEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSelectCategory = (cat: 'all' | 'men' | 'women' | 'kids' | 'accessories', sub = 'All') => {
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
    const catalogEl = document.getElementById('product-catalog-section');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
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
    const catalogEl = document.getElementById('product-catalog-section');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-xs">
      {/* Top Utility Announcement Bar */}
      <div className="bg-neutral-900 text-white text-xs py-2 px-4 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Rotating ticker */}
          <div className="flex items-center gap-2 font-medium tracking-wide">
            <span className="inline-flex items-center justify-center p-1 rounded bg-[#D8232A] text-white">
              {announcements[announcementIndex].icon}
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={announcementIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
                className="text-neutral-200"
              >
                {announcements[announcementIndex].text}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Quick links & Currency */}
          <div className="flex items-center gap-4 text-neutral-300">
            <button
              onClick={() => setIsStoreLocatorOpen(true)}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-[#D8232A]" />
              <span className="hidden md:inline">AKS Boutiques & Outlets</span>
              <span className="md:hidden">Boutiques</span>
            </button>

            <span className="w-px h-3 bg-neutral-700" />

            <button
              onClick={() => setIsOrderTrackerOpen(true)}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Track Order</span>
            </button>

            <span className="w-px h-3 bg-neutral-700" />

            <button
              onClick={() => setIsBataClubOpen(true)}
              className="flex items-center gap-1 hover:text-white transition-colors text-amber-400 font-semibold cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>AKS Privé Club</span>
            </button>

            <span className="w-px h-3 bg-neutral-700" />

            {/* Currency toggle */}
            <div className="flex items-center gap-1 bg-neutral-800 rounded px-1.5 py-0.5 border border-neutral-700 text-[11px]">
              <button
                onClick={() => setCurrency('BDT')}
                className={`px-1.5 py-0.5 rounded font-semibold transition-all ${
                  currency === 'BDT' ? 'bg-[#D8232A] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                ৳ BDT
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-1.5 py-0.5 rounded font-semibold transition-all ${
                  currency === 'USD' ? 'bg-[#D8232A] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                $ USD
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-neutral-700 hover:bg-neutral-100 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* AKS Garments Logo */}
          <div
            onClick={() => {
              setActiveProductPage(null);
              setFilters((prev) => ({ ...prev, category: 'all', subcategory: 'All', searchQuery: '', brand: [] }));
            }}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="bg-[#D8232A] text-white font-black text-2xl tracking-tight px-3.5 py-1 rounded-sm shadow-sm group-hover:scale-[1.02] transition-transform">
              AKS
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-[11px] uppercase tracking-widest font-bold text-neutral-900 leading-tight">
                GARMENTS
              </span>
              <span className="text-[10px] text-neutral-500 font-medium tracking-tight">
                Contemporary & Heritage Apparel
              </span>
            </div>
          </div>

          {/* Smart Live Search Bar */}
          <div ref={searchRef} className="relative flex-1 max-w-xl hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search silk panjabis, formal shirts, festive salwar kameez, linen..."
                className="w-full pl-11 pr-24 py-2.5 bg-neutral-50 hover:bg-neutral-100/80 focus:bg-white text-sm text-neutral-900 placeholder:text-neutral-400 rounded-full border border-neutral-200 focus:border-[#D8232A] focus:ring-2 focus:ring-[#D8232A]/20 transition-all outline-none"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-xs p-1"
                >
                  Clear
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#D8232A] text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-[#b51c22] transition-colors"
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
                          Matching Apparel ({searchResults.length})
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
                          No exact garments found for "{searchQuery}". Try exploring our collections!
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="mb-3">
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                          Trending Searches in Bangladesh
                        </span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {[
                            'Silk Panjabi',
                            'Kabli Suit',
                            '2-Ply Oxford Shirt',
                            'European Washed Linen',
                            'Organza 3-Piece Suit',
                            'Jamdani Saree',
                            'Selvedge Denim',
                            'Italian Leather Belt',
                          ].map((kw) => (
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
                          100% Certified Authentic Fabrics & Tailoring
                        </span>
                        <button
                          onClick={() => {
                            setIsSizeGuideOpen(true);
                            setIsSearchFocused(false);
                          }}
                          className="text-[#D8232A] font-semibold hover:underline"
                        >
                          Garment Size Chart & Fit Guide
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Icons (Outfit Matcher, Compare, Wishlist, Cart) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Style & Fit Matcher */}
            <button
              onClick={() => setIsShoeFinderOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200/80 text-amber-900 text-xs font-bold hover:shadow-sm transition-all hover:scale-102 cursor-pointer"
            >
              <Sparkle className="w-3.5 h-3.5 text-amber-600 fill-amber-500 animate-pulse" />
              <span>Outfit Matcher</span>
            </button>

            {/* Compare */}
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="relative p-2.5 rounded-full text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Compare Garments"
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
              onClick={() => {
                setActiveProductPage(null);
                setFilters((prev) => ({ ...prev, category: 'all', subcategory: 'All', searchQuery: '' }));
                setIsCartDrawerOpen(true);
              }}
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
              className="flex items-center gap-2.5 bg-[#D8232A] hover:bg-[#b51c22] text-white pl-3.5 pr-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5 group-hover:rotate-6 transition-transform" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-neutral-900 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
                    {totalCartCount}
                  </span>
                )}
              </div>
              <div className="flex flex-col text-left leading-none">
                <span className="text-[10px] font-medium text-red-100 uppercase tracking-tight">Bag</span>
                <span className="text-xs font-extrabold tracking-tight mt-0.5">
                  {formatPrice(cartSubtotal, currency)}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Search input */}
        <div className="mt-3 md:hidden">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search panjabis, shirts, lawn, sarees..."
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
            {/* All Apparel */}
            <li>
              <button
                onClick={() => handleSelectCategory('all', 'All')}
                className={`px-3.5 py-3 hover:text-[#D8232A] transition-colors flex items-center gap-1 cursor-pointer ${
                  filters.category === 'all' && filters.subcategory === 'All' ? 'text-[#D8232A] border-b-2 border-[#D8232A]' : ''
                }`}
              >
                All Garments
              </button>
            </li>

            {/* Men */}
            <li
              className="relative"
              onMouseEnter={() => setActiveMegaMenu('men')}
              onMouseLeave={() => setActiveMegaMenu(null)}
            >
              <button
                onClick={() => handleSelectCategory('men', 'All')}
                className={`px-3.5 py-3 hover:text-[#D8232A] transition-colors flex items-center gap-1 cursor-pointer ${
                  filters.category === 'men' ? 'text-[#D8232A] border-b-2 border-[#D8232A]' : ''
                }`}
              >
                Men's Wear <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {/* Mega Dropdown Men */}
              <AnimatePresence>
                {activeMegaMenu === 'men' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 top-full w-[620px] bg-white rounded-2xl shadow-xl border border-neutral-100 p-6 grid grid-cols-3 gap-6 z-50"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                        By Garment Type
                      </h4>
                      <ul className="space-y-2 text-sm text-neutral-700 font-medium">
                        <li>
                          <button
                            onClick={() => handleSelectCategory('men', 'Panjabis & Kabli')}
                            className="hover:text-[#D8232A] transition-colors"
                          >
                            Silk & Cotton Panjabis
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => handleSelectCategory('men', 'Formal Shirts')}
                            className="hover:text-[#D8232A] transition-colors"
                          >
                            2-Ply Oxford Formal Shirts
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => handleSelectCategory('men', 'Casual Shirts & Polos')}
                            className="hover:text-[#D8232A] transition-colors"
                          >
                            Pure Linen Shirts & Polos
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => handleSelectCategory('men', 'Denim & Trousers')}
                            className="hover:text-[#D8232A] transition-colors"
                          >
                            Selvedge Denim & Chinos
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => handleSelectCategory('men', 'Blazers & Waistcoats')}
                            className="hover:text-[#D8232A] transition-colors"
                          >
                            Wool Blazers & Waistcoats
                          </button>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                        Featured Labels
                      </h4>
                      <ul className="space-y-2 text-sm text-neutral-700 font-medium">
                        <li>
                          <button onClick={() => handleSelectBrand('AKS Heritage')} className="hover:text-[#D8232A]">
                            AKS Heritage Panjabi
                          </button>
                        </li>
                        <li>
                          <button onClick={() => handleSelectBrand('AKS Signature')} className="hover:text-[#D8232A]">
                            AKS Signature Tailored
                          </button>
                        </li>
                        <li>
                          <button onClick={() => handleSelectBrand('AKS Studio')} className="hover:text-[#D8232A]">
                            AKS Studio Linen & Polos
                          </button>
                        </li>
                        <li>
                          <button onClick={() => handleSelectBrand('AKS Denim Co.')} className="hover:text-[#D8232A]">
                            AKS Denim Co.
                          </button>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-neutral-50 p-4 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D8232A] bg-red-100 px-2 py-0.5 rounded">
                          EID 2026
                        </span>
                        <h5 className="font-bold text-neutral-900 text-sm mt-2">Imperial Silk Panjabi</h5>
                        <p className="text-xs text-neutral-500 mt-1">100% Mulberry silk with fine zardozi collar embroidery.</p>
                      </div>
                      <button
                        onClick={() => handleSelectCategory('men', 'Panjabis & Kabli')}
                        className="text-xs font-bold text-[#D8232A] flex items-center gap-1 mt-3"
                      >
                        Shop Men's Festive <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>

            {/* Women */}
            <li
              className="relative"
              onMouseEnter={() => setActiveMegaMenu('women')}
              onMouseLeave={() => setActiveMegaMenu(null)}
            >
              <button
                onClick={() => handleSelectCategory('women', 'All')}
                className={`px-3.5 py-3 hover:text-[#D8232A] transition-colors flex items-center gap-1 cursor-pointer ${
                  filters.category === 'women' ? 'text-[#D8232A] border-b-2 border-[#D8232A]' : ''
                }`}
              >
                Women's Couture <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              <AnimatePresence>
                {activeMegaMenu === 'women' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 top-full w-[620px] bg-white rounded-2xl shadow-xl border border-neutral-100 p-6 grid grid-cols-3 gap-6 z-50"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                        By Garment Category
                      </h4>
                      <ul className="space-y-2 text-sm text-neutral-700 font-medium">
                        <li>
                          <button
                            onClick={() => handleSelectCategory('women', 'Salwar Kameez & Suits')}
                            className="hover:text-[#D8232A]"
                          >
                            Organza & Lawn 3-Piece Suits
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => handleSelectCategory('women', 'Sarees & Festive')}
                            className="hover:text-[#D8232A]"
                          >
                            Muslin Dhakai Jamdani Sarees
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => handleSelectCategory('women', 'Kurtis & Tunics')}
                            className="hover:text-[#D8232A]"
                          >
                            Embroidered Viscose Kurtis
                          </button>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                        Women's Labels
                      </h4>
                      <ul className="space-y-2 text-sm text-neutral-700 font-medium">
                        <li>
                          <button onClick={() => handleSelectBrand('AKS Riva')} className="hover:text-[#D8232A]">
                            AKS Riva Luxury Couture
                          </button>
                        </li>
                        <li>
                          <button onClick={() => handleSelectBrand('AKS Studio')} className="hover:text-[#D8232A]">
                            AKS Studio Ethnic Chic
                          </button>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-pink-50 p-4 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-pink-700 bg-pink-200 px-2 py-0.5 rounded">
                          AKS RIVA
                        </span>
                        <h5 className="font-bold text-neutral-900 text-sm mt-2">Dhakai Jamdani Heritage</h5>
                        <p className="text-xs text-neutral-500 mt-1">200-count fine handloom muslin with pure zari work.</p>
                      </div>
                      <button
                        onClick={() => handleSelectCategory('women', 'Sarees & Festive')}
                        className="text-xs font-bold text-[#D8232A] flex items-center gap-1 mt-3"
                      >
                        Explore Sarees <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>

            {/* Kids */}
            <li>
              <button
                onClick={() => handleSelectCategory('kids', 'All')}
                className={`px-3.5 py-3 hover:text-[#D8232A] transition-colors flex items-center gap-1 cursor-pointer ${
                  filters.category === 'kids' ? 'text-[#D8232A] border-b-2 border-[#D8232A]' : ''
                }`}
              >
                Kids & Festive Wear
              </button>
            </li>

            {/* Accessories & Shawls */}
            <li>
              <button
                onClick={() => handleSelectCategory('accessories', 'All')}
                className={`px-3.5 py-3 hover:text-[#D8232A] transition-colors flex items-center gap-1 cursor-pointer ${
                  filters.category === 'accessories' ? 'text-[#D8232A] border-b-2 border-[#D8232A]' : ''
                }`}
              >
                Shawls, Belts & Dupattas
              </button>
            </li>

            {/* Brands Dropdown */}
            <li
              className="relative"
              onMouseEnter={() => setActiveMegaMenu('brands')}
              onMouseLeave={() => setActiveMegaMenu(null)}
            >
              <button
                className="px-3.5 py-3 hover:text-[#D8232A] transition-colors flex items-center gap-1 cursor-pointer"
              >
                AKS Labels <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              <AnimatePresence>
                {activeMegaMenu === 'brands' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 top-full w-[650px] bg-white rounded-2xl shadow-xl border border-neutral-100 p-6 grid grid-cols-2 gap-4 z-50"
                  >
                    {BRAND_INFOS.map((brand) => (
                      <div
                        key={brand.name}
                        onClick={() => handleSelectBrand(brand.name)}
                        className="p-3 rounded-xl hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-all cursor-pointer flex items-start gap-3"
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0"
                          style={{ backgroundColor: brand.accent }}
                        >
                          {brand.logoText.substring(0, 3)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-neutral-900">{brand.name}</span>
                            <span className="text-[10px] text-neutral-400 font-semibold">{brand.tag}</span>
                          </div>
                          <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{brand.desc}</p>
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
                Festive Sale Up to 40%
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
                All Apparel
              </button>
              <button
                onClick={() => handleSelectCategory('men', 'All')}
                className="text-left font-bold text-sm py-2 px-3 rounded-lg hover:bg-neutral-100 text-neutral-900"
              >
                Men's Collection
              </button>
              <button
                onClick={() => handleSelectCategory('women', 'All')}
                className="text-left font-bold text-sm py-2 px-3 rounded-lg hover:bg-neutral-100 text-neutral-900"
              >
                Women's Couture
              </button>
              <button
                onClick={() => handleSelectCategory('kids', 'All')}
                className="text-left font-bold text-sm py-2 px-3 rounded-lg hover:bg-neutral-100 text-neutral-900"
              >
                Kids & Festive
              </button>
              <button
                onClick={() => handleSelectCategory('accessories', 'All')}
                className="text-left font-bold text-sm py-2 px-3 rounded-lg hover:bg-neutral-100 text-neutral-900"
              >
                Shawls & Accessories
              </button>
              <button
                onClick={() => {
                  setFilters((prev) => ({ ...prev, onSaleOnly: true }));
                  setIsMobileMenuOpen(false);
                }}
                className="text-left font-bold text-sm py-2 px-3 rounded-lg bg-red-50 text-[#D8232A]"
              >
                Festive Sale
              </button>
            </div>

            <div className="border-t border-neutral-100 pt-3">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Shop by AKS Label</p>
              <div className="flex flex-wrap gap-1.5">
                {BRAND_INFOS.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => handleSelectBrand(b.name)}
                    className="text-xs font-medium bg-neutral-100 hover:bg-[#D8232A] hover:text-white px-2.5 py-1 rounded-full text-neutral-800 transition-colors"
                  >
                    {b.name}
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
                  setIsStoreLocatorOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 py-2"
              >
                <MapPin className="w-4 h-4 text-[#D8232A]" />
                Find Nearby AKS Boutiques
              </button>
              <button
                onClick={() => {
                  setIsOrderTrackerOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 py-2"
              >
                <Clock className="w-4 h-4 text-neutral-500" />
                Track My Order Status
              </button>
              <button
                onClick={() => {
                  setIsSizeGuideOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 py-2"
              >
                <SlidersHorizontal className="w-4 h-4 text-neutral-500" />
                Garment Size Guide & Measurements
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
