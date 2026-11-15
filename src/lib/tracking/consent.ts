/**
 * Tracking consent — the single source of truth for whether analytics (GA4)
 * and advertising (Meta Pixel / Conversions API) may run.
 *
 * Nothing is loaded and nothing is sent until the shopper chooses. The choice
 * is kept in localStorage on this device; withdrawing it stops all further
 * events and removes the analytics/advertising cookies this site set.
 */

export interface ConsentState {
  /** GA4 measurement. */
  analytics: boolean;
  /** Meta Pixel + Conversions API, including hashed customer matching data. */
  marketing: boolean;
  decidedAt: string;
}

const STORAGE_KEY = 'aks.trackingConsent.v1';
/** Fired on window to reopen the consent dialog (e.g. from the footer link). */
export const OPEN_CONSENT_EVENT = 'aks:open-consent';

function read(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<ConsentState>;
    if (typeof v.analytics !== 'boolean' || typeof v.marketing !== 'boolean') return null;
    return { analytics: v.analytics, marketing: v.marketing, decidedAt: String(v.decidedAt ?? '') };
  } catch {
    return null;
  }
}

let current: ConsentState | null = typeof window === 'undefined' ? null : read();
const listeners = new Set<(state: ConsentState | null) => void>();

export function getConsent(): ConsentState | null {
  return current;
}

export function hasAnalyticsConsent(): boolean {
  return current?.analytics === true;
}

export function hasMarketingConsent(): boolean {
  return current?.marketing === true;
}

export function setConsent(choice: { analytics: boolean; marketing: boolean }): void {
  current = { analytics: choice.analytics, marketing: choice.marketing, decidedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage blocked (private mode): the choice still applies for this visit.
  }
  listeners.forEach((fn) => fn(current));
}

export function subscribeConsent(fn: (state: ConsentState | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function openConsentSettings(): void {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}

/** Delete first-party cookies whose names start with one of the prefixes. */
export function deleteCookies(prefixes: string[]): void {
  const host = window.location.hostname;
  const parts = host.split('.');
  // Cookies may be set on the host or on any parent domain (GA uses the top one).
  const domains = [''];
  for (let i = 0; i < parts.length - 1; i++) domains.push(`; domain=.${parts.slice(i).join('.')}`);
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0].trim();
    if (!prefixes.some((p) => name.startsWith(p))) continue;
    for (const d of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d}`;
    }
  }
}
