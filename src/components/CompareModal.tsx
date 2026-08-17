import React from 'react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import {
  X,
  Scale,
  Trash2,
  Star,
  ShoppingBag,
} from 'lucide-react';
import { motion } from 'motion/react';

export const CompareModal: React.FC = () => {
  const {
    isCompareModalOpen,
    setIsCompareModalOpen,
    compareList,
    toggleCompare,
    clearCompare,
    currency,
    addToCart,
    setIsCartDrawerOpen,
  } = useStore();

  if (!isCompareModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsCompareModalOpen(false)}
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="relative bg-white w-full max-w-5xl rounded-2xl shadow-xl border border-neutral-200 overflow-hidden z-10 my-auto max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-900">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
                AKS Garment Comparison Matrix
              </h2>
              <p className="text-xs text-neutral-500">
                Comparing fabric weave, tailoring cut, and artisanal craft details side-by-side
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {compareList.length > 0 && (
              <button
                onClick={clearCompare}
                className="text-xs text-neutral-500 hover:text-red-600 transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => setIsCompareModalOpen(false)}
              className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {compareList.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-400">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">No Garments Added to Compare</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Click the compare icon on any garment card in the catalog to evaluate fabrics and fits side-by-side.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="p-3 w-40 font-bold uppercase tracking-wider text-[10px] text-neutral-400 bg-neutral-50/50">
                      Garment
                    </th>
                    {compareList.map((p) => (
                      <th key={p.id} className="p-3 min-w-[200px] align-top bg-white">
                        <div className="space-y-2">
                          <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => toggleCompare(p)}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-neutral-400 hover:text-red-600 shadow-xs transition-colors cursor-pointer"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D8232A]">
                              {p.brand}
                            </span>
                            <h4 className="font-bold text-xs text-neutral-900 leading-snug line-clamp-1">
                              {p.name}
                            </h4>
                            <p className="text-xs font-black text-neutral-900 mt-1">
                              {formatPrice(p.price, currency)}
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              addToCart(p, p.colors[0], p.sizes[0], 1);
                              setIsCompareModalOpen(false);
                              setIsCartDrawerOpen(true);
                            }}
                            className="w-full py-2 bg-neutral-900 hover:bg-[#D8232A] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Add to Bag</span>
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  <tr>
                    <td className="p-3 font-semibold text-neutral-500 bg-neutral-50/50">Customer Rating</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-3 font-semibold text-neutral-900">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{p.rating} ({p.reviewsCount} reviews)</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-neutral-500 bg-neutral-50/50">Category & Style</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-3 text-neutral-700 capitalize">
                        {p.category} • {p.subcategory}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-neutral-500 bg-neutral-50/50">Primary Fabric</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-3 text-neutral-700">
                        {p.materials.fabric || p.materials.upper || '100% Fine Combed Cotton'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-neutral-500 bg-neutral-50/50">Weave & Finish</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-3 text-neutral-700">
                        {p.materials.weave || p.pattern || 'Fine Jacquard / Handloom'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-neutral-500 bg-neutral-50/50">Tailored Fit</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-3 text-neutral-700">
                        {p.fit || 'Regular Tailored Fit'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-neutral-500 bg-neutral-50/50">Occasion</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-3 font-semibold text-neutral-900">
                        {p.occasion || 'Festive / Formal'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-neutral-500 bg-neutral-50/50">Care Guide</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-3 text-neutral-700">
                        {p.materials.care || 'Dry clean recommended'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-neutral-500 bg-neutral-50/50">Key Craft Details</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-3 text-neutral-700">
                        <ul className="space-y-1">
                          {p.features.slice(0, 3).map((f, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-[#D8232A] font-bold">•</span>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
