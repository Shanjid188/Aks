import React from 'react';
import { useStore } from '../context/StoreContext';
import { HomeProductCard } from './HomeProductCard';
import { SectionHeader } from './SectionHeader';
import { ArrowRight } from 'lucide-react';
import { navigate } from '../lib/router';

export const NewArrivals: React.FC = () => {
  const { products, setFilters } = useStore();

  const newArrivals = products
    .filter((p) => p.isNewArrival)
    .sort((a, b) => (b.id || '').localeCompare(a.id || ''))
    .slice(0, 4);

  if (newArrivals.length === 0) return null;

  const handleViewAll = () => {
    setFilters((prev) => ({
      ...prev,
      sortOption: 'newest',
      category: 'all',
      subcategory: 'All',
      brand: [],
      searchQuery: '',
      onSaleOnly: false,
    }));
    navigate('/products');
  };

  return (
    <section className="py-14 sm:py-20 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Just Landed"
          accentDotClass="bg-emerald-600"
          title="New Arrivals"
          subtitle="Fresh picks and latest additions to the AKS Mart family."
          action={
            <button
              onClick={handleViewAll}
              className="flex items-center gap-1.5 text-sm font-bold text-neutral-900 hover:text-[#D8232A] transition-colors group"
            >
              <span>View All New</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {newArrivals.map((product) => (
            <HomeProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};
