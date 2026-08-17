# video-player

## 役割

NicoCache_nlのローカルキャッシュを再生するスタンドアロンプレイヤーと、ニコニコ動画のウォッチページからローカルプレイヤーへ移動するルーターを提供します。コメント一覧・オーバーレイ・投稿、再生設定、動画情報表示、次動画・繰り返し再生にも対応します。

- 配信URL: `https://www.nicovideo.jp/local/features/dist/pages/video-player/index.html?videoId=<動画ID>`
- HTML生成元: `standalone/index.html`
- ウォッチページ入口: `startVideoPlayerRouter()`
- スタンドアロン入口: `startStandalonePlayer()`

## 構成

- `index.ts`: ウォッチページルーターの多重起動防止。
- `router/watch-page-router.ts`: URLの動画ID、視聴可否、ローカルキャッシュを確認し、公式・ローカル再生を選択。
- `standalone/`: 静的ページのレイアウト、APIデータ正規化、動画ソース検証、再生本体、スタイル、再生終了時の設定。
- `core/comment-fetcher.ts`: コメント取得。
- `core/comment-poster.ts`: 視聴ページから投稿先を取得し、投稿キーAPIとnvComment APIを接続する型付き投稿クライアント。
- `core/comment-system.ts`: コメント一覧とプレイヤー連携。
- `core/comment-overlay-comment-system.ts`: `comment-overlay` を使う描画。
- `core/nicochart-*`: ウォッチページから情報を取得できない場合のnicochartフォールバック。
- `core/database-manager.ts`, `core/migration-manager.ts`, `config/database-config.ts`: 設定DBのスキーマ、移行、バックアップ、クリーンアップ。
- `ui/player-controls-view.ts`, `ui/player-controls-events.ts`, `ui/player-controls.ts`: 再生コントロールのShadow DOM表示、イベント配線、全画面・ライフサイクル。
- `ui/`: 上記に加え、コメント一覧、背景モード、設定保存などのUI部品。
- `ui/comment-post-form.ts`: 75文字制限、公式風コマンドパレット、投稿状態を扱うShadow DOMフォーム。
- `utils/`: DOM待機、IndexedDB設定、通知。
- `concepts.md`: プレイヤー設計上の補足。

## 起動フロー

### ウォッチページ

1. URLから現在の動画IDを取得する。
2. ウォッチAPIの視聴可否と、専用ホストの動画単位REST資源でローカルキャッシュを確認する。
3. 必要に応じて公式プレイヤー継続、ローカルプレイヤー遷移、削除済み動画用表示を選ぶ。

動画IDはURLを優先します。`window.NicoCache_nl.watch` はタイトルなどを補完する場合も存在と型を確認し、判定の第一情報源にしません。

### スタンドアロン

1. `videoId` クエリまたは共通動画ナビゲーションから対象を決める。
2. ローカルキャッシュをプレイヤーへ読み込む。
3. 動画情報はウォッチページを優先し、取得できない場合だけNicoCache_nl拡張経由のnicochart情報へフォールバックする。
4. comment-filter2とコメント取得処理を接続し、一覧とオーバーレイへ反映する。
5. 自動次動画または繰り返し設定に従って終了時動作を決める。

### コメント投稿

1. 投稿時点の視聴ページを取得し、再生中の動画IDと一致する既定投稿先スレッドを選ぶ。
2. `nvapi.nicovideo.jp` からログイン状態に紐づく `postKey` を取得する。
3. 通常動画では公式と同じく `184` を補い、再生位置をミリ秒で付けて `nvComment.server` へ投稿する。
4. 成功したコメントを一覧と流れるオーバーレイへ即時反映し、このページで投稿したコメントは双方で黄色い矩形枠を付ける。枠は一時表示で、ページ再読み込み後は付けない。

投稿フォームはコメント一覧側ではなく動画コンテナ直下に置き、動画と同じ幅で表示します。パレット、選択済みコマンド、本文、投稿ボタンは一行に並べ、パレットではサイズ・位置・カラーを選ぶと `サイズ 位置 色` の順でコマンドを自動生成します。プレミアム追加色は視聴ページのログイン種別がpremiumの場合だけ表示します。全画面では投稿フォームを画面最下部、その直上にプレイヤーコントローラを配置し、両者の表示状態を連動させます。フォーム操作中はコントローラも表示し続け、パレット本体はコントローラより手前に表示します。コメント設定はコントローラの設定メニューから全画面中も操作できます。

投稿先ホストはHTTPSの `nvcomment.nicovideo.jp` 配下に制限します。未ログイン、投稿禁止、レート制限はフォーム内に理由を表示します。CAPTCHAを要求された場合は公式ウィジェットを複製せず、公式視聴ページで認証してから再試行する案内を表示します。公式バンドルの隔離方法と確認済みAPI契約は [`../sandbox/comment-post-api.md`](../sandbox/comment-post-api.md) を参照してください。

nicochart情報は最新とは限らないため、UI上で情報源を明示します。拡張の詳細はリポジトリルートの `extensions/NicochartInfoProxy.java` を確認してください。

## 永続化

- DB名: `NicoCachePlayerDB`。
- `playerSettings`: コメント表示などのプレイヤー設定。
- その他のストアと移行履歴: `config/database-config.ts` を正とする。
- 音量、コメント表示、操作モード、背景モード、自動次動画、繰り返しにはlocalStorage設定もある。

保存先を変更するときは、旧キー・旧DBからの移行と設定優先順位を明示してください。watch-historyのDBとは別物です。

## 連携境界

- comment-filter2の `commentFilter2Update` を受け、フィルター済みコメントを反映する。
- mlink-video-controllerがスタンドアロンページにもパネルと背景機能を提供する。
- watch-historyの追跡処理が同じ動画要素の再生状態を記録する。
- `common/video-navigation.ts` とキャッシュ検索UIをmovie-infoと共有する。

## 変更時の確認

- 再生URLやキャッシュAPI変更は、NicoCache_nlの実装とエラー形式を確認する。
- コメント変更は、一覧、オーバーレイ、comment-filter2同期を同時に確認する。
- コメント投稿変更は、ログインCookieを保存せず、実投稿ではなくfetchモックで投稿キー取得、credentials、184処理、エラー分岐を確認する。
- 再生終了時は、繰り返しを自動次動画より優先する現在の契約をテストする。
- 背景モードはmlinkの `--bg-*` 変数と積層順を維持する。
- Web Componentsのイベント、Observer、メディアリスナーを破棄時に解除する。

## テスト

- `tests/video-player.spec.ts`: スタンドアロンUI、背景モード、nicochart変換。
- `tests/video-player-*.test.ts`: キャッシュ検索、動画ナビゲーション、再生終了設定、スタイル。
- `tests/comment-data-bypass.test.ts`: 元コメント取得の境界。
- `tests/video-player-comment-poster.test.ts`: 投稿キー取得、nvComment送信、184・未ログイン分岐。

```powershell
cd local/features
bun run test:unit
bunx playwright test tests/video-player.spec.ts
bun run type-check
bun run build
```
