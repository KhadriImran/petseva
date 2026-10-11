import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Set by scripts/vercel-build.js from the restaurant config; falls back for local dev.
const APP_NAME = process.env.APP_NAME ?? 'Restaurant POS';
// Vercel functions can't hold WebSockets → the POS polls instead.
const REALTIME = process.env.VITE_REALTIME ?? (process.env.VERCEL ? 'poll' : 'socket');

export default defineConfig({
  define: { 'import.meta.env.VITE_REALTIME': JSON.stringify(REALTIME) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: `${APP_NAME} POS`,
        short_name: APP_NAME.split(' ')[0] + ' POS',
        description: 'Restaurant point of sale — offline capable',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        // App shell is precached; API data lives in IndexedDB (Dexie), not the HTTP cache.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/ws/],
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    // Consume the shared package from source so Vite handles TS + tree-shaking (and HMR in dev).
    alias: { '@rms/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/ws': { target: 'http://localhost:4000', ws: true },
    },
  },
  build: { sourcemap: false },
});
