import React from 'react';
import { Bi } from './Bi';
import { useLanguage } from '../context/LanguageContext';
import { Sparkles, Gift, Truck, CreditCard, ArrowRight } from 'lucide-react';

/**
 * Premium promotional advertisement strip — sits right above the footer.
 * Modern e-commerce style with decorative elements, bilingual support, and subtle animations.
 */
export const PromoBar: React.FC = () => {
  const { language } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FDF6EC]/70 via-white to-white border-t border-b border-amber-200/50">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#D8232A]/5 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-amber-200/20 blur-2xl" />
        <div className="absolute top-6 left-[15%] w-2 h-2 rounded-full bg-[#D8232A]/20 animate-pulse" />
        <div className="absolute top-10 right-[25%] w-1.5 h-1.5 rounded-full bg-amber-400/40 animate-pulse" />
        <div className="absolute bottom-8 left-[40%] w-1 h-1 rounded-full bg-[#D8232A]/15 animate-pulse" />
        <div className="absolute bottom-5 right-[10%] w-2 h-2 rounded-full bg-amber-300/30 animate-pulse" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="promo-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#D8232A" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#promo-dots)" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        {/* Top tagline */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D8232A]/8 backdrop-blur-sm border border-[#D8232A]/20 text-[#D8232A] text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-[#D8232A]" />
            <Bi en="Why Shop With Us" bn="কেন আমাদের থেকে কিনবেন" />
          </span>
        </div>

        {/* Main heading */}
        <h2 className="text-center text-2xl sm:text-3xl lg:text-4xl font-extrabold text-neutral-900 tracking-tight leading-tight mb-3">
          <Bi en="One Mart. Many Choices." bn="এক মার্ট। অনেক পছন্দ।" />
        </h2>
        <p className="text-center text-sm sm:text-base text-neutral-500 max-w-xl mx-auto mb-10 leading-relaxed">
          <Bi
            en="Five curated divisions, one trusted destination — quality products delivered to your doorstep across Bangladesh."
            bn="পাঁচটি কিউরেটেড ডিভিশন, একটি বিশ্বস্ত গন্তব্য — বাংলাদেশ জুড়ে আপনার দোরগোড়ায় মানসম্পন্ন পণ্য পৌঁছে যাবে।"
          />
        </p>

        {/* Feature cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          <div className="group relative flex flex-col items-center text-center p-5 rounded-2xl bg-white border border-neutral-200 hover:border-[#D8232A]/30 hover:shadow-lg hover:shadow-[#D8232A]/5 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#D8232A]/10 text-[#D8232A] mb-3 group-hover:bg-[#D8232A] group-hover:text-white transition-colors">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-neutral-800 mb-1">
              <Bi en="Free Delivery" bn="ফ্রি ডেলিভারি" />
            </h3>
            <p className="text-[11px] text-neutral-500 leading-snug">
              <Bi en="On orders above ৳1500" bn="৳1500 এর উপরে অর্ডারে" />
            </p>
          </div>

          <div className="group relative flex flex-col items-center text-center p-5 rounded-2xl bg-white border border-neutral-200 hover:border-[#D8232A]/30 hover:shadow-lg hover:shadow-[#D8232A]/5 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#D8232A]/10 text-[#D8232A] mb-3 group-hover:bg-[#D8232A] group-hover:text-white transition-colors">
              <Gift className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-neutral-800 mb-1">
              <Bi en="Exclusive Deals" bn="এক্সক্লুসিভ ডিল" />
            </h3>
            <p className="text-[11px] text-neutral-500 leading-snug">
              <Bi en="Member-only offers" bn="শুধুমাত্র সদস্যদের অফার" />
            </p>
          </div>

          <div className="group relative flex flex-col items-center text-center p-5 rounded-2xl bg-white border border-neutral-200 hover:border-[#D8232A]/30 hover:shadow-lg hover:shadow-[#D8232A]/5 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#D8232A]/10 text-[#D8232A] mb-3 group-hover:bg-[#D8232A] group-hover:text-white transition-colors">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-neutral-800 mb-1">
              <Bi en="Secure Payment" bn="নিরাপদ পেমেন্ট" />
            </h3>
            <p className="text-[11px] text-neutral-500 leading-snug">
              <Bi en="bKash, Nagad, Card & COD" bn="বিকাশ, নগদ, কার্ড ও COD" />
            </p>
          </div>

          <div className="group relative flex flex-col items-center text-center p-5 rounded-2xl bg-white border border-neutral-200 hover:border-[#D8232A]/30 hover:shadow-lg hover:shadow-[#D8232A]/5 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#D8232A]/10 text-[#D8232A] mb-3 group-hover:bg-[#D8232A] group-hover:text-white transition-colors">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-neutral-800 mb-1">
              <Bi en="Quality Promise" bn="কোয়ালিটি প্রমিস" />
            </h3>
            <p className="text-[11px] text-neutral-500 leading-snug">
              <Bi en="Checked before dispatch" bn="ডিসপ্যাচের আগে যাচাই" />
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex justify-center mt-8">
          <a
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#D8232A] text-white font-bold text-sm rounded-full shadow-lg shadow-[#D8232A]/20 hover:shadow-xl hover:bg-[#B91C1C] hover:scale-105 transition-all duration-300"
          >
            <Bi en="Shop Now" bn="এখনই কিনুন" />
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
};
