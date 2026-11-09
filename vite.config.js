import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Lo staging gira su un altro repo Pages: VITE_BASE_PATH sovrascrive il percorso di produzione
export default defineConfig(({ mode }) => {
const env = loadEnv(mode, '.', 'VITE_')
const base = `/${(env.VITE_BASE_PATH || 'gestionale-IMD').replace(/^\/+|\/+$/g, '')}/`

return {
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.webmanifest',
      includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Gestionale IMD',
        short_name: 'Gestionale',
        description: 'Applicazione di gestione IMD',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: base,
        start_url: base,
        icons: [
          {
            src: `${base}pwa-192x192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: `${base}pwa-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: `${base}pwa-maskable-192x192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: `${base}pwa-maskable-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        categories: ['productivity', 'business'],
        screenshots: [
          {
            src: `${base}screenshot1.png`,
            sizes: '540x720',
            type: 'image/png',
            form_factor: 'narrow'
          },
          {
            src: `${base}screenshot2.png`,
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpeg,jpg,gif,json}'],
        maximumFileSizeToCacheInBytes: 5000000,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60
              }
            }
          }
        ]
      }
    })
  ],
}
})
