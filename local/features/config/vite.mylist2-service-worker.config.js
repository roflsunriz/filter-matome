// Service Worker専用のViteコンフィグ
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュールで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: false, // 既存の出力を消さない
    minify: false,
    sourcemap: true,
    lib: {
      entry: 'src/mylist2/service-worker.ts',
      name: 'mylist2-service-worker',
      formats: ['es'],
      fileName: () => 'mylist2-service-worker.js',
    },
    rollupOptions: {
      output: {
        // Service Workerも単一ファイルに
        inlineDynamicImports: true,
      },
      external: () => false, // すべてをバンドル
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
  },
  // CSS処理を無効化
  css: {
    modules: false,
    preprocessorOptions: {},
  },
}); 