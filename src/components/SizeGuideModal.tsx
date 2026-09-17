import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { X, Package, HelpCircle, Sparkles, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

export const SizeGuideModal: React.FC = () => {
  const { isSizeGuideOpen, setIsSizeGuideOpen } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<'food' | 'craft' | 'home' | 'beauty' | 'print'>('food');

  if (!isSizeGuideOpen) return null;

  // Division-specific reference info appropriate for an everyday mart (food/craft/home/beauty/print)
  const guideContent: Record<
    string,
    { title: string; desc: string; items: string[] }
  > = {
    food: {
      title: 'SHUDDHO Food Guide',
      desc: 'Storage, shelf life & serving guidance for everyday food essentials.',
      items: [
        'Dry staples (rice, pulses, spices): store airtight in a cool, dry place — keeps 6–12 months past the best-before date.',
        'Oils & ghee: refrigerate after opening; they may solidify in winter — that is natural.',
        'Honey: store at room temperature away from direct sunlight; crystals forming means it is pure.',
        'Pickles & condiments: keep refrigerated after opening and always use a clean, dry spoon.',
        'Ready-to-eat snacks & dry fruit mixes: finish within 2 weeks once opened for best crunch.',
      ],
    },
    craft: {
      title: 'AKS CRAFT Care Guide',
      desc: 'Looking after handcrafted pieces made from jute, bamboo & artisan materials.',
      items: [
        'Keep dry at all times — jute and bamboo are natural and water-sensitive.',
        'Wipe clean with a soft, dry microfiber cloth; never use chemical cleaners.',
        'Store flat or as shown; avoid crushing intricate weaves or cane work.',
        'Keep away from direct sunlight to prevent fading of dyed threads.',
        'Handle cane/bamboo frames gently — each piece is hand-bent, not machine-made.',
      ],
    },
    home: {
      title: 'AKS HOME Reference',
      desc: 'Dimensions & care for home textiles, décor & kitchen essentials.',
      items: [
        'Curtains & cushion covers: machine wash cold (30°C), tumble dry low, iron inside-out while damp.',
        'Bedding & table linens: wash separately in cold water; avoid chlorine bleach.',
        'Kitchen textiles (napkins, oven mitts): pre-wash before first use; do not bleach.',
        'Decorative candles & diffusers: keep away from drafts and out of reach of children.',
        'Terracotta & cane décor: dust regularly; wipe spills immediately with a barely-damp cloth.',
      ],
    },
    beauty: {
      title: 'AKS BEAUTY Guide',
      desc: 'Usage & storage notes for personal-care essentials.',
      items: [
        'Soaps & body care: keep dry between uses on a slatted soap dish; avoid pooling water.',
        'Oil-based serums & balms: screw caps tightly; store in a cool place away from direct sun.',
        'Powders & scrubs: use a dry spatula; close lids firmly to prevent moisture clumping.',
        'Hair oils & butters: warm between palms before applying; do a patch test first.',
        'Discontinue if you notice a change in smell, colour or texture.',
      ],
    },
    print: {
      title: 'AKS PRINT Specs',
      desc: 'Custom-print size & care reference — made to order at any AKS Mart hub.',
      items: [
        'Mugs & drinkware: ceramic print is dishwasher-safe on the top rack; hand-wash the artwork side for longevity.',
        'T-shirts & apparel: print on one side; turn inside-out, wash cold, do not tumble-dry the print.',
        'Posters, cards & stationery: printed on quality matte stock; keep flat, away from humidity.',
        'Candles & packaging: custom branded; trim wick to ¼ inch before each use; never leave unattended.',
        'Proof before production — artwork is print-ready after final approval in the studio.',
      ],
    },
  };

  const current = guideContent[selectedCategory];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsSizeGuideOpen(false)}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden z-10 my-auto max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#D8232A]" />
            <h3 className="font-black text-base text-neutral-900 tracking-tight">
              AKS Mart Product Guide
            </h3>
          </div>
          <button
            onClick={() => setIsSizeGuideOpen(false)}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Division tabs */}
        <div className="p-4 border-b border-neutral-200 bg-white">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
            <MapPin className="w-3.5 h-3.5" /> Shop by Division
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'food', label: 'SHUDDHO' },
              { id: 'craft', label: 'AKS CRAFT' },
              { id: 'home', label: 'AKS HOME' },
              { id: 'beauty', label: 'AKS BEAUTY' },
              { id: 'print', label: 'AKS PRINT' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all text-center cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'border-[#D8232A] bg-[#D8232A]/10 text-[#D8232A] shadow-xs'
                    : 'border-neutral-200 hover:border-neutral-300 text-neutral-700 bg-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Guide content */}
        <div className="p-6 overflow-y-auto">
          <h4 className="font-bold text-sm text-neutral-900 mb-1 uppercase tracking-wider">
            {current.title}
          </h4>
          <p className="text-xs text-neutral-500 mb-4">{current.desc}</p>
          <ul className="space-y-2 text-xs text-neutral-700 leading-relaxed">
            {current.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#D8232A] shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick help */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 text-xs text-neutral-600">
          <h5 className="font-bold text-neutral-900 flex items-center gap-1.5 mb-1">
            <HelpCircle className="w-4 h-4 text-[#D8232A]" /> Need more help?
          </h5>
          <p>
            Chat with our team via the Support tab in your account. Reference your
            order number for product-specific care instructions.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
