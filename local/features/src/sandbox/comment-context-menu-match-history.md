# 公式コメントメニューMatch履歴

## 採用条件

- 各版で公式原本のURL、SHA-256、サイズ、Match、一致数、意味上の根拠を記録する。
- Matchは対象となる`ExpandedComment`資産に1回、同じcaptureの他JavaScriptに0回だけ一致させる。
- 置換後ES Moduleをde-minify・構文解析し、元の公式NG操作と追加した版付きAPI接続が共存することを確認する。
- 公式minify名の変化を含む3版以上を観測するまでは、識別子を無条件にワイルドカード化しない。

## 現行Match

```regex
(\(0,([A-Za-z_$][\w$]*)\.jsxs\)\(([A-Za-z_$][\w$]*),\{css:([A-Za-z_$][\w$]*)\.raw\(\),onPress:([A-Za-z_$][\w$]*),children:\[`再生時間（`,)(?=\(0,\2\.jsx\)\([A-Za-z_$][\w$]*,\{css:\{fontFamily:`metaNumber`\},type:`vposMs`,children:([A-Za-z_$][\w$]*)\.comment\.vposMs\}\),`）に移動`)
```

React runtime、button、css、handler、propsの識別子をcaptureし、同じReact runtimeとpropsが直後の`vposMs`表示へ使われることをlookaheadで確認します。Replaceはcaptureしたruntime、button、propsを再利用し、生成class名や表示DOMを探索しません。

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

この時点では1版だけだったためMatchを汎化しなかった。以後も同じ意味上の境界を再確認して履歴へ追記する。

### 2026-08-24: 3版目の公式原本

- 取得日時: `2026-08-24T15:44:21.093Z`
- URL: `https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/ExpandedComment-CKWWkC-q.js`
- SHA-256: `4086a885446f73ad69e4282c9db13fe50792b0367f2adcfaba1a5d2df05ed263`
- サイズ: `19,573 bytes`
- capture group Match一致数: 対象資産`1`、同一captureの他JavaScript`0`
- 意味上の根拠: 再生時刻項目、同じpropsの`comment.vposMs`、直後の通報・公式NG操作が維持されている。

### 2026-08-26: 現行公式原本と汎化Match採用

- 取得日時: `2026-08-26T06:46:01.350Z`
- Chrome: `152.0.7977.64`
- URL: `https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/ExpandedComment-Wbg9CyM5.js`
- SHA-256: `19484baa018479f1132b28fb19792180b7b7a8c5ab55b832be892dbf5e2a683c`
- サイズ: `19,573 bytes`
- capture group Match一致数: 対象資産`1`、同一captureの他JavaScript`0`
- 置換後確認: ES Module構文、既存公式NG操作、`getItems/execute`、`FilterMatomeCommentMenuBridgeApi`状態マーカーを確認。

保存済み7 captureで対象資産へ各1回、他JavaScriptへ0回一致しました。資産hashと周辺minify名が変化しても、再生時刻項目と同じpropsの`comment.vposMs`という関係が維持されたため、固定の`q`、`f`、`$`、`s`、`t`ではなくcapture groupを再利用するMatchへ更新しました。
