import React from 'react';
import { useStore } from '../context/StoreContext';
import { useSiteContent } from '../context/SiteContentContext';
import { HomeProductCard } from './HomeProductCard';
import { SectionHeader } from './SectionHeader';
import { useLocalized } from './Localized';
import { ArrowRight } from 'lucide-react';
import { navigate } from '../lib/router';

export const BestSellers: React.FC = () => {
  const { products, setFilters } = useStore();
  const { content } = useSiteContent();
  const t = useLocalized();

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
          eyebrow={t(content.bestSellersEyebrow, content.bestSellersEyebrowBn)}
          accentDotClass="bg-amber-500"
          title={t(content.bestSellersTitle, content.bestSellersTitleBn)}
          subtitle={t(content.bestSellersSubtitle, content.bestSellersSubtitleBn)}
          action={
            <button
              onClick={handleViewAll}
              className="flex items-center gap-1.5 text-sm font-bold text-neutral-900 hover:text-[#D8232A] transition-colors group"
            >
              <span>{t(content.bestSellersAction, content.bestSellersActionBn)}</span>
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
