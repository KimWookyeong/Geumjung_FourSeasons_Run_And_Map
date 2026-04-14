import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.png'],
      manifest: {
        name: '사계절 런앤맵',
        short_name: '런앤맵',
        description: '금정구의 사계절을 기록하고 함께 지켜나가는 실시간 환경 지도',
        theme_color: '#19c37d',
        background_color: '#edf8f1',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/favicon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/favicon.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/favicon.ico',
            sizes: '48x48',
            type: 'image/x-icon'
          }
        ]
      }
    })
  ]
});