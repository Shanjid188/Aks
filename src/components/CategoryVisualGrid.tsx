import React from 'react';
import { useStore } from '../context/StoreContext';
import { ArrowRight, Sparkles } from 'lucide-react';
import { DIVISIONS } from '../data/aksMart';

export const CategoryVisualGrid: React.FC = () => {
  const { setFilters, setActiveProductPage } = useStore();

  const categories = DIVISIONS.map((d) => ({
    title: d.title,
    subtitle: d.subtitle,
    image: d.image,
    category: d.slug,
    subcategory: 'All',
    badge: d.badge,
    badgeColor: d.badgeClass,
  }));

  const handleTileClick = (item: (typeof categories)[0]) => {
    setActiveProductPage(null);
    setFilters((prev) => ({
      ...prev,
      category: item.category as any,
      subcategory: item.subcategory || 'All',
      brand: [],
      searchQuery: '',
    }));
    const catalogEl = document.getElementById('product-catalog-section');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#D8232A] uppercase tracking-widest mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Curated Collections
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
              Explore Our Five Mart Divisions
            </h2>
          </div>
          <p className="text-sm text-neutral-500 max-w-md">
            From SHUDDHO pure food to AKS CRAFT handiwork, AKS HOME comfort, AKS BEAUTY care and AKS PRINT custom print — everything under one mart.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat, idx) => (
            <div
              key={idx}
              onClick={() => handleTileClick(cat)}
              className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-neutral-100 transition-all duration-300 cursor-pointer h-72 flex flex-col justify-end p-6"
            >
              {/* Background Image */}
              <img
                src={cat.image}
                alt={cat.title}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-106 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

              {/* Badge */}
              <div className="relative z-10 mb-auto">
                <span
                  className={`inline-block text-[11px] font-extrabold uppercase tracking-wider text-white px-2.5 py-1 rounded-full shadow-sm ${cat.badgeColor}`}
                >
                  {cat.badge}
                </span>
              </div>

              {/* Content */}
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-amber-200 transition-colors">
                  {cat.title}
                </h3>
                <p className="text-xs text-neutral-300 mt-1 line-clamp-1">{cat.subtitle}</p>
                <div className="flex items-center gap-1 text-xs font-bold text-white mt-3 group-hover:translate-x-1 transition-transform">
                  <span>Explore Division</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
