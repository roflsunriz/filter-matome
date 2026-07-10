# nlFilters 編集ルールガイド

## 基本原則

- `01_globalFilter.txt`から`99_*.txt`までは外部配布物のため編集しません。
- filter-matome固有の変更は100番台以降で行います。
- ブラウザ機能のJavaScript挿入は`100_features.txt`へ集約しています。

## 編集対象

| ファイル名 | 役割 |
|---|---|
| `100_features.txt` | `dist/features.js`をニコニコ動画全体へ1回挿入 |
| `101_disable_official_function.txt` | 公式プレイヤーの競合機能を無効化 |
| `105_premium_hide.txt` | プレミアム勧誘要素を非表示 |

`features.js`にはcommon、mlink-video-controller、comment-filter2、video-player、watch-trackerなどが統合されています。実際に起動する機能は、バンドル内のページルーターがホスト名、URL、ローカルHTMLの`data-feature-page`から判定します。

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

新しい個別バンドルとscript挿入用nlFilterは作りません。

1. `local/features/src/`へ機能を実装する
2. 明示的な`start*()`関数を公開する
3. `local/features/src/features.ts`のページルーターへ起動条件を追加する
4. `local/features`で`bun run build`を実行する
5. 対象ページをハード再読み込みして確認する

## 注意事項

- `100_features.txt`を無効にするとブラウザ機能はすべて起動しません。
- 同じ`features.js`を複数のnlFilterから挿入しないでください。
- URL条件を変更した場合は、中央ページルーターの条件と一致しているか確認してください。
- 問題発生時はブラウザキャッシュを消すか、Ctrl+F5で再読み込みします。

参考: [nlFilterの文法](https://w.atwiki.jp/nicocachenlwiki/pages/17.html)
