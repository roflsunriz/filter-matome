# mlink-video-controller

## 役割

ニコニコ動画の対象ページへ `<mlink-video-controller>` を挿入し、再生、音量、速度、コメント、関連リンク、設定を一つのパネルから操作します。ページ固有機能はモジュールとして登録し、設定に応じて読み込み・破棄します。

`startMlinkVideoController()` は `src/features.ts` から対象のニコニコ動画サブドメインとスタンドアロンvideo-playerで起動されます。SPA遷移時にも対象ページと動画IDを再判定します。

## 全編先読みとA-Bリピート

右下のパネルを開き、再生タブの下部から操作します。

- **全編先読み**: 公式Watchの動画全体を、再生位置・一時停止・再生速度を保ったまま読み込みます。途中から開始した動画の先頭側も対象です。読込済み割合を表示し、`解除`で通常の先読みに戻ります。動画切り替えやページ再読み込みで解除され、開始状態は保存しません。通信量とメモリーを使うため、容量に達した場合は停止理由を表示します。画質を下げて再試行できます。
- **A-Bリピート**: A（開始）とB（終了）の`現在位置を設定`、または時刻入力を使います。入力は秒数、`分:秒`、`時:分:秒`（小数3桁まで）に対応し、BはAより0.1秒以上後に指定します。`リピート開始`で有効になり、一時停止中は自動で再生しません。`リピート解除`は点を保持し、`クリア`は点も消します。全体リピートとA-Bリピートは後から選んだ方を優先します。動画切り替えで点と有効状態を消します。

全編先読みのボタンが無効のままなら、101番フィルターとfeaturesを同じ版へ更新し、視聴ページを再読み込みしてください。上部`filter-matome`メニューの`全編先読み`はAPIが利用可能かを示し、先読みの開始や動画取得は行いません。ローカルvideo-playerではA-Bリピートを利用でき、全編先読みの欄は表示しません。

## 構成と責務

- `index.ts`: 対象ページ検出、パネル配置、SPA遷移監視、初期化の入口。
- `panels/`: Web Component本体とパネルの基底実装。
- `tab-controllers/`: リンク、再生、音量、速度、コメント各タブのDOM操作。
- `handlers/`: タブ操作をプレイヤーやmylist2へ接続する処理。
- `managers/`: コメント、ヒートマップ、プレイヤー制御などの状態管理。
- `services/`: 動画プレイヤー抽象化と外部・ローカルリンク定義。
- `module-handlers/`: モジュール登録、依存解決、読み込み、設定保存・正規化、設定UI。
- `modules/`: ページ固有の独立機能。
- `templates/`, `styles/`: タブ別のHTMLとスタイル。
- `utils/`: ページ判定、動画ID、時刻、DOM、コメントJSON出力。

## モジュールシステム

`ModuleRegistry` が次の現行モジュールを登録し、`ModuleManager` が対象ページ、依存関係、排他グループ、設定状態に基づいて制御します。

- `header_privacy`
- `daily_lottery_highlight`
- `watch_page`
- `watch_background_selector`
- `watch_matrix_background`
- `watch_harajuku`
- `watch_tab_sessions`
- `thumbnails_filter`
- `heatmap`

新しいモジュールは `ModuleConfig` と `ModuleInstance` の契約を実装し、`module-registry.ts` へ登録してください。IDは永続設定のキーになるため、変更時は `settings-normalizer.ts` に明示的な移行を追加します。

watchページ間のSPA遷移は共通navigationイベントから`ModuleManager`が`onSPANavigate()`を呼ぶ。各モジュールはURL検出専用の全DOM監視を追加せず、このライフサイクルでObserverと保留中タイマーを破棄してから再初期化します。

## 設定とデータ

- モジュール有効状態・設定: `localStorage` の `nicoVideoController_moduleSettings`。
- 旧モジュールIDと未知のID: `settings-normalizer.ts` で正規化し、未知の設定をそのまま実行しない。
- 背景画像: `background-image-settings.ts` がIndexedDB、永続化要求、移行、バックアップ・復旧を管理する。
- ヒートマップ、ヘッダープライバシー、原宿風表示などには個別のlocalStorage設定がある。

原宿風表示はwatchページの`server-response.data.response.video.description`を投稿者情報と同じ事前取得経路から読み、DOMPurifyで安全化した専用説明欄へ描画します。公式の詳細アコーディオンは表示せず、空または短い説明は最小高、長い説明は上限まで自動伸長し、上限を超えた本文だけを内部スクロールさせます。

左上の原宿風ニコニコアイコンは画面へ居残る`fixed`にせず、ページ内の同じ文書座標へ置きます。公式CommonHeaderのインライン`sticky`はモジュール有効中だけ退避して`relative`へ変更し、無効化・破棄時は元の値と優先度を復元します。

