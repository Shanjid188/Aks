import React, { useState } from 'react';
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
import { AKS_MART } from '../data/aksMart';
import { Logo } from './Logo';
import type { CategoryType } from '../types';

export const Footer: React.FC = () => {
  const {
    setIsStoreLocatorOpen,
        setIsAksMartClubOpen,
    setIsOrderTrackerOpen,
    setIsSizeGuideOpen,
    setFilters,
    setActiveProductPage,
    addToast,
  } = useStore();

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
        {/* Top Feature Highlights */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pb-12 border-b border-neutral-800">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-white shrink-0">
              <Truck className="w-5 h-5 text-[#D8232A]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Nationwide Delivery</h4>
              <p className="text-xs text-neutral-400 mt-1">Home delivery available across Bangladesh — timing confirmed after you order</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-white shrink-0">
              <RotateCcw className="w-5 h-5 text-[#D8232A]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Easy Exchange</h4>
              <p className="text-xs text-neutral-400 mt-1">Exchange policy details coming soon</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#D8232A]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Curated Quality</h4>
              <p className="text-xs text-neutral-400 mt-1">Every product quality checked across all five divisions</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-white shrink-0">
              <Headphones className="w-5 h-5 text-[#D8232A]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Customer Support</h4>
              <p className="text-xs text-neutral-400 mt-1">WhatsApp / Call: {AKS_MART.phone}</p>
            </div>
          </div>
        </div>

        {/* Middle Navigation & Newsletter */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand & Newsletter (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <Logo className="h-9 w-9 rounded-md shrink-0" />
              <span className="text-xs uppercase font-bold tracking-widest text-neutral-300">
                AKS MART BANGLADESH
              </span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm">
              AKS Mart is Bangladesh's multi-division marketplace — SHUDDHO food, AKS CRAFT handicrafts, AKS HOME living, AKS BEAUTY personal care and AKS PRINT custom print — all under one roof at aksmartbd.com.
            </p>
            {/* Brand motto */}
            <div className="space-y-0.5 pt-1 border-l-2 border-[#D8232A] pl-3 max-w-sm">
              <p className="text-[11px] font-bold text-neutral-200 leading-snug">
                “{AKS_MART.mottoEn}”
              </p>
              <p className="text-[11px] text-neutral-500 leading-snug">{AKS_MART.mottoBn}</p>
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

          {/* Shop Categories */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Divisions</h4>
            <ul className="space-y-2 text-xs text-neutral-400">
              <li>
                <button onClick={() => handleCategoryClick('food')} className="hover:text-white transition-colors cursor-pointer">
                  SHUDDHO — Food
                </button>
              </li>
              <li>
                <button onClick={() => handleCategoryClick('craft')} className="hover:text-white transition-colors cursor-pointer">
                  AKS Craft — Handicrafts
                </button>
              </li>
              <li>
                <button onClick={() => handleCategoryClick('home')} className="hover:text-white transition-colors cursor-pointer">
                  AKS Home — Living
                </button>
              </li>
              <li>
                <button onClick={() => handleCategoryClick('beauty')} className="hover:text-white transition-colors cursor-pointer">
                  AKS Beauty — Care
                </button>
              </li>
              <li>
                <button onClick={() => handleCategoryClick('print')} className="hover:text-white transition-colors cursor-pointer">
                  AKS Print — Custom
                </button>
              </li>
              <li>
                <button onClick={() => handleCategoryClick('all')} className="hover:text-white transition-colors cursor-pointer">
                  All Departments
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Customer Care</h4>
            <ul className="space-y-2 text-xs text-neutral-400">
              <li>
                <button onClick={() => setIsOrderTrackerOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                  Track Your Order
                </button>
              </li>
              <li>
                <button onClick={() => setIsStoreLocatorOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                  AKS Mart Stores
                </button>
              </li>
              <li>
                <button onClick={() => setIsSizeGuideOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                  Product & Fit Guides
                </button>
              </li>
              <li>
                <button onClick={() => setIsAksMartClubOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                  AKS Mart Club Rewards
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
                      message: `Call or WhatsApp us at ${AKS_MART.phone}.`,
                    });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Returns & Easy Exchange
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Contact & Order</h4>
            <div className="space-y-2.5 text-xs text-neutral-400">
              <a
                href={`tel:${AKS_MART.phoneRaw}`}
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4 text-[#D8232A] shrink-0" />
                <span>WhatsApp / Call: {AKS_MART.phone}</span>
              </a>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#D8232A] shrink-0 mt-0.5" />
                <span>
                  {AKS_MART.address}
                  <span className="block text-[11px] text-neutral-500 mt-0.5">{AKS_MART.addressBn}</span>
                </span>
              </div>
              <a
                href={`https://${AKS_MART.site}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Globe className="w-4 h-4 text-[#D8232A] shrink-0" />
                <span>www.{AKS_MART.site}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Payment Logos & Copyright */}
        <div className="pt-8 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} AKS Mart (Bangladesh). All rights reserved. aksmartbd.com</span>
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
