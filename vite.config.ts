import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'lucide-react',
        'motion',
        'motion/react',
      ],
    },

    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: [
              'react',
              'react-dom',
              'react-dom/client',
              'react/jsx-runtime',
            ],
            motion: ['motion', 'motion/react'],
            icons: ['lucide-react'],
          },
        },
      },
    },

    server: {
      hmr: true,
      watch: {},

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

    preview: {
      host: '127.0.0.1',
      port: 3000,
      allowedHosts: ['www.aksmartbd.com', 'aksmartbd.com'],

      proxy: {
        '/api': {
          target: 'http://127.0.0.1:4000',
          changeOrigin: true,
        },
      },
    },
  };
});