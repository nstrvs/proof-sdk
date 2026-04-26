import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import {
  LOCAL_EDITOR_HOST,
  LOCAL_EDITOR_PORT,
  LOCAL_SERVER_ORIGIN,
} from './local-dev.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proofDevServerOrigin = (env.VITE_PROOF_DEV_SERVER_ORIGIN || LOCAL_SERVER_ORIGIN).replace(/\/+$/, '');

  return {
    root: 'src',
    publicDir: resolve(__dirname, 'public'),
    base: './',  // Use relative paths for self-hosted embedding
    define: {
      __PROOF_DEV_SERVER_ORIGIN__: JSON.stringify(proofDevServerOrigin),
    },
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      // IIFE keeps the bundle easy to embed in external hosts.
      modulePreload: false,
      rollupOptions: {
        input: {
          editor: resolve(__dirname, 'src/index.html'),
        },
        output: {
          // Keep filenames predictable for external embedding
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
          // Use IIFE format for broad runtime compatibility
          format: 'iife',
          // Ensure window.proof is accessible globally
          name: 'ProofEditor',
          inlineDynamicImports: true
        }
      },
    },
    server: {
      host: LOCAL_EDITOR_HOST,
      port: LOCAL_EDITOR_PORT,
      strictPort: true,  // Fail if port in use instead of auto-incrementing
      open: false,
    },
  };
});
