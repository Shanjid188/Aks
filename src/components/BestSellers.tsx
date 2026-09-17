import React from 'react';
import { useStore } from '../context/StoreContext';
import { HomeProductCard } from './HomeProductCard';
import { SectionHeader } from './SectionHeader';
import { ArrowRight } from 'lucide-react';
import { navigate } from '../lib/router';

export const BestSellers: React.FC = () => {
  const { products, setFilters } = useStore();

  const bestSellers = products
    .filter((p) => p.isBestSeller)
    .sort((a, b) => (a.featuredOrder || 99) - (b.featuredOrder || 99))
    .slice(0, 4);

  if (bestSellers.length === 0) return null;

  const handleViewAll = () => {
    setFilters((prev) => ({
      ...prev,
      sortOption: 'bestseller',
      category: 'all',
      subcategory: 'All',
      brand: [],
      searchQuery: '',
      onSaleOnly: false,
    }));
    navigate('/products');
  };

  return (
    <section className="py-14 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Top Picks"
          accentDotClass="bg-amber-500"
          title="Best Sellers"
          subtitle="Most-loved products chosen by the AKS Mart community."
          action={
            <button
              onClick={handleViewAll}
              className="flex items-center gap-1.5 text-sm font-bold text-neutral-900 hover:text-[#D8232A] transition-colors group"
            >
              <span>View All Best Sellers</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {bestSellers.map((product) => (
            <HomeProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};
