import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '../lib/router';
import { ArrowRight, Sparkles } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { SectionAction } from './SectionAction';
import { useLocalized } from './Localized';
import { useStore } from '../context/StoreContext';
import { useSiteContent } from '../context/SiteContentContext';
import { SkeletonBlock } from './Skeleton';

/** Fallback card step (card + gap) when the rail is not measurable yet. */
const STEP_FALLBACK = 344;

/**
 * Homepage division showcase — "Our brands" style rail.
 *
 * One compact card per division (API-driven from Admin → Categories) inside a
 * rounded, scroll-snapping rail: 5 cards per view on desktop, 3 on tablet and a
 * peek of the next card on phones. A section head carries the title and the
 * "see all" pill; as soon as the rail holds more cards than fit, clickable dots
 * below it (and swipe) page through the rest.
 *
 * Every card is a division from Admin → Categories: give it a name and a
 * picture (Image / Grid image) and it appears here in that order.
 */
export const CategoryVisualGrid: React.FC = () => {
  const { products, categories, catalogLoading } = useStore();
  const { content } = useSiteContent();
  const t = useLocalized();

  const railRef = useRef<HTMLDivElement>(null);
  /** Card width + gap, measured from the DOM so every breakpoint works. */
  const stepRef = useRef(STEP_FALLBACK);
  const [active, setActive] = useState(0);
  const [positions, setPositions] = useState(1);
  /** Cards in the rail — one per division created in Admin → Categories. */
  const itemCount = categories.length;

  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const first = rail.children[0] as HTMLElement | undefined;
    const second = rail.children[1] as HTMLElement | undefined;
    stepRef.current = Math.max(
      1,
      first && second ? second.offsetLeft - first.offsetLeft : (first?.offsetWidth ?? STEP_FALLBACK - 24) + 24,
    );
    const max = rail.scrollWidth - rail.clientWidth;
    setPositions(max <= 4 ? 1 : Math.round(max / stepRef.current) + 1);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, itemCount]);

  const handleScroll = () => {
    const rail = railRef.current;
    if (!rail) return;
    const index = Math.round(rail.scrollLeft / stepRef.current);
    setActive(Math.min(positions - 1, Math.max(0, index)));
  };

  const goTo = (index: number) => {
    railRef.current?.scrollTo({ left: index * stepRef.current, behavior: 'smooth' });
  };

  // Skeleton rail while the divisions load, so the bundled division artwork
  // never flashes before the merchant's own images arrive.
  if (catalogLoading) {
    return (
      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-3 overflow-hidden sm:gap-6">
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonBlock
                key={i}
                className="aspect-[4/3] shrink-0 basis-[80%] sm:basis-[calc((100%-3rem)/3)] lg:basis-[calc((100%-6rem)/5)]"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow={
            <>
              <Sparkles className="h-3.5 w-3.5" />
              {t(content.divisionsEyebrow, content.divisionsEyebrowBn)}
            </>
          }
          title={t(content.divisionsTitle, content.divisionsTitleBn)}
          subtitle={t(content.divisionsSubtitle, content.divisionsSubtitleBn)}
          action={
            <SectionAction to="/products" ariaLabel={t(content.divisionsAction, content.divisionsActionBn)}>
              {t(content.divisionsAction, content.divisionsActionBn)}
            </SectionAction>
          }
        />

        {/* Rounded rail — the cards glide horizontally with even gaps. */}
        <div className="rounded-[28px] bg-neutral-50 p-3 shadow-sm ring-1 ring-neutral-100 sm:p-4">
          <div
            ref={railRef}
            onScroll={handleScroll}
            className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth sm:gap-6"
          >
            {categories.map((d) => {
              const count = products.filter((p) => p.category === d.slug).length;
              return (
                <Link
                  key={d.slug}
                  to={`/category/${d.slug}`}
                  ariaLabel={`Shop ${d.name}`}
                  className="group relative aspect-[4/3] shrink-0 basis-[80%] snap-start overflow-hidden rounded-2xl bg-neutral-200 ring-1 ring-black/5 transition-all duration-300 hover:ring-black/10 sm:basis-[calc((100%-3rem)/3)] lg:basis-[calc((100%-6rem)/5)]"
                >
                  <img
                    src={d.gridImage || d.image || ''}
                    alt={d.name}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/25 to-transparent" />

                  <span
                    className="absolute left-3 top-3 z-10 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm"
                    style={{ backgroundColor: d.accentColor }}
                  >
                    {d.badge || d.name}
                  </span>

                  {count > 0 && (
                    <span className="absolute right-3 top-3 z-10 hidden rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm xl:inline-block">
                      {count} {count === 1 ? 'product' : 'products'}
                    </span>
                  )}

                  <div className="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-3.5">
                    <h3 className="truncate text-sm font-bold tracking-tight text-white transition-colors group-hover:text-amber-200 sm:text-base">
                      {d.name}
                    </h3>
                    {d.tagline && <p className="mt-0.5 line-clamp-1 text-[11px] text-neutral-300">{d.tagline}</p>}

                    {/* The compact 5-up cards keep only the essentials; phones
                        get the tap-through hint because there is no hover. */}
                    <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-white sm:hidden">
                      {t('Shop now', 'এখনই কিনুন')}
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {positions > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            {Array.from({ length: positions }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={active === i ? 'true' : undefined}
                className={`h-2 cursor-pointer rounded-full transition-all duration-300 ${
                  active === i ? 'w-7 bg-[#D8232A]' : 'w-2 bg-neutral-300 hover:bg-neutral-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
