import React, { useEffect, useState } from 'react';
import { dataLoader } from '../lib/dataLoader';
import { useSiteContent } from '../context/SiteContentContext';
import { Coupon } from '../types';
import { useStore } from '../context/StoreContext';
import { ArrowRight, Tag, Truck, Gift, Copy, Check } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { useLocalized } from './Localized';
import { motion } from 'motion/react';
import { navigate } from '../lib/router';

/** Human value label from real coupon data — "15%", "৳600", "FREE". */
const valueLabel = (c: Coupon) => {
  if (c.discountType === 'percent' && c.value >= 100) return 'FREE';
  return c.discountType === 'fixed' ? `৳${c.value.toLocaleString()}` : `${c.value}%`;
};
const valueSuffix = (c: Coupon) => {
  if (c.discountType === 'percent' && c.value >= 100) return 'DELIVERY';
  return 'OFF';
};
const minSpendLabel = (c: Coupon) =>
  c.minSpend > 0 ? `Min. spend ৳${c.minSpend.toLocaleString()}` : 'No minimum spend';
const couponIcon = (c: Coupon) => {
  if (c.discountType === 'percent' && c.value >= 100) return <Truck className="w-5 h-5" />;
  if (c.discountType === 'fixed') return <Gift className="w-5 h-5" />;
  return <Tag className="w-5 h-5" />;
};

