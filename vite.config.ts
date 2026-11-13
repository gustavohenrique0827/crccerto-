import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// Identifica o build: a Vercel dá o commit; fora dela usamos a hora do build.
const buildId = process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now());

export default defineConfig(() => {
  return {
    define: { __APP_VERSION__: JSON.stringify(buildId) },
    plugins: [
      react(),
      tailwindcss(),
      {
        // version.json fica ao lado do site: o app compara com a versão que está rodando e avisa quando muda
        name: 'emit-version',
        generateBundle() {
          (this as any).emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: buildId }) });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
