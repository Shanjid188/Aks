import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
} from 'lucide-react';

export const Footer: React.FC = () => {
  const {
    setIsStoreLocatorOpen,
    setIsBataClubOpen,
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
    addToast({
      type: 'success',
      title: 'Subscribed to AKS Privé!',
      message: 'Thank you! A 15% discount promo code (AKS15) has been sent to your email.',
    });
    setNewsletterEmail('');
  };

  const handleCategoryClick = (category: 'all' | 'men' | 'women' | 'kids' | 'accessories') => {
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
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Nationwide Fast Courier</h4>
              <p className="text-xs text-neutral-400 mt-1">Next-day in Dhaka, 3-4 days across all 64 districts</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-white shrink-0">
              <RotateCcw className="w-5 h-5 text-[#D8232A]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">30-Day Easy Exchange</h4>
              <p className="text-xs text-neutral-400 mt-1">Free alterations & size exchange at any AKS flagship boutique</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#D8232A]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">100% Certified Fabrics</h4>
              <p className="text-xs text-neutral-400 mt-1">Pure Mulberry silk, Dhakai Jamdani & Egyptian Giza cotton</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-white shrink-0">
              <Headphones className="w-5 h-5 text-[#D8232A]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Personal Stylist Support</h4>
              <p className="text-xs text-neutral-400 mt-1">Dedicated style helpline +880 9612 888999 (9 AM - 10 PM)</p>
            </div>
          </div>
        </div>

        {/* Middle Navigation & Newsletter */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand & Newsletter (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="bg-[#D8232A] text-white font-black text-2xl tracking-tight px-3 py-0.5 rounded-sm">
                AKS
              </span>
              <span className="text-xs uppercase font-bold tracking-widest text-neutral-300">
                GARMENTS BANGLADESH
              </span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm">
              AKS Garments is Bangladesh's premier contemporary apparel house, fusing timeless South Asian heritage weaving with bespoke modern tailoring since 1998.
            </p>

            {/* Newsletter Form */}
            <div className="pt-2">
              <p className="text-xs font-bold text-white mb-2">Subscribe to AKS Privé Gazette</p>
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
                Receive curated seasonal lookbooks, private sale access, and runway alerts.
              </p>
            </div>
          </div>

          {/* Shop Categories */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Collections</h4>
            <ul className="space-y-2 text-xs text-neutral-400">
              <li>
                <button onClick={() => handleCategoryClick('men')} className="hover:text-white transition-colors cursor-pointer">
                  Men's Panjabis & Shirts
                </button>
              </li>
              <li>
                <button onClick={() => handleCategoryClick('women')} className="hover:text-white transition-colors cursor-pointer">
                  Women's Salwar & Sarees
                </button>
              </li>
              <li>
                <button onClick={() => handleCategoryClick('kids')} className="hover:text-white transition-colors cursor-pointer">
                  Kids & Junior Festive Wear
                </button>
              </li>
              <li>
                <button onClick={() => handleCategoryClick('accessories')} className="hover:text-white transition-colors cursor-pointer">
                  Kashmiri Shawls & Belts
                </button>
              </li>
              <li>
                <button onClick={() => handleCategoryClick('all')} className="hover:text-white transition-colors cursor-pointer">
                  New Arrivals & Lookbook
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
                  AKS Flagship Boutiques
                </button>
              </li>
              <li>
                <button onClick={() => setIsSizeGuideOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                  Garment Fit & Measuring Guide
                </button>
              </li>
              <li>
                <button onClick={() => setIsBataClubOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                  AKS Privé Loyalty Rewards
                </button>
              </li>
              <li>
                <a
                  href="#support"
                  onClick={(e) => {
                    e.preventDefault();
                    addToast({
                      type: 'info',
                      title: 'AKS Care Hotline',
                      message: 'Call +880 9612 888999 or email care@aksgarments.com.bd',
                    });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Bespoke Alteration & Returns
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Boutique Atelier</h4>
            <div className="space-y-2.5 text-xs text-neutral-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                <span>AKS Garments Atelier<br />Gulshan Avenue, Road 11, Block D, Dhaka-1212</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-neutral-500 shrink-0" />
                <span>+880 9612 888999 / +880 1711 000111</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-neutral-500 shrink-0" />
                <span>care@aksgarments.com.bd</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Payment Logos & Copyright */}
        <div className="pt-8 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} AKS Garments (Bangladesh) Limited. All rights reserved.</span>
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
