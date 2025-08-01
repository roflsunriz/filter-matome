// 自動生成されたViteコンフィグ
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュールで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// テンプレート関数をインポート
import createConfigTemplate from './vite.ts-css.template.js';

// 設定の作成
export default createConfigTemplate({
  entry: 'src/watch-history/watch-tracker.ts',
  name: 'watch-tracker',
  formats: ['es'],
  exclude: [],
});