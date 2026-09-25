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
  const production = mode === 'production';
  // The website (invite + welcome pages). Unset falls back per build, so a
  // store build can never end up pointing at localhost by accident.
  const siteUrl = env.VITE_SITE_URL || (production ? 'https://ghostly247.com' : 'http://localhost:3000');
  console.log(`[ghostly247] building against API: ${apiBaseUrl} · site: ${siteUrl}`);
  return {
    plugins: [react(), tailwindcss(), crx({ manifest: buildManifest(apiBaseUrl, siteUrl, production) })],
    define: {
      // Resolved here (with the fallback above) so the code and the manifest's
      // externally_connectable always agree on the site.
      'import.meta.env.VITE_SITE_URL': JSON.stringify(siteUrl),
    },
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
      // Dev only. A store build ships no .map files: they roughly 6x the zip
      // and publish the full readable source of a paid product. `pnpm dev` and
      // any non-production mode still gets them for debugging.
      sourcemap: mode !== 'production',
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
