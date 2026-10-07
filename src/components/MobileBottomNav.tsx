import React, { useEffect, useRef, useState } from 'react';
import {
  Heart,
  Home,
  LayoutGrid,
  Package,
  Ruler,
  Search,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useSiteContent } from '../context/SiteContentContext';
import { useRouter, navigate } from '../lib/router';
import { useLocalized } from './Localized';

/*
 * Mobile-only sticky bottom navigation (Home · Categories · Cart · Search · Account).
 *
 * - `fixed bottom-0` + `lg:hidden`: rides above page content on phones and
 *   tablets (never desktop) and stays put while scrolling. A flow spacer
 *   reserves its height so footers can never slide underneath it.
 * - No hardcoded links: Home → `/`, Categories → the header's mobile category
 *   drawer (shared store state), Cart → the existing cart drawer,
 *   Search → asks the header to scroll up + focus its mobile search box,
 *   Account → a bottom sheet of existing store actions (orders, wishlist,
 *   guides…).
 * - Labels from siteContent `mobileNav*` keys via the same `t(en, bn)` rule
 *   the header uses, so EN/BN shoppers each see a single language.
 */

type AccountRow =
  | { kind: 'link'; to: string; icon: React.ReactNode; en: string; bn: string }
  | {
      kind: 'action';
      key: 'wishlist' | 'guides';
      icon: React.ReactNode;
      en: string;
      bn: string;
    };

