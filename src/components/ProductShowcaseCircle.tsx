import React from 'react';
import { useStore } from '../context/StoreContext';
import { useSiteContent } from '../context/SiteContentContext';
import { navigate } from '../lib/router';
import { formatPrice } from '../utils/format';
import { Star, ArrowRight, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Product } from '../types';

const imgOf = (p: Product): string => p.colors?.[0]?.image || p.images?.[0] || '';

const blurbOf = (p: Product): string =>
  (p.features && p.features[0]) || p.description || `${p.brand} · ${p.category}`;

const clampStyle: React.CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

/** Three tiny brand dots — echoes the section-header pattern used across the home page. */
const Dots: React.FC = () => (
  <span className="flex items-center gap-1" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <span key={i} className="h-1 w-1 rounded-full bg-[#D8232A]" />
    ))}
  </span>
);

/** Simple decorative leaf for the fresh, organic market feel. */
const Leaf: React.FC<{ className?: string; delay?: number }> = ({ className, delay = 0 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
    style={{ animation: `showcase-float 7s ease-in-out ${delay}s infinite` }}
  >
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
  </svg>
);

/** Circular thumbnail + title + one-liner — clickable, links to the product page. */
const Callout: React.FC<{ product: Product; reverse?: boolean }> = ({ product, reverse = false }) => (
  <button
    type="button"
    onClick={() => navigate(`/products/${product.slug}`)}
    className={`group flex items-center gap-4 text-left focus:outline-none ${
      reverse ? 'lg:flex-row-reverse lg:text-right' : ''
    }`}
  >
    <span className="relative shrink-0">
      <span className="absolute -inset-1.5 rounded-full bg-[#D8232A]/0 transition-colors duration-300 group-hover:bg-[#D8232A]/10" />
      <img
        src={imgOf(product)}
        alt={product.name}
        loading="lazy"
        className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full border-4 border-white object-cover shadow-lg ring-1 ring-neutral-200 transition duration-300 group-hover:scale-105 group-hover:ring-2 group-hover:ring-[#D8232A]/40"
      />
    </span>
    <span className="min-w-0">
      <span className="block truncate text-sm sm:text-base font-bold text-neutral-900 transition-colors group-hover:text-[#D8232A]">
        {product.name}
      </span>
      <span
        className="mt-0.5 block text-xs leading-snug text-neutral-500 sm:text-sm"
        style={clampStyle}
      >
        {blurbOf(product)}
      </span>
      <span className="mt-1 flex items-center gap-2 text-xs font-bold">
        <span className="text-[#D8232A]">{formatPrice(product.price)}</span>
        <span className="flex items-center gap-0.5 text-amber-500">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="text-neutral-400">{product.rating.toFixed(1)}</span>
        </span>
      </span>
    </span>
  </button>
);

/** Trust strip icons + tints — the copy itself is admin-editable (Storefront → Homepage). */
const TRUST_ICONS: { icon: LucideIcon; tint: string }[] = [
  { icon: ShieldCheck, tint: 'bg-emerald-50 text-emerald-600' },
  { icon: Truck, tint: 'bg-sky-50 text-sky-600' },
  { icon: RotateCcw, tint: 'bg-rose-50 text-rose-600' },
];

/**
 * Circle showcase — one hero product inside a big brand-red ring with a glass
 * info card, satellite product callouts around it, and a trust strip below.
 * Pure presentation: every item is a real catalog product and navigates to its
 * detail page. Renders nothing if the catalog is too small.
 */
export const ProductShowcaseCircle: React.FC = () => {
  const { products } = useStore();
  const { content } = useSiteContent();

  /** Trust-strip copy is admin-editable; the icons and tints stay in code. */
  const trustItems = TRUST_ICONS.map((item, i) => ({
    ...item,
    title: [content.trust1Title, content.trust2Title, content.trust3Title][i] ?? '',
    sub: [content.trust1Sub, content.trust2Sub, content.trust3Sub][i] ?? '',
  }));

  const usable = products.filter((p) => imgOf(p) !== '');
  if (usable.length < 2) return null;

  const byScore = [...usable].sort(
    (a, b) =>
      Number(!!b.isTrending) - Number(!!a.isTrending) ||
      Number(!!b.isBestSeller) - Number(!!a.isBestSeller) ||
      (b.rating || 0) - (a.rating || 0) ||
      (b.reviewsCount || 0) - (a.reviewsCount || 0)
  );
  const hero = byScore[0];
  const satellites = byScore.slice(1, 5);
  const leftPair = satellites.filter((_, i) => i % 2 === 0);
  const rightPair = satellites.filter((_, i) => i % 2 === 1);

  const hasStrike = !!hero.originalPrice && hero.originalPrice > hero.price;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FDF6EC]/70 via-white to-white py-16 sm:py-20">
      {/* soft decorative blobs + floating leaves */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-28 -top-24 h-96 w-96 rounded-full bg-[#D8232A]/[0.05] blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -right-24 h-96 w-96 rounded-full bg-emerald-500/[0.06] blur-3xl" />
      <Leaf className="pointer-events-none absolute right-[6%] top-14 hidden h-10 w-10 text-emerald-500/35 lg:block" />
      <Leaf className="pointer-events-none absolute bottom-12 left-[5%] hidden h-8 w-8 text-emerald-600/30 lg:block" delay={1.6} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* section header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex items-center justify-center gap-2.5">
            <Dots />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#D8232A]">
              {content.showcaseEyebrow}
            </span>
            <Dots />
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-neutral-900 sm:text-4xl">
            {content.showcaseTitle}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-500 sm:text-base">
            {content.showcaseSubtitle}
          </p>
        </div>

        {/* main showcase — satellites orbit the hero circle */}
        <div className="mt-12 grid items-center gap-10 lg:mt-16 lg:grid-cols-[1fr_auto_1fr] lg:gap-6 xl:gap-10">
          {/* left satellites (thumbnails face the circle) */}
          <div className="order-2 flex flex-col gap-8 sm:gap-10 lg:order-1 lg:items-end">
            {leftPair.map((p) => (
              <Callout key={p.id} product={p} reverse />
            ))}
          </div>

          {/* hero circle */}
          <div className="order-1 flex flex-col items-center lg:order-2">
            <div className="relative">
              {/* rotating halo with an orbiting dot */}
              <div
                aria-hidden="true"
                className="absolute -inset-6"
                style={{ animation: 'showcase-spin 40s linear infinite' }}
              >
                <span className="absolute inset-0 rounded-full border-2 border-dashed border-[#D8232A]/25" />
                <span className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-[#D8232A] shadow-md ring-4 ring-white" />
              </div>

              <button
                type="button"
                onClick={() => navigate(`/products/${hero.slug}`)}
                aria-label={`View ${hero.name}`}
                className="group relative block h-[300px] w-[300px] rounded-full bg-[#D8232A] p-3 shadow-[0_30px_70px_-20px_rgba(216,35,42,0.5)] transition-transform duration-500 hover:scale-[1.02] focus:outline-none sm:h-[380px] sm:w-[380px] lg:h-[440px] lg:w-[440px]"
              >
                <span className="block h-full w-full overflow-hidden rounded-full bg-[#FDF6EC] p-2">
                  <img
                    src={imgOf(hero)}
                    alt={hero.name}
                    className="h-full w-full rounded-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </span>
                {/* floating category chip */}
                <span className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-700 shadow-lg backdrop-blur-sm">
                  {hero.category}
                </span>
              </button>
            </div>

            {/* glass info card overlapping the circle */}
            <div className="relative z-10 -mt-10 w-full max-w-sm rounded-2xl border border-neutral-200 bg-white/95 px-6 py-4 text-center shadow-xl backdrop-blur">
              <p className="truncate text-base font-black text-neutral-900 sm:text-lg">{hero.name}</p>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < Math.floor(hero.rating || 0)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-neutral-300'
                      }`}
                    />
                  ))}
                </span>
                <span className="text-xs font-bold text-neutral-700">{hero.rating || 0}</span>
                <span className="text-xs text-neutral-400">({hero.reviewsCount || 0})</span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-center gap-2">
                <span className="text-xl font-black text-[#D8232A]">{formatPrice(hero.price)}</span>
                {hasStrike && (
                  <span className="text-sm font-semibold text-neutral-400 line-through">
                    {formatPrice(hero.originalPrice!)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => navigate(`/products/${hero.slug}`)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#D8232A] px-5 py-2 text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-neutral-900 focus:outline-none"
              >
                View details
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* right satellites */}
          <div className="order-3 flex flex-col gap-8 sm:gap-10">
            {rightPair.map((p) => (
              <Callout key={p.id} product={p} />
            ))}
          </div>
        </div>

        {/* trust strip */}
        <div className="mx-auto mt-14 grid max-w-3xl gap-3 sm:grid-cols-3">
          {trustItems.map(({ icon: Icon, tint, title, sub }) => (
            <div
              key={title}
              className="flex items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 backdrop-blur"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tint}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-neutral-900">{title}</span>
                <span className="block text-xs text-neutral-500">{sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
