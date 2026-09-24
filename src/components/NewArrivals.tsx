import React from 'react';
import { useStore } from '../context/StoreContext';
import { useSiteContent } from '../context/SiteContentContext';
import { HomeProductCard } from './HomeProductCard';
import { SectionHeader } from './SectionHeader';
import { useLocalized } from './Localized';
import { ArrowRight } from 'lucide-react';
import { navigate } from '../lib/router';

export const NewArrivals: React.FC = () => {
  const { products, setFilters } = useStore();
  const { content } = useSiteContent();
  const t = useLocalized();

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
          eyebrow={t(content.newArrivalsEyebrow, content.newArrivalsEyebrowBn)}
          accentDotClass="bg-emerald-600"
          title={t(content.newArrivalsTitle, content.newArrivalsTitleBn)}
          subtitle={t(content.newArrivalsSubtitle, content.newArrivalsSubtitleBn)}
          action={
            <button
              onClick={handleViewAll}
              className="flex items-center gap-1.5 text-sm font-bold text-neutral-900 hover:text-[#D8232A] transition-colors group"
            >
              <span>{t(content.newArrivalsAction, content.newArrivalsActionBn)}</span>
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
