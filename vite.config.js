import { defineConfig } from 'vite';
export default defineConfig({
  build: { outDir: 'dist-web', emptyOutDir: true, target: 'es2022' },
  optimizeDeps: { exclude: ['@wllama/wllama'] },
  server: { headers: { 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cross-Origin-Opener-Policy': 'same-origin' } },
});
