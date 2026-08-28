import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Served under /admin on the production VPS (same Node process as the API),
  // so bundled asset URLs must be prefixed to avoid clashing with the
  // storefront's own /assets folder. Dev server behaviour is unchanged.
  base: '/admin/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Admin UI (products/hero slides) shows uploaded-image previews and old
      // /images/... URLs. Dev server must forward those to the API so images
      // actually render (otherwise the admin panel shows broken thumbnails).
      '/api': 'http://localhost:4000',
      '/images': 'http://localhost:4000',
    },
  },
});