/* eslint-env node */
// 複数のエントリーポイントを定義するグローバルコンフィグ
import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import glob from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュールで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 除外するフォルダのパターン
const excludePatterns = [
  'src/types/**',
  // 必要に応じて除外パターンを追加
];

// HTMLファイルをエントリーポイントとして検索（除外パターンを適用）
const htmlEntries = glob.sync('src/**/*.html', {
  ignore: excludePatterns
});

// HTMLエントリーポイントをRollupの入力形式に変換
const inputEntries = {};
htmlEntries.forEach(file => {
  // ファイル名をキーとして使用
  const name = path.basename(file, '.html');
  const dir = path.dirname(file).replace('src/', '');
  inputEntries[`${dir}/${name}`] = file;
});

export default defineConfig({
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: false, // 既存ファイルを削除しない
    sourcemap: false,
    minify: true,
    rollupOptions: {
      input: inputEntries,
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
      // 除外するファイルを設定
      external: excludePatterns,
    },
  },
  plugins: [
    createHtmlPlugin({
      minify: true,
      inject: {
        data: {
          // HTMLテンプレート変数
          BASE_URL: 'https://www.nicovideo.jp/local/features/dist',
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
  },
}); 