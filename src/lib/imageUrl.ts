/**
 * Central resolution for every image URL the storefront renders.
 *
 * Why this exists
 * ---------------
 * Uploaded artwork is stored by the API under `public/images/uploads/`, and the
 * DB keeps a root-relative `/images/uploads/<file>` reference so URLs stay
 * portable between local and production.
 *
 * In production the storefront HTML is a prebuilt `dist/`. Vite only copies
 * `public/` into `dist/` *at build time*, so a file uploaded through the Admin
 * panel after the last build exists on disk but not inside `dist/`. The request
 * for `/images/uploads/<file>` then falls through to the SPA catch-all and
 * answers `200 text/html` — which a browser refuses to paint, so the merchant
 * sees a blank tile even though the upload reported success.
 *
 * The API already exposes the *same live folder* under `/api/uploads`, which the
 * web server always proxies to Node and which never depends on a rebuild. So we
 * rewrite upload references to that path. The file bytes, the stored URL and
 * the database are all untouched — only the path the browser requests changes.
 * `/images` is kept as a fallback for anything that slips through.
 */
const UPLOAD_PATH = '/images/uploads/';
const API_UPLOAD_PATH = '/api/uploads/';

export const isUploadPath = (url: string): boolean => url.startsWith(UPLOAD_PATH);

/**
 * Map a stored image reference onto the live API path so artwork uploaded after
 * the last build is served immediately — no `git push`, `git pull`, `npm run
 * build` or PM2 restart involved. Non-upload URLs, absolute URLs and data URLs
 * are returned untouched.
 */
export const resolveImageUrl = (url: string | null | undefined): string => {
  if (!url) return url ?? '';
  if (isUploadPath(url)) return `${API_UPLOAD_PATH}${url.slice(UPLOAD_PATH.length)}`;
  return url;
};

/** Apply {@link resolveImageUrl} across a list of image references. */
export const resolveImageUrls = (urls: string[] | null | undefined): string[] =>
  (urls ?? []).map(resolveImageUrl);