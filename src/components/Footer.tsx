import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  CreditCard,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  Youtube,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Logo } from './Logo';
import { Bi } from './Bi';
import { navigate } from '../lib/router';
import { dataLoader, DEFAULT_STORE_INFO } from '../lib/dataLoader';
import type { StoreInfo } from '../lib/dataLoader';
import { useSiteContent } from '../context/SiteContentContext';
import { useLocalized, fillTokens } from './Localized';
import { apiErrorMessage, subscribeNewsletter } from '../api';
import type { ContentPageData } from '../data/pages';
import { splitFooterPages } from '../data/pages';
import type { CategoryType } from '../types';
import { PAYMENT_BRANDS } from '../data/payments';

/** Accent colour for a live payment-method pill (Admin → Settings). */
const methodAccent = (label: string) => {
  if (/bkash/i.test(label)) return '#D12053';
  if (/nagad/i.test(label)) return '#F26522';
  if (/cash|cod/i.test(label)) return '#15803D';
  return '#D8232A';
};

/** Absolute URL for a social handle — bare handles get https://, WhatsApp gets wa.me. */
const socialHref = (id: string, raw: string) => {
  const value = raw.trim();
  if (value === '') return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (id === 'whatsapp') return `https://wa.me/${value.replace(/\D/g, '')}`;
  return `https://${value}`;
};

/**
 * One footer link column (reference: `.footer-widget`). Hidden when it has no
 * links, so an empty Information or Consumer Policy column never leaves a gap.
 */
const FooterColumn: React.FC<{
  title: string;
  titleBn: string;
  hidden?: boolean;
  children?: React.ReactNode;
}> = ({ title, titleBn, hidden, children }) => {
  if (hidden) return null;
  return (
    <div className="lg:col-span-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-white">
        <Bi en={title} bn={titleBn} />
      </h4>
      <ul className="mt-3 space-y-2 text-xs text-neutral-400">{children}</ul>
    </div>
  );
};