原宿風表示のCSSはモジュールbundleへ文字列として埋め込まず、ビルド時に`dist/watch-harajuku.css`へ生成します。`104_watch_harajuku_style.txt`がWatchの`head`先頭で先行ロードし、公式root CSS応答全体を`filter-matome-official` layerへ入れます。Harajuku側はモジュール有効時の`data-filter-matome-harajuku="active"`だけを`@scope`のrootにし、非layerの通常宣言で公式CSSより優先します。モジュール無効時は同属性がないため、先行ロード済みCSSは画面へ影響しません。

公式Watchが全画面表示中のときは、`fullscreen-target`の実測状態から全画面を判定し、公式の動画プレーヤー設定パネルをHarajukuの`@scope`終端に指定します。設定パネル内では公式スタイルを維持し、全画面解除時は通常のHarajuku配置へ戻します。

保存形式を変更するときは、設定UI、インポート・エクスポート、正規化、初期値、テストを同時に更新してください。

設定UIは一覧・各機能設定を`settings-ui-core.ts`、入出力・背景画像モーダルを`settings-ui.ts`へ分けています。背景画像の基本CRUDは`background-image-storage-core.ts`、保守と入出力は`background-image-settings.ts`が担当し、原宿表示のメタデータ読取とCSS、パネルのキー保護も専用ファイルへ分離しています。

## 主な連携境界

- `services/nico-video-player.ts`: 対象ページの動画要素と再生状態を優先して操作する。
- `services/official-playback-rate-bridge.ts`: 101番nlFilterが公式media controllerへ公開する版付きAPIを検証し、Watchでは公式内部状態と動画要素を同時更新する。APIがないスタンドアロンプレイヤーでは動画要素へ直接設定する。
- `services/official-buffering-bridge.ts`: 101番の全編先読みAPIの型・動画IDを検証し、映像と音声の共通の読込済み範囲から進捗を算出する。HLS sessionへの接続根拠は`../sandbox/full-buffer-bridge.md`を参照。
- `services/ab-repeat.ts`: 点の検証、再生中の区間監視、終端Bでの次動画への自動遷移抑制、動画要素の置換・破棄を扱う。
- `tab-controllers/playback-tools.ts`, `templates/playback-tools.ts`, `styles/playback-tools.ts`: 再生タブの2機能を接続する。`playback-tools-copy.ts`に表示文言を集約し、日本語・英語と主要言語の操作名、未翻訳文言の英語フォールバックを提供する。
- `handlers/mylist2.ts`: mylist2 SPAへ動画追加要求を渡す。
- `services/link-manager.ts`: filter-matome専用リンクからsmartFetcherを開き、視聴ページでは現在の動画IDを予約フォームへ渡す。キャッシュリストはNicoCache_nl本体の`https://nicocachenl.test/cache`を直接開く。
- `managers/comment-api-cache.ts`: コメントAPIデータを共有する。
- `common/cache-removal.ts`: NicoCache_nl本体APIで動画単位のHLS削除・変種単位の削除予約を行う。
- `integrations/video-player-bridge.ts` はcomment-filter2側にあり、スタンドアロンプレイヤーへフィルター済みコメントを渡す。

`window.NicoCache_nl.watch` は存在・型・失敗を確認したフォールバックに限定し、現在の動画IDはURL、再生状態は対象ページのメディア要素を優先します。

## 変更時の確認

- パネル操作を追加するときは、template、controller、handler、styleの責務を分離する。
- Web Componentの再接続やSPA遷移でイベントリスナー、Observer、タイマーを重複させない。
- ニコニコ動画のDOMセレクター変更は実ページで確認し、翻訳文やハッシュ付きクラス名へ依存させない。
- 再生速度連携は公式候補や会員判定を書き換えず、版付きAPIの`get`・`set`だけを利用する。公式UIとmlinkのどちらで変更しても動画要素の`ratechange`と両画面の表示が追従することを確認する。
- 背景・原宿風・マトリックス背景の積層順とCSS変数を同時に確認する。
- 外部リンクやキャッシュ削除は、対象動画IDを検証してから実行する。

## テスト

- `tests/mlink-video-controller.spec.ts`: パネル、全タブ、モジュール設定、インポート・正規化、主要UI。
- `tests/mlink-video-controller.test.ts`: ディレクトリと責務の構造契約。
- `tests/mlink-video-controller-mylist2.test.ts`: mylist2へのSPA遷移。
- `tests/mlink-video-controller-cache-remove.test.ts`: キャッシュ削除API。
- `tests/mlink-video-controller-playback-tools.spec.ts`: A-Bの全操作、実メディアの区間リピート・終端、先読みの遅延公開・失敗、SPA・再接続、狭幅・RTL。
- `tests/full-buffer-nlfilter.test.ts`, `tests/playback-tools.test.ts`: 読込位置・公式設定の復元・容量超過・破棄と、進捗・時刻の境界条件。

```powershell
cd local/features
bun run test:unit
bunx playwright test tests/mlink-video-controller.spec.ts
bun run type-check
bun run build
```

タブセッションの設計背景は `tab-sessions-module-concepts.md` を参照してください。
