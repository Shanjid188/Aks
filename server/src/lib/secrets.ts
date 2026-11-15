// Encrypted, admin-managed integration secrets.
//
// Precedence for every secret:  environment variable  →  encrypted DB value  →  unset.
// Values are decrypted into an in-process cache (loaded at boot and refreshed
// after every change) so hot paths such as CAPI sends stay synchronous.
// Nothing in this module ever logs or returns a plaintext value to a client.
import crypto from 'node:crypto';
import { prisma } from './prisma.ts';

export interface SecretDef {
  key: string;
  label: string;
  group: 'tracking' | 'integrations';
  /** Maximum accepted length (service-account JSON is large). */
  maxLength: number;
}

export const SECRET_DEFS: SecretDef[] = [
  { key: 'META_CAPI_ACCESS_TOKEN', label: 'Meta Conversions API access token', group: 'tracking', maxLength: 1024 },
  { key: 'GA4_API_SECRET', label: 'GA4 Measurement Protocol API secret', group: 'tracking', maxLength: 256 },
  { key: 'META_ADS_ACCESS_TOKEN', label: 'Meta Marketing API token (ads_read)', group: 'integrations', maxLength: 1024 },
  { key: 'GA4_SERVICE_ACCOUNT_JSON', label: 'GA4 Data API service-account key (JSON)', group: 'integrations', maxLength: 8192 },
];

export const SECRET_KEYS = new Set(SECRET_DEFS.map((d) => d.key));

const ALGO = 'aes-256-gcm';

/** 32-byte key from INTEGRATION_ENCRYPTION_KEY (64 hex chars or base64), or null. */
export function encryptionKey(): Buffer | null {
  const raw = (process.env.INTEGRATION_ENCRYPTION_KEY ?? '').trim();
  if (!raw) return null;
  let buf: Buffer | null = null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) buf = Buffer.from(raw, 'hex');
  else {
    try {
      const b = Buffer.from(raw, 'base64');
      if (b.length === 32) buf = b;
    } catch {
      buf = null;
    }
  }
  return buf;
}

export function encryptionConfigured(): boolean {
  return encryptionKey() !== null;
}

function encrypt(key: Buffer, name: string, plain: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  cipher.setAAD(Buffer.from(name)); // binds the ciphertext to its secret name
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), authTag: cipher.getAuthTag().toString('base64') };
}

function decrypt(key: Buffer, name: string, row: { ciphertext: string; iv: string; authTag: string }): string {
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(row.iv, 'base64'));
  decipher.setAAD(Buffer.from(name));
  decipher.setAuthTag(Buffer.from(row.authTag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(row.ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

interface CachedSecret {
  value: string | null; // null when stored but not decryptable
  last4: string;
  updatedAt: Date;
  updatedBy: string | null;
}

const cache = new Map<string, CachedSecret>();

/** (Re)load every stored secret into memory. Safe to call at any time. */
export async function loadSecrets(): Promise<void> {
  const key = encryptionKey();
  const rows = await prisma.integrationSecret.findMany();
  cache.clear();
  for (const row of rows) {
    let value: string | null = null;
    if (key) {
      try {
        value = decrypt(key, row.key, row);
      } catch {
        console.warn(`[secrets] ${row.key} could not be decrypted (wrong INTEGRATION_ENCRYPTION_KEY?)`);
      }
    }
    cache.set(row.key, { value, last4: row.last4, updatedAt: row.updatedAt, updatedBy: row.updatedBy });
  }
}

function envValue(name: string): string {
  return (process.env[name] ?? '').trim();
}

/** Effective secret: environment first, then the decrypted stored value. */
export function getSecret(name: string): string {
  return envValue(name) || cache.get(name)?.value || '';
}

export interface SecretStatus {
  key: string;
  label: string;
  group: SecretDef['group'];
  /** Where the effective value comes from. */
  source: 'env' | 'admin' | null;
  /** Stored but cannot be decrypted with the current key. */
  undecryptable: boolean;
  /** Stored value's last 4 characters (never shown for env-managed values). */
  last4: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export function secretStatus(def: SecretDef): SecretStatus {
  const stored = cache.get(def.key);
  const fromEnv = envValue(def.key) !== '';
  return {
    key: def.key,
    label: def.label,
    group: def.group,
    source: fromEnv ? 'env' : stored?.value ? 'admin' : null,
    undecryptable: !!stored && stored.value === null,
    last4: fromEnv ? null : (stored?.last4 ?? null),
    updatedAt: stored?.updatedAt.toISOString() ?? null,
    updatedBy: stored?.updatedBy ?? null,
  };
}

export function secretStatuses(group?: SecretDef['group']): SecretStatus[] {
  return SECRET_DEFS.filter((d) => !group || d.group === group).map(secretStatus);
}

export class SecretError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Encrypt and store a secret. Throws SecretError for invalid input/config. */
export async function setSecret(name: string, value: string, updatedBy: string | null): Promise<void> {
  const def = SECRET_DEFS.find((d) => d.key === name);
  if (!def) throw new SecretError(404, 'Unknown secret');
  const key = encryptionKey();
  if (!key) {
    throw new SecretError(
      503,
      'Secret storage is not configured. Set INTEGRATION_ENCRYPTION_KEY (32 bytes, hex or base64) on the server, or set this value as an environment variable.'
    );
  }
  const plain = value.trim();
  if (!plain) throw new SecretError(400, 'Value is required');
  if (plain.length > def.maxLength) throw new SecretError(400, `Value is longer than ${def.maxLength} characters`);
  const enc = encrypt(key, name, plain);
  const last4 = plain.length >= 12 ? plain.slice(-4) : '';
  await prisma.integrationSecret.upsert({
    where: { key: name },
    create: { key: name, ...enc, last4, updatedBy },
    update: { ...enc, last4, updatedBy },
  });
  await loadSecrets();
}

export async function clearSecret(name: string): Promise<boolean> {
  if (!SECRET_KEYS.has(name)) throw new SecretError(404, 'Unknown secret');
  const res = await prisma.integrationSecret.deleteMany({ where: { key: name } });
  await loadSecrets();
  return res.count > 0;
}
