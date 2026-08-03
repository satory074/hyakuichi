import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/hyakuichi/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg'],
      manifest: {
        name: '百一 - 百人一首暗記',
        short_name: '百一',
        description: '百人一首を効率的に暗記するアプリ',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icons/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'icons/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,svg,ico,woff2}'],
        // 絵札(JPEG, ~6MB)はプリキャッシュせず、閲覧時にオンデマンドでキャッシュ（初回インストールを軽く保つ）
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/efuda/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'efuda-images',
              expiration: {
                maxEntries: 110,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
