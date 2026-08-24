import React from 'react';
import { useStore } from '../context/StoreContext';
import { AKS_MART } from '../data/aksMart';
import { X, MapPin, Phone } from 'lucide-react';
import { motion } from 'motion/react';

export const StoreLocatorModal: React.FC = () => {
  const { isStoreLocatorOpen, setIsStoreLocatorOpen } = useStore();

  if (!isStoreLocatorOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsStoreLocatorOpen(false)}
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="relative bg-white w-full max-w-md rounded-2xl shadow-xl border border-neutral-200 z-10 my-auto"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-[#D8232A]">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 tracking-tight">
                AKS Mart Store Locator
              </h2>
              <p className="text-xs text-neutral-500">Physical store locations</p>
            </div>
          </div>
          <button
            onClick={() => setIsStoreLocatorOpen(false)}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Coming Soon Body */}
        <div className="px-8 py-10 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
            <MapPin className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <h3 className="text-base font-black text-neutral-900">Store locations coming soon</h3>
            <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
              We're setting up AKS Mart pickup points across Bangladesh.
              Until then, order online â€” we deliver nationwide.
            </p>
          </div>
          <a
            href={`tel:${AKS_MART.phoneRaw}`}
            className="inline-flex items-center gap-2 py-2.5 px-5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Order by phone: {AKS_MART.phone}</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
};
