// watch-history SPA用Viteコンフィグ
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュールで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HTMLテンプレート関数をインポート
import createConfigTemplate from './vite.html.template.js';

// 設定の作成
export default createConfigTemplate({
  entry: 'src/watch-history/index.html',
  name: 'watch-history',
  exclude: [],
  singleFile: true
}); 