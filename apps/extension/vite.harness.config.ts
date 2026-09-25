import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * The screenshot harness — the side panel rendered as an ordinary page.
 *
 * Deliberately NOT the extension build: no @crxjs, no manifest, no service
 * worker. It shares nothing with `vite.config.ts` except the source it points
 * at, so nothing here can change what ships. See harness/README.md.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: { port: 5199, strictPort: true },
  build: {
    outDir: 'harness-dist',
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: { input: 'harness/index.html' },
  },
});
