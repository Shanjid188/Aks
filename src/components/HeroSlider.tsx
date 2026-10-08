import React, { useState, useEffect } from 'react';
import type { HeroSlide } from '../data/promos';
import { dataLoader } from '../lib/dataLoader';
import { useStore } from '../context/StoreContext';
import { ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, Zap, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { HeroSideBanners } from './HeroSideBanners';
import { HeroSkeleton } from './Skeleton';

export const HeroSlider: React.FC = () => {
  const { setFilters, setActiveProductPage } = useStore();
  const { language } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  // Slides arrive from the API (Admin → Hero Slides). Nothing is rendered until
  // they do, so the bundled slides never flash first — `loadHeroSlides` itself
  // falls back to them when the API is unavailable.
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    let cancelled = false;
    dataLoader.loadHeroSlides().then((loaded) => {
      if (cancelled) return;
      setSlides(loaded);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isPaused || slides.length === 0) return;
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    // 2s was too fast to read anything and made the crossfade overlap visible
    // for a quarter of the cycle — 6s gives each slide time on screen.
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  if (loading) return <HeroSkeleton />;
  if (slides.length === 0) return null;

  const slide = slides[currentSlide % slides.length];

  const goTo = (idx: number) => {
    setDirection(idx > currentSlide ? 1 : -1);
    setCurrentSlide(idx);
  };

  const goNext = () => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const goPrev = () => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  // Honest, verifiable trust points (no invented claims).
  const FEATURE_STRIP = [
    '100% Quality Checked',
    'Home Delivery Across Bangladesh',
    'Cash on Delivery Available',
    'bKash, Nagad & Cash on Delivery',
  ];

  const handleSlideCta = (current: HeroSlide) => {
    setActiveProductPage(null);
    setFilters((prev) => ({
      ...prev,
      category: (current.ctaCategory as any) || 'all',
      subcategory: current.ctaSubcategory || 'All',
      brand: current.ctaBrand ? [current.ctaBrand] : [],
      searchQuery: '',
    }));
    const catalogEl = document.getElementById('product-catalog-section');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Localised slide copy. New slides are image-only (Admin → Hero slides), so the
  // overlay block below renders only when a slide actually carries text — a plain
  // upload stays a clean, full-bleed banner.
  const slideBadge = language === 'bn' && slide.badgeBn ? slide.badgeBn : slide.badge;
  const slideTitle = language === 'bn' && slide.titleBn ? slide.titleBn : slide.title;
  const slideSubtitle = language === 'bn' && slide.subtitleBn ? slide.subtitleBn : slide.subtitle;
  const slideTagline = language === 'bn' && slide.taglineBn ? slide.taglineBn : slide.tagline;
  const slideCtaText = language === 'bn' && slide.ctaTextBn ? slide.ctaTextBn : slide.ctaText;
  const hasCopy = Boolean(slideBadge || slideTitle || slideSubtitle || slideTagline);

  return (
    <div
      className="relative bg-neutral-100 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Contained hero zone: the carousel card and the promo column are two
          columns of the SAME grid row, so both always share one height. Below
          `xl` the grid collapses and the promos drop under the hero. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Mobile locks the card to 16:10 — the old min-h-[380px] made the box
            near-square (358x380), so object-cover had to zoom a 16:9 photo to
            ~1.5x and slice away almost half its width. Wider breakpoints keep
            their original min-heights because the card is already landscape
            there (e.g. 720x435, 860x505 ≈ 16:9). */}
        <div className="relative flex items-center overflow-hidden rounded-2xl bg-neutral-900 shadow-lg shadow-neutral-900/5 aspect-[16/10] sm:aspect-auto sm:min-h-[435px] lg:min-h-[505px]">
          {/* Background Image Carousel — true crossfade, no overlay or shadow */}
          <AnimatePresence initial={false}>
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
              className="absolute inset-0 z-0"
            >
              <img
                src={slide.image}
                alt={slide.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain object-center xl:object-cover"
              />
            </motion.div>
          </AnimatePresence>

          {/* Contrast scrim — only when HTML copy sits on the photo; plain
              image-only slides (hasCopy === false) keep their full brightness.
              Two gradients — one anchored to the bottom, one to the left where
              the text block lives — keep white text readable on any slide. */}
          {hasCopy && (
            <div
              className="absolute inset-0 z-[1] pointer-events-none"
              style={{
                background:
                  'linear-gradient(to top, rgba(9,9,11,0.90) 0%, rgba(9,9,11,0.50) 45%, rgba(9,9,11,0.18) 100%), linear-gradient(to right, rgba(9,9,11,0.70) 0%, rgba(9,9,11,0.30) 55%, rgba(9,9,11,0) 100%)',
              }}
            />
          )}

          {/* Hero Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16 sm:py-12 lg:py-16 w-full">
            <div className="max-w-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 0.61, 0.36, 1] }}
                  className="space-y-3 sm:space-y-6 [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]"
                >
                  {hasCopy && (
                    <>
                      {/* Badge */}
                      {slideBadge && (
                        <div className="inline-flex items-center gap-2 px-3.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-widest uppercase">
                          <span
                            className="w-2 h-2 rounded-full animate-pulse"
                            style={{ backgroundColor: slide.accentColor }}
                          />
                          {slideBadge}
                        </div>
                      )}

                      {/* Main Heading */}
                      {slideTitle && (
                        <h2 className="text-2xl min-[400px]:text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.05]">
                          {slideTitle}
                        </h2>
                      )}

                      {/* Subtitle — hidden below sm: the 16:10 mobile card has
                          no vertical room for it (badge + title + CTA already
                          fill the box); sm+ layouts are wide enough to spare it. */}
                      {slideSubtitle && (
                        <p className="hidden sm:block text-base sm:text-lg lg:text-xl text-neutral-300 font-normal leading-relaxed max-w-xl">
                          {slideSubtitle}
                        </p>
                      )}

                      {/* Tagline pill — same mobile cutoff as the subtitle. */}
                      {slideTagline && (
                        <div className="hidden sm:flex text-sm text-neutral-400 font-semibold tracking-wide items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>{slideTagline}</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-3.5">
                        {slideCtaText && (
                          <button
                            onClick={() => handleSlideCta(slide)}
                            className="px-5 py-3 sm:px-8 sm:py-3.5 rounded-full text-white font-extrabold text-sm sm:text-base flex items-center gap-2.5 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                            style={{ backgroundColor: slide.accentColor }}
                          >
                            <span>{slideCtaText}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setFilters((prev) => ({
                              ...prev,
                              category: 'all',
                              subcategory: 'All',
                              onSaleOnly: true,
                              brand: [],
                            }));
                            const catalogEl = document.getElementById('product-catalog-section');
                            if (catalogEl) catalogEl.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="px-4 py-2.5 sm:px-5 sm:py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 backdrop-blur-md transition-all cursor-pointer"
                        >
                          View All Deals
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Carousel Navigation Arrows */}
          <div className="absolute right-6 bottom-6 z-20 flex items-center gap-2">
            <button
                    onClick={() =>
                setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))
              }
              className="w-10 h-10 rounded-full bg-neutral-900/80 hover:bg-white hover:text-neutral-900 text-white border border-neutral-700 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
                          onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
              className="w-10 h-10 rounded-full bg-neutral-900/80 hover:bg-white hover:text-neutral-900 text-white border border-neutral-700 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Slide Indicators */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-6 z-20 flex items-center">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                aria-current={currentSlide === idx ? 'true' : undefined}
                className="px-2 -mx-2 py-3 flex items-center cursor-pointer"
              >
                {/* The visible bar is only 8px tall, which is far too small to hit
                    with a finger. Padding grows the tap area to 32px tall while the
                    matching -mx-2 hands that space back to the layout, so the dots
                    keep their original 8px visual gap. */}
                <span
                  aria-hidden="true"
                  className={`h-2 rounded-full transition-all block ${
                    currentSlide === idx ? 'w-8 bg-[#D8232A]' : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Promotional side banners — same grid row as the carousel (xl and up). */}
        <HeroSideBanners />

        {/* Trust strip — a rounded band right under the hero row, full row width */}
        <div className="rounded-2xl bg-neutral-950 px-4 sm:px-6 py-3.5 text-neutral-300 shadow-lg shadow-neutral-900/5 xl:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium">
            {FEATURE_STRIP.map((f, i) => (
              <div key={f} className="flex items-center gap-2.5">
                {i === 0 && <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />}
                {i === 1 && <Zap className="w-4 h-4 text-amber-400 shrink-0" />}
                {i === 2 && <Award className="w-4 h-4 text-rose-400 shrink-0" />}
                {i === 3 && <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />}
                <span className="leading-tight">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