export const Footer: React.FC = () => {
  const {
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

  // Reference layout splits the footer pages into Information and Consumer Policy.
  const { info: infoPages, policy: policyPages } = splitFooterPages(footerPages);

  // Social profiles — only the ones filled in at Admin → Settings are rendered.
  const socials: { id: string; label: string; icon: LucideIcon; href: string }[] = [
    { id: 'facebook', label: 'Facebook', icon: Facebook, href: socialHref('facebook', storeInfo.facebook) },
    { id: 'instagram', label: 'Instagram', icon: Instagram, href: socialHref('instagram', storeInfo.instagram) },
    { id: 'youtube', label: 'YouTube', icon: Youtube, href: socialHref('youtube', storeInfo.youtube) },
    { id: 'tiktok', label: 'TikTok', icon: Music2, href: socialHref('tiktok', storeInfo.tiktok) },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, href: socialHref('whatsapp', storeInfo.whatsapp) },
  ].filter((s) => s.href !== '');

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
    <footer className="border-t border-neutral-800 bg-neutral-900 text-neutral-300">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Simple columns — brand block beside four link columns */}
        <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-10">
          {/* Brand — logo, intro, contact, social & newsletter */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-4">
            {/* Logo links home, exactly like the reference */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 cursor-pointer"
              aria-label={storeInfo.name}
            >
              <Logo className="h-9 w-9 rounded-md shrink-0" />
              <span className="text-xs uppercase font-bold tracking-widest text-neutral-300">
                {storeInfo.name.toUpperCase()} BANGLADESH
              </span>
            </button>

            <p className="text-xs text-neutral-400 leading-relaxed">
              <Bi en={content.footerBrand} bn={content.footerBrandBn} />
            </p>

            {/* Footer contact — address, phone, email (Admin → Settings) */}
            <ul className="space-y-2 text-xs text-neutral-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#D8232A] shrink-0 mt-0.5" aria-hidden="true" />
                <span>{t(storeInfo.address, storeInfo.addressBn)}</span>
              </li>
              <li>
                <a href={`tel:${storeInfo.phoneRaw}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone className="w-3.5 h-3.5 text-[#D8232A] shrink-0" aria-hidden="true" />
                  <span>{storeInfo.phone}</span>
                </a>
              </li>
              {storeInfo.email && (
                <li>
                  <a href={`mailto:${storeInfo.email}`} className="flex items-center gap-2 hover:text-white transition-colors">
                    <Mail className="w-3.5 h-3.5 text-[#D8232A] shrink-0" aria-hidden="true" />
                    <span>{storeInfo.email}</span>
                  </a>
                </li>
              )}
            </ul>

            {/* Social profiles — only the ones filled in at Admin → Settings */}
            {socials.length > 0 && (
              <ul className="flex items-center gap-2">
                {socials.map((s) => (
                  <li key={s.id}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      title={s.label}
                      aria-label={s.label}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-neutral-400 transition-colors hover:bg-[#D8232A] hover:text-white"
                    >
                      <s.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {/* Newsletter — one compact row (Admin → Storefront → Footer copy) */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-bold text-white">
                <Bi en={content.footerNewsletterTitle} bn={content.footerNewsletterTitleBn} />
              </p>
              <form onSubmit={handleNewsletterSubmit} className="flex max-w-sm gap-2">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder={t(content.footerNewsletterPlaceholder, content.footerNewsletterPlaceholderBn)}
                  required
                  className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-xs text-white outline-none transition-colors focus:border-[#D8232A]"
                />
                <button
                  type="submit"
                  disabled={newsletterState === 'sending'}
                  className="shrink-0 cursor-pointer rounded-lg bg-[#D8232A] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#b51c22] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Bi en={content.footerNewsletterCta} bn={content.footerNewsletterCtaBn} />
                </button>
              </form>
            </div>

          </div>

          {/* Information — content pages ("show in footer") that are not policies */}
          <FooterColumn
            title={content.footerInfoHeading}
            titleBn={content.footerInfoHeadingBn}
            hidden={infoPages.length === 0}
          >
            {infoPages.map((p) => (
              <li key={p.slug}>
                <button
                  onClick={() => navigate('/' + p.slug)}
                  className="py-2 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <Bi en={p.title} bn={p.titleBn || p.title} />
                </button>
              </li>
            ))}
          </FooterColumn>

          {/* Shop By — API-driven divisions (Admin → Categories), reference: "Shop By" */}
          <FooterColumn title={content.footerDivisionsHeading} titleBn={content.footerDivisionsHeadingBn}>
            {categories.map((c) => (
              <li key={c.id}>
                <button onClick={() => handleCategoryClick(c.slug as CategoryType)} className="py-2 hover:text-white transition-colors cursor-pointer">
                  {c.name}
                </button>
              </li>
            ))}
            <li>
              <button onClick={() => handleCategoryClick('all')} className="py-2 hover:text-white transition-colors cursor-pointer">
                <Bi en={content.headerAllDepartments} bn={content.headerAllDepartmentsBn} />
              </button>
            </li>
          </FooterColumn>

          {/* Support — help links, reference: "Support" column */}
          <FooterColumn title={content.footerCareHeading} titleBn={content.footerCareHeadingBn}>
            <li>
              <button onClick={() => navigate('/track-order')} className="py-2 hover:text-white transition-colors cursor-pointer">
                <Bi en={content.footerTrack} bn={content.footerTrackBn} />
              </button>
            </li>
            <li>
              <button onClick={() => setIsSizeGuideOpen(true)} className="py-2 hover:text-white transition-colors cursor-pointer">
                <Bi en={content.footerGuides} bn={content.footerGuidesBn} />
              </button>
            </li>
          </FooterColumn>

          {/* Consumer Policy — return / refund / exchange pages, reference column */}
          <FooterColumn
            title={content.footerPolicyHeading}
            titleBn={content.footerPolicyHeadingBn}
            hidden={policyPages.length === 0}
          >
            {policyPages.map((p) => (
              <li key={p.slug}>
                <button
                  onClick={() => navigate('/' + p.slug)}
                  className="py-2 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <Bi en={p.title} bn={p.titleBn || p.title} />
                </button>
              </li>
            ))}
          </FooterColumn>
        </div>

        {/* Footer bottom — copyright and the payments we accept (reference: footer-bottom) */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-neutral-800 pt-5 text-xs text-neutral-500 sm:flex-row">
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

          {/* Pay with — self-drawn brand badges plus the live methods the
              merchant actually offers (Admin → Settings). */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
              <Bi en={content.footerPaymentsLabel} bn={content.footerPaymentsLabelBn} />
            </span>

            {/* Pay with — self-drawn brand badges (src/data/payments.ts) */}
            {PAYMENT_BRANDS.map((brand) => (
              <span
                key={brand.id}
                title={brand.label}
                className="flex h-6 items-center gap-1.5 rounded-md px-2 shadow-sm"
                style={{ backgroundColor: brand.bg ?? '#FFFFFF' }}
              >
                {brand.mark === 'mastercard' && (
                  <span className="relative block h-3.5 w-5" aria-hidden="true">
                    <span className="absolute left-0 top-0 h-3.5 w-3.5 rounded-full bg-[#EB001B]" />
                    <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full bg-[#F79E1B]" />
                  </span>
                )}
                {brand.mark === 'card' && (
                  <CreditCard className="h-3 w-3" style={{ color: brand.color }} aria-hidden="true" />
                )}
                <span
                  className={`font-bold leading-none ${brand.italic ? 'italic tracking-tight' : ''} ${
                    brand.size === 'md' ? 'text-[12px]' : 'text-[9px]'
                  }`}
                  style={{ color: brand.color }}
                >
                  {brand.label}
                </span>
              </span>
            ))}

            {/* Live methods — bKash / Nagad / COD … whatever Admin → Settings says */}
            {paymentMethods.map((m) => (
              <span
                key={m.id}
                className="flex h-6 items-center rounded-md bg-white px-2 text-[9px] font-bold leading-none shadow-sm"
                style={{ color: methodAccent(m.label) }}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
