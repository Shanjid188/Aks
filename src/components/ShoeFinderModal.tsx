import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import {
  X,
  Sparkles,
  RotateCcw,
  Compass,
} from 'lucide-react';
import { motion } from 'motion/react';

export const ShoeFinderModal: React.FC = () => {
  const { isShoeFinderOpen, setIsShoeFinderOpen, products } = useStore();

    const [division, setDivision] = useState<'food' | 'craft' | 'home' | 'beauty' | 'print'>('food');
  const [occasion, setOccasion] = useState<'everyday' | 'gifts' | 'premium' | 'clearance'>('everyday');
  const [materialTier, setMaterialTier] = useState<'any' | 'natural' | 'crafted' | 'custom'>('any');
  const [budgetRange, setBudgetRange] = useState<number>(8000);
  const [hasSearched, setHasSearched] = useState(false);

  if (!isShoeFinderOpen) return null;

    const matchedProducts = products.filter((p) => {
    const divisionMatch = p.category === division;
    const priceMatch = p.price <= budgetRange;
    const occasionMatch =
      occasion === 'everyday'
        ? !p.isClearance
        : occasion === 'gifts'
          ? p.isNewArrival || p.isBestSeller
          : occasion === 'premium'
            ? p.price >= 1500
            : occasion === 'clearance'
              ? p.isClearance || (p.discountPercent ?? 0) >= 20
              : true;

    return divisionMatch && priceMatch && occasionMatch;
  });

  const finalRecommendations = matchedProducts.length > 0
    ? matchedProducts
    : products.filter((p) => p.category === division).slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsShoeFinderOpen(false)}
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="relative bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-neutral-200 overflow-hidden z-10 my-auto max-h-[88vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-900">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
                                  AKS Mart Product Finder
                </h2>
                <span className="text-[10px] uppercase font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                                    Quick Finder Quiz
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Answer 3 quick questions to discover your ideal product from across the mart
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsShoeFinderOpen(false)}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Finder Form */}
        <div className="p-6 overflow-y-auto space-y-6">
          {!hasSearched ? (
            <div className="space-y-6">
              {/* Question 1: Who are you shopping for? */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                                  1. Which AKS Mart division?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                                        { id: 'food', label: 'SHUDDHO' },
                                        { id: 'craft', label: 'AKS CRAFT' },
                                        { id: 'home', label: 'AKS HOME' },
                    { id: 'beauty', label: 'AKS BEAUTY' },
                    { id: 'print', label: 'AKS PRINT' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDivision(item.id as any)}
                      className={`p-3 rounded-xl border text-xs font-semibold transition-all text-center cursor-pointer ${
                                                division === item.id
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                          : 'border-neutral-200 hover:border-neutral-300 text-neutral-700 bg-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2: Primary Occasion */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                                  2. Shopping lifestyle?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                                        { id: 'everyday', label: 'Everyday Essentials' },
                    { id: 'gifts', label: 'Gifts & Occasions' },
                    { id: 'premium', label: 'Premium Picks' },
                    { id: 'clearance', label: 'Deals & Clearance' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setOccasion(item.id as any)}
                      className={`p-3 rounded-xl border text-xs font-semibold transition-all text-center cursor-pointer ${
                        occasion === item.id
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                          : 'border-neutral-200 hover:border-neutral-300 text-neutral-700 bg-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 3: Fabric Preference */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                                  3. Material & Craftsmanship
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                                        { id: 'any', label: 'Any Material' },
                    { id: 'natural', label: 'Natural (Food, Herbs, Cotton)' },
                    { id: 'crafted', label: 'Handcrafted (Artisan, Jute, Bamboo)' },
                    { id: 'custom', label: 'Custom Print' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMaterialTier(item.id as any)}
                      className={`p-3 rounded-xl border text-xs font-semibold transition-all text-center cursor-pointer ${
                                                materialTier === item.id
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                          : 'border-neutral-200 hover:border-neutral-300 text-neutral-700 bg-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Slider */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-xs font-semibold text-neutral-800">
                  <span>Target Budget:</span>
                  <span className="text-sm font-bold text-neutral-900">৳{budgetRange.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="1500"
                  max="15000"
                  step="500"
                  value={budgetRange}
                  onChange={(e) => setBudgetRange(Number(e.target.value))}
                  className="w-full accent-neutral-900 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>৳1,500</span>
                  <span>৳15,000+</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => setHasSearched(true)}
                  className="w-full py-3.5 bg-[#D8232A] hover:bg-[#b51c22] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                                    <span>Reveal My AKS Mart Picks</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                <div>
                  <h4 className="text-xs font-bold text-neutral-900">
                    Showing {finalRecommendations.length} curated picks — {division} · {occasion}
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Budget up to ৳{budgetRange.toLocaleString()}</p>
                </div>
                <button
                  onClick={() => setHasSearched(false)}
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Modify Quiz Criteria
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {finalRecommendations.slice(0, 6).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
