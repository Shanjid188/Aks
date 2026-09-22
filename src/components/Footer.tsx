import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  Phone,
  MapPin,
  Globe,
} from 'lucide-react';
import { Logo } from './Logo';
import { Bi } from './Bi';
import { navigate } from '../lib/router';
import { dataLoader, DEFAULT_STORE_INFO } from '../lib/dataLoader';
import type { StoreInfo } from '../lib/dataLoader';
import type { CategoryType } from '../types';

export const Footer: React.FC = () => {
  const {
        setIsAksMartClubOpen,
    setIsSizeGuideOpen,
    setFilters,
    setActiveProductPage,
    addToast,
    categories,
  } = useStore();

  // Store contact info — DB-driven via /settings/public, bundled AKS_MART as fallback.
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(DEFAULT_STORE_INFO);

  useEffect(() => {
    let cancelled = false;
    dataLoader.loadStoreInfo().then((info) => {
      if (!cancelled) setStoreInfo(info);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [newsletterEmail, setNewsletterEmail] = useState('');

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    // Honest feedback: nothing is emailed yet, so we never claim a promo code was sent.
    addToast({
      type: 'success',
      title: 'Thanks for subscribing!',
      message: "We'll keep you updated with new products and offers.",
    });
    setNewsletterEmail('');
  };

  const handleCategoryClick = (category: CategoryType) => {
    setActiveProductPage(null);
    setFilters((prev) => ({
      ...prev,
      category,
      subcategory: 'All',
      brand: [],
      inStockOnly: false,
      searchQuery: '',
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-neutral-900 text-neutral-300 pt-16 pb-12 border-t border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Middle Navigation & Newsletter */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand & Newsletter (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <Logo className="h-9 w-9 rounded-md shrink-0" />
              <span className="text-xs uppercase font-bold tracking-widest text-neutral-300">
                {storeInfo.name.toUpperCase()} BANGLADESH
              </span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm">
              AKS Mart is Bangladesh's multi-division marketplace — SHUDDHO food, AKS CRAFT handicrafts, AKS HOME living, AKS BEAUTY personal care and AKS PRINT custom print — all under one roof at aksmartbd.com.
            </p>
            {/* Brand motto */}
            <div className="pt-1 border-l-2 border-[#D8232A] pl-3 max-w-sm">
              <p className="text-[11px] font-bold text-neutral-200 leading-snug">
                “{storeInfo.mottoEn}”
              </p>
            </div>

            {/* Newsletter Form */}
            <div className="pt-2">
              <p className="text-xs font-bold text-white mb-2">Subscribe to the AKS Mart Gazette</p>
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2 max-w-sm">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Your email address"
                  required
                  className="flex-1 px-3.5 py-2.5 bg-neutral-800 text-xs text-white rounded-xl border border-neutral-700 outline-none focus:border-[#D8232A] transition-colors"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#D8232A] text-white text-xs font-bold rounded-xl hover:bg-[#b51c22] transition-colors shrink-0 cursor-pointer"
                >
                  Join
                </button>
              </form>
              <p className="text-[11px] text-neutral-500 mt-1.5">
                Receive seasonal offers, division launches and private sale alerts.
              </p>
            </div>
          </div>

          {/* Shop Categories — API-driven divisions (Admin → Categories) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Divisions</h4>
            <ul className="space-y-2 text-xs text-neutral-400">
              {categories.map((c) => (
                <li key={c.id}>
                  <button onClick={() => handleCategoryClick(c.slug as CategoryType)} className="hover:text-white transition-colors cursor-pointer">
                    {c.name}
                  </button>
                </li>
              ))}
              <li>
                <button onClick={() => handleCategoryClick('all')} className="hover:text-white transition-colors cursor-pointer">
                  <Bi en="All Departments" bn="সব পণ্য" />
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white"><Bi en="Customer Care" bn="কাস্টমার কেয়ার" /></h4>
            <ul className="space-y-2 text-xs text-neutral-400">
              <li>
                <button onClick={() => navigate('/track-order')} className="hover:text-white transition-colors cursor-pointer">
                  Track Your Order
                </button>
              </li>
              <li>
                <button onClick={() => setIsSizeGuideOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                  <Bi en="Product & Fit Guides" bn="পণ্য ও সাইজ গাইড" />
                </button>
              </li>
              <li>
                <button onClick={() => setIsAksMartClubOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                  <Bi en="AKS Mart Club Rewards" bn="AKS Mart ক্লাব রিওয়ার্ড" />
                </button>
              </li>
              <li>
                <a
                  href="#support"
                  onClick={(e) => {
                    e.preventDefault();
                    addToast({
                      type: 'info',
                      title: 'Customer Support',
                      message: `Call or WhatsApp us at ${storeInfo.phone}.`,
                    });
                  }}
                  className="hover:text-white transition-colors"
                >
                  <Bi en="Returns & Easy Exchange" bn="রিটার্ন ও এক্সচেঞ্জ" />
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white"><Bi en="Contact & Order" bn="যোগাযোগ ও অর্ডার" /></h4>
            <div className="space-y-2.5 text-xs text-neutral-400">
              <a
                href={`tel:${storeInfo.phoneRaw}`}
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4 text-[#D8232A] shrink-0" />
                <span>WhatsApp / Call: {storeInfo.phone}</span>
              </a>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#D8232A] shrink-0 mt-0.5" />
                <span>
                  {storeInfo.address}
                </span>
              </div>
              <a
                href={`https://${storeInfo.site}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Globe className="w-4 h-4 text-[#D8232A] shrink-0" />
                <span>www.{storeInfo.site}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Payment Logos & Copyright */}
        <div className="pt-8 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} {storeInfo.name} (Bangladesh). All rights reserved. {storeInfo.site}</span>
          </div>

          {/* Payment Gateways Badges */}
          <div className="flex items-center gap-3 text-[11px] font-semibold text-neutral-400">
            <span className="bg-neutral-800 px-2 py-1 rounded text-neutral-300">bKash</span>
            <span className="bg-neutral-800 px-2 py-1 rounded text-neutral-300">Nagad</span>
            <span className="bg-neutral-800 px-2 py-1 rounded text-neutral-300">Visa / Mastercard</span>
            <span className="bg-neutral-800 px-2 py-1 rounded text-neutral-300">Cash on Delivery</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