export const PromoCampaign: React.FC = () => {
  const { addToast } = useStore();
  const { content } = useSiteContent();
  const t = useLocalized();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  // DB-driven offers (Admin → Coupons). dataLoader falls back to the bundled
  // coupon list when the API is unreachable, so the section never goes blank.
  const [offers, setOffers] = useState<Coupon[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    dataLoader.loadCoupons().then((list) => {
      if (!cancelled) setOffers(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing to advertise yet — hide the section instead of flashing placeholders.
  if (offers === null || offers.length === 0) return null;
  const [anchor, ...rest] = offers;

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* clipboard unavailable — the code stays visible on the ticket */
    }
    setCopiedCode(code);
    addToast({
      type: 'success',
      title: 'Code copied!',
      message: `Apply ${code} in your shopping bag at checkout.`,
    });
    window.setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 2000);
  };

  return (
    <section className="py-14 sm:py-20 bg-white relative overflow-hidden" aria-label="Active offers">
      {/* Decorative ecommerce illustrations around the section */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* top-left shopping bag */}
        <svg className="absolute -left-4 -top-4 h-20 w-20 text-[#D8232A]/[0.07] rotate-[-15deg]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 7h-4V5a4 4 0 00-8 0v2H4a1 1 0 00-1 1l1 14a2 2 0 002 2h12a2 2 0 002-2l1-14a1 1 0 00-1-1zM10 5a2 2 0 014 0v2h-4V5z"/>
        </svg>
        {/* top-right gift box */}
        <svg className="absolute -right-3 top-6 h-16 w-16 text-emerald-500/[0.08] rotate-[12deg]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 6h-2.18a3 3 0 00-5.64 0H10a3 3 0 00-3 3v1H4a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2v-8a2 2 0 00-2-2h-3V9a1 1 0 00-1-1zm-5-2a1 1 0 110 2 1 1 0 010-2z"/>
        </svg>
        {/* bottom-left package */}
        <svg className="absolute -bottom-4 left-10 h-18 w-18 text-sky-500/[0.07] rotate-[8deg]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 16.5a1 1 0 01-.55.89l-8 4a1 1 0 01-.88 0l-8-4a1 1 0 01-.55-.89v-9a1 1 0 01.55-.89l8-4a1 1 0 01.88 0l8 4a1 1 0 01.55.89v9zM12 4.15L6.04 7.5 12 10.85l5.96-3.35L12 4.15z"/>
        </svg>
        {/* bottom-right cart */}
        <svg className="absolute -bottom-3 -right-4 h-20 w-20 text-amber-500/[0.07] rotate-[-10deg]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zM7.16 14.25l.96-2h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49a1 1 0 00-.87-1.48H6.21L5.27 2H2v2h2l3.6 7.59-1.35 2.45a2 2 0 001.83 2.96h12v-2H7.42a.25.25 0 01-.24-.32z"/>
        </svg>
        {/* scattered dots */}
        <div className="absolute left-[30%] top-3 flex gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#D8232A]/20"/><span className="h-1.5 w-1.5 rounded-full bg-[#D8232A]/15"/><span className="h-1.5 w-1.5 rounded-full bg-[#D8232A]/10"/>
        </div>
        <div className="absolute right-[25%] bottom-4 flex gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/20"/><span className="h-1.5 w-1.5 rounded-full bg-emerald-500/15"/><span className="h-1.5 w-1.5 rounded-full bg-emerald-500/10"/>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <SectionHeader
          eyebrow={t(content.offersEyebrow, content.offersEyebrowBn)}
          title={t(content.offersTitle, content.offersTitleBn)}
          subtitle={t(content.offersSubtitle, content.offersSubtitleBn)}
          centered
        />

        {/* Anchor offer — the strongest coupon gets a hero ticket with background image */}
        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          onClick={() => navigate('/products')}
          className="relative w-full overflow-hidden rounded-3xl text-white text-left shadow-lg shadow-red-900/10 cursor-pointer group mb-5"
        >
          {/* Background image */}
          {anchor.image && (
            <img
              src={anchor.image}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-[#D8232A]/95 via-[#c41d24]/90 to-[#8f1219]/85" />
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute -right-6 bottom-0 w-24 h-24 rounded-full bg-white/10" />

          <div className="relative flex flex-col sm:flex-row items-stretch">
            {/* Value stub */}
            <div className="sm:w-56 shrink-0 flex sm:flex-col items-center justify-center gap-1.5 py-6 sm:py-10 border-b-2 sm:border-b-0 sm:border-r-2 border-dashed border-white/30">
              <span className="text-5xl font-black tracking-tight leading-none">
                {valueLabel(anchor)}
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/80">
                {valueSuffix(anchor)}
              </span>
            </div>

            {/* Body */}
            <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center gap-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">
                    Featured Offer
                  </p>
                  <h3 className="text-lg sm:text-xl font-black leading-snug max-w-md">
                    {anchor.description}
                  </h3>
                  <p className="text-xs text-white/70 mt-1">{minSpendLabel(anchor)}</p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-white group-hover:gap-2.5 transition-all shrink-0 mt-1">
                  Shop Now <ArrowRight className="w-4 h-4" />
                </span>
              </div>

              {/* Code + copy */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm font-bold tracking-[0.15em] border-2 border-dashed border-white/50 rounded-lg px-3.5 py-2 bg-white/10">
                  {anchor.code}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Copy code ${anchor.code}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    void copyCode(anchor.code);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      e.preventDefault();
                      void copyCode(anchor.code);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-white text-[#D8232A] rounded-lg px-3 py-2 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  {copiedCode === anchor.code ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Code
                    </>
                  )}
                </span>
                <span className="sm:hidden inline-flex items-center gap-1.5 text-xs font-bold text-white">
                  Shop Now <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </motion.button>

        {/* Remaining coupons — punch-hole tickets with copyable codes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {rest.map((c) => {
            const tint =
              c.discountType === 'percent' && c.value >= 100
                ? 'bg-sky-50 text-sky-600'
                : c.discountType === 'fixed'
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-red-50 text-[#D8232A]';
            return (
              <motion.div
                key={c.code}
                whileHover={{ y: -4 }}
                className="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate('/products')}
              >
                {/* Background image */}
                {c.image && (
                  <img
                    src={c.image}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-white/80 group-hover:bg-white/75 transition-colors" />
                <div className="relative h-full rounded-2xl border-2 border-dashed border-neutral-200 group-hover:border-[#D8232A]/40 p-5 sm:p-6 transition-colors">
                  {/* Ticket punch holes */}
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border border-neutral-200" />
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-white border border-neutral-200" />

                  <div className="flex items-center justify-between">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tint}`}>
                      {couponIcon(c)}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-neutral-900 text-white px-2.5 py-1 rounded-full">
                      {c.code}
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-3xl font-black tracking-tight text-neutral-900">
                      {valueLabel(c)}
                    </span>
                    <span className="text-xs font-black uppercase tracking-wide text-[#D8232A]">
                      {valueSuffix(c)}
                    </span>
                  </div>

                  <p className="mt-1.5 text-sm text-neutral-600 leading-snug">{c.description}</p>
                  <p className="mt-1 text-xs text-neutral-400">{minSpendLabel(c)}</p>

                  <div className="mt-5 pt-4 border-t border-dashed border-neutral-200 flex items-center justify-between gap-2">
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Copy coupon code ${c.code}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        void copyCode(c.code);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          e.preventDefault();
                          void copyCode(c.code);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D8232A] border border-[#D8232A]/40 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      {copiedCode === c.code ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Code
                        </>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-neutral-500 group-hover:text-[#D8232A] group-hover:gap-2 transition-all">
                      Shop Now <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
