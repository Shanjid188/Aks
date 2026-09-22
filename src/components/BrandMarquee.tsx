import React from 'react';
import { Link } from '../lib/router';
import { useStore } from '../context/StoreContext';

/**
 * Scrolling brand strip — division brands with their taglines, from the API.
 * Pure navigation + illustration; duplicated list makes the loop seamless.
 */
export const BrandMarquee: React.FC = () => {
  const { categories } = useStore();
  const items = [...categories, ...categories];

  return (
    <div
      className="relative overflow-hidden border-y border-neutral-100 bg-white py-4"
      aria-label="AKS Mart divisions"
    >
      <div className="marquee-track flex w-max items-center gap-12 pr-12">
        {items.map((d, i) => (
          <Link
            key={`${d.slug}-${i}`}
            to={`/category/${d.slug}`}
            className="group flex shrink-0 items-center gap-3"
          >
            <span
              className="h-2.5 w-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: d.accent }}
              aria-hidden="true"
            />
            <span className="text-lg font-black tracking-tight text-neutral-900 transition-colors group-hover:text-[#D8232A]">
              {d.brand}
            </span>
            <span className="hidden text-sm font-semibold text-neutral-400 md:inline">
              {d.subtitle}
            </span>
          </Link>
        ))}
      </div>

      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent" />
    </div>
  );
};