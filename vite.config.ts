import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.config';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@popup': fileURLToPath(new URL('./src/popup', import.meta.url)),
      '@content': fileURLToPath(new URL('./src/content', import.meta.url)),
      '@injected': fileURLToPath(new URL('./src/injected', import.meta.url))
    }
  },
  build: {
    sourcemap: true,
    target: 'esnext'
  }
});
