import React from 'react';
import { useStore } from '../context/StoreContext';
import { useSiteContent } from '../context/SiteContentContext';
import { HomeProductCard } from './HomeProductCard';
import { SectionHeader } from './SectionHeader';
import { SectionAction } from './SectionAction';
import { useLocalized } from './Localized';
import { navigate } from '../lib/router';
import { ProductRailSkeleton } from './Skeleton';

export const NewArrivals: React.FC = () => {
  const { products, setFilters, catalogLoading } = useStore();
  const { content } = useSiteContent();
  const t = useLocalized();

  const newArrivals = products
    .filter((p) => p.isNewArrival)
    .sort((a, b) => (b.id || '').localeCompare(a.id || ''))
    .slice(0, 4);

  // Placeholder cards while the catalog loads — no bundled products flash.
  if (catalogLoading) {
    return (
      <section className="bg-neutral-50 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ProductRailSkeleton count={4} />
        </div>
      </section>
    );
  }

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
            <SectionAction onClick={handleViewAll}>
              {t(content.newArrivalsAction, content.newArrivalsActionBn)}
            </SectionAction>
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
