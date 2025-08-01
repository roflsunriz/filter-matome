/* eslint-env node */
// TypeScriptバンドルテンプレート（CSS統合版・単一ファイル強制）
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュールで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @param {Object} options - 設定オプション
 * @param {string} options.entry - エントリーポイントのパス (例: 'src/features/header/index.ts')
 * @param {string} options.name - 出力バンドルの名前 (例: 'header')
 * @param {string|string[]} options.formats - ビルド形式 ('es' または 'iife')
 * @param {string[]} options.exclude - 除外するフォルダのパターン (例: ['src/comments_filter/explanation/**'])
 * @param {boolean} [options.singleFile=true] - 単一ファイル出力を強制するか
 * @returns {import('vite').UserConfig}
 */
export default function createConfig(options) {
  const { 
    entry, 
    name, 
    formats = ['es'],
    exclude = [],
    singleFile = true
  } = options;

  return defineConfig({
    build: {
      target: 'esnext',
      outDir: 'dist',
      emptyOutDir: false, // 既存の出力を消さない
      minify: false,
      esbuild: {
        keepNames: true,
      },
      sourcemap: true,
      lib: {
        entry,
        name,
        formats,
        fileName: (format) => `${name}.${format}.js`,
      },
      rollupOptions: {
        input: {
          [name]: entry
        },
        output: {
          // CSSファイルは生成しない（テンプレートリテラルに統合済み）
          entryFileNames: (chunkInfo) => {
            return `${chunkInfo.name}.[format].js`;
          },
          // チャンクファイルを生成しない設定
          chunkFileNames: (chunkInfo) => {
            return `${chunkInfo.name}.js`;
          },
          // アセットファイル（CSS等）の処理を無効化
          assetFileNames: () => {
            // CSSはもうテンプレートリテラルに統合されているので、
            // アセットファイルは生成しない
            return '[name].[ext]';
          },
          // 単一ファイル強制設定
          ...(singleFile && {
            // インライン動的インポートを有効化（これだけで単一ファイルになる）
            inlineDynamicImports: true,
          }),
        },
        // 単一ファイル出力の場合は外部依存関係を無効化
        ...(singleFile && {
          external: () => false, // すべてをバンドルに含める
        }),
        // 従来の外部依存関係設定（単一ファイルでない場合のみ）
        ...(!singleFile && {
          external: (id) => {
            // エントリーポイント自体は外部化しない
            if (id === entry) {
              return false;
            }
            // 共通ライブラリを外部化（ただし、commonライブラリ自体をビルドする場合は除く）
            if (name !== 'common' && (id.includes('/common/') || id.includes('\\common\\'))) {
              return true;
            }
            // 除外パターンをチェック
            return exclude.some(pattern => id.includes(pattern));
          },
        }),
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '../src'),
      },
    },
    // CSS処理を無効化（テンプレートリテラルに統合済み）
    css: {
      // CSSファイルの処理を最小限に
      modules: false,
      preprocessorOptions: {},
    },
  });
} 