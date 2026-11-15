/**
 * Server-side tracking configuration. Every value comes from the environment
 * (server/.env in development, the process environment in production) and is
 * read at call time, so tests and ops can change it without a code edit.
 *
 * Secrets (META_CAPI_ACCESS_TOKEN, GA4_API_SECRET) live ONLY here — they are
 * never sent to the browser. The public IDs are accepted under their server
 * names or the NEXT_PUBLIC_* names the storefront build uses, so one value can
 * be shared by both.
 */

export const CURRENCY = 'BDT';

function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

export interface MetaConfig {
  pixelId: string;
  accessToken: string;
  testEventCode: string;
  graphApiVersion: string;
  graphApiBase: string;
}

/** Meta Conversions API settings, or null when CAPI is not configured. */
export function metaConfig(): MetaConfig | null {
  const pixelId = env('META_PIXEL_ID') || env('NEXT_PUBLIC_META_PIXEL_ID');
  const accessToken = env('META_CAPI_ACCESS_TOKEN');
  if (!pixelId || !accessToken) return null;
  return {
    pixelId,
    accessToken,
    testEventCode: env('META_TEST_EVENT_CODE'),
    graphApiVersion: env('META_GRAPH_API_VERSION') || 'v26.0',
    // Overridable only so the test suite can point CAPI at a local fake.
    graphApiBase: (env('META_GRAPH_API_BASE') || 'https://graph.facebook.com').replace(/\/+$/, ''),
  };
}

export interface Ga4Config {
  measurementId: string;
  apiSecret: string;
  endpoint: string;
}

/** GA4 Measurement Protocol settings (used for server-side refunds), or null. */
export function ga4Config(): Ga4Config | null {
  const measurementId = env('GA_MEASUREMENT_ID') || env('NEXT_PUBLIC_GA_MEASUREMENT_ID');
  const apiSecret = env('GA4_API_SECRET');
  if (!measurementId || !apiSecret) return null;
  return {
    measurementId,
    apiSecret,
    endpoint: (env('GA4_MP_ENDPOINT') || 'https://www.google-analytics.com/mp/collect').replace(/\/+$/, ''),
  };
}
