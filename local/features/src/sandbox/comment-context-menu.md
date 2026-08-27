# 公式コメント右クリックメニューの調査記録

## 調査対象

- 取得日時: 2026-08-19T23:45:24.377Z
- 公開資産: `https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/ExpandedComment-gES-NJrs.js`
- SHA-256: `ee67392486bf58a2e4bba6e80f4f5a2ab942bfdc6b6e9d353a45e6d51596d586`
- サイズ: 16,847 bytes
- 保存先: `official-watch-bundle/captures/2026-08-19T23-45-24-377Z/`

取得済みの公開ES ModuleをPrettierでメモリー上だけde-minifyし、実行せず静的に追跡した。Cookie、認証ヘッダー、HTML、個人識別子は使用していない。

## 確認した右クリック経路

公式プレイヤーは右クリック座標を動画領域内の座標へ変換し、コメントレンダラーの`getCommentAtOffset()`から描画中のコメントモデルを取得する。重なっているコメントを一覧表示し、選択されたコメントを`ExpandedComment`へ渡す。`ExpandedComment`は同じモデルの`body`、`userId`、`vposMs`などを使って、再生位置移動、通報、公式NGワード、公式NGユーザー、削除のReact要素を生成する。

この経路では公式コメントモデルを既に保持しているため、canvasや生成DOMから本文やユーザーIDを逆算する必要はない。

## filter-matomeの接続

`nlFilters/103_official_comment_menu.txt`は、`ExpandedComment`が操作項目のReact childrenを生成する一点へ、`window.FilterMatomeCommentMenuApi`が返す項目記述子を追加する。DOMノード、生成class名、表示言語の文字列を探索・監視しない。APIがない、版が違う、項目取得に失敗した場合は空配列に戻し、公式メニューを変更せず表示する。

comment-filter2が公開する契約版`1`は次の最小境界である。

- `getItems(comment)`: 公式コメントモデルを検証し、表示する項目IDと日本語ラベルだけを返す。
- `execute(action, comment)`: コピー、Google検索、HTTP(S) URLの新規タブ表示、comment-filter2の全動画NGワード・NGユーザーID追加を実行する。

CommonHeaderの状態表示は公式メニューを疑似操作しない。Performance Resource Timingで既に読み込まれた同一公式CDNの`ExpandedComment-*.js`だけを特定し、Cookieなどの認証情報を付けずに再取得して、103番が追加する`FilterMatomeCommentMenuApi`、bridge marker、`getItems`、`execute`の固有断片をread-only検査する。ページ開始時と資産読込時に即時確認し、その後の保険確認は180秒間隔とする。

URLを直接開く項目は、空白を除いた本文全体を`URL`で解析でき、schemeが`http:`または`https:`の場合だけ返す。NGワードは本文を正規表現リテラルとしてエスケープし、既存の同一ルールを重複登録しない。無効な同一ルールは再有効化し、保存後に既存の公式コメント再取得APIで即時反映する。

## 追従確認

```powershell
cd local/features
bun run sandbox:analyze-comment-menu
bun test tests/comment-context-menu-nlfilter.test.ts tests/comment-context-menu-rules.test.ts tests/official-comment-menu.test.ts
bunx playwright test tests/comment-filter2.spec.ts
```

解析コマンドは最新capture内の全JavaScriptに対してMatchが対象資産へ1回だけ現れること、置換後ES Moduleを構文解析できること、公式NG操作が残ることを検証する。Matchが外れた場合はDOM挿入へ切り替えず、右クリック座標からコメントモデルを得る経路と`ExpandedComment`のReact children生成点を再解析する。
