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
import { useSiteContent } from '../context/SiteContentContext';
import { useLocalized, fillTokens } from './Localized';
import { apiErrorMessage, subscribeNewsletter } from '../api';
import type { ContentPageData } from '../data/pages';
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

  // Storefront copy — Admin → Storefront → Homepage (Footer group).
  const { content, checkout } = useSiteContent();
  const t = useLocalized();
  const paymentMethods = checkout.paymentMethods;

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

  // Content pages (About, Contact, policies) — Admin → Content Pages.
  const [footerPages, setFooterPages] = useState<ContentPageData[]>([]);

  useEffect(() => {
    let cancelled = false;
    dataLoader.loadPages().then((list) => {
      if (!cancelled) setFooterPages(list.filter((p) => p.showInFooter));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterState, setNewsletterState] = useState<'idle' | 'sending'>('idle');

  /**
   * Subscribe through the API, which stores the address for Admin → Subscribers.
   * The toast repeats exactly what the server said, so "already subscribed" is
   * never dressed up as a fresh sign-up.
   */
  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || newsletterState === 'sending') return;

    setNewsletterState('sending');
    try {
      const result = await subscribeNewsletter(newsletterEmail.trim(), 'footer');
      addToast({
        type: 'success',
        title: result.alreadySubscribed
          ? t('You are already on the list', 'আপনি ইতিমধ্যেই তালিকায় আছেন')
          : t('Thanks for subscribing!', 'সাবস্ক্রাইব করার জন্য ধন্যবাদ!'),
        message: result.reactivated
          ? t(
              'Welcome back — we have switched your subscription on again.',
              'স্বাগতম — আপনার সাবস্ক্রিপশন আবার চালু করা হয়েছে।'
            )
          : result.alreadySubscribed
            ? t(
                'This email address is already registered with us.',
                'এই ইমেইল ঠিকানাটি আগেই আমাদের কাছে নিবন্ধিত।'
              )
            : t(
                "We'll keep you updated with new products and offers.",
                'নতুন পণ্য ও অফারের খবর আমরা আপনাকে জানাতে থাকব।'
              ),
      });
      setNewsletterEmail('');
    } catch (err) {
      addToast({
        type: 'error',
        title: t('Subscription failed', 'সাবস্ক্রিপশন সম্পন্ন হয়নি'),
        message: apiErrorMessage(err, t('Please try again in a moment.', 'একটু পরে আবার চেষ্টা করুন।')),
      });
    } finally {
      setNewsletterState('idle');
    }
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
              <Bi en={content.footerBrand} bn={content.footerBrandBn} />
            </p>
            {/* Brand motto */}
            <div className="pt-1 border-l-2 border-[#D8232A] pl-3 max-w-sm">
              <p className="text-[11px] font-bold text-neutral-200 leading-snug">
                “{storeInfo.mottoEn}”
              </p>
            </div>

            {/* Newsletter Form */}
            <div className="pt-2">
              <p className="text-xs font-bold text-white mb-2">
                <Bi en={content.footerNewsletterTitle} bn={content.footerNewsletterTitleBn} />
              </p>
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2 max-w-sm">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder={t(content.footerNewsletterPlaceholder, content.footerNewsletterPlaceholderBn)}
                  required
                  className="flex-1 px-3.5 py-2.5 bg-neutral-800 text-xs text-white rounded-xl border border-neutral-700 outline-none focus:border-[#D8232A] transition-colors"
                />
                <button
                  type="submit"
                  disabled={newsletterState === 'sending'}
                  className="px-4 py-2.5 bg-[#D8232A] text-white text-xs font-bold rounded-xl hover:bg-[#b51c22] transition-colors shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Bi en={content.footerNewsletterCta} bn={content.footerNewsletterCtaBn} />
                </button>
              </form>
              <p className="text-[11px] text-neutral-500 mt-1.5">
                <Bi en={content.footerNewsletterNote} bn={content.footerNewsletterNoteBn} />
              </p>
            </div>
          </div>

          {/* Shop Categories — API-driven divisions (Admin → Categories) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              <Bi en={content.footerDivisionsHeading} bn={content.footerDivisionsHeadingBn} />
            </h4>
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
                  <Bi en={content.headerAllDepartments} bn={content.headerAllDepartmentsBn} />
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white"><Bi en={content.footerCareHeading} bn={content.footerCareHeadingBn} /></h4>
            <ul className="space-y-2 text-xs text-neutral-400">
              <li>
                <button onClick={() => navigate('/track-order')} className="hover:text-white transition-colors cursor-pointer">
                  <Bi en={content.footerTrack} bn={content.footerTrackBn} />
                </button>
              </li>
              <li>
                <button onClick={() => setIsSizeGuideOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                  <Bi en={content.footerGuides} bn={content.footerGuidesBn} />
                </button>
              </li>
              <li>
                <button onClick={() => setIsAksMartClubOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                  <Bi en={content.footerClub} bn={content.footerClubBn} />
                </button>
              </li>
              {footerPages.map((p) => (
                <li key={p.slug}>
                  <button
                    onClick={() => navigate('/' + p.slug)}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <Bi en={p.title} bn={p.titleBn || p.title} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white"><Bi en={content.footerContactHeading} bn={content.footerContactHeadingBn} /></h4>
            <div className="space-y-2.5 text-xs text-neutral-400">
              <a
                href={`tel:${storeInfo.phoneRaw}`}
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4 text-[#D8232A] shrink-0" />
                <span>
                  <Bi en={content.footerContactPhoneLabel} bn={content.footerContactPhoneLabelBn} />: {storeInfo.phone}
                </span>
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
            <span>
              {t(
                fillTokens(content.footerCopyright, {
                  year: String(new Date().getFullYear()),
                  store: storeInfo.name,
                  site: storeInfo.site,
                }),
                fillTokens(content.footerCopyrightBn, {
                  year: String(new Date().getFullYear()),
                  store: storeInfo.name,
                  site: storeInfo.site,
                })
              )}
            </span>
          </div>

          {/* Payment badges — the methods the merchant actually offers (Admin → Settings) */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-neutral-400">
            {paymentMethods.map((m) => (
              <span key={m.id} className="bg-neutral-800 px-2 py-1 rounded text-neutral-300">
                {t(m.label, m.labelBn || m.label)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
