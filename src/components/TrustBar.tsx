import React from 'react';
import { Truck, RotateCcw, ShieldCheck, Headphones } from 'lucide-react';
import { AKS_MART } from '../data/aksMart';
import { Bi } from './Bi';
import { useLanguage } from '../context/LanguageContext';

interface TrustItem {
  icon: React.ReactNode;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
}

const TRUST_ITEMS: TrustItem[] = [
  {
    icon: <Truck className="w-5 h-5" />,
    titleEn: 'Nationwide Delivery',
    titleBn: 'সারাদেশ ডেলিভারি',
    descEn: 'Home delivery across Bangladesh — timing confirmed after you order',
    descBn: 'সারা বাংলাদেশে হোম ডেলিভারি — অর্ডারের পরে সময় নিশ্চিত করা হবে',
  },
  {
    icon: <RotateCcw className="w-5 h-5" />,
    titleEn: 'Easy Exchange',
    titleBn: 'সহজ এক্সচেঞ্জ',
    descEn: 'Exchange policy details coming soon',
    descBn: 'এক্সচেঞ্জ পলিসির বিবরণ শীঘ্রই আসছে',
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    titleEn: 'Curated Quality',
    titleBn: 'কিউরেটেড কোয়ালিটি',
    descEn: 'Every product quality checked across all five divisions',
    descBn: 'সব পাঁচটি ডিভিশনে প্রতিটি পণ্যের মান যাচাই করা হয়',
  },
  {
    icon: <Headphones className="w-5 h-5" />,
    titleEn: 'Customer Support',
    titleBn: 'কাস্টমার সাপোর্ট',
    descEn: `WhatsApp / Call: ${AKS_MART.phone}`,
    descBn: `হোয়াটসঅ্যাপ / কল: ${AKS_MART.phone}`,
  },
];

/**
 * Premium trust strip — sits right above the navbar.
 * 4 service highlights with icons, bilingual support, and subtle hover effects.
 */
export const TrustBar: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-900 border-b border-neutral-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-0 py-4">
          {TRUST_ITEMS.map((item, idx) => (
            <div
              key={item.titleEn}
              className={`flex items-center gap-3.5 px-2 lg:px-5 group transition-all ${
                idx !== 0 ? 'lg:border-l lg:border-neutral-700/50' : ''
              } ${idx < 2 ? 'border-b border-neutral-800/50 pb-3 lg:border-b-0 lg:pb-0' : ''}`}
            >
              {/* Icon container — soft rounded with brand tint */}
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D8232A]/15 to-[#D8232A]/5 text-[#D8232A] ring-1 ring-[#D8232A]/10 transition-all duration-300 group-hover:from-[#D8232A] group-hover:to-[#D8232A] group-hover:text-white group-hover:ring-[#D8232A]/30 group-hover:shadow-lg group-hover:shadow-[#D8232A]/20">
                {item.icon}
              </span>

              {/* Text */}
              <div className="min-w-0">
                <h4 className="text-[13px] font-extrabold text-white tracking-tight leading-tight">
                  <Bi en={item.titleEn} bn={item.titleBn} />
                </h4>
                <p className="text-[11px] text-neutral-400 leading-snug mt-0.5">
                  <Bi en={item.descEn} bn={item.descBn} />
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};