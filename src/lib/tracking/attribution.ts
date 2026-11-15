/**
 * Campaign attribution for orders.
 *
 * On every arrival the storefront notes where the shopper came from: campaign
 * tags (utm_*), the referring site's HOST name (never the full URL) and the
 * landing path. The first and the last non-direct visit within 30 days are
 * kept in localStorage and sent with the order; the server derives the
 * channel and links the order to a campaign.
 *
 * Ad click IDs (fbclid, gclid, …) identify an ad click, so they are stored and
 * sent only with advertising consent — captured in memory until then, and
 * erased from storage when consent is withdrawn.
 */
import { hasMarketingConsent, subscribeConsent } from './consent';

const KEY = 'aks.attribution.v1';
const WINDOW_MS = 30 * 24 * 3600 * 1000;
const CLICK_IDS = ['fbclid', 'gclid', 'gbraid', 'wbraid', 'ttclid', 'msclkid'] as const;
type ClickIdType = (typeof CLICK_IDS)[number];

export interface AttributionTouch {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  id?: string;
  clickIdType?: ClickIdType;
  clickId?: string;
  referrerHost?: string;
  landingPath?: string;
  at: number;
}

interface Stored {
  first?: AttributionTouch;
  last?: AttributionTouch;
}

function read(): Stored {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}') as Stored;
    const fresh = (t?: AttributionTouch) => (t && typeof t.at === 'number' && Date.now() - t.at < WINDOW_MS ? t : undefined);
    return { first: fresh(s.first), last: fresh(s.last) };
  } catch {
    return {};
  }
}

function write(s: Stored) {
  try {
    if (!s.first && !s.last) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked — attribution is best-effort */
  }
}

const clip = (v: string | null, max: number) => {
  const s = v?.trim();
  return s ? s.slice(0, max) : undefined;
};

function stripClickId(t?: AttributionTouch): AttributionTouch | undefined {
  if (!t?.clickId) return t;
  const { clickId: _drop, ...rest } = t;
  return rest;
}

/** Click ID seen on this page load, held in memory until advertising consent. */
let pendingClick: { type: ClickIdType; value: string } | null = null;
let captured = false;

/** Call once at startup, before the router rewrites the URL. */
export function captureAttribution(): void {
  if (captured || typeof window === 'undefined') return;
  captured = true;

  const params = new URLSearchParams(window.location.search);
  const touch: AttributionTouch = {
    source: clip(params.get('utm_source'), 150),
    medium: clip(params.get('utm_medium'), 150),
    campaign: clip(params.get('utm_campaign'), 200),
    content: clip(params.get('utm_content'), 200),
    term: clip(params.get('utm_term'), 150),
    id: clip(params.get('utm_id'), 100),
    landingPath: window.location.pathname.slice(0, 300),
    at: Date.now(),
  };
  for (const type of CLICK_IDS) {
    const v = clip(params.get(type), 500);
    if (v) {
      touch.clickIdType = type;
      pendingClick = { type, value: v };
      if (hasMarketingConsent()) touch.clickId = v;
      break;
    }
  }
  try {
    const ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : '';
    const own = window.location.hostname.replace(/^www\./, '');
    if (ref && ref !== own) touch.referrerHost = ref;
  } catch {
    /* malformed referrer */
  }

  const hasSignal = touch.source || touch.medium || touch.campaign || touch.id || touch.clickIdType || touch.referrerHost;
  if (hasSignal) {
    // Direct visits never overwrite a marketing touch (last non-direct model).
    const stored = read();
    for (const k of Object.keys(touch) as (keyof AttributionTouch)[]) if (touch[k] === undefined) delete touch[k];
    write({ first: stored.first ?? touch, last: touch });
  }

  subscribeConsent((state) => {
    const stored = read();
    if (state?.marketing) {
      // Consent given after landing: attach the click ID to the touch it came with.
      if (pendingClick && stored.last?.clickIdType === pendingClick.type && !stored.last.clickId) {
        const last = { ...stored.last, clickId: pendingClick.value };
        const first = stored.first?.at === stored.last.at ? last : stored.first;
        write({ first, last });
      }
    } else {
      write({ first: stripClickId(stored.first), last: stripClickId(stored.last) });
    }
  });
}

/** The `attribution` block sent with an order (undefined for direct visits). */
export function attributionForOrder(): { first?: AttributionTouch; last?: AttributionTouch } | undefined {
  const s = read();
  if (!s.first && !s.last) return undefined;
  if (hasMarketingConsent()) return s;
  return { first: stripClickId(s.first), last: stripClickId(s.last) };
}
