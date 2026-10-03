// Browser-side invoice helpers — turn the pure template into a live print window.
//
// Kept separate from `invoiceTemplate.ts` so the template stays dependency-free
// (and testable), while this module owns the browser bits: the reused logo asset,
// the settings fetch and the print-window lifecycle.
import { api } from '../api';
import aksLogo from '../assets/AKS.logo.jpg';
import type { Order } from '../types';
import {
  buildInvoiceHtml,
  emptyInvoiceSettings,
  type InvoiceSettings,
} from './invoiceTemplate';

/** Absolute URL of the bundled AKS Mart logo (the project's existing asset). */
function logoHref(): string {
  try {
    return new URL(aksLogo, window.location.origin).href;
  } catch {
    return aksLogo;
  }
}

function str(raw: Record<string, unknown> | undefined, key: string): string {
  const v = raw?.[key];
  if (v == null) return '';
  return typeof v === 'string' ? v : String(v);
}

/** Normalise an API settings payload into the shape the template needs. */
function normalise(raw: Record<string, unknown> | undefined): InvoiceSettings {
  const base = emptyInvoiceSettings();
  if (!raw) return base;

  const paymentLabels: Record<string, string> = { ...base.paymentLabels };
  if (Array.isArray(raw.paymentMethods)) {
    for (const entry of raw.paymentMethods) {
      const m = entry as Record<string, unknown>;
      if (m && typeof m.id === 'string') paymentLabels[m.id] = typeof m.label === 'string' ? m.label : m.id;
    }
  }
  const zoneLabels: Record<string, string> = { ...base.zoneLabels };
  if (Array.isArray(raw.shippingZones)) {
    for (const entry of raw.shippingZones) {
      const z = entry as Record<string, unknown>;
      if (z && typeof z.id === 'string') zoneLabels[z.id] = typeof z.label === 'string' ? z.label : z.id;
    }
  }

  return {
    storeName: str(raw, 'storeName') || base.storeName,
    storeTagline: str(raw, 'storeTagline') || base.storeTagline,
    website: str(raw, 'website') || base.website,
    phone: str(raw, 'phone') || base.phone,
    email: str(raw, 'email') || base.email,
    address: str(raw, 'address') || base.address,
    currencySymbol: str(raw, 'currencySymbol') || base.currencySymbol,
    returnPolicy: str(raw, 'returnPolicy') || base.returnPolicy,
    invoiceFooter: str(raw, 'invoiceFooter'),
    thankYouMessage: str(raw, 'thankYouMessage') || base.thankYouMessage,
    paymentLabels,
    zoneLabels,
  };
}

/**
 * Load invoice/business settings. Prefers the full admin settings map (which
 * carries the merchant's custom invoice footer + return policy) and blends in the
 * public snapshot for the delivery/payment labels. Never throws — the invoice
 * always falls back to baseline branding.
 */
export async function loadInvoiceSettings(): Promise<InvoiceSettings> {
  const [admin, pub] = await Promise.allSettled([
    api.get<{ settings: Record<string, unknown> }>('/admin/settings'),
    api.get<{ settings: Record<string, unknown> }>('/settings/public'),
  ]);
  const adminSettings = admin.status === 'fulfilled' ? admin.value.settings : undefined;
  const publicSettings = pub.status === 'fulfilled' ? pub.value.settings : undefined;

  const merged: Record<string, unknown> = { ...publicSettings, ...adminSettings };
  // Public resolves payment ids → labels; admin stores the zone objects with labels.
  if (publicSettings?.paymentMethods) merged.paymentMethods = publicSettings.paymentMethods;
  if (adminSettings?.shippingZones) merged.shippingZones = adminSettings.shippingZones;

  return normalise(merged);
}

export interface OpenInvoiceOptions {
  /** Print as soon as the document (and logo) is ready, instead of only previewing. */
  autoPrint?: boolean;
  /** Reuse an already-loaded settings snapshot (optional — otherwise it is fetched). */
  settings?: InvoiceSettings;
}

/**
 * Open the invoice in its own window (which keeps the admin chrome out of the
 * printout) and optionally send it straight to the printer. The window is opened
 * synchronously so it is treated as a user gesture; settings load afterwards.
 */
export function openInvoice(order: Order, opts: OpenInvoiceOptions = {}): void {
  const w = window.open('', '_blank', 'width=1000,height=1250');
  if (!w) return;
  w.document.write('<!doctype html><title>Invoice</title><body style="font-family:system-ui,sans-serif;padding:40px;color:#64748b">Preparing invoice…</body>');

  const settingsPromise = opts.settings ? Promise.resolve(opts.settings) : loadInvoiceSettings();

  const render = (settings: InvoiceSettings) => {
    if (w.closed) return;
    const html = buildInvoiceHtml(order, settings, { logoUrl: logoHref() });
    w.document.open();
    w.document.write(html);
    w.document.close();
    if (opts.autoPrint) printWhenReady(w);
  };

  settingsPromise
    .then(render)
    .catch(() => render(emptyInvoiceSettings()));
}

/** Print once the logo image has settled (with a safety timeout). */
function printWhenReady(w: Window): void {
  let printed = false;
  const go = () => {
    if (printed || w.closed) return;
    printed = true;
    try {
      w.focus();
      w.print();
    } catch {
      /* the user may have closed the window first */
    }
  };
  const img = w.document.getElementById('aks-invoice-logo') as HTMLImageElement | null;
  if (img && !img.complete) {
    img.addEventListener('load', go);
    img.addEventListener('error', go);
    window.setTimeout(go, 1500);
  } else {
    window.setTimeout(go, 250);
  }
}
