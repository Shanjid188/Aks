import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Pre-bundle the third-party packages once instead of letting the browser
    // discover hundreds of small module files on the first dev page load.
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', 'lucide-react', 'motion', 'motion/react'],
    },
    build: {
      rollupOptions: {
        output: {
          // Vendor code changes rarely, so it is cached separately from the app.
          manualChunks: {
            react: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
            motion: ['motion', 'motion/react'],
            icons: ['lucide-react'],
          },
        },
      },
    },
    server: {
      hmr: true,
      watch: {},
      // Compile the above-the-fold modules as soon as the dev server starts, so
      // the very first page load is not waiting on on-demand transformation.
      warmup: {
        clientFiles: [
          './src/main.tsx',
          './src/App.tsx',
          './src/components/Header.tsx',
          './src/pages/HomePage.tsx',
          './src/components/HeroSlider.tsx',
          './src/components/CategoryVisualGrid.tsx',
        ],
      },
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  };
});
