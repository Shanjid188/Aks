import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';

import authRouter from './routes/auth.ts';
import productsRouter from './routes/products.ts';
import categoriesRouter from './routes/categories.ts';
import ordersRouter from './routes/orders.ts';
import couponsRouter from './routes/coupons.ts';
import reviewsRouter from './routes/reviews.ts';
import statsRouter from './routes/stats.ts';
import heroSlidesRouter from './routes/heroSlides.ts';
import sideBannersRouter from './routes/sideBanners.ts';
import galleryBannersRouter from './routes/galleryBanners.ts';
import offerBannersRouter from './routes/offerBanners.ts';
import loveBannersRouter from './routes/loveBanners.ts';
import uploadsRouter from './routes/uploads.ts';
import rolesRouter from './routes/roles.ts';
import adminsRouter from './routes/admins.ts';
import settingsRouter from './routes/settings.ts';
import inventoryRouter from './routes/inventory.ts';
import posRouter from './routes/pos.ts';
import invoicesRouter from './routes/invoices.ts';
import packagingRouter from './routes/packaging.ts';
import returnsRouter from './routes/returns.ts';
import suppliersRouter from './routes/suppliers.ts';
import purchasesRouter from './routes/purchases.ts';
import expensesRouter from './routes/expenses.ts';
import reportsRouter from './routes/reports.ts';
import activityRouter from './routes/activity.ts';
import storefrontRouter from './routes/storefront.ts';
import pagesRouter from './routes/pages.ts';
import newsletterRouter from './routes/newsletter.ts';
import contactRouter from './routes/contact.ts';
import seoRouter from './routes/seo.ts';
import trackingRouter from './routes/tracking.ts';
import advertisingTrackingRouter from './routes/advertisingTracking.ts';
import advertisingCampaignsRouter from './routes/advertisingCampaigns.ts';
import { registerJob, startJobs } from './lib/jobs.ts';
import { purgeExpiredClickIds } from './lib/attribution.ts';
import { loadAdsSettings, scheduledMetaSync } from './lib/metaAds.ts';
import advertisingSpendRouter from './routes/advertisingSpend.ts';
import advertisingTrafficRouter from './routes/advertisingTraffic.ts';
import abandonedCartsRouter from './routes/abandonedCarts.ts';
import courierRouter, { COURIER_SYNC_JOB } from './routes/courier.ts';
import { syncCourierStatuses } from './lib/courier/index.ts';
import { runCartMaintenance } from './lib/checkoutSessions.ts';
import { loadGa4Settings, purgeExpiredGa4Cache } from './lib/ga4Data.ts';
import { loadTrackingSettings } from './lib/tracking/config.ts';
import { loadSecrets } from './lib/secrets.ts';

const app = express();

app.use(cors());
// Large limit so admin can upload images as base64 data-URLs (max ~12 MB file)
app.use(express.json({ limit: '15mb' }));

