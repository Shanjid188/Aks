import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import { SubcategoryType } from '../types';
import { BRAND_INFOS } from '../data/promos';
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  LayoutGrid,
  Grid3X3,
  List,
  ChevronDown,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ProductGrid: React.FC = () => {
  const { products, filters, setFilters, resetFilters } = useStore();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [viewLayout, setViewLayout] = useState<'grid4' | 'grid3' | 'list'>('grid4');

  // Subcategory list based on active category
  const subcategories: SubcategoryType[] = useMemo(() => {
    if (filters.category === 'men') {
      return ['All', 'Panjabis & Kabli', 'Formal Shirts', 'Casual Shirts & Polos', 'Trousers & Chinos', 'Blazers & Waistcoats'];
    }
    if (filters.category === 'women') {
      return ['All', 'Salwar Kameez & Suits', 'Kurtis & Tunics', 'Jamdani & Festive Sarees', 'Shawls & Dupattas'];
    }
    if (filters.category === 'kids') {
      return ['All', 'Boys Panjabi Sets', 'Girls Frocks & Kurtis'];
    }
    if (filters.category === 'accessories') {
      return ['All', 'Shawls & Stoles', 'Belts & Wallets', 'Caps & Brooches'];
    }
    return [
      'All',
      'Panjabis & Kabli',
      'Formal Shirts',
      'Salwar Kameez & Suits',
      'Kurtis & Tunics',
      'Jamdani & Festive Sarees',
      'Casual Shirts & Polos',
      'Trousers & Chinos',
      'Blazers & Waistcoats',
      'Shawls & Stoles',
    ];
  }, [filters.category]);

  // Common Garment Sizes
  const availableSizes = ['38 (S)', '40 (M)', '42 (L)', '44 (XL)', '46 (XXL)', '30', '32', '34', '36', '38'];

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (filters.category !== 'all' && p.category !== filters.category) {
        return false;
      }
      // Subcategory filter
      if (filters.subcategory !== 'All' && p.subcategory !== filters.subcategory) {
        return false;
      }
      // Brand filter
      if (filters.brand.length > 0 && !filters.brand.includes(p.brand)) {
        return false;
      }
      // Price range
      if (p.price < filters.priceRange[0] || p.price > filters.priceRange[1]) {
        return false;
      }
      // Size filter
      if (filters.sizes.length > 0) {
        const hasSize = p.sizes.some((s) => {
          // Compare either string size or number
          return filters.sizes.some((fs) => String(fs).toLowerCase() === s.size.toLowerCase() || s.size.includes(String(fs))) && s.inStock;
        });
        if (!hasSize) return false;
      }
      // On sale
      if (filters.onSaleOnly && (!p.discountPercent || p.discountPercent <= 0)) {
        return false;
      }
      // Rating min
      if (filters.ratingMin > 0 && p.rating < filters.ratingMin) {
        return false;
      }
      // Search query
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const matches =
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.subcategory.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          (p.materials?.fabric && p.materials.fabric.toLowerCase().includes(q)) ||
          (p.occasion && p.occasion.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [products, filters]);

  // Sorting Logic
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (filters.sortOption) {
      case 'bestseller':
        return list.sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0));
      case 'price-low':
        return list.sort((a, b) => a.price - b.price);
      case 'price-high':
        return list.sort((a, b) => b.price - a.price);
      case 'rating':
        return list.sort((a, b) => b.rating - a.rating);
      case 'newest':
        return list.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0));
      case 'featured':
      default:
        return list.sort((a, b) => (a.featuredOrder || 99) - (b.featuredOrder || 99));
    }
  }, [filteredProducts, filters.sortOption]);

  const toggleBrand = (brandName: string) => {
    setFilters((prev) => {
      const exists = prev.brand.includes(brandName);
      return {
        ...prev,
        brand: exists ? prev.brand.filter((b) => b !== brandName) : [...prev.brand, brandName],
      };
    });
  };

  const toggleSize = (sizeVal: any) => {
    setFilters((prev) => {
      const exists = prev.sizes.includes(sizeVal);
      return {
        ...prev,
        sizes: exists ? prev.sizes.filter((s) => s !== sizeVal) : [...prev.sizes, sizeVal],
      };
    });
  };

  // Active filter count
  const activeFilterCount =
    (filters.category !== 'all' ? 1 : 0) +
    (filters.subcategory !== 'All' ? 1 : 0) +
    filters.brand.length +
    filters.sizes.length +
    (filters.onSaleOnly ? 1 : 0) +
    (filters.priceRange[1] < 15000 || filters.priceRange[0] > 0 ? 1 : 0) +
    (filters.searchQuery ? 1 : 0);

  return (
    <section id="product-catalog-section" className="py-12 bg-neutral-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header & Controls Bar */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight capitalize">
                  {filters.searchQuery
                    ? `Search Results for "${filters.searchQuery}"`
                    : filters.category === 'all'
                    ? 'All Garments & Accessories'
                    : `${filters.category}'s Collection`}
                </h2>
                <span className="text-xs font-bold text-neutral-500 bg-neutral-200/80 px-2.5 py-1 rounded-full">
                  {sortedProducts.length} Garments
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Artisanal certified apparel crafted with fine mulberry silks, 2-ply Egyptian cotton, and bespoke tailoring.
              </p>
            </div>

            {/* Layout Toggles & Sort Dropdown */}
            <div className="flex items-center gap-3 self-start md:self-auto">
              {/* Mobile Filter Toggle */}
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-2 px-3.5 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-800 shadow-xs cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4 text-[#D8232A]" />
                <span>Filters {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
              </button>

              {/* Sort Selector */}
              <div className="relative">
                <select
                  value={filters.sortOption}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      sortOption: e.target.value as any,
                    }))
                  }
                  aria-label="Sort garments by"
                  className="appearance-none bg-white border border-neutral-300 hover:border-neutral-400 text-xs font-bold text-neutral-800 pl-3.5 pr-8 py-2 rounded-xl outline-none focus:ring-2 focus:ring-[#D8232A]/20 cursor-pointer shadow-xs"
                >
                  <option value="featured">Sort by: Featured</option>
                  <option value="bestseller">Sort by: Best Sellers</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Customer Rating</option>
                  <option value="newest">New Arrivals</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* View Layout Switcher (Desktop) */}
              <div className="hidden sm:flex items-center bg-white border border-neutral-300 rounded-xl p-0.5 shadow-xs">
                <button
                  onClick={() => setViewLayout('grid4')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewLayout === 'grid4' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                  title="4 Columns"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewLayout('grid3')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewLayout === 'grid3' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                  title="3 Columns"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewLayout('list')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewLayout === 'list' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Subcategory Pills Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {subcategories.map((sub) => {
              const isActive = filters.subcategory === sub;
              return (
                <button
                  key={sub}
                  onClick={() => setFilters((prev) => ({ ...prev, subcategory: sub }))}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>

          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-200/60">
              <span className="text-xs font-bold text-neutral-400">Active Filters:</span>

              {filters.category !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-neutral-200 text-neutral-800 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  {filters.category}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-600"
                    onClick={() => setFilters((prev) => ({ ...prev, category: 'all' }))}
                  />
                </span>
              )}

              {filters.subcategory !== 'All' && (
                <span className="inline-flex items-center gap-1 bg-neutral-200 text-neutral-800 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  {filters.subcategory}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-600"
                    onClick={() => setFilters((prev) => ({ ...prev, subcategory: 'All' }))}
                  />
                </span>
              )}

              {filters.brand.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 bg-neutral-200 text-neutral-800 text-xs px-2.5 py-0.5 rounded-full font-medium"
                >
                  {b}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-600"
                    onClick={() => toggleBrand(b)}
                  />
                </span>
              ))}

              {filters.sizes.map((s) => (
                <span
                  key={String(s)}
                  className="inline-flex items-center gap-1 bg-neutral-200 text-neutral-800 text-xs px-2.5 py-0.5 rounded-full font-medium"
                >
                  Size: {s}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-600"
                    onClick={() => toggleSize(s)}
                  />
                </span>
              ))}

              {filters.onSaleOnly && (
                <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  On Sale
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-900"
                    onClick={() => setFilters((prev) => ({ ...prev, onSaleOnly: false }))}
                  />
                </span>
              )}

              {filters.searchQuery && (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  "{filters.searchQuery}"
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-600"
                    onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
                  />
                </span>
              )}

              <button
                onClick={resetFilters}
                className="text-xs text-[#D8232A] font-bold hover:underline ml-2 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Main Grid + Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block lg:col-span-1 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <span className="font-extrabold text-sm text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-[#D8232A]" /> Refine Collection
                </span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-[#D8232A] font-semibold hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Department */}
              <div>
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2.5">
                  Department
                </h4>
                <div className="space-y-1.5">
                  {[
                    { id: 'all', label: 'All Garments' },
                    { id: 'men', label: "Men's Collection" },
                    { id: 'women', label: "Women's Collection" },
                    { id: 'kids', label: 'Kids & Juniors' },
                    { id: 'accessories', label: 'Shawls & Accessories' },
                  ].map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          category: dept.id as any,
                          subcategory: 'All',
                        }))
                      }
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        filters.category === dept.id
                          ? 'bg-[#D8232A] text-white'
                          : 'text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <span>{dept.label}</span>
                      {filters.category === dept.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brands */}
              <div className="border-t border-neutral-100 pt-4">
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2.5">
                  House of Brands
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {BRAND_INFOS.map((brand) => {
                    const isChecked = filters.brand.includes(brand.name);
                    const count = products.filter((p) => p.brand === brand.name).length;
                    return (
                      <label
                        key={brand.name}
                        className="flex items-center justify-between text-xs text-neutral-700 font-medium cursor-pointer hover:text-neutral-900 py-1"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleBrand(brand.name)}
                            className="rounded border-neutral-300 text-[#D8232A] focus:ring-[#D8232A]"
                          />
                          <span>{brand.name}</span>
                        </div>
                        <span className="text-[11px] text-neutral-400 font-normal">({count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Garment Sizes */}
              <div className="border-t border-neutral-100 pt-4">
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2.5">
                  Garment Size
                </h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {availableSizes.map((sz) => {
                    const isSelected = filters.sizes.includes(sz as any);
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => toggleSize(sz)}
                        className={`py-1.5 px-2 text-xs font-extrabold rounded-lg border transition-all text-center cursor-pointer ${
                          isSelected
                            ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Special Filter Options */}
              <div className="border-t border-neutral-100 pt-4 space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.onSaleOnly}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, onSaleOnly: e.target.checked }))
                    }
                    className="rounded border-neutral-300 text-[#D8232A] focus:ring-[#D8232A]"
                  />
                  <span className="text-red-600">Festive Offers & On Sale</span>
                </label>
              </div>
            </div>
          </aside>

          {/* Product Cards Grid Area */}
          <div className="lg:col-span-3">
            {sortedProducts.length > 0 ? (
              <div
                className={
                  viewLayout === 'list'
                    ? 'flex flex-col gap-4'
                    : viewLayout === 'grid3'
                    ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'
                    : 'grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6'
                }
              >
                {sortedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    layout={viewLayout === 'list' ? 'list' : 'grid'}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
                <div className="w-16 h-16 bg-red-50 text-[#D8232A] rounded-full flex items-center justify-center mx-auto mb-4">
                  <SlidersHorizontal className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">No garments matched your filters</h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1">
                  Try clearing some filter criteria, broadening your price range, or exploring our signature Panjabis or Shirts collections.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-5 px-5 py-2.5 bg-[#D8232A] hover:bg-[#b51c22] text-white text-xs font-bold rounded-full transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <AnimatePresence>
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileFilterOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="relative w-full max-w-xs bg-white h-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
                  <span className="font-black text-sm text-neutral-900 uppercase">Filters</span>
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="p-1 rounded-lg text-neutral-500 hover:bg-neutral-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Brands Mobile */}
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                    House of Brands
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {BRAND_INFOS.map((b) => {
                      const isSel = filters.brand.includes(b.name);
                      return (
                        <button
                          key={b.name}
                          onClick={() => toggleBrand(b.name)}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium border cursor-pointer ${
                            isSel
                              ? 'bg-neutral-900 text-white border-neutral-900'
                              : 'bg-neutral-50 text-neutral-700 border-neutral-200'
                          }`}
                        >
                          {b.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sizes Mobile */}
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                    Sizes
                  </h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {availableSizes.map((sz) => {
                      const isSel = filters.sizes.includes(sz as any);
                      return (
                        <button
                          key={sz}
                          onClick={() => toggleSize(sz)}
                          className={`py-1.5 text-xs font-bold rounded-lg border text-center cursor-pointer ${
                            isSel ? 'bg-neutral-900 text-white' : 'bg-neutral-50 text-neutral-700'
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-4 flex gap-2">
                <button
                  onClick={resetFilters}
                  className="flex-1 py-2.5 bg-neutral-100 text-neutral-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Reset
                </button>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="flex-1 py-2.5 bg-[#D8232A] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Apply ({sortedProducts.length})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
