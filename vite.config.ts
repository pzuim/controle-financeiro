import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// No GitHub Pages o app fica em /<nome-do-repositorio>/. O workflow de deploy
// define BASE_PATH; localmente o app roda na raiz.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0'),
  },
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'preact' },
  },
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      // Ícones e favicon já entram pelo globPatterns abaixo.
      includeManifestIcons: false,
      manifest: {
        id: base,
        name: 'Controle Financeiro',
        short_name: 'Finanças',
        description: 'Controle pessoal de despesas, faturas de cartão e rendas.',
        lang: 'pt-BR',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F2F3F5',
        theme_color: '#F2F3F5',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
