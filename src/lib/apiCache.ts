/**
 * Stale-while-revalidate cache for the public API payloads.
 *
 * The storefront is a static SPA, so every visit used to start from an empty
 * screen until the API answered. Successful reads are mirrored into
 * localStorage, which lets the providers paint the previous payload
 * immediately and revalidate it in the background: repeat visits are readable
 * straight away, while the bundled placeholder data is still never used.
 */
const PREFIX = 'aks_cache_v1_';
/** Anything older than a week is ignored, so a stale shape can never stick. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  at: number;
  data: T;
}

/** Same-tab mirror — a value is parsed from storage at most once per session. */
const memory = new Map<string, unknown>();

/** Read the last successful payload for a key (null when there is none). */
export function readCache<T>(key: string): T | null {
  if (memory.has(key)) return memory.get(key) as T;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (!entry || typeof entry.at !== 'number' || Date.now() - entry.at > MAX_AGE_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    memory.set(key, entry.data);
    return entry.data;
  } catch {
    // Corrupt entry or storage blocked (private mode) — treat it as a miss.
    return null;
  }
}

/** Remember a successful payload. Never throws: caching is best-effort. */
export function writeCache(key: string, data: unknown): void {
  memory.set(key, data);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data } satisfies CacheEntry<unknown>));
  } catch {
    // Quota exceeded or storage unavailable.
  }
}
