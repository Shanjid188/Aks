import React, { useState, useEffect } from 'react';
import { HERO_SLIDES, HeroSlide } from '../data/promos';
import { useStore } from '../context/StoreContext';
import { ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, Zap, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const HeroSlider: React.FC = () => {
  const { setFilters, setActiveProductPage } = useStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const slide = HERO_SLIDES[currentSlide];

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
      <div className="relative min-h-[440px] sm:min-h-[520px] lg:min-h-[580px] flex items-center">
        {/* Background Image Carousel with Fade */}
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
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
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 w-full">
          <div className="max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="space-y-4 sm:space-y-6"
              >
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-widest uppercase">
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: slide.accentColor }}
                  />
                  {slide.badge}
                </div>

                {/* Main Heading */}
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                  {slide.title}
                </h1>

                {/* Subtitle */}
                <p className="text-sm sm:text-base lg:text-lg text-neutral-300 font-normal leading-relaxed max-w-xl">
                  {slide.subtitle}
                </p>

                {/* Tagline pill */}
                <div className="text-xs text-neutral-400 font-semibold tracking-wide flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{slide.tagline}</span>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-wrap items-center gap-3.5">
                  <button
                    onClick={() => handleSlideCta(slide)}
                    className="px-6 sm:px-8 py-3.5 rounded-full text-white font-extrabold text-sm sm:text-base flex items-center gap-2.5 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-0.5 cursor-pointer"
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
                    className="px-5 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 backdrop-blur-md transition-all cursor-pointer"
                  >
                    View Festive Deals
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
              setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1))
            }
            className="w-10 h-10 rounded-full bg-neutral-900/80 hover:bg-white hover:text-neutral-900 text-white border border-neutral-700 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
            className="w-10 h-10 rounded-full bg-neutral-900/80 hover:bg-white hover:text-neutral-900 text-white border border-neutral-700 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Slide Indicators */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-6 z-20 flex items-center gap-2">
          {HERO_SLIDES.map((s, idx) => (
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
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>100% Certified Authentic AKS Quality</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Express Delivery in 24-48h</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Award className="w-4 h-4 text-rose-400 shrink-0" />
            <span>30-Day Nationwide Boutique Exchange</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
            <span>bKash, Nagad & Cash on Delivery</span>
          </div>
        </div>
      </div>
    </div>
  );
};
