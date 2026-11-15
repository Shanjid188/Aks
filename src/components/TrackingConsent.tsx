import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from '../lib/router';
import {
  OPEN_CONSENT_EVENT,
  getConsent,
  isGaConfigured,
  isPixelConfigured,
  setConsent,
  subscribeTrackingConfig,
  trackPageView,
  trackingConfigSnapshot,
} from '../lib/tracking';

/** Which trackers are configured (resolved at runtime from the API). */
export function useTrackingConfig() {
  useSyncExternalStore(subscribeTrackingConfig, trackingConfigSnapshot, trackingConfigSnapshot);
  const pixel = isPixelConfigured();
  const ga = isGaConfigured();
  return { pixel, ga, any: pixel || ga };
}

/** Sends one page view per route (path + query) change. Renders nothing. */
export function PageViewTracker() {
  const { path, query } = useRouter();
  const search = query.toString();
  useEffect(() => {
    trackPageView();
  }, [path, search]);
  return null;
}

/**
 * Cookie / tracking consent. Shown until the shopper chooses, and again when
 * they open "Cookie settings" in the footer. Only the trackers that are
 * actually configured are offered.
 */
export function ConsentBanner() {
  const { pixel: pixelConfigured, ga: gaConfigured, any: trackingConfigured } = useTrackingConfig();
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(() => getConsent()?.analytics ?? false);
  const [marketing, setMarketing] = useState(() => getConsent()?.marketing ?? false);

  useEffect(() => {
    const reopen = () => {
      const c = getConsent();
      setAnalytics(c?.analytics ?? false);
      setMarketing(c?.marketing ?? false);
      setCustomizing(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  // Ask once the tracker IDs are known, if the shopper hasn't chosen yet.
  useEffect(() => {
    if (trackingConfigured && getConsent() === null) setOpen(true);
  }, [trackingConfigured]);

  if (!trackingConfigured || !open) return null;

  const decide = (choice: { analytics: boolean; marketing: boolean }) => {
    setConsent({ analytics: choice.analytics && gaConfigured, marketing: choice.marketing && pixelConfigured });
    setOpen(false);
    setCustomizing(false);
  };

  const toggleRow = (
    id: string,
    label: string,
    hint: string,
    checked: boolean,
    onChange: (v: boolean) => void
  ) => (
    <label htmlFor={id} className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3 cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[#D8232A]"
      />
      <span>
        <span className="block text-xs font-bold text-neutral-900">{label}</span>
        <span className="block text-[11px] text-neutral-500">{hint}</span>
      </span>
    </label>
  );

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      className="fixed inset-x-3 z-[60] mx-auto max-w-xl rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl sm:p-5 bottom-[calc(68px_+_env(safe-area-inset-bottom))] lg:bottom-4"
    >
      <h2 id="consent-title" className="text-sm font-black text-neutral-900">
        Cookies &amp; tracking · কুকি ও ট্র্যাকিং
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">
        We use essential storage to run your cart and checkout. With your permission we also use
        {gaConfigured ? ' Google Analytics to understand how the shop is used' : ''}
        {gaConfigured && pixelConfigured ? ' and' : ''}
        {pixelConfigured ? ' the Meta Pixel to measure our Facebook & Instagram ads' : ''}. You can change this
        any time from “Cookie settings” at the bottom of the page.
      </p>

      {customizing && (
        <div className="mt-3 space-y-2">
          {gaConfigured &&
            toggleRow('consent-analytics', 'Analytics', 'Google Analytics — anonymous visit and shopping statistics.', analytics, setAnalytics)}
          {pixelConfigured &&
            toggleRow(
              'consent-marketing',
              'Advertising',
              'Meta Pixel & Conversions API — measures ads. On checkout, your email/phone are sent to Meta only in hashed (encrypted) form.',
              marketing,
              setMarketing
            )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {customizing ? (
          <button
            type="button"
            onClick={() => decide({ analytics, marketing })}
            className="rounded-full border border-neutral-300 px-4 py-2 text-xs font-bold text-neutral-800 hover:bg-neutral-50 cursor-pointer"
          >
            Save choices
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCustomizing(true)}
            className="rounded-full px-3 py-2 text-xs font-bold text-neutral-600 underline-offset-2 hover:underline cursor-pointer"
          >
            Customize
          </button>
        )}
        <button
          type="button"
          onClick={() => decide({ analytics: false, marketing: false })}
          className="rounded-full border border-neutral-300 px-4 py-2 text-xs font-bold text-neutral-800 hover:bg-neutral-50 cursor-pointer"
        >
          Essential only
        </button>
        <button
          type="button"
          onClick={() => decide({ analytics: true, marketing: true })}
          className="rounded-full bg-[#D8232A] px-4 py-2 text-xs font-black text-white hover:bg-[#b51c22] cursor-pointer"
        >
          Accept all
        </button>
      </div>
    </div>
  );
}
