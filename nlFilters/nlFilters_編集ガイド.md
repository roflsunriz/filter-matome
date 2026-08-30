# nlFilters 編集ルールガイド

## 基本原則

- `01_globalFilter.txt`から`99_*.txt`までは外部配布物のため編集しません。
- filter-matome固有の変更は100番台以降で行います。
- ブラウザ機能のJavaScript挿入は`100_features.txt`へ集約しています。

## 編集対象

| ファイル名 | 役割 |
|---|---|
| `100_features.txt` | `dist/features.js`をCommonHeader導入サービスへ1回挿入 |
| `101_disable_official_function.txt` | serverContextの設定JSONを保持し、公式プレイヤーとmlinkの再生速度を版付きAPIで同期 |
| `102_comment_reload_api.txt` | 公式コメントストアの再取得actionをcomment-filter2向けの版付きAPIとして公開 |
| `103_official_comment_menu.txt` | 公式Reactコメントメニューへcomment-filter2の版付き操作APIを接続 |
| `104_watch_harajuku_style.txt` | 公式Watch CSSのlayer隔離とHarajuku CSSの先行読込 |
| `105_premium_hide.txt` | プレミアム勧誘要素を非表示 |

`features.js`はページ判定用の軽量ブートストラップです。ホスト名、URL、ローカルHTMLの`data-feature-page`を判定し、common、mlink-video-controller、comment-filter2、video-player、watch-trackerなど必要なエントリーだけを遅延読み込みします。

## nlFilter基本構文

```text
[Replace]
Name = フィルター名
FullURL = 対象URLの正規表現
Match<
置換対象
>
Replace<
置換後
>
```

主なセクションは`[Replace]`、`[Script]`、`[Style]`、`[RequestHeader]`です。正規表現内のドットは`\.`としてエスケープします。

## JavaScript機能を追加する場合

新しいscript挿入用nlFilterは作りません。機能エントリーは`local/features/scripts/build.ts`の一括ビルドへ追加します。

例外として、公式コードがメタタグを読む前に同期実行する必要がある `server-context-override.js` は、`101_disable_official_function.txt` が `server-context` の直後へ defer なしで挿入します。同フィルターには設定JSONだけを置き、パス走査、型検証、通信保護などの実装を埋め込まないでください。

もう一つの例外が`102_comment_reload_api.txt`です。公式ES Moduleのコメント再取得actionへ、ストアをclosureに閉じ込めた`reload()`だけを追加します。公式資産由来のコードをfeaturesへ複製せず、公開境界は版と再取得関数に限定します。API不在時は通常再読み込みを自動実行せず、一度だけ必要なハード再読み込み方法を通知します。Matchを更新するときは、`local/features/src/sandbox/comment-reload-match-history.md`へ時系列の観測を追加し、`comment-reload-api.md`の手順で取得済み資産をde-minifyして検証してください。

`103_official_comment_menu.txt`も公式ES Moduleへ接続する例外です。右クリック座標から取得済みの公式コメントモデルをReactメニュー生成時に版付きAPIへ渡します。DOMノード、生成class名、表示言語を探索するコードは追加しません。Matchを更新するときは`comment-context-menu-match-history.md`へ観測を追加し、`comment-context-menu.md`の手順で置換後構文と既存公式操作を検証してください。

`101_disable_official_function.txt`の再生速度同期も公式ES Moduleへ接続する例外です。公式media controllerの`getPlaybackRate`境界へ`version: 1`、`get()`、`set(rate)`だけを公開し、mlink-video-controllerから内部状態と動画要素を同時に更新します。公式の候補配列、会員判定、保存処理は変更せず、`playbackRate`という語の全面置換へ戻さないでください。Matchを更新するときは`local/features/src/sandbox/playback-rate-bridge.md`へ観測を追加し、`bun run sandbox:analyze-playback-rate`で置換後をde-minify・構文検証してください。

1. `local/features/src/`へ機能を実装する
2. 明示的な`start*()`関数を公開する
3. `local/features/src/features.ts`のページルーターへ起動条件を追加する
4. `local/features`で`bun run build`を実行する
5. 対象ページをハード再読み込みして確認する

## 注意事項

- `100_features.txt`を無効にするとブラウザ機能はすべて起動しません。
- `104_watch_harajuku_style.txt`の公式root CSS Matchを変更するときは、`bun run sandbox:capture-official`で現行資産を取得し、`bun run sandbox:analyze-watch-css`で元CSSとlayer隔離後CSSの両方をde-minify・構文検証してください。
- `101_disable_official_function.txt`の再生速度Matchを変更した場合は`bun run sandbox:analyze-playback-rate`で最新captureとの一意一致と公式media controller同期を確認してください。
- 同じ`features.js`を複数のnlFilterから挿入しないでください。
- URL条件を変更した場合は、中央ページルーターの条件と一致しているか確認してください。
- `102_comment_reload_api.txt`を変更した場合は`bun run sandbox:analyze-comment-reload`で最新captureとの一致を確認してください。
- `103_official_comment_menu.txt`を変更した場合は`bun run sandbox:analyze-comment-menu`で最新captureとの一致を確認してください。
- 問題発生時はブラウザキャッシュを消すか、Ctrl+F5で再読み込みします。

参考: [nlFilterの文法](https://roflsunriz.github.io/setup-nicocache-nl/nl-filters-syntax/)
