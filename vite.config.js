import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

function readVersion() {
  const out = { VERSION_NAME: '0.9.9', VERSION_CODE: '22' };
  try {
    for (const line of readFileSync(new URL('./version.env', import.meta.url), 'utf8').split(/\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch (e) {}
  return out;
}

const V = readVersion();

export default defineConfig({
  build: { outDir: 'dist-web', emptyOutDir: true, target: 'es2022' },
  define: {
    __APP_VERSION__: JSON.stringify(V.VERSION_NAME),
    __APP_VERSION_CODE__: JSON.stringify(Number(V.VERSION_CODE) || 21),
  },
});
