import React, { useState, useEffect } from 'react';
import { HERO_SLIDES, HeroSlide } from '../data/promos';
import { dataLoader } from '../lib/dataLoader';
import { useStore } from '../context/StoreContext';
import { ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, Zap, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BRAND_BN, SLIDER_DESC_BN } from '../data/bn';
import { FEATURE_STRIP_BN } from '../data/bn';

export const HeroSlider: React.FC = () => {
  const { setFilters, setActiveProductPage } = useStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [slides, setSlides] = useState<HeroSlide[]>(HERO_SLIDES);

  // Admin-managed slides from the API; keeps bundled slides as fallback.
  useEffect(() => {
    let cancelled = false;
    dataLoader.loadHeroSlides().then((loaded) => {
      if (!cancelled && loaded.length > 0) setSlides(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isPaused || slides.length === 0) return;
    const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[currentSlide % slides.length];
  const titleBn =
    BRAND_BN[slide.ctaBrand ?? ''] ?? BRAND_BN[(slide.title || '').toUpperCase()] ?? '';
  const descBn =
    SLIDER_DESC_BN[slide.ctaBrand ?? ''] ??
    SLIDER_DESC_BN[(slide.title || '').toUpperCase()] ??
    '';

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

  return (
    <div
      className="relative bg-neutral-900 overflow-hidden select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Height adapts to content on phones (min-h); fixed feel kept from sm up.
          This prevents the tall mobile text stack from clipping / overlapping the
          arrows & indicators that anchor to this box's bottom edge. */}
      <div className="relative flex items-center overflow-hidden min-h-[360px] sm:min-h-[415px] lg:min-h-[485px]">
        {/* Background Image Carousel with Fade */}
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute inset-0 z-0"
          >
            <img
              src={slide.image}
              alt={slide.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center opacity-60"
            />
            {/* Gradient Overlays for optimal typography legibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 sm:py-12 lg:py-16 w-full">
          <div className="max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="space-y-3 sm:space-y-6"
              >
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-widest uppercase">
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: slide.accentColor }}
                  />
                  {slide.badge}
                </div>

                {/* Main Heading */}
                <h2 className="text-2xl min-[400px]:text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.05]">
                  {slide.title}
                  {titleBn && (
                    <span className="text-lg min-[400px]:text-xl sm:text-3xl lg:text-4xl font-bold text-neutral-200 tracking-normal">
                      {' '}({titleBn})
                    </span>
                  )}
                </h2>

                {/* Subtitle */}
                <p className="text-sm sm:text-base lg:text-lg text-neutral-300 font-normal leading-relaxed max-w-xl">
                  {slide.subtitle}
                </p>
                {descBn && (
                  <p className="text-xs sm:text-sm text-neutral-300/90 font-medium leading-relaxed max-w-xl mt-1.5">
                    {descBn}
                  </p>
                )}

                {/* Tagline pill */}
                <div className="text-xs text-neutral-400 font-semibold tracking-wide flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{slide.tagline}</span>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-3.5">
                  <button
                    onClick={() => handleSlideCta(slide)}
                    className="px-5 py-3 sm:px-8 sm:py-3.5 rounded-full text-white font-extrabold text-sm sm:text-base flex items-center gap-2.5 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-0.5 cursor-pointer"
                    style={{ backgroundColor: slide.accentColor }}
                  >
                    <span>{slide.ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

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
        <div className="absolute left-1/2 -translate-x-1/2 bottom-6 z-20 flex items-center gap-2">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                currentSlide === idx ? 'w-8 bg-[#D8232A]' : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
                            aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Feature Strip under Hero (bilingual) */}
      <div className="bg-neutral-950/90 border-t border-neutral-800 text-neutral-300 py-3 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium">
          {FEATURE_STRIP_BN.map((f, i) => (
            <div key={f.en} className="flex items-center gap-2.5">
              {i === 0 && <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />}
              {i === 1 && <Zap className="w-4 h-4 text-amber-400 shrink-0" />}
              {i === 2 && <Award className="w-4 h-4 text-rose-400 shrink-0" />}
              {i === 3 && <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />}
              <span>
                <span className="block leading-tight">{f.en}</span>
                <span className="block text-neutral-500 leading-tight">{f.bn}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
