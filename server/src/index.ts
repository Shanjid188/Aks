import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';

import authRouter from './routes/auth.ts';
import productsRouter from './routes/products.ts';
import ordersRouter from './routes/orders.ts';
import couponsRouter from './routes/coupons.ts';
import storesRouter from './routes/stores.ts';
import reviewsRouter from './routes/reviews.ts';
import statsRouter from './routes/stats.ts';
import heroSlidesRouter from './routes/heroSlides.ts';
import uploadsRouter from './routes/uploads.ts';

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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'aks-api', time: new Date().toISOString() });
});

// Feature routers — each file mixes public + /admin/* routes
app.use('/api', authRouter);
app.use('/api', productsRouter);
app.use('/api', ordersRouter);
app.use('/api', couponsRouter);
app.use('/api', storesRouter);
app.use('/api', reviewsRouter);
app.use('/api', statsRouter);
app.use('/api', heroSlidesRouter);
app.use('/api', uploadsRouter);

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