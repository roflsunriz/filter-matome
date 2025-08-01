// 自動生成されたViteコンフィグ
// テンプレート関数をインポート
import createConfigTemplate from './vite.html.template.js';

// メイン設定（単一ファイル）
export default createConfigTemplate({
  entry: 'src/mylist2/index.html',
  name: 'mylist2',
  formats: ['es'],
  exclude: [],
  singleFile: true, // 単一ファイル強制
});