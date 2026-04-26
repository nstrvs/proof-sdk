import { defineConfig } from 'vite';
import { resolve } from 'path';

const editorHost = 'localhost';
const editorPort = 3000;

export default defineConfig({
  root: 'src',
  publicDir: resolve(__dirname, 'public'),
  base: './',  // Use relative paths for self-hosted embedding
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
    host: editorHost,
    port: editorPort,
    strictPort: true,  // Fail if port in use instead of auto-incrementing
    open: false,
  },
});