export const MobileBottomNav: React.FC = () => {
  const {
    cart,
    wishlist,
    setIsCartDrawerOpen,
    setIsWishlistDrawerOpen,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    requestMobileSearchFocus,
    setIsSizeGuideOpen,
    setFilters,
  } = useStore();
  const { content } = useSiteContent();
  const { path } = useRouter();
  const t = useLocalized();

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Account bottom sheet (still lg:hidden — see the sheet JSX below).
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const firstRowRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!isAccountOpen) return undefined;
    const timer = window.setTimeout(() => firstRowRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [isAccountOpen]);
  const closeAccount = () => setIsAccountOpen(false);

  const openSheetModal = (which: 'wishlist' | 'guides') => {
    closeAccount();
    if (which === 'wishlist') setIsWishlistDrawerOpen(true);
    else setIsSizeGuideOpen(true);
  };

  // Sheet rows — every destination already exists (routes or store modals).
  const accountRows: AccountRow[] = [
    {
      kind: 'link',
      to: '/track-order',
      icon: <Package className="h-5 w-5" aria-hidden="true" />,
      en: content.headerQuickTrack,
      bn: content.headerQuickTrackBn,
    },
    {
      kind: 'action',
      key: 'wishlist',
      icon: <Heart className="h-5 w-5" aria-hidden="true" />,
      en: 'Wishlist',
      bn: 'উইশলিস্ট',
    },
    {
      kind: 'action',
      key: 'guides',
      icon: <Ruler className="h-5 w-5" aria-hidden="true" />,
      en: 'Size & Fit Guide',
      bn: 'সাইজ ও ফিট গাইড',
    },
  ];

  const pressHome = () => {
    closeAccount();
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  const pressMenu = () => {
    closeAccount();
    // The drawer lives inside the header at the top of the page — scroll home
    // first so a shopper who tapped Categories mid-page actually sees it open.
    if (!isMobileMenuOpen) window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const pressCart = () => {
    closeAccount();
    setIsMobileMenuOpen(false);
    setIsCartDrawerOpen(true);
  };

  const pressSearch = () => {
    closeAccount();
    // The mobile search input lives in the header (often above the fold), so
    // hand the request over — the header scrolls up and focuses it itself.
    requestMobileSearchFocus();
  };

  const pressAccount = () => {
    setIsMobileMenuOpen(false);
    setIsAccountOpen((v) => !v);
  };

  const isHomeTab = (path === '/' || path === '') && !isMobileMenuOpen && !isAccountOpen;

  const tabCls = (active: boolean) =>
    `relative flex min-h-[56px] min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 px-1 pt-2 pb-1.5 text-[10px] font-semibold leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D8232A] ${
      active ? 'text-[#D8232A]' : 'text-neutral-500 active:text-neutral-900'
    }`;

  const accountTitle = t(content.mobileNavAccount, content.mobileNavAccountBn);

  const sheetTile = (row: AccountRow) => (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
      {row.icon}
    </span>
  );
  const sheetRowCls =
    'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-neutral-800 hover:bg-neutral-50';

  return (
    <>
      {/* In-flow spacer — reserves the bar's height so page footers and footer
          CTAs can never slide underneath the fixed bar. */}
      <div aria-hidden="true" className="h-[calc(60px_+_env(safe-area-inset-bottom))] lg:hidden" />

      {/* Account bottom sheet — white card floating just above the bar with a
          dismiss backdrop. z-40 like the rail so drawers/modals (z-50) win. */}
      {isAccountOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={accountTitle}>
          <div aria-hidden="true" className="absolute inset-0 bg-black/45" onClick={closeAccount} />
          <div className="absolute inset-x-0 bottom-[calc(64px_+_env(safe-area-inset-bottom))] mx-3 overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <p className="text-sm font-extrabold text-neutral-900">{accountTitle}</p>
              <button
                type="button"
                onClick={closeAccount}
                aria-label={t('Close account menu', 'অ্যাকাউন্ট মেনু বন্ধ করুন')}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[44vh] divide-y divide-neutral-100 overflow-y-auto">
              {accountRows.map((row, i) => {
                const label = t(row.en, row.bn);
                if (row.kind === 'link') {
                  return (
                    <a
                      key={row.to}
                      ref={i === 0 ? firstRowRef : undefined}
                      href={row.to}
                      onClick={(e) => {
                        e.preventDefault();
                        closeAccount();
                        setIsMobileMenuOpen(false);
                        navigate(row.to);
                      }}
                      className={sheetRowCls}
                    >
                      {sheetTile(row)}
                      {label}
                    </a>
                  );
                }
                return (
                  <button
                    key={row.key}
                    ref={i === 0 ? firstRowRef : undefined}
                    type="button"
                    onClick={() => openSheetModal(row.key)}
                    className={sheetRowCls}
                  >
                    {sheetTile(row)}
                    {label}
                    {row.key === 'wishlist' && wishlist.length > 0 && (
                      <span className="ml-auto rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-[#D8232A]">
                        {wishlist.length > 99 ? '99+' : wishlist.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* The bar itself — fixed, scroll-independent, mobile/tablet only. */}
      <nav
        aria-label={t('Mobile navigation', 'মোবাইল নেভিগেশন')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/80 bg-white/95 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)] backdrop-blur-md lg:hidden"
      >
        <div className="flex items-stretch">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              pressHome();
            }}
            aria-label={t(content.mobileNavHome, content.mobileNavHomeBn)}
            aria-current={isHomeTab ? 'page' : undefined}
            className={tabCls(isHomeTab)}
          >
            <Home className="h-[22px] w-[22px]" aria-hidden="true" />
            <span className="truncate">{t(content.mobileNavHome, content.mobileNavHomeBn)}</span>
            {isHomeTab && <span aria-hidden="true" className="mt-1 h-1 w-1 rounded-full bg-[#D8232A]" />}
          </a>

          <button
            type="button"
            onClick={pressMenu}
            aria-label={t(content.mobileNavMenu, content.mobileNavMenuBn)}
            aria-expanded={isMobileMenuOpen}
            className={tabCls(isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-[22px] w-[22px]" aria-hidden="true" />
            ) : (
              <LayoutGrid className="h-[22px] w-[22px]" aria-hidden="true" />
            )}
            <span className="truncate">{t(content.mobileNavMenu, content.mobileNavMenuBn)}</span>
            {isMobileMenuOpen && <span aria-hidden="true" className="mt-1 h-1 w-1 rounded-full bg-[#D8232A]" />}
          </button>

          <button
            type="button"
            onClick={pressCart}
            aria-label={
              totalCartCount > 0
                ? `${t(content.mobileNavCart, content.mobileNavCartBn)}, ${totalCartCount}`
                : t(content.mobileNavCart, content.mobileNavCartBn)
            }
            className={tabCls(false)}
          >
            <span className="relative" aria-hidden="true">
              <ShoppingBag className="h-[22px] w-[22px]" aria-hidden="true" />
              {totalCartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D8232A] px-0.5 text-[10px] font-black leading-none text-white ring-2 ring-white">
                  {totalCartCount > 99 ? '99+' : totalCartCount}
                </span>
              )}
            </span>
            <span className="truncate">{t(content.mobileNavCart, content.mobileNavCartBn)}</span>
          </button>

          <button
            type="button"
            onClick={pressSearch}
            aria-label={t(content.mobileNavSearch, content.mobileNavSearchBn)}
            className={tabCls(false)}
          >
            <Search className="h-[22px] w-[22px]" aria-hidden="true" />
            <span className="truncate">{t(content.mobileNavSearch, content.mobileNavSearchBn)}</span>
          </button>

          <button
            type="button"
            onClick={pressAccount}
            aria-label={t(content.mobileNavAccount, content.mobileNavAccountBn)}
            aria-expanded={isAccountOpen}
            className={tabCls(isAccountOpen)}
          >
            <User className="h-[22px] w-[22px]" aria-hidden="true" />
            <span className="truncate">{t(content.mobileNavAccount, content.mobileNavAccountBn)}</span>
            {isAccountOpen && <span aria-hidden="true" className="mt-1 h-1 w-1 rounded-full bg-[#D8232A]" />}
          </button>
        </div>
        {/* Home-indicator padding inside the bar so its background extends. */}
        <div aria-hidden="true" className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </>
  );
};

export default MobileBottomNav;
