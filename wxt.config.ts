import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'wxt';
import packageJson from './package.json';

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  manifestVersion: 3,
  manifest: {
    name: '融美美 (findig-bling-bling)',
    version: packageJson.version,
    description: '监听findig-web作业日志扩展数据，可视化KTR数据处理链路',
    permissions: ['webRequest', 'activeTab', 'storage'],
    host_permissions: ['http://*/*', 'https://*/*'],
    icons: {
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
    web_accessible_resources: [
      {
        resources: ['interceptor.js'],
        matches: ['<all_urls>'],
      },
    ],
  },
  vite: () => ({
    resolve: {
      alias: {
        '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
        '@popup': fileURLToPath(new URL('./src/popup', import.meta.url)),
        '@content': fileURLToPath(new URL('./src/content', import.meta.url)),
        '@injected': fileURLToPath(new URL('./src/injected', import.meta.url)),
      },
    },
    build: {
      sourcemap: true,
      target: 'esnext',
    },
  }),
});
