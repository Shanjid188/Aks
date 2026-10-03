import React from 'react';

/**
 * Neutral loading placeholders for the homepage sections.
 *
 * The sections used to render their bundled (hardcoded) artwork first and swap
 * to the merchant's own images once the API answered — so every page load
 * flashed stale pictures. While data is on its way the sections now show these
 * placeholders instead: same box sizes, so nothing shifts when the real images
 * arrive, and the bundled fallback is only used when the API genuinely fails.
 */
export const SkeletonBlock: React.FC<{ className?: string }> = ({ className }) => (
  <div aria-hidden="true" className={`animate-pulse rounded-2xl bg-neutral-200/80 ${className ?? ''}`} />
);

/** A grid of product-card placeholders (image + two text lines). */
export const ProductRailSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 4,
  className,
}) => (
  <div aria-hidden="true" className={`grid grid-cols-2 gap-4 md:grid-cols-4 ${className ?? ''}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="space-y-3">
        <SkeletonBlock className="aspect-[4/5]" />
        <SkeletonBlock className="h-3 w-3/4 rounded-full" />
        <SkeletonBlock className="h-3 w-1/3 rounded-full" />
      </div>
    ))}
  </div>
);

/** Hero placeholder — the carousel card plus its side column, in the same grid. */
export const HeroSkeleton: React.FC = () => (
  <section aria-hidden="true" className="bg-white">
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-3 sm:gap-6 lg:grid-cols-3">
        <SkeletonBlock className="h-[260px] rounded-3xl sm:h-[380px] lg:col-span-2 lg:h-[440px]" />
        <div className="hidden space-y-6 lg:block">
          <SkeletonBlock className="h-[130px]" />
          <SkeletonBlock className="h-[130px]" />
        </div>
      </div>
    </div>
  </section>
);

/**
 * Whole-section placeholder. The home page loads each section on demand, so
 * this keeps the page height stable for the moment a section chunk arrives.
 */
export const SectionSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <section aria-hidden="true" className="bg-white py-14 sm:py-20">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="w-full max-w-md space-y-3">
          <SkeletonBlock className="h-3 w-28 rounded-full" />
          <SkeletonBlock className="h-7 w-64" />
          <SkeletonBlock className="h-3 w-full" />
        </div>
        <SkeletonBlock className="hidden h-10 w-32 rounded-full sm:block" />
      </div>
      <ProductRailSkeleton count={count} />
    </div>
  </section>
);
