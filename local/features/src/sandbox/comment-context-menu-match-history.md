# 公式コメントメニューMatch履歴

## 採用条件

- 各版で公式原本のURL、SHA-256、サイズ、Match、一致数、意味上の根拠を記録する。
- Matchは対象となる`ExpandedComment`資産に1回、同じcaptureの他JavaScriptに0回だけ一致させる。
- 置換後ES Moduleをde-minify・構文解析し、元の公式NG操作と追加した版付きAPI接続が共存することを確認する。
- 公式minify名の変化を含む3版以上を観測するまでは、識別子を無条件にワイルドカード化しない。

## 観測

### 2026-08-20: 初回解析

- 取得日時: `2026-08-19T23:45:24.377Z`
- URL: `https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/ExpandedComment-gES-NJrs.js`
- SHA-256: `ee67392486bf58a2e4bba6e80f4f5a2ab942bfdc6b6e9d353a45e6d51596d586`
- サイズ: `16,847 bytes`
- Match: `(\(0,q\.jsxs\)\(f,\{css:\$\.raw\(\),onPress:s,children:\[`再生時間（`,)`
- 一致数: 対象資産`1`、同一captureの他JavaScript`0`
- 意味上の根拠: 選択済み公式コメントモデルを受け取る`ExpandedComment`が、操作グリッドの先頭に「再生時間へ移動」ボタンを生成するReact children境界。直後に通報、公式NGワード、公式NGユーザー、削除が続く。
- 置換後確認: `FilterMatomeCommentMenuApi.getItems/execute`、既存の「コメントをNG登録」「ユーザーをNG登録」、ES Module構文解析がすべて成立した。

現時点では1版だけなのでMatchを汎化しない。更新時は同じ意味上の境界を再確認してこの履歴へ追記する。
