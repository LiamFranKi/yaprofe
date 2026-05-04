import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      /** Evita registrar SW en `vite` (puerto 5173): reduce conflictos con HMR y caché. */
      devOptions: {
        enabled: false,
      },
      includeAssets: ['favicon.png', 'hero-panel.webp'],
      manifest: {
        name: 'YaProFe',
        short_name: 'YaProFe',
        description: 'Marketplace educativo para docentes',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react-quill', 'quill'],
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
