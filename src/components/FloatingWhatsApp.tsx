import React, { useEffect, useState } from 'react';
import { dataLoader, DEFAULT_STORE_INFO } from '../lib/dataLoader';
import { AKS_MART } from '../data/aksMart';

/**
 * Edge-pinned circular WhatsApp chat button on the right side, stacked just
 * below the floating cart. Tapping it opens a wa.me chat in a new tab.
 *
 * - Number source: Admin → Settings → WhatsApp (DB-driven), bundled
 *   AKS_MART.phoneRaw as the offline fallback — same priority as the footer.
 * - Same right-edge rail language as FloatingCart (fixed, z-40, below toasts),
 *   sized 35px mobile / 46px desktop — always inside the viewport thanks to
 *   dvh-safe offsets and small-screen sizes.
 */
export const FloatingWhatsApp: React.FC = () => {
  const [waDigits, setWaDigits] = useState(() =>
    AKS_MART.phoneRaw.replace(/\D/g, '')
  );

  useEffect(() => {
    let cancelled = false;
    dataLoader
      .loadStoreInfo()
      .then((info) => {
        const digits = info.whatsapp.replace(/\D/g, '');
        if (!cancelled && digits !== '') setWaDigits(digits);
      })
      .catch(() => {
        /* offline — bundled fallback number stays */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const waHref = `https://wa.me/${waDigits}?text=${encodeURIComponent(
    'Assalamu Alaikum! I need help with my order.'
  )}`;

  return (
    <a
      href={waHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat with us on WhatsApp"
      // Rail: right edge, BELOW the cart — the cart is pinned to the viewport's
      // vertical middle (top-1/2), so the two never collide at any screen
      // height (landscape phones included). This bubble stays bottom-anchored;
      // env(safe-area-inset-bottom) keeps it out of the iOS home-indicator
      // zone on notched devices (0 elsewhere).
      // Below lg the mobile bottom bar owns the bottom edge, so the bubble is
      // lifted clear of it (76px = ~60px bar + 16px gap) and only drops back
      // to its resting offset once the bar is gone (lg+).
      // z-40 lets drawers slide over freely. 16/20px (literal px, immune to the
      // ≥1280 root-size bump; at the right edge it stays clear of the centred
      // iOS home indicator) and thumb-reachable, while ToastContainer's right-24
      // keeps the toast stack LEFT of this rail instead of covering it.
      className="fixed bottom-[calc(76px_+_env(safe-area-inset-bottom))] right-3 z-40 flex h-[35px] w-[35px] items-center justify-center rounded-full bg-[#D8232A] text-white shadow-[0_8px_24px_-6px_rgba(216,35,42,0.65)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#B81E24] hover:shadow-[0_14px_32px_-8px_rgba(216,35,42,0.7)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D8232A] focus-visible:ring-offset-2 motion-reduce:transform-none sm:bottom-[calc(76px_+_env(safe-area-inset-bottom))] sm:right-4 sm:h-[46px] sm:w-[46px] lg:bottom-[calc(20px_+_env(safe-area-inset-bottom))]"
    >
      {/* Subtle ping so first-time shoppers notice the help channel. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 animate-ping rounded-full bg-[#D8232A] opacity-20 motion-reduce:animate-none"
      />
      {/* Official WhatsApp glyph (Simple Icons) — MessageCircle looks generic,
          this reads as WhatsApp instantly on every device. */}
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="relative h-[17px] w-[17px] sm:h-5 sm:w-5"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    </a>
  );
};

export default FloatingWhatsApp;
