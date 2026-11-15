import crypto from 'node:crypto';

/**
 * Customer-matching data for the Meta Conversions API.
 *
 * Meta's rules: normalise first, then SHA-256 (lowercase hex). Browser/network
 * identifiers (IP, user agent, _fbp, _fbc) are sent unhashed, as Meta requires.
 * See https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
 */

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Lowercase, trim, drop punctuation and whitespace (names, city, state, zip). */
function compact(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, '');
}

export function normalizeEmail(value: unknown): string {
  const email = String(value ?? '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

/**
 * Digits only, with the country code. Checkout only accepts Bangladeshi
 * mobiles (01XXXXXXXXX), so a local 11-digit number gets the 880 prefix.
 */
export function normalizePhone(value: unknown): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (/^01\d{9}$/.test(digits)) return `88${digits}`;
  if (/^8801\d{9}$/.test(digits)) return digits;
  return digits.length >= 8 ? digits : '';
}

function hashed(value: string): string[] | undefined {
  return value ? [sha256(value)] : undefined;
}

export interface CustomerInfo {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  district?: unknown;
  division?: unknown;
  postalCode?: unknown;
}

export interface BrowserContext {
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
}

export type MetaUserData = Record<string, string | string[]>;

/** Build Meta `user_data`. Undefined fields are omitted, never sent empty. */
export function buildUserData(customer: CustomerInfo | null, browser: BrowserContext): MetaUserData {
  const out: MetaUserData = {};
  if (customer) {
    const parts = String(customer.fullName ?? '').trim().split(/\s+/).filter(Boolean);
    const phone = normalizePhone(customer.phone);
    const fields: Record<string, string[] | undefined> = {
      em: hashed(normalizeEmail(customer.email)),
      ph: hashed(phone),
      fn: hashed(compact(parts[0])),
      ln: hashed(parts.length > 1 ? compact(parts[parts.length - 1]) : ''),
      ct: hashed(compact(customer.district)),
      st: hashed(compact(customer.division)),
      zp: hashed(compact(customer.postalCode)),
      country: hashed('bd'),
      // Stable per-customer key: the hashed phone, the identifier this shop
      // already uses for customers (orders are indexed by phone).
      external_id: hashed(phone),
    };
    for (const [k, v] of Object.entries(fields)) if (v) out[k] = v;
  }
  if (browser.ip) out.client_ip_address = browser.ip;
  if (browser.userAgent) out.client_user_agent = browser.userAgent;
  if (browser.fbp) out.fbp = browser.fbp;
  if (browser.fbc) out.fbc = browser.fbc;
  return out;
}

/** `_fbp` / `_fbc` cookie values have a fixed shape — reject anything else. */
export function cleanFbCookie(value: unknown): string | undefined {
  const s = String(value ?? '').trim();
  return /^fb\.\d\.\d{10,16}\.[A-Za-z0-9_.-]{1,500}$/.test(s) ? s : undefined;
}

function isPublicIp(ip: string): boolean {
  if (!ip) return false;
  if (ip === '::1' || ip.startsWith('127.') || ip === 'localhost') return false;
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) return false;
  if (/^f[cd][0-9a-f]{2}:/i.test(ip) || /^fe80:/i.test(ip)) return false;
  return true;
}

/**
 * The shopper's IP. nginx sets X-Real-IP to the connecting address (see
 * deploy/nginx.conf.example), which a client cannot forge; X-Forwarded-For is
 * the fallback for other proxies. Private/loopback addresses are dropped —
 * they identify the proxy, not the customer.
 */
export function clientIp(req: { ip?: string; headers: Record<string, unknown> }): string | undefined {
  const realIp = req.headers['x-real-ip'];
  const forwarded = req.headers['x-forwarded-for'];
  const candidates = [
    typeof realIp === 'string' ? realIp : '',
    typeof forwarded === 'string' ? forwarded.split(',')[0] : '',
    req.ip ?? '',
  ];
  for (const raw of candidates) {
    const ip = raw.trim().replace(/^::ffff:/, '');
    if (isPublicIp(ip)) return ip;
  }
  return undefined;
}

export function userAgent(req: { headers: Record<string, unknown> }): string | undefined {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' && ua ? ua.slice(0, 512) : undefined;
}
