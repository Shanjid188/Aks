/**
 * Tiny in-memory rate limiter for the public write endpoints (reviews, contact
 * form, newsletter). This API runs as a single process, so a Map is enough: it
 * resets on restart and is not shared across instances — swap in a shared store
 * (Redis/database) if the API is ever scaled out.
 */

export interface Throttle {
  /** Records this hit and returns true when the caller is over the limit. */
  isLimited(key: string): boolean;
  /** True when `key` already used up the window; records nothing. */
  isBlocked(key: string): boolean;
  /** Record a hit for `key` without checking it. */
  record(key: string): void;
  /** Test/ops helper — forget every recorded hit. */
  reset(): void;
}

export function createThrottle({
  windowMs,
  max,
  maxKeys = 1000,
}: {
  windowMs: number;
  max: number;
  /** Guard so the map cannot grow without bound under a flood. */
  maxKeys?: number;
}): Throttle {
  const hits = new Map<string, number[]>();
  const recentHits = (key: string, now: number) => (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  const record = (key: string): number => {
    const now = Date.now();
    const recent = recentHits(key, now);
    recent.push(now);
    hits.set(key, recent);

    if (hits.size > maxKeys) {
      for (const [k, v] of hits) {
        if (v.every((t) => now - t >= windowMs)) hits.delete(k);
      }
    }
    return recent.length;
  };

  return {
    isLimited(key: string): boolean {
      return record(key) > max;
    },
    isBlocked(key: string): boolean {
      return recentHits(key, Date.now()).length >= max;
    },
    record(key: string): void {
      record(key);
    },
    reset() {
      hits.clear();
    },
  };
}

/**
 * Client identity for throttling. req.ip already accounts for the trusted
 * proxy (see 'trust proxy' in index.ts); the raw X-Forwarded-For header is
 * never read here because the client controls its first entries.
 */
export function clientKey(req: { ip?: string }): string {
  return req.ip ?? 'unknown';
}
