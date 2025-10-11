import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@popup': fileURLToPath(new URL('./src/popup', import.meta.url)),
      '@content': fileURLToPath(new URL('./src/content', import.meta.url)),
      '@injected': fileURLToPath(new URL('./src/injected', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    globals: true,
    css: false
  }
});
