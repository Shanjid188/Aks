/**
 * Admin-side image URL resolution.
 *
 * The DB stores a portable `/images/uploads/<file>` reference, and the API
 * returns that same form. In production the admin bundle is served from
 * `/admin`, and `/images/*` in front of it is answered by the web server /
 * build output — which does not contain a file uploaded moments earlier, so a
 * freshly uploaded image previews as a broken tile even though the upload
 * succeeded. The storefront avoids this by rendering from the live
 * `/api/uploads/` route.
 *
 * This mirrors that: admin previews read from the same live API route, which
 * is proxied to Node and always serves the file that is actually on disk.
 * Non-upload URLs (absolute http(s), data URLs, bundled assets) are untouched.
 */
const UPLOAD_PATH = '/images/uploads/';
const API_UPLOAD_PATH = '/api/uploads/';

/** Rewrite an upload reference to the live API path; pass anything else through. */
export function adminImageUrl(url: string | null | undefined): string {
  if (!url) return url ?? '';
  if (url.startsWith(UPLOAD_PATH)) return `${API_UPLOAD_PATH}${url.slice(UPLOAD_PATH.length)}`;
  return url;
}

/** Same rewrite across a list (product images). */
export function adminImageUrls(urls: string[] | null | undefined): string[] {
  return (urls ?? []).map(adminImageUrl);
}