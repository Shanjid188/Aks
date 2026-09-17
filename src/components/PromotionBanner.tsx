import React, { useEffect, useState } from 'react';
import { dataLoader } from '../lib/dataLoader';
import type { ApiPromotion } from '../api';
import { navigate } from '../lib/router';
import { ArrowRight, Megaphone } from 'lucide-react';

/** Open a promotion link — internal routes use the SPA router, external URLs
 *  open in a new tab. Returns early when no link is configured. */
const openPromotion = (link: string | null) => {
  if (!link) return;
  if (link.startsWith('/')) navigate(link);
  else window.open(link, '_blank');
};

/**
 * DB-driven promotions banner — renders whatever active Promotion rows the
 * backend returns. Renders nothing when the API is unavailable or empty
 * (no bundled fallback data exists, so there is nothing to show offline).
 */
export const PromotionBanner: React.FC = () => {
  const [promotions, setPromotions] = useState<ApiPromotion[]>([]);

  useEffect(() => {
    let cancelled = false;
    dataLoader.loadPromotions().then((loaded) => {
      if (!cancelled) setPromotions(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (promotions.length === 0) return null;

  return (
    <section className="bg-white" aria-label="Promotions">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid gap-4 lg:grid-cols-2">
          {promotions.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => openPromotion(p.link)}
              className={`group relative w-full text-left rounded-2xl overflow-hidden min-h-[150px] sm:min-h-[170px] ${
                p.link ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              {/* Banner background — promo image if present, else brand-red gradient */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-br from-[#D8232A] via-[#c91d24] to-neutral-900"
              />
              {p.image && (
                <img
                  src={p.image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-0 bg-neutral-900/55" />

              {/* Content */}
              <div className="relative z-10 flex flex-col justify-center h-full p-6 sm:p-8 text-white">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                  <Megaphone className="w-3.5 h-3.5 text-[#FDB8BC]" />
                  Promotion
                </span>
                <h2 className="mt-2 text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  {p.title}
                </h2>
                {p.subtitle && (
                  <p className="mt-1 text-sm text-white/85 max-w-md leading-snug">{p.subtitle}</p>
                )}
                {p.link && (
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-white bg-white/15 border border-white/25 rounded-full px-4 py-2 backdrop-blur-sm group-hover:bg-white group-hover:text-[#D8232A] transition-colors w-fit">
                    Shop Now <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