// Serve /public/images directly from the API too, so admin previews work on any origin
const PUBLIC_IMAGES_CANDIDATES = [
  path.resolve(process.cwd(), '..', 'public', 'images'),
  path.resolve(process.cwd(), 'public', 'images'),
];
const PUBLIC_IMAGES_DIR = PUBLIC_IMAGES_CANDIDATES.find((dir) => fs.existsSync(dir));
if (PUBLIC_IMAGES_DIR) {
  // Uploaded artwork changes as the merchant edits the catalog, so it must never
  // be cached long by a proxy sitting in front of us. etag/lastModified still
  // let the browser revalidate cheaply; immutable caching is only safe for the
  // hashed /assets bundle that Vite emits.
  app.use(
    '/images',
    express.static(PUBLIC_IMAGES_DIR, {
      etag: true,
      lastModified: true,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}uploads${path.sep}`)) {
          // Upload filenames are unique (timestamp + random), so each URL is a
          // distinct immutable file. Cache hard: a replaced upload is a new URL.
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );

  /* Second route for uploaded artwork. /images/* has to be proxied by the web
     server (nginx/LiteSpeed) to reach Node at all; on hosts where only /api is
     proxied, a freshly uploaded file would 404 even though it saved correctly.
     Serving the same folder under /api keeps uploads reachable in that setup
     without changing any stored URL. */
  /* Uploaded artwork is served long-lived. Every stored filename embeds a
       timestamp plus random bytes, so a URL always maps to exactly one immutable
       file: replacing an image produces a NEW filename, never a mutated one.
       That is what makes `immutable` safe — no browser can pin a stale file,
       and repeat visits skip revalidation entirely. */
  app.use(
    '/api/uploads',
    express.static(path.join(PUBLIC_IMAGES_DIR, 'uploads'), {
      etag: true,
      lastModified: true,
      immutable: true,
      maxAge: '365d',
      setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'),
    })
  );
}

/* ── Production: serve the built storefront & admin SPAs from this process ──
   On a VPS the same Node process serves /api plus the compiled frontends, so
   everything is same-origin (no CORS setup, no VITE_API_BASE needed). Each
   block is skipped automatically when the dist folder is absent, so the same
   code still works in API-only or dev setups. */
const STOREFRONT_DIST = [
  path.resolve(process.cwd(), '..', 'dist'),
  path.resolve(process.cwd(), 'dist'),
].find((dir) => fs.existsSync(path.join(dir, 'index.html')));
if (STOREFRONT_DIST) {
  app.use(express.static(STOREFRONT_DIST));
}

const ADMIN_DIST = [
  path.resolve(process.cwd(), '..', 'admin', 'dist'),
  path.resolve(process.cwd(), 'admin', 'dist'),
].find((dir) => fs.existsSync(path.join(dir, 'index.html')));
if (ADMIN_DIST) {
  app.use('/admin', express.static(ADMIN_DIST));
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'aks-api', time: new Date().toISOString() });
});

// Feature routers — each file mixes public + /admin/* routes
app.use('/api', authRouter);
app.use('/api', productsRouter);
app.use('/api', categoriesRouter);
app.use('/api', ordersRouter);
app.use('/api', couponsRouter);
app.use('/api', reviewsRouter);
app.use('/api', statsRouter);
app.use('/api', heroSlidesRouter);
app.use('/api', sideBannersRouter);
app.use('/api', galleryBannersRouter);
app.use('/api', offerBannersRouter);
app.use('/api', loveBannersRouter);
app.use('/api', uploadsRouter);
app.use('/api', rolesRouter);
app.use('/api', adminsRouter);
app.use('/api', settingsRouter);
app.use('/api', inventoryRouter);
app.use('/api', posRouter);
app.use('/api', invoicesRouter);
app.use('/api', packagingRouter);
app.use('/api', returnsRouter);
app.use('/api', suppliersRouter);
app.use('/api', purchasesRouter);
app.use('/api', expensesRouter);
app.use('/api', reportsRouter);
app.use('/api', activityRouter);
app.use('/api', storefrontRouter);
app.use('/api', pagesRouter);
app.use('/api', newsletterRouter);
app.use('/api', contactRouter);
app.use('/api', trackingRouter);
app.use('/api', advertisingTrackingRouter);
app.use('/api', advertisingCampaignsRouter);
app.use('/api', advertisingSpendRouter);
app.use('/api', advertisingTrafficRouter);
app.use('/api', abandonedCartsRouter);
app.use('/api', courierRouter);

/* Crawler files (robots.txt / sitemap.xml) live at the site root, not under
   /api — registered before the SPA fallback so they are never swallowed. */
app.use('/', seoRouter);

/* ── SPA fallbacks (registered AFTER all /api routes) ───────────────────────
   Deep links get the right SPA instead of the JSON 404 below. /api/* paths are
   excluded so unknown API endpoints still return the JSON error. */
if (ADMIN_DIST) {
  app.get(['/admin', '/admin/*'], (req, res, next) => {
    // Same rule as the storefront fallback: a request with a file extension is
    // a missing asset, not an admin deep link. Serve a 404 so a broken image
    // or script is reported as such instead of returning the admin shell HTML.
    if (/\.[a-z0-9]{2,5}$/i.test(req.path)) {
      return res.status(404).type('text/plain').send('Not found');
    }
    res.sendFile(path.join(ADMIN_DIST, 'index.html'));
  });
}
if (STOREFRONT_DIST) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    // Requests that look like a file (they carry an extension) are assets, not
    // SPA routes. Falling through to the SPA fallback answered them with
    // index.html and HTTP 200, so a missing image became an HTML response and
    // the browser rendered a broken image with nothing in the network tab to
    // explain why. Answer those with a real 404 instead — deep links such as
    // /products/food still fall through to the SPA below.
    if (/\.[a-z0-9]{2,5}$/i.test(req.path)) {
      return res.status(404).type('text/plain').send('Not found');
    }
    res.sendFile(path.join(STOREFRONT_DIST, 'index.html'));
  });
}

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('[API ERROR]', err);
  res.status(500).json({ error: err?.message || 'Internal server error' });
};
app.use(errorHandler);

// Decrypt admin-managed integration secrets into memory (env vars still win).
// Awaited so the very first order already sees admin-configured tracking.
await Promise.all([
  loadSecrets().catch((err) => console.warn('[secrets] could not load stored secrets:', err?.message ?? err)),
  loadTrackingSettings().catch((err) => console.warn('[tracking] could not load tracking settings:', err?.message ?? err)),
  loadAdsSettings().catch((err) => console.warn('[ads] could not load ad settings:', err?.message ?? err)),
  loadGa4Settings().catch((err) => console.warn('[ga4] could not load GA4 settings:', err?.message ?? err)),
]);

const PORT = Number(process.env.PORT) || 4000;
// Privacy & maintenance jobs (exclusive via JobLock; DISABLE_JOBS=true turns them off).
registerJob({
  name: 'purge-click-ids',
  everyMs: 24 * 3600 * 1000,
  run: async () => `${await purgeExpiredClickIds()} click id(s) erased`,
});
registerJob({ name: 'ga4-cache-purge', everyMs: 24 * 3600 * 1000, run: purgeExpiredGa4Cache });
registerJob({ name: 'cart-maintenance', everyMs: 10 * 60 * 1000, run: () => runCartMaintenance() });
registerJob({ name: 'meta-ads-sync', everyMs: 6 * 3600 * 1000, run: scheduledMetaSync });
// Courier status safety net (webhooks are the fast path): booked parcels still in transit.
registerJob({ name: COURIER_SYNC_JOB, everyMs: 30 * 60 * 1000, run: () => syncCourierStatuses() });
startJobs();

app.listen(PORT, () => {
  console.log(`🚀 AKS API listening on http://localhost:${PORT}`);
  console.log(`   Health:  http://localhost:${PORT}/api/health`);
  console.log(`   Admin:   POST /api/admin/auth/login`);
});