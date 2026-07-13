## 問題の説明

現在のvideo-playerには以下の課題があります。
公式のニコニコ動画プレイヤーを隠してカスタムプレイヤーを重ねる構成のため、公式プレイヤーはバックグラウンドでコメントを描画し続けパフォーマンスが低下します。キーボードショートカットも公式・カスタムの双方が反応してしまい衝突が起きます。また、埋め込み対象となるウォッチページの読み込み順序に依存するため、ページの再読込を繰り返さないとカスタムプレイヤーが立ち上がらないケースも散見されます（現在は <code>100_features.txt</code> が単一バンドルを挿入し、中央ルーターがvideo-playerを起動します）。

## 目的

- 公式プレイヤーへの依存を断ち切り、安定して起動するローカル専用の視聴体験を提供する。
- 有料動画（課金必須）のみを対象にローカルプレイヤーへ遷移し、無料動画では既存のウォッチページ挙動を維持する。
- <code>NicoWatchApi</code> の情報を活用し、ウォッチページ相当のメタデータとコメント体験をローカル側で再構築する。

## 解決策

### 全体フロー

1. ウォッチページに挿入した <code>initWatchPageRouter</code> が <code>window.commonHelper.fetchWatchPage()</code> を呼び出し、<code>NicoWatchApi</code> 互換のレスポンスを取得する。
2. <code>video.watchableUserTypeForPayment</code> または <code>payment.video.watchableUserType</code> が <code>all</code> 以外（＝課金が必要）と判定できた場合のみ、<code>/local/features/dist/pages/video-player/index.html?videoId=...</code> に遷移する。
3. ローカルページ（スタンドアロンページ）はクエリパラメーターの <code>videoId</code> を受け取り、再度 <code>fetchWatchPage(videoId)</code> を実行して <code>ApiData</code> に整形する。
4. <code>StandalonePlayer</code> がキャッシュサーバーから動画ソースを選別しつつ、UIモジュール群（コメント、操作パネル等）を初期化する。
5. 表示用コンポーネントが <code>NicoWatchApi</code> の各セクションを描画し、ウォッチページ同等のメタ情報を提供する。

### 視聴ページ側の判定と遷移

- <code>router/watch-page-router.ts</code> がウォッチページ判定（<code>*.nicovideo.jp/watch/*</code>）と課金判定を担当する。
- 判定に成功した場合のみローカルURLを生成し、既にローカルページにいる場合は二重遷移を防ぐ。
- 失敗時は <code>window.logger.warn</code> で通知し、公式ページのままにしてユーザー体験を阻害しない。

### スタンドアロンページ構成

- <code>standalone/index.html</code> で共通ライブラリ（<code>../common/index.ts</code>）と <code>standalone/main.ts</code> を読み込む。
- <code>createStandaloneLayout</code> がレイアウト（ヘッダー、プレイヤー領域、情報カード、関連動画、説明文）を組み立てる。
- パンくずリスト直下では <code>common/video-navigation.ts</code> の共通フォームを使い、動画URLまたは <code>videoId</code> から <code>[a-z]{2}\d+</code> を抽出する。video-player は選択結果を受け取って <code>index.html?videoId=...</code> へ遷移し、movie-info は同じ選択結果からデータ取得を開始する。
- <code>StandalonePlayer</code> は <code>UrlManager</code>・<code>CommentSystem</code>・<code>PlayerControlsShadow</code> など既存モジュールを再利用し、Bunが生成する <code>features.js</code> に統合される。
- <code>assignWatchContext</code> で <code>window.NicoCache_nl.watch</code> に <code>videoId</code> と <code>apiData</code> を再設定し、既存の共通機能（コメントフィルター等）が同じインターフェースで利用できるようにする。

### データ取得と共有

- <code>window.commonHelper.fetchWatchPage(videoId?)</code> が返すオブジェクトは <code>nico-watch-api.md</code> に定義された <code>NicoWatchApi</code> に準拠する。
- スタンドアロン側では <code>ApiData</code> 型にマッピングし、UIが必要とするプロパティのみを抽出する。変換時に欠損値は <code>-</code> や既定文言へフォールバックする。
- コメントは <code>comment.threads</code> や <code>comment.nvComment</code> の情報を <code>CommentSystem</code> へ渡して初期化する。
- 関連動画 <code>related.items</code> は存在すればカードとして描画し、無い場合はプレースホルダを表示する。

## 表示要件

| UI項目 | 取得元 (<code>NicoWatchApi</code>) | 表示内容の例 |
| --- | --- | --- |
| タイトル | <code>video.title</code> | <code>&lt;h1&gt;</code> に表示し、<code>document.title</code> も更新 |
| 投稿日 | <code>video.registeredAt</code> | <code>formatDateTime</code> でローカル日時に整形 |
| 再生時間 | <code>video.duration</code> | <code>formatDuration</code> で <code>HH:MM:SS</code> 表記 |
| 再生数 | <code>video.count.view</code> | 千位区切りで表示 |
| コメント数 | <code>video.count.comment</code> | 上記同様 |
| マイリスト数 | <code>video.count.mylist</code> | 上記同様 |
| いいね数 | <code>video.count.like</code> または <code>video.likeCount</code> | 欠損時は <code>-</code> |
| 広告ポイント | <code>video.advertisePoint</code> | <code>gift.totalPoint</code> をフォールバック |
| ギフトポイント | <code>gift.totalPoint</code> | 欠損時は <code>-</code> |
| タグ | <code>tag.items[].name</code> | カテゴリタグも同一チップで表示 |
| 投稿者情報 | <code>owner</code> または <code>channel</code> | アイコン、名前、プロフィールリンク |
| 投稿者コメント | <code>owner.description</code> または <code>video.description</code> | HTMLは除去しテキスト化 |
| ジャンル | <code>genre.label</code> または <code>video.genre</code> | ヘッダーのメタ情報へ追加 |
| シリーズ情報 | <code>series.video.prev/next/first</code> | シリーズナビゲーションリンク |
| 関連動画 | <code>related.items</code> | サムネイル・タイトル・再生数・長さ |

## コメント・プレイヤー機能

- <code>StandalonePlayer.initialize</code> がプレイヤーシェルを構築し、カスタムコメントシステムを初期化する。
- <code>UrlManager.findFirstAvailableUrl(videoId)</code> でキャッシュ済みソースを検索し、HLS か否かで再生パイプラインを切り替える。
- プレイヤーコントロールは既存の <code>player-controls-shadow</code> Web Component を再利用し、コメント／再生制御との連携を維持する。
- MP4ソースは faststart 変換を前提としており、追加のキャッシュクリーンアップ処理なしに滑らかな再生を維持する。

## エラーとフォールバック

- ウォッチページで課金判定・API取得に失敗した場合は遷移せず公式プレイヤーを使う。
- スタンドアロンページで <code>fetchWatchPage</code> が失敗した場合はエラー文言を表示し、<code>window.logger.error</code> で詳細を記録する。
- 動画ソースの解決に失敗した場合はトーストで通知し、例外をスローして操作を停止する。
- コメント初期化で例外が発生した場合はエラーをログに残しつつプレイヤー再生は継続する。

## 今後の発展

- 無料動画でもローカルプレイヤーを利用できる設定導入余地の検討。
- <code>NicoWatchApi</code> の追加フィールド（ギフト履歴、広告バナーなど）をUIへ段階的に反映。
- サーバー時間 <code>system.serverTime</code> を用いた時刻補正や、視聴履歴・統計との連携強化。
