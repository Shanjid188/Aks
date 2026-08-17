import React from 'react';
import { BRAND_INFOS } from '../data/promos';
import { useStore } from '../context/StoreContext';

export const BrandBar: React.FC = () => {
  const { filters, setFilters, setActiveProductPage } = useStore();

  const handleBrandClick = (brandName: string) => {
    setActiveProductPage(null);
    setFilters((prev) => {
      const isSelected = prev.brand.includes(brandName);
      return {
        ...prev,
        brand: isSelected ? [] : [brandName],
        category: 'all',
        subcategory: 'All',
        searchQuery: '',
      };
    });
    const catalogEl = document.getElementById('product-catalog-section');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="bg-neutral-50 py-8 border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              World-Class Portfolio
            </h3>
            <h2 className="text-lg font-black text-neutral-900 tracking-tight">
              Shop by Authentic House of Brands
            </h2>
          </div>
          <span className="text-xs text-neutral-500 font-medium hidden sm:inline">
            Click any brand to filter collection
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {BRAND_INFOS.map((brand) => {
            const isSelected = filters.brand.includes(brand.name);
            return (
              <button
                key={brand.name}
                onClick={() => handleBrandClick(brand.name)}
                className={`p-3.5 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer group ${
                  isSelected
                    ? 'bg-neutral-900 border-neutral-900 text-white shadow-md'
                    : 'bg-white border-neutral-200 hover:border-neutral-400 hover:shadow-xs text-neutral-800'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs transition-transform group-hover:scale-105 ${
                    isSelected ? 'text-white' : 'text-white'
                  }`}
                  style={{ backgroundColor: brand.accent }}
                >
                  {brand.logoText.substring(0, 3)}
                </div>
                <span className="text-xs font-bold tracking-tight truncate w-full">
                  {brand.name}
                </span>
                <span
                  className={`text-[10px] truncate w-full ${
                    isSelected ? 'text-neutral-300' : 'text-neutral-400'
                  }`}
                >
                  {brand.tag}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
