/**
 * Server-side tracking configuration.
 *
 * Precedence for every value:  environment variable  →  Admin → Tracking
 * Settings  →  off. Public IDs and switches live in StoreSetting; secrets
 * (META_CAPI_ACCESS_TOKEN, GA4_API_SECRET) live in the encrypted
 * IntegrationSecret store (lib/secrets.ts) — never in StoreSetting, never in
 * a response and never in the browser bundle.
 *
 * Admin values are cached in memory (loaded at boot, refreshed after every
 * admin change) so the send path stays synchronous.
 */
import { prisma } from '../prisma.ts';
import { getSecret } from '../secrets.ts';

export const CURRENCY = 'BDT';

/** StoreSetting keys owned by Tracking Settings (not editable via /admin/settings). */
export const TRACKING_SETTING_KEYS = [
  'trackingMetaPixelId',
  'trackingMetaEnabled',
  'trackingGa4MeasurementId',
  'trackingGa4Enabled',
  'trackingMetaTestEventCode',
] as const;
type TrackingSettingKey = (typeof TRACKING_SETTING_KEYS)[number];

const settings: Partial<Record<TrackingSettingKey, unknown>> = {};

export async function loadTrackingSettings(): Promise<void> {
  const rows = await prisma.storeSetting.findMany({ where: { key: { in: [...TRACKING_SETTING_KEYS] } } });
  for (const k of TRACKING_SETTING_KEYS) delete settings[k];
  for (const r of rows) {
    try {
      settings[r.key as TrackingSettingKey] = JSON.parse(r.value);
    } catch {
      settings[r.key as TrackingSettingKey] = r.value;
    }
  }
}

export function trackingSetting(key: TrackingSettingKey): unknown {
  return settings[key];
}

function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export type ValueSource = 'env' | 'admin' | null;

export interface ResolvedValue {
  value: string;
  source: ValueSource;
}

function resolve(envNames: string[], settingKey: TrackingSettingKey): ResolvedValue {
  for (const n of envNames) if (env(n)) return { value: env(n), source: 'env' };
  const v = str(settings[settingKey]);
  return v ? { value: v, source: 'admin' } : { value: '', source: null };
}

/** A channel is on unless an admin switched it off (so env-only setups keep working). */
export const metaSwitchOn = () => settings.trackingMetaEnabled !== false;
export const ga4SwitchOn = () => settings.trackingGa4Enabled !== false;

export const resolvedMetaPixelId = () => resolve(['META_PIXEL_ID', 'NEXT_PUBLIC_META_PIXEL_ID'], 'trackingMetaPixelId');
export const resolvedGa4MeasurementId = () =>
  resolve(['GA_MEASUREMENT_ID', 'NEXT_PUBLIC_GA_MEASUREMENT_ID'], 'trackingGa4MeasurementId');
export const resolvedMetaTestEventCode = () => resolve(['META_TEST_EVENT_CODE'], 'trackingMetaTestEventCode');

/** Public IDs the storefront may load — empty when unset or switched off. */
export function publicTrackingIds(): { metaPixelId: string | null; ga4MeasurementId: string | null } {
  const pixel = resolvedMetaPixelId().value;
  const ga = resolvedGa4MeasurementId().value;
  return {
    metaPixelId: metaSwitchOn() && pixel ? pixel : null,
    ga4MeasurementId: ga4SwitchOn() && ga ? ga : null,
  };
}

export interface MetaConfig {
  pixelId: string;
  accessToken: string;
  testEventCode: string;
  graphApiVersion: string;
  graphApiBase: string;
}

/** Meta Conversions API settings, or null when CAPI is not configured or switched off. */
export function metaConfig(): MetaConfig | null {
  const pixelId = publicTrackingIds().metaPixelId;
  const accessToken = getSecret('META_CAPI_ACCESS_TOKEN');
  if (!pixelId || !accessToken) return null;
  return {
    pixelId,
    accessToken,
    testEventCode: resolvedMetaTestEventCode().value,
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
  const measurementId = publicTrackingIds().ga4MeasurementId;
  const apiSecret = getSecret('GA4_API_SECRET');
  if (!measurementId || !apiSecret) return null;
  return {
    measurementId,
    apiSecret,
    endpoint: (env('GA4_MP_ENDPOINT') || 'https://www.google-analytics.com/mp/collect').replace(/\/+$/, ''),
  };
}
