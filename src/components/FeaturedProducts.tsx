import React from 'react';
import { useStore } from '../context/StoreContext';
import { useSiteContent } from '../context/SiteContentContext';
import { HomeProductCard } from './HomeProductCard';
import { SectionHeader } from './SectionHeader';
import { useLocalized } from './Localized';
import { ArrowRight } from 'lucide-react';
import { navigate } from '../lib/router';

export const FeaturedProducts: React.FC = () => {
  const { products, setFilters } = useStore();
  const { content } = useSiteContent();
  // Section copy follows the shopper's language (English stays the default).
  const t = useLocalized();

  // A product shows here when an admin ticks “Featured on homepage” *or* gives
  // it a featured order (both controls live in Products → Edit product).
  const featuredProducts = products
    .filter((p) => p.isFeatured || (p.featuredOrder ?? 0) > 0)
    .sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99))
    .slice(0, 8);

  if (featuredProducts.length === 0) return null;

  const handleViewAll = () => {
    setFilters((prev) => ({
      ...prev,
      sortOption: 'featured',
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
          eyebrow={t(content.featuredEyebrow, content.featuredEyebrowBn)}
          title={t(content.featuredTitle, content.featuredTitleBn)}
          subtitle={t(content.featuredSubtitle, content.featuredSubtitleBn)}
          action={
            <button
              onClick={handleViewAll}
              className="flex items-center gap-1.5 text-sm font-bold text-neutral-900 hover:text-[#D8232A] transition-colors group"
            >
              <span>{t(content.featuredAction, content.featuredActionBn)}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {featuredProducts.map((product) => (
            <HomeProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};
