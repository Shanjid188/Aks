/**
 * Tiny in-memory rate limiter for the public write endpoints (reviews, contact
 * form, newsletter). This API runs as a single process, so a Map is enough: it
 * resets on restart and is not shared across instances — swap in a shared store
 * (Redis/database) if the API is ever scaled out.
 */

export interface Throttle {
  /** Records this hit and returns true when the caller is over the limit. */
  isLimited(key: string): boolean;
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

  return {
    isLimited(key: string): boolean {
      const now = Date.now();
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      recent.push(now);
      hits.set(key, recent);

      if (hits.size > maxKeys) {
        for (const [k, v] of hits) {
          if (v.every((t) => now - t >= windowMs)) hits.delete(k);
        }
      }
      return recent.length > max;
    },
    reset() {
      hits.clear();
    },
  };
}

/** Best-effort client identity for throttling (proxy-aware). */
export function clientKey(req: { ip?: string; headers: Record<string, unknown> }): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim() !== '') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? 'unknown';
}
