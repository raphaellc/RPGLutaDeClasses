/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// Em produção (GitHub Pages) o repo é servido sob /RPGLutaDeClasses/.
// HashRouter não depende de rotas no servidor, mas os assets (JS/CSS/favicon)
// precisam do base correto para serem encontrados.
const base = process.env.GITHUB_PAGES ? '/RPGLutaDeClasses/' : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'O Capital: Luta de Classes',
        short_name: 'Luta de Classes',
        description: 'RPG: A Metrópole-Máquina e a luta da classe trabalhadora',
        theme_color: '#D92121',
        background_color: '#121212',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, 'src/domain'),
      '@application': path.resolve(__dirname, 'src/application'),
      '@infrastructure': path.resolve(__dirname, 'src/infrastructure'),
      '@presentation': path.resolve(__dirname, 'src/presentation'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
