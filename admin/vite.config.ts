import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Served under /admin on the production VPS (same Node process as the API),
  // so bundled asset URLs must be prefixed to avoid clashing with the
  // storefront's own /assets folder. Dev server behaviour is unchanged.
  base: '/admin/',

  plugins: [react(), tailwindcss()],

  // One pre-bundle pass for the shared packages, so the first dev page load is
  // not a waterfall of individual module requests.
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'lucide-react'],
  },

  build: {
    rollupOptions: {
      output: {
        // React is cached separately from the app code (it changes rarely).
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
          icons: ['lucide-react'],
        },
      },
    },
  },

  server: {
    port: 5173,

    // Compile the console shell up front so the login screen appears instantly.
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/pages/LoginPage.tsx',
      ],
    },

    proxy: {
      // Admin UI (products/hero slides) shows uploaded-image previews and old
      // /images/... URLs. Dev server must forward those to the API so images
      // actually render (otherwise the admin panel shows broken thumbnails).
      '/api': 'http://localhost:4000',
      '/images': 'http://localhost:4000',
    },
  },

  preview: {
    host: '127.0.0.1',
    port: 5173,
    allowedHosts: ['www.aksmartbd.com', 'aksmartbd.com'],
  },
});