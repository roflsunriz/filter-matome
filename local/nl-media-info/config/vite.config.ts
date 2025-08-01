import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: resolve(__dirname, '../src'),
  base: '/local/nl-media-info/dist/',
  build: {
    outDir: resolve(__dirname, '../dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, '../src/index.html')
      },
      output: {
        // assetsフォルダを作らずdist直下に出力
        assetFileNames: '[name].[ext]',
        chunkFileNames: '[name].js',
        entryFileNames: '[name].js'
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
      '@/types': resolve(__dirname, '../src/types')
    }
  },
  server: {
    port: 3000,
    open: true
  }
}); 