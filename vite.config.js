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
        // 静的ページ /poems/ と /poems/{id}/（scripts/build-static-pages.js が vite build の後に書き出す）:
        // - 既定の NavigationRoute は全遷移に index.html（アプリの殻）を返すので、/poems/ だけ外してネットワークから本物の HTML を読む
        //   （sitemap.xml もブラウザで開くとアプリが出てしまうので外す）
        // - プリキャッシュにも入れない（101 ページ分を初回インストールに足さない。今は SW 生成の後に書き出すので元々入らないが、順番が変わっても入らないように）
        navigateFallbackDenylist: [/\/poems\//, /\/sitemap\.xml$/],
        globIgnores: ['**/node_modules/**/*', 'poems/**'],
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
          // 朗読音声(VOICEVOX生成m4a, ~10MB)も再生時にオンデマンドでキャッシュ。
          // 音声を再生成・差し替えした場合は cacheName を 'poem-audio-v3' に上げること（1年キャッシュのため）
          {
            urlPattern: ({ url }) => url.pathname.includes('/audio/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'poem-audio-v2',
              expiration: {
                maxEntries: 210,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
              // iOS Safari は音声を Range リクエストで取得するため、
              // キャッシュから部分レスポンス(206)を合成できるようにする
              rangeRequests: true,
            },
          },
        ],
      },
    }),
  ],
});
