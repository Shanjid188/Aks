import React, { useState, useEffect } from 'react';
import { HERO_SLIDES, HeroSlide } from '../data/promos';
import { dataLoader } from '../lib/dataLoader';
import { useStore } from '../context/StoreContext';
import { ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, Zap, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

export const HeroSlider: React.FC = () => {
  const { setFilters, setActiveProductPage } = useStore();
  const { language } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [slides, setSlides] = useState<HeroSlide[]>(HERO_SLIDES);
  const [direction, setDirection] = useState(1);

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
      setDirection(1);
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

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

  return (
    <div
      className="relative bg-neutral-900 overflow-hidden select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative flex items-center overflow-hidden min-h-[360px] sm:min-h-[415px] lg:min-h-[485px]">
        {/* Background Image Carousel — smooth crossfade + subtle zoom */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 0.6, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
            className="absolute inset-0 z-0"
          >
            <img
              src={slide.image}
              alt={slide.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/40 to-neutral-950/70" />
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/60 via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 sm:py-12 lg:py-16 w-full">
          <div className="max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 0.61, 0.36, 1] }}
                className="space-y-3 sm:space-y-6"
              >
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-widest uppercase">
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: slide.accentColor }}
                  />
                  {language === 'bn' && slide.badgeBn ? slide.badgeBn : slide.badge}
                </div>

                {/* Main Heading */}
                <h2 className="text-2xl min-[400px]:text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.05]">
                  {language === 'bn' && slide.titleBn ? slide.titleBn : slide.title}
                </h2>

                {/* Subtitle */}
                <p className="text-base sm:text-lg lg:text-xl text-neutral-300 font-normal leading-relaxed max-w-xl">
                  {language === 'bn' && slide.subtitleBn ? slide.subtitleBn : slide.subtitle}
                </p>

                {/* Tagline pill */}
                <div className="text-sm text-neutral-400 font-semibold tracking-wide flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{language === 'bn' && slide.taglineBn ? slide.taglineBn : slide.tagline}</span>
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

      {/* Feature Strip under Hero */}
      <div className="bg-neutral-950/90 border-t border-neutral-800 text-neutral-300 py-3 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium">
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
  );
};
