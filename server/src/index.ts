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
  app.use('/images', express.static(PUBLIC_IMAGES_DIR));
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

/* Crawler files (robots.txt / sitemap.xml) live at the site root, not under
   /api — registered before the SPA fallback so they are never swallowed. */
app.use('/', seoRouter);

/* ── SPA fallbacks (registered AFTER all /api routes) ───────────────────────
   Deep links get the right SPA instead of the JSON 404 below. /api/* paths are
   excluded so unknown API endpoints still return the JSON error. */
if (ADMIN_DIST) {
  app.get(['/admin', '/admin/*'], (_req, res) => {
    res.sendFile(path.join(ADMIN_DIST, 'index.html'));
  });
}
if (STOREFRONT_DIST) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
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

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`🚀 AKS API listening on http://localhost:${PORT}`);
  console.log(`   Health:  http://localhost:${PORT}/api/health`);
  console.log(`   Admin:   POST /api/admin/auth/login`);
});