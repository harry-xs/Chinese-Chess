import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// `VITE_BASE` 由部署环境注入（GitHub Pages 为 "/<repo>/"）。
// 默认 './' 让产物可放在任意子路径下直接运行。
const base = process.env.VITE_BASE ?? './';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '中国象棋',
        short_name: '象棋',
        description: '纯人机对战的中国象棋',
        theme_color: '#F5F5F7',
        background_color: '#F5F5F7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
          {
            src: 'icons/icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2020',
  },
});
