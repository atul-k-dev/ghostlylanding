import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { crx } from '@crxjs/vite-plugin';
import { buildManifest } from './manifest.config.js';

// envDir '.' = apps/extension, which is where the package's own scripts run.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  const apiBaseUrl = env.VITE_API_BASE_URL ?? 'http://localhost:4000';
  console.log(`[ghostly247] building against API: ${apiBaseUrl}`);
  return {
    plugins: [react(), tailwindcss(), crx({ manifest: buildManifest(apiBaseUrl) })],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
    server: {
      port: 5173,
      strictPort: true,
      hmr: {
        port: 5173,
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
      rollupOptions: {
        input: {
          // One entry. The popup was deleted in updateplan 1.6 — the side panel
          // IS the product now, and the floating panel (Phase 2) is injected by
          // the content script rather than built as a page.
          sidepanel: 'src/sidepanel/index.html',
        },
      },
    },
  };
});
