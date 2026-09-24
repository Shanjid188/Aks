import React from 'react';
import { Link } from '../lib/router';
import { ArrowRight, Sparkles } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { useStore } from '../context/StoreContext';
import { useSiteContent } from '../context/SiteContentContext';

/**
 * Homepage division showcase — premium bento grid.
 * Fully API-driven: first division gets a hero-sized tile; every tile shows a
 * real product count computed from the live catalog and navigates to /category/:slug.
 */
export const CategoryVisualGrid: React.FC = () => {
  const { products, categories } = useStore();
  const { content } = useSiteContent();

  return (
    <section className="py-14 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow={
            <>
              <Sparkles className="w-3.5 h-3.5" />
              {content.divisionsEyebrow}
            </>
          }
          title={content.divisionsTitle}
          subtitle={content.divisionsSubtitle}
          action={
            <Link
              to="/products"
              className="flex items-center gap-1.5 text-sm font-bold text-neutral-900 hover:text-[#D8232A] transition-colors group shrink-0"
            >
              {content.divisionsAction}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[17rem] gap-4 sm:gap-5">
          {categories.map((d, idx) => {
            const count = products.filter((p) => p.category === d.slug).length;
            const isFeature = idx === 0;
            return (
              <Link
                key={d.slug}
                to={`/category/${d.slug}`}
                ariaLabel={`Shop ${d.name}`}
                className={`group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-neutral-100 transition-all duration-300 cursor-pointer flex flex-col justify-end p-5 sm:p-6 h-64 sm:h-72 lg:h-full ${
                  isFeature ? 'sm:col-span-2 lg:col-span-2 lg:row-span-2 sm:h-80' : ''
                }`}
              >
                <img
                  src={d.gridImage || d.image || ''}
                  alt={d.name}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/95 via-neutral-950/35 to-transparent" />

                <div className="relative z-10 mb-auto">
                  <span
                    className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-white px-2.5 py-1 rounded-full shadow-sm"
                    style={{ backgroundColor: d.accentColor }}
                  >
                    {d.badge || d.name}
                  </span>
                </div>

                <div className="relative z-10">
                  <h3
                    className={`font-bold text-white tracking-tight group-hover:text-amber-200 transition-colors ${
                      isFeature ? 'text-2xl' : 'text-lg'
                    }`}
                  >
                    {d.name}
                  </h3>
                  <p className={`text-neutral-300 mt-1 ${isFeature ? 'text-sm line-clamp-2' : 'text-xs line-clamp-1'}`}>
                    {d.tagline}
                  </p>
                  <div className="flex items-center justify-between mt-3 gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-white group-hover:translate-x-1 transition-transform">
                      Shop now
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    {count > 0 && (
                      <span className="text-[11px] font-semibold text-neutral-200 bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full whitespace-nowrap">
                        {count} {count === 1 ? 'product' : 'products'}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
