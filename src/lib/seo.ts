/**
 * Runtime <head> management for the client-rendered storefront.
 *
 * The static tags in index.html remain the baseline; these helpers keep the
 * title, description, OG/Twitter tags and favicon in step with the page the
 * visitor is on and with the values configured in Admin → Settings → SEO.
 *
 * Route components that own their meta call `claimSeo(path)` so the app-level
 * default (applied by a parent effect, which React runs *after* child effects)
 * does not overwrite the more specific tags.
 */

export interface SeoInput {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'product' | 'article';
  url?: string;
}

let claimedPath: string | null = null;

function setMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Absolute URL for a possibly relative image path (needed for og:image). */
export function absoluteUrl(value: string): string {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${window.location.origin}${value.startsWith('/') ? '' : '/'}${value}`;
}

/** Write title/description/OG tags. Only the fields provided are touched. */
export function applySeo({ title, description, image, type = 'website', url }: SeoInput): void {
  const pageUrl = url ?? window.location.href;
  if (title) {
    document.title = title;
    setMeta('property', 'og:title', title);
    setMeta('name', 'twitter:title', title);
  }
  if (description) {
    setMeta('name', 'description', description);
    setMeta('property', 'og:description', description);
    setMeta('name', 'twitter:description', description);
  }
  setMeta('property', 'og:type', type);
  setMeta('property', 'og:url', pageUrl);
  setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
  if (image) {
    const absolute = absoluteUrl(image);
    setMeta('property', 'og:image', absolute);
    setMeta('name', 'twitter:image', absolute);
  }
}

/** Point the favicon at the configured file (Admin → Settings → favicon). */
export function applyFavicon(href: string): void {
  if (!href) return;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
}

/** Mark a route as owning its own meta tags. */
export function claimSeo(path: string): void {
  claimedPath = path;
}

/** App-level fallback: applies defaults unless the current route claimed the tags. */
export function applyDefaultSeo(
  path: string,
  seo: { title: string; description: string; image: string; favicon: string }
): void {
  const owned = claimedPath === path;
  applySeo({
    ...(owned ? {} : { title: seo.title, description: seo.description }),
    image: seo.image,
  });
  applyFavicon(seo.favicon);
}
