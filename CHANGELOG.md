# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed
- 【mlink-video-controller】未対応ページでサムネイルフィルターを有効化した際、空のCSSセレクターを検索して切り替えに失敗しないよう修正。
- 【mlink-video-controller】ニコニ広告のお知らせページでデイリー福引ハイライトを動作させ、モジュールの設定欄から対象ページへ移動できるリンクを追加。
- 【mlink-video-controller】設定画面で表示するモジュール名を「Watch Page統合」から「タグカウンター」へ変更。
- 【mlink-video-controller】モジュール設定画面から各モジュールのバージョン表記を削除。
- 【README】`local/features/src` の現行プロジェクト構成、ビルドターゲット、Vite バージョン、nlFilter ファイル名、機能説明に合わせて更新。
- 【cache-data-manager】動画ごとのキャッシュ情報から完了済みHLSとテンポラリHLSを判定し、それぞれ適切な削除APIで一括削除するよう変更。
- 【cache-data-manager】動画カードと検索結果カードの削除も同じキャッシュ情報ベースの削除処理へ統一。
- 【common】HLSキャッシュ削除処理を共通化し、`mlink-video-controller` と `cache-data-manager` から利用するよう変更。

## [#229] - 2026-07-05

### Added
- 【features】`package.json` の `version` を `229` に更新。
- 【README】latest バッジを `#229` に更新。
- 【movie-info】データ取得またはコメント取得が完遂しなかった場合に、失敗した取得元・原因・確認ポイントを表示するエラーモーダルを追加。
- 【watch-history】履歴削除機能を専用モーダルへ分離し、全削除、メタデータ条件、比較演算子、数値指定、レンジ指定、リアルタイムのドライラン表示、詳細な最終確認を追加。
- 【watch-history】投稿日時の日付範囲フィルタを追加し、既存の日付範囲フィルタを視聴期間として明確化。
- 【comment-filter2】ニコる数条件と除外ルールを組み合わせた場合の再発防止テストを追加。
- 【mlink-video-controller】キャッシュ削除URL生成のユニットテストを追加し、完了済みHLSとテンポラリHLSの削除形式を検証。
- 【features/tests】raw CDPで採取したニコニコ動画コモンヘッダーと検索カードのfixtureを追加し、テスト入力を実環境由来DOMへ近付けた。
- 【features/tests】テストfixtureの採取・匿名化・必要十分な実環境再現方針を `tests/README.md` に追加。

### Changed
- 【common】コメント取得ヘルパーをmainフォーク単独処理から、取得可能な全フォークの `threads` と統合済み `comments` を返す処理へ変更。
- 【common/video-player/movie-info/mlink-video-controller】コメント取得ヘルパーに表示用フィルタを通さない保存用途のバイパス経路を追加し、コメントJSONダウンロードやmovie-infoのコメント取得では元コメントを利用するよう変更。
- 【mlink-video-controller】ヘッダープライバシーに設定ボタンを追加し、ユーザーアイコンとユーザー名の非表示を個別トグルでリアルタイム反映できるよう変更。
- 【mlink-video-controller】コメント保存ボタンをXMLスレッドURLの表示から、共通ヘルパーで取得したコメントJSONのダウンロードに変更。
- 【mlink-video-controller】サムネイルフィルターのキーワード追加・削除・一時停止を現在表示中の動画一覧へリアルタイム反映するよう変更。
- 【mlink-video-controller】サムネイルフィルター設定パネルの検索欄と追加欄をラベル・背景色・プレースホルダーで区別しやすく変更。
- 【mlink-video-controller】サムネイルフィルター設定パネル右側に、クリックして追加欄へ入力できるキーワード例を追加。
- 【mlink-video-controller】`動画非表示設定`を関連リンクタブからサムネイルフィルターのモジュール設定ボタンへ移動。
- 【mlink-video-controller】背景画像設定モーダル右側に、USAGE の背景画像設定手順を補助表示するよう変更。
- 【mlink-video-controller】プレイバックタブのヒートマップ領域に、OFF時と動画上オーバーレイ表示中の状態が分かるプレースホルダーを表示するよう変更。
- 【mlink-video-controller】キャッシュ削除をNicoCache_nlの `ajax_rm` / `ajax_rmtmp` に統一し、`OK/NG` 本文で成否を判定するよう変更。
- 【mlink-video-controller】完了済みHLSキャッシュ削除でも裸の動画IDではなく `sm9[720p,256].hls` のような `cacheId` を指定するよう変更。
- 【mlink-video-controller】サムネイルフィルターを現行検索ページの `data-decoration-video-id` / `data-anchor-page="search"` 構造へ対応。
- 【video-player】コメントリストの時刻同期を全DOM走査から、ソート済みコメント配列の二分探索とactive範囲の差分更新へ変更。
- 【video-player】コメントリストの自動スクロールを、キャンバス中央付近に描画される想定のコメントがリスト中央へ来るよう調整。
- 【video-player】音量バーのドラッグ中にスライダー値を書き戻さず、localStorage保存をデバウンスし、音量アイコンDOMの不要な再生成を避けるよう変更。
- 【watch-history】視聴期間・投稿日時フィルタの入力変更を即時反映し、Ctrl+F5後でもフィルタ・ソート状態を元データから再適用するよう変更。
- 【mylist2】一括コピー・一括移動でDB由来の複合IDではなく元動画IDを優先して扱うよう変更。
- 【cache-data-manager】利用不可バッジと公開状態メタデータの扱いを整理し、モーダルサービスをリファクタリング。
- 【cache-data-manager】IndexedDB再作成時の緊急バックアップ処理を追加し、データ消失リスクを下げるよう変更。

### Removed
- 【mlink-video-controller】`マイリストセレクタ`モジュールを廃止し、モジュール一覧と遅延読み込み対象から削除。

### Fixed
- 【mlink-video-controller】プレイバックタブの再生/一時停止ボタンが、状態確認のたびにアイコンを再生成してちらつく問題を修正。
- 【comment-filter2】ニコる数条件に一致したコメントが除外ルールにより後続の非表示ルールから免除されない問題を修正。
- 【comment-filter2】アクション指定の「除外のみ」とニコる数指定の「マッチしたら対象」の組み合わせで、除外対象の扱いが矛盾する問題を修正。
- 【movie-info】視聴ページ外で動画IDやURLを変更した場合にコメント取得が `NetworkError when attempting to fetch resource.` で失敗する問題を修正。
- 【mlink-video-controller】NicoCache_nlキャッシュ削除で通常APIのリダイレクト応答とajax APIの `OK/NG` 応答を取り違えていた問題を修正。
- 【mlink-video-controller】完了済みHLSキャッシュを `/cache/ajax_rm?sm9` で削除しようとして `NG` になる問題を修正。
- 【watch-history】日付範囲フィルタがリアルタイムに反映されない問題を修正。
- 【watch-history】期間フィルタ適用後にソートやボタン操作でフィルタ・ソートが解除されない問題を修正。
- 【mylist2】一括コピー・一括移動時に動画IDへ不要な文字列が混入する問題を修正。

## [#228] - 2026-07-05

### Changed
- 【features】`package.json` の `version` を `228` に更新。
- 【README】latest バッジを `#228` に更新。
- 【mlink-video-controller】ヒートマップの表示モード・詳細設定を、プレイバックタブからモジュール設定内の「コメントヒートマップ」設定ボタンへ移動。
- 【mlink-video-controller】モジュール設定の各行を、左側のタイトル・説明・メタ情報と右端の設定ボタン・切り替えノブ列に整理。
- 【mlink-video-controller】排他グループの表示を文字チップから行のアクセント表示へ変更し、レイアウトを圧迫しないように変更。

### Fixed
- 【mlink-video-controller】コメントヒートマップがモジュールOFF中でも監視・表示更新を実行する問題を修正。
- 【mlink-video-controller】モジュール設定のバージョン・対象ページ・状態表示が、行ごとの構造差で崩れる問題を修正。

## [#227] - 2026-07-05

### Added
- 【mlink-video-controller】モジュール設定の正規化機能を追加し、旧モジュールIDを現在のIDへ移行できるように追加。
- 【mlink-video-controller】Watch ページ操作パネルをタブ別コントローラーへ分割し、コメント・リンク・再生・速度・音量タブごとのテストを追加。

### Changed
- 【features】`package.json` の `version` を `227` に更新。
- 【README】latest バッジを `#227` に更新。
- 【features】Bun 依存関係を更新し、Playwright・Vite・ESLint・DOMPurify などを脆弱性修正版へ追従。
- 【mlink-video-controller】Watch Page統合をタグカウンター単機能として扱うよう整理し、説明文を更新。
- 【mlink-video-controller】モジュール設定の定義元を各 module ファイルに寄せ、`module-registry` は module 側の `ModuleConfig` を登録する構成へ変更。
- 【mlink-video-controller】設定 UI とモジュール管理のイベント対象取得を整理し、タブごとの処理責務を分割。
- 【video-player】削除・視聴不可動画の検出と deleted モード起動を Watch ページ router に統合。

### Removed
- 【mlink-video-controller】Watch Page統合のサブモジュール設定UIと個別有効/無効設定を削除。
- 【mlink-video-controller】`deleted_video_detector` モジュールと専用サービスを削除。
- 【mlink-video-controller】レガシーなモジュール設定 ID と未使用の設定スタイル定義を削除。

### Fixed
- 【features】依存更新後の `typescript-eslint` で不要な型アサーションとして検出される既存コードを整理。
- 【mlink-video-controller】Watch Page統合のタグカウンターが、Firefoxで初期挿入に失敗する場合や公式DOMの再描画で削除された後に復帰しない場合がある問題を修正。
- 【mlink-video-controller】コメント検索入力欄でEnterキーを押しても検索が開始されない問題を修正。
- 【mlink-video-controller】コメント検索入力欄でスペースを入力できない問題を修正。

### Security
- 【features】`bun audit` で検出された DOMPurify、Vite、Rollup、flatted、minimatch などの脆弱性を依存更新と overrides で解消。

## [#226.2] - 2026-06-28

### Added
- 【cache-data-manager】getthumbinfo由来のタイトル・サムネイルURL・公開状態をIndexedDBに保存し、表示時にキャッシュを優先利用する仕組みを追加。
- 【cache-data-manager】getthumbinfoによる公開状態の一括並列チェックボタンと、利用不可動画のバッジ表示を追加。
- 【cache-data-manager】動画一覧ソートに「利用不可」を追加し、利用不可動画を先頭へ集められるように追加。
- 【cache-data-manager】ステータスフィルターに「利用不可」を追加し、利用不可動画だけに絞り込めるように追加。
- 【docs】MkDocs にダークモード切り替えを追加。

### Changed
- 【features】`package.json` の `version` を `226.2` に更新。
- 【README】latest バッジを `#226.2` に更新。
- 【cache-data-manager】動画カードをコンパクト化し、横幅に余裕がある画面でより多くのカードを一列に表示できるように変更。
- 【docs】USAGE の動画ID対応説明と、動画ファイル追加後の NicoCache_nl 再起動案内を更新。
- 【docs】mylist2 の公開状態チェック説明を更新。
- 【docs】共通 AGENTS 導線を整理。

## [#226.1] - 2026-06-26

### Changed
- 【features】`package.json` の `version` を `226.1` に更新。
- 【README】latest バッジを `#226.1` に更新。

### Fixed
- 【mlink-video-controller】Harajukuサブモジュールで、コメントリストの下端が動画プレイヤー操作バー分だけ上に切れていた問題を修正。
- 【mlink-video-controller】Harajukuサブモジュールで、NG設定・タグ編集・動画プレイヤー設定・ギフト・マイリスト追加などのサイドバー重なりパネルが、おすすめ欄の下端ではなくコメントリスト下端を基準に開くよう修正。
- 【mlink-video-controller】Harajukuサブモジュールで、サイドバー先頭に空要素が入るDOMでもコメントリストパネルを安定して検出するよう修正。

## [#226] - 2026-06-26

### Added
- 【mylist2】getthumbinfo経由で削除/非公開などの公開状態を一括並列チェックし、検知結果をマイリスト一覧へバッジ表示する機能を追加。
- 【mylist2】一括公開状態チェックと一括情報更新に、API送信前の並列数・ディレイ設定を追加。
- 【mylist2】動画一覧ソートに「利用不可」を追加し、利用不可動画を先頭へ集められるように追加。
- 【watch-history】シリーズタブの「最後に視聴」タイトル横に再生ボタンを追加。
- 【cache-data-manager】テンポラリ動画を一括削除する操作を追加。
- 【mlink-video-controller】yyya-nico.com とヤジュヤジュ動画へのリンクを追加・修正。

### Changed
- 【features】`package.json` の `version` を `226` に更新。
- 【README】latest バッジを `#226` に更新。
- 【common】各プロジェクトの Shadow DOM を open にし、デバッグしやすく変更。
- 【common】共通ヘッダーを固定解像度前提の負オフセットから、上端・左右端に接地しつつ折り返せるレスポンシブ構成へ変更。
- 【common】ログ出力を WARN・ERROR 中心に整理し、通常ログ出力を抑制。
- 【mlink-video-controller】SPA遷移時のUIモデルを視聴ページベースに統一し、非視聴ページでは視聴ページ専用機能をdisabled表示へ変更。
- 【mlink-video-controller】Harajukuのギフト・マイリスト追加パネル、おすすめ欄、動画詳細展開の高さ同期対象を整理。
- 【build】全体ビルドの直列部分を解消し、並列ビルドを高速化。

### Fixed
- 【common】SPA直後に古い `NicoCache_nl.watch` 状態から一つ前の動画IDを掴む場合がある問題を修正。
- 【mlink-video-controller】非視聴ページの外部リンクで前回動画IDを使わず、各サービスのトップページへフォールバックするよう修正。
- 【mlink-video-controller】SPA再描画後に監視や設定UIのイベント接続が外れる問題を修正。
- 【mlink-video-controller】Harajukuのタグ検索おすすめ欄ヘッダー崩れ、通常おすすめ欄タブ折り返し、追加パネル配置崩れを修正。
- 【mylist2】公開状態チェック結果を「など」でまとめず、削除・非公開などの内訳件数を表示するよう修正。
- 【mylist2】アラート本文の改行表示と、利用不可バッジのローカル再生条件説明を修正。
- 【video-player】コメント取得やメタ取得が失敗してもキャッシュ動画再生を優先し、全プローブ失敗時はキャッシュ未検出モーダルを表示するよう修正。
- 【cache-data-manager】スクロール時のサムネイルちらつきと、テンポラリ削除APIの呼び出し・生キー送信を修正。
- 【harajuku】検索窓の虫めがねアイコンが中央に揃わない問題を修正。

## [#225.3] - 2026-06-24

### Changed
- 【features】`package.json` の `version` を `225.3` に更新。
- 【README】latest バッジを `#225.3` に更新。
- 【mlink-video-controller】原宿風Watchの動画詳細展開高を実測してCSS変数へ反映し、詳細が長い動画でもタグ欄とプレイヤー位置が追従するよう変更。
- 【mlink-video-controller】NG設定・タグ編集・動画プレイヤー設定パネルの高さを、タイトル上端から可視サイドバー本体の下端までに自動同期するよう変更。

### Fixed
- 【mlink-video-controller】原宿風Watchで、開いたサイドバーパネルの下端がコメントリストの見えている下端より下に伸びる問題を修正。
- 【mlink-video-controller】動画詳細情報の `aria-hidden` 変更時に高さ再計算が走らず、展開直後のパネル高さが古い値のままになる場合がある問題を修正。

## [#225.2] - 2026-06-24

### Changed
- 【features】`package.json` の `version` を `225.2` に更新。
- 【README】latest バッジを `#225.2` に更新。
- 【mlink-video-controller】原宿風Watchの背景画像優先モードで、タグ一覧の外側背景だけを透明化するよう調整。

### Fixed
- 【mlink-video-controller】背景画像優先モードでタグチップ自体の矩形まで透明になっていた問題を修正。

## [#225.1] - 2026-06-24

### Added
- 【mlink-video-controller】原宿風Watchにカラースキーム優先/背景画像優先を切り替えるトグルを追加し、背景画像優先時はページ土台の背景を透明化して背景セレクターの画像を見えるようにした。
- 【mlink-video-controller】背景画像設定モーダルのURL入力欄に `https://www.nicovideo.jp/local/background-images/` をプリ入力し、開いた直後と追加後に末尾へカーソルを置くようにした。

### Changed
- 【features】`package.json` の `version` を `225.1` に更新。
- 【README】latest バッジを `#225.1` に更新。
- 【mlink-video-controller】原宿風Watchの背景優先トグルを `色`/`画` の文字表示から、白黒アイコン/フルカラーアイコン表示へ変更。
- 【docs】`watch-background-selector-module.ts` と standalone player の文字化けしていたコメントを読みやすい日本語へ修正。

### Fixed
- 【mlink-video-controller】背景セレクターを設定UIからONにした直後、設定保存前に読み込み判定が走ってラジアルメニューが表示されない問題を修正。
- 【mlink-video-controller】背景選択ラジアルメニューのShadow Hostが全画面透明レイヤーかつ `pointer-events: none` になっていたため、右端の取っ手をhoverしても開けない問題を修正。
- 【mlink-video-controller】背景選択ラジアルメニューの通常時イベント領域を右端の取っ手幅に限定し、展開中だけメニュー全幅を操作可能にするよう修正。
- 【mlink-video-controller】原宿風Watchの背景優先トグルで、ポッチがアイコンを覆わず重なりが崩れる問題を修正。

## [#225] - 2026-06-24

### Added
- 【mlink-video-controller】コメントAPIレスポンスを `fetch` の `Response.clone()` で捕捉し、動画IDごとに短期キャッシュする `CommentApiCacheManager` を追加。
- 【mlink-video-controller】コメントAPIキャッシュを `NicoApiFetcher` へ連携し、取得済み公式APIレスポンスからコメントを再利用できるように追加。

### Changed
- 【features】`package.json` の `version` を `225` に更新。
- 【mlink-video-controller】原宿風Watchのプレイヤー設定パネルをコメントリスト上に相対配置し、動画タイトルからコメントリスト下端までの高さに合わせてスクロール可能に変更。
- 【mlink-video-controller】原宿風WatchのNG設定パネルをプレイヤー設定パネルと同じ相対配置へ揃え、閉じるボタンが前面に出るように変更。
- 【mlink-video-controller】原宿風Watchの横幅・サイドバー幅・タイトル/詳細/タグ欄の位置をCSS変数と `clamp()` ベースへ整理し、4:3、3:2、16:9、4Kなど複数解像度で崩れにくい配置に改善。
- 【mlink-video-controller】原宿風Watchの明示テーマトグルがOS/ブラウザ配色より優先されるよう、背景・パネル・入力欄・タグ編集/NG設定周辺の配色指定を強化。
- 【docs】mlink-video-controller README に原宿風Watchのレスポンシブ方針と、コモンヘッダーのホバーメニュー配色保護対象を追記。

### Fixed
- 【mlink-video-controller】原宿風Watch適用時、コモンヘッダーの「その他」メニューとアカウントメニューが白飛びする問題を修正。
- 【mlink-video-controller】原宿風Watch適用時、アカウントメニューの「アカウント設定」「ヘッダー追従」周辺が白飛びする問題を修正。
- 【mlink-video-controller】原宿風Watch適用時、コモンヘッダーの「フォロー新着」と「お知らせ」ホバーメニューが白飛びする問題を修正。
- 【mlink-video-controller】原宿風Watch適用時、お知らせメニュー右側のSVGアイコンが黒/グレーの四角形に見える問題を修正。
- 【mlink-video-controller】原宿風Watch適用時、コメントリスト開閉アイコンの `^` 表示位置がずれる問題を修正。
- 【mlink-video-controller】原宿風Watch適用時、タグ編集中のマスクがタグ一覧全体を覆わずにずれる問題を修正。
- 【mlink-video-controller】原宿風Watch適用時、動画の詳細情報、タグ一覧、コメント入力欄、いいね/共有欄、NG設定パネル、タグ編集パネルの背景色が明示テーマに完全追従しない問題を修正。
- 【mlink-video-controller】ヘッダープライバシーのアカウント名検出を実DOMで確認したCommonHeaderクラスへ合わせ、アカウントメニューのホバー表示内でもユーザー名を非表示化できるように修正。

## [#224.1] - 2026-06-20

### Changed
- 【features】`package.json` の `version` を `224.1` に更新。
- 【video-player】動画メタデータの実アスペクト比から全画面時の動画表示矩形を計算し、`video-container` とコメントオーバーレイを同じ矩形へ中央配置するように変更。
- 【video-player】全画面切り替え直後の viewport 更新タイミング差を吸収するため、全画面レイアウトの再計算を複数タイミングで実行するように変更。

### Fixed
- 【video-player】Firefox の 16:9 以外の画面比率の全画面表示で、左右余白がない状態でも動画が上下中央に配置されない問題を修正。
- 【video-player】ブラウザ別 fullscreen 疑似クラスを同一セレクタリストに混在させたことで、未対応ブラウザで全画面スタイルが無効化される問題を修正。

## [#224] - 2026-06-20

### Changed
- 【video-player】`comment-overlay` を v4.0.0 に更新し、v4 の同一 `vposMs` コメント並び制御で使われるメタ情報を描画エンジンへ渡すように変更。
- 【video-player】コメント API / CommentFilter2 由来のコメントへスレッド `fork` 情報を保持し、`no`、`fork`、`source`、`threadId`、`postedAt`、`userId` を `comment-overlay` の校正メタ情報へ連携。
- 【features】`package.json` の `version` を `224` に更新し、`comment-overlay` を `4.0.0` に固定。
- 【features】`dependencies` と `devDependencies` の重複を整理し、Bun install 時の重複依存警告を解消。

## [#223] - 2026-06-12

### Added
- 【mlink-video-controller】Harajuku リポジトリの成果物を取り込み、Watch ページをニコニコ動画（原宿）風に表示する `原宿風Watch` ビジュアルモジュールを追加。
- 【mlink-video-controller】原宿風Watchに、原宿風CSS注入、再生数・コメント数・マイリスト数・投稿日時の集約表示、ライト/ダークテーマ切替、SPA再描画対応を追加。

### Changed
- 【mlink-video-controller】原宿風Watchを背景セレクターと同時使用できるようにし、背景系モジュールの排他グループから除外。
- 【mlink-video-controller】原宿風Watchのページ全体・ヘッダー外側・テレビちゃん／原宿タイトル周辺の背景指定を透明化し、背景セレクターの背景が見えるように調整。
- 【mlink-video-controller】タグ個数表示と共有ボタンを既存タグと同じ `a[data-anchor-area="tags"] > span` 構造へ変更し、原宿風Watch適用時の通常タグと算出スタイルが揃うように調整。
- 【mlink-video-controller】タグ編集ボタンを通常タグ風の高さ・余白・フォント・背景・枠色に統一し、light/dark 配色の文字色も通常タグに合わせて補正。
- 【build】`bun run build` が使用する `scripts/build-all.mjs` を逐次実行から並列実行へ変更し、既定ではCPU数を上限に各ビルドを同時実行するように改善。
- 【build】`BUILD_CONCURRENCY` 環境変数で全体ビルドの並列数を調整できるようにし、失敗したビルドの集約表示を追加。
- 【docs】mlink-video-controller README に原宿風Watchモジュールの概要と背景セレクター同時使用の説明を追加。

### Fixed
- 【mlink-video-controller】原宿風Watchと背景セレクターを同時に有効化できない問題を修正。
- 【mlink-video-controller】原宿風Watch適用時にページ全体の強制背景指定が背景セレクターを覆う問題を修正。
- 【mlink-video-controller】light テーマで「続きを読む」ボタンの文字の裏に元要素が重なって見える問題を修正。
- 【mlink-video-controller】原宿風Watch適用時、タグ個数表示と共有ボタンの高さや余白が既存タグと微妙にずれる問題を修正。
- 【mlink-video-controller】light テーマでタグ編集ボタンの文字色が通常タグと同じ青色にならず黒く表示される問題を修正。

## [#222.1] - 2026-06-04

### Changed
- 【video-player】`NicoCachePlayerDB` 初期化後に必須ストア・インデックスを検証し、作成失敗の残骸がある場合は一度だけ削除・再作成するように変更。
- 【mylist2】`Mylist2DB` 初期化時にスキーマ検証と破損DBの一回再作成を追加。
- 【watch-history】`NicoWatchHistory` 初期化時に `watchHistory` / `seriesAlerts` のストア・インデックス検証と自己修復を追加。
- 【comment-filter2】`CommentFilter2DB` 初期化時に `rules` / `settings` / `json_rules` のスキーマ検証と自己修復を追加。
- 【mlink-video-controller】背景画像設定DBの起動時スキーマ検証と破損DBの一回再作成を追加。
- 【docs】AGENTS.md に日本語 Conventional Commits のコミットメッセージ規約を追加。

### Fixed
- 【video-player】作成失敗の残骸が残った `NicoCachePlayerDB` で設定保存が継続的に失敗する問題を修正。

## [#222] - 2026-06-04

### Changed
- 【build】TypeScript 7 対応として `tsconfig.json` から非推奨の `baseUrl` を削除し、Vite バンドル前提の `moduleResolution: "bundler"` に変更。
- 【video-player】再生開始フェーズを改善し、候補 URL の優先度付き並列プローブと隠し video/HLS による実再生プローブを追加。
- 【video-player】最初に `loadedmetadata` / `canplay` へ到達した動画ソースを本再生に採用し、失敗時は次候補へフォールバックするように変更。
- 【video-player】IndexedDB のスキーマ更新を `onupgradeneeded` のバージョン変更トランザクション内で同期的に完了させる方式へ変更。
- 【video-player】`comment-overlay` v3 の API に合わせ、存在しない `renderer.updateSettings()` 呼び出しを `settings` セッター経由の更新へ置き換え。
- 【video-player】コメント透明度・デフォルト色の変更後にコメントを再同期して即時再描画するように改善。
- 【docs】video-player README に IndexedDB 昇格時の注意点と再生開始プローブ仕様を追記。

### Fixed
- 【video-player】Firefox / Chrome で `NicoCachePlayerDB` 作成後に設定保存が進まない問題を修正。
- 【video-player】コメント透明度・デフォルト色の設定時に `this.renderer.updateSettings is not a function` が発生する問題を修正。
- 【video-player】Firefox で HLS 候補の準備待ちが積み重なり、再生開始まで大きく遅延する問題を軽減。

## [#221] - 2026-05-01

### Changed
- 【release】リリースアーカイブから `docs/`、`resources/`、`GUIDE.md` を外し、代わりにルートの `GUIDE.html` ランディングページからセットアップガイドへ誘導する構成に変更。
- 【release】リリースノート生成と README の案内を新しいガイドフローに合わせて更新。
- 【mlink-video-controller】検索結果 8 列表示モジュールを削除し、module-registry と module-manager から `search_eight_column` を除去。
- 【mlink-video-controller】モジュール一覧の README 表記を整理し、不要になった `search-page-module.ts` を削除。
- 【mlink-video-controller】デイリー福引ハイライトのモジュール ID を `daily_lottery_highlight` に統一し、誤って使われていた `nico_info_highlight` 設定の自動移行を追加。
- 【docs】バグ報告テンプレートにスクリーンショットと OCR の確認手順を追加し、環境情報の記入項目を明確化。
- 【docs】キャッシュデータ関連の不要なチェック項目を整理し、バグ報告時の確認内容を簡素化。
- 【docs】シンボリックリンク作成手順、USAGE、README の説明を順次見直し、導入時の案内を整備。
- 【scripts】`create-all-symlinks.ps1` の入力方法と dry-run 周辺の挙動を改善し、リンクマッピングの信頼性を高めた。
- 【ci】MkDocs ドキュメントワークフローとリリースワークフローを新しいドキュメント構成に追従させた。

## [#220] - 2026-04-15

### Added
- 【scripts】`filter-matome` から `NicoCache_nl` へまとめてシンボリックリンクを作成する `create-all-symlinks.ps1` を追加。
- 【scripts】`create-all-symlinks.ps1` 用の README を追加し、使い方・オプション・必要条件・トラブルシューティングを整理。

### Changed
- 【docs】`how-to-update.md` を更新し、前回のリリースタグからのコミット履歴を参照して詳細な CHANGELOG を作成する手順を明記。
- 【docs】ルート README と関連ドキュメントを整理し、ドキュメント群の配置変更後の案内を反映。
- 【scripts】`create-all-symlinks.ps1` を対話入力と引数指定の両方に対応させ、dry-run 時の挙動とリンクマッピングを改善。
- 【mylist2】クラウドバックアップの対象を Google Drive のみに整理し、Dropbox / OneDrive / MEGA のサポートを削除。
- 【ci】リリースアーカイブに `docs/` フォルダを含めるように変更。

### Fixed
- 【scripts】`create-all-symlinks.ps1` の `Split-Path` パラメータセット競合を修正し、dry-run 時に親ディレクトリがなくても処理を継続できるように改善。
- 【scripts】`nlFilters/extensions` のリンク先パスから `local\` を除去し、要件に合わせて修正。
- 【scripts】`nicocache-utility.py` 内のバッチファイル名参照を `nico-cache-gui-launcher.bat` に統一。

## [#219] - 2026-02-22

### Changed
- 【mylist2】video-playerバイパスを条件付きルーティングに変更。so動画・「dアニメストア ニコニコ支店」投稿者は即座にvideo-playerへ遷移し、それ以外の動画はクリック時にgetthumbinfo APIで公開状態を確認して削除済み/非公開ならvideo-player、公開中なら公式プレーヤーへ遷移するように。

## [#218.1] - 2026-02-19

### Added
- 【video-player】プレイヤーコントロール操作中のカーソル可視性管理を追加。マウス非操作時に自動でカーソルを非表示にし、操作時に再表示。

### Changed
- 【video-player】コントロール表示ロジックをリファクタリング。StandalonePlayerのグローバルマウスハンドラーと不活動タイマーを削除し、PlayerControlsShadowに集約。マウスがビデオエリアに入った際のコントロール表示を改善。

## [#218] - 2026-02-17

### Added
- 【video-player】シリーズ連続再生機能を追加。説明文リンクのフォールバック対応、数値のみ動画IDのAPI経由正規化にも対応。
- 【mylist2】詳細モーダルで視聴ページからリッチHTML説明文を遅延取得。DOMPurifyで安全にレンダリング。
- 【mylist2】動画リンクのターゲット設定を追加し、公式プレイヤーをバイパス可能に。
- 【watch-history】条件付き削除機能のUIを強化。

### Fixed
- 【mylist2】ソート切替時に仮想スクロールの表示が即座に反映されない不具合を修正。
- 【mylist2】情報更新時にdescription/tagsが更新されない不具合を修正。
- 【video-player】再生前のビデオ要素にコンテナと同サイズを確保し、レイアウトシフトを防止。

### Other
- 【video-player】URL探索・存在チェックをPromise.allで並列化し、canplay待ちを除去してコメント読み込みを並列化。再生開始までのパフォーマンスを改善。
- パッケージ管理をnpmからBunに移行。CIワークフローの簡素化。サービスワーカーのグローバルスコープ定義を改善。

## [#217.1] - 2026-01-24

### Fixed
- 【mylist2】マイリスト設定モーダルで各種操作（名前変更、削除、エクスポート等）を行った際に、確認ダイアログやアラートが設定モーダルの下に表示される問題を修正。モーダルのマウント先をdocument.bodyに変更してスタッキングコンテキストの問題を解消。

## [#217] - 2026-01-24

### Added
- 【mylist2】仮想スクロールとアクションメニュー（ポップオーバー方式）を実装。大量の動画でも快適にスクロール可能に。

### Fixed
- 【mlink-video-controller】タグカウント取得方法を改善。

### Changed
- 【mylist2】ホバーで表示される折りたたみコントロールをFAB（フローティングアクションボタン）＋モーダル方式に変更。マイリスト名変更、テーマ選択、インポート/エクスポート、動画追加、キーワード追加を設定モーダルに統合。
- 【mylist2】動画・キーワードリストのチェックボックスにホバースタイルを追加。
- 【mlink-video-controller】排他グループのトグルスイッチをUIレベルで同期。

## [#216] - 2026-01-21

### Changed
- 【mylist2】インポート時既存データ上書きエラーの修正、上書き時に警告機能の追加

### Other
- install-requirements.ps1を追加し、pythonの依存パッケージをインストールするようにした。

## [#215] - 2026-01-08

### Changed
- 【watch-history】カラースキームをダークテーマに変更。背景・カード・テキスト・ボーダー・入力欄等をダーク系カラーに統一。目に優しい夜間表示を実現。

## [#214] - 2026-01-05

### Added
- 【video-player】スタンドアロンプレイヤーのタグ表示をリンク化。タグクリックでニコニコ動画のタグ検索ページへ遷移。
- 【video-player】タグに「百」アイコンを追加し、クリックでニコニコ大百科へ遷移（公式ニコニコ動画と同じ仕様）。
- 【video-player】スタンドアロンプレイヤーの説明文（Description）でHTMLタグをレンダリングするように変更。DOMPurifyで危険なHTMLのみサニタイズし、安全なHTMLはそのまま表示。

### Changed
- 【video-player】スタンドアロンプレイヤーから取得不可な「広告ポイント」と「ギフトポイント」の表示を削除。

### Other
- DOMPurify依存パッケージを追加。

## [#213] - 2026-01-05

### Changed
- 【movie-info】raw JSONの表示方式をアコーディオンからモーダルに変更。「Raw JSONを表示」ボタンでフルスクリーンモーダルとして表示。
- 【movie-info】APIデータ取得処理中に各パネル内で円形スピナーアニメーションを表示し、取得中であることを視覚的に強調。

## [#212] - 2026-01-03

### Added
- 【cache-data-manager】仮想スクロール対応：大量データでもスムーズなスクロールを実現
- 【cache-data-manager】フィルター・ソート機能：画質・ステータスでフィルタリング、複数条件でソート可能
- 【cache-data-manager】検索結果モーダル：検索結果を別モーダルで表示、メインリストを維持
- 【cache-data-manager】サムネイル遅延読み込み：パフォーマンス向上のためビューポート外で先読み
- 【cache-data-manager】キーボードナビゲーション：PageDown/PageUp/Home/Endキーでスクロール操作
- 【cache-data-manager】タイトルツールチップ：省略されたタイトルをホバーで全文表示

### Fixed
- 【cache-data-manager】スクロールが勝手に動く不具合を修正（overflow-anchor無効化）
- 【cache-data-manager】検索結果が空になる問題を修正（部分一致検索に変更）

### Changed
- 【cache-data-manager】FlexSearchから独自の部分一致検索に移行（日本語トークナイズ問題対策）
- 【cache-data-manager】batch-renderer.tsを削除（仮想スクロールに完全移行）
- 【cache-data-manager】ヘッダーを2行構成に変更（検索バーとフィルターバーを同列配置）

### Other
- cache-data-managerの大規模リファクタリング完了

## [#211] - 2025-12-30

### Changed
- 【依存関係更新】comment-overlayパッケージを3.0.0にアップデート。
- video-playerのコメントオーバーレイシステムで、v3.0.0のsetCommentVisibility() APIに移行。updateSettings()ではキャンバスがフリーズする問題を回避。

### Other
- comment-overlay 3.0.0ではコメント表示/非表示の切り替えにsetCommentVisibility()メソッドを使用する必要があります。

## [#210] - 2025-12-22

### Added
- comment-filter2に正規表現の複雑度を静的解析する機能を追加。
- ルールベースでバックトラッキング地獄（ReDoS）を引き起こす可能性のあるパターンを検出し警告表示。
- パターン入力時にリアルタイムで分析結果をフィードバック。
- リテラルパターンにはAho-Corasick最適化対象であることを表示。
- 複雑度レベル（低/中/高/危険）をバッジ形式で表示。
- 最適化の提案と代替パターンを自動提示。

## [#209] - 2025-11-30

### Fixed
- 【依存関係更新】comment-overlayパッケージを2.9.0にアップデート。
- 【非推奨API対応】comment-overlay 2.9.0で削除されたhardReset()とenableAutoHardResetの使用箇所を削除。
- video-playerのコメントオーバーレイシステムで、自動リセット機能が組み込まれたため手動リセット処理を不要化。

### Changed
- comment-overlay-comment-system.tsからhardReset()メソッドを削除。
- comment-overlay-comment-system.tsの設定からenableAutoHardReset: trueオプションを削除（2.9.0+では自動で有効）。
- comment-system.tsからhardReset()メソッドを削除。
- player-controls.tsのresetCommentOverlayAfterSeek()を簡略化し、コメント付き説明に変更。

### Other
- comment-overlay 2.9.0では自動リセット機能が標準装備され、手動でのhardReset呼び出しが不要になりました。

## [#208.3] - 2025-11-27

### Fixed
- 【重大バグ修正】mlink-video-controllerのSPA遷移時に発生するhandleSPANavigationの無限再帰を完全に修正。
- 視聴ページ⇔その他のページ遷移時にパネルを完全破棄・再構築する方式に変更し、ページタイプ切り替えの確実性を向上。
- 再初期化中フラグによる多重実行防止機構を追加し、6回連続呼び出しの問題を解決。
- MutationObserverがパネル自身のDOM変更を無視するようフィルター処理を実装し、無限ループを防止。
- Shadow DOM初期化チェックとクリア処理を追加し、再レンダリング時の確実性を向上。

### Changed
- ページタイプ（watch/other）を明示的に管理し、タイプ変更時は従来の再初期化ではなく完全再構築を実行。
- connectedCallback()を非同期関数として実装し、初期化の順序保証を強化。
- disconnectedCallback()で全サービスインスタンスをnullに設定し、メモリリーク防止を徹底。

### Other
- ユーザー提供の診断データにより、handleSPANavigationの6回連続呼び出しとShadow DOM未作成を特定。
- 従来の部分的な再初期化から、ページタイプ変更時の完全再構築へ方針転換することで根本解決。

## [#208.2] - 2025-11-27

### Fixed
- 【重大バグ修正】mlink-video-controllerが2回目のSPA遷移後に完全に動作しなくなる致命的な問題を修正。
- Web ComponentsのconnectedCallback()を実装し、DOMライフサイクルに準拠した正しい初期化フローに修正。
- Shadow DOMが作成されずUIが一切表示されない問題を根本解決。
- SPA遷移時のクリーンアップ処理をdisconnectedCallback()に統合し、メモリリーク防止を強化。

### Changed
- constructorでのレンダリング処理をconnectedCallback()に移行（Web Components標準準拠）。
- disconnectedCallback()でcleanup()を呼び出すように統合（ライフサイクル管理の一元化）。

### Other
- 診断スニペットによる徹底的な問題調査により、Shadow DOM未作成が根本原因と判明。
- Web Components標準のライフサイクルメソッドに完全準拠することで、あらゆるSPA遷移パターンでの安定動作を実現。

## [#208.1] - 2025-11-27

### Fixed
- mlink-video-controllerの動画ページとそれ以外のページ切り替え機能をSPA完全対応に修正。
- MlinkVideoControllerパネルにhandleSPANavigation()メソッドを実装し、ページタイプ変更時にUIを自動再構築。
- ページタイプ変更検知とクリーンアップ処理を追加し、watchページ⇔その他ページ間の遷移を完全サポート。

### Other
- watchページ内での動画切り替え時にも動画サービス（プレイヤー、コメント、ヒートマップ）を適切に再初期化。

## [#208] - 2025-11-27

### Added
- comment-filter2とmlink-video-controllerを完全なSPA対応に強化。History API（pushState/replaceState/popstate）を完全にフックし、ページ遷移時の自動再初期化を実装。

### Fixed
- History APIフックの競合問題を解決。既存フックを保存してチェーン呼び出し可能にすることで、複数モジュール間の共存性を確保。
- mlink-video-controllerの非効率なsetIntervalポーリングを削除し、イベント駆動の効率的なSPA遷移検知に移行。

### Changed
- comment-filter2のSPA遷移時にVideoPlayerBridgeを自動リセットし、新しいページで再検出・再接続するように改善。
- mlink-video-controllerのモジュールマネージャーにreinitializeForSPA()メソッドを追加。SPA遷移時にページ対応モジュールの自動アンロード/ロードを実装。
- ModuleInstance型定義にonSPANavigate()オプショナルメソッドを追加。モジュール個別のSPA対応処理が可能に。
- 動画ID変更検知ロジックを追加し、同じページ内での動画切り替えも確実に検出。

### Other
- SPA遷移検知のタイミングを最適化（100-300ms）してレスポンスを改善。
- 詳細なSPA遷移ログを追加し、デバッグ性を向上。

## [#207.6] - 2025-11-26

### Changed
- mlink-video-controllerのMylist2ハンドラーをSPA完全対応に改善。`window.NicoCache_nl.watch.apiData`の代わりに`window.commonHelper.fetchWatchPage()`を使用してサーバーから直接最新のAPIデータを取得するように変更。
- 型アサーションで型安全性を強化し、TypeScriptの厳格なESLintルールに準拠。
- 詳細なエラーメッセージとキーワード抽出のエラーハンドリングを改善。

## [#207] - 2025-11-11

### Added
- video-playerのスタンドアロンプレイヤーで、動画を最後まで再生した後再度再生したときに自動でコメントがハードリセットされて再度コメントが流れるように対応した。

### Changed
- #207.1 - スタンドアロンプレイヤーのシーク時にcomment-overlayのhardReset()を実行し、描画アーティファクトを防止
- #207.2 - visibility復帰時にコメントアーティファクトが残る問題を修正。
- #207.3 - comment-overlayをv2.6.0へ更新し、自動ハードリセットを有効化。スタンドアロンプレイヤーの手動ハードリセットを撤去してエンジン側に委譲。
- #207.4 - comment-overlayをv2.7.1へ更新し、コメント描画エンジンのリサイズが正常に動作するように修正。
- #207.5 - comment-overlayをv2.8.0へ更新し、アウトラインからシャドウに移行。シャドウインテンシを強くした。

## [#206] - 2025-11-05

### Changed
- video-playerのスタンドアロンプレイヤーで使用する`comment-overlay`モジュールをv2.2.0に更新。
- #206.1 - `comment-overlay`モジュールをv2.2.1に更新。ビジビリティ復帰時のコメント描画が修正された。
- #206.2 - video-playerのスタンドアロンプレイヤーでマウスが非活性のとき非表示になるようにした。
- #206.3 - `comment-overlay`モジュールをv2.3.0に更新。
- #206.4 - video-playerのrouterでSPAページでも動作するようにした
- #206.5 - `comment-overlay`モジュールをv2.4.0に更新。
- #206.6 - `comment-overlay`モジュールをv2.5.0に更新。
- #206.7 - `comment-overlay`モジュールをv2.5.1に更新。
- #206.8 - video-playerのスタンドアロンプレイヤーでコメント描画エンジンのリサイズが正常に動作しない問題を修正。スタンドアロンプレイヤーを完全レスポンシブウェブデザインに対応。

## [#205] - 2025-11-05

### Added
- video-playerのスタンドアロンプレイヤーでコメント描画エンジンを`comment-overlay`に刷新し、描画品質と保守性を向上させた。
- #205.1 - `comment-overlay`モジュールをv1.2.2に更新。
- #205.2 - `comment-overlay`モジュールをv2.0.0に更新し、コメント開始位置をミリ秒(`vposMs`)ベースで扱うように調整。

### Changed
- Danmaku.jsへの依存を廃止し、`comment-overlay`モジュールへ全面移行。透過率やデフォルト色の設定ロジックも新レンダラー向けに再調整した。

## [#204] - 2025-10-28

### Added
- video-playerのコメントレンダリングエンジンを自前のものからDanmaku.jsに変更した。
- これにより衝突判定が改善され重なりが軽減されることが期待される。

## [#203] - 2025-10-23

### Added
- comment-filter2で、処理最適化を実施。(コメントフィルタリングのパフォーマンス向上)
- 「事前準備（インデックス化）＋候補絞り込み → 最終判定」で高速化。Aho–Corasick、WebWorker並列化、niroru集計の前計算、正規表現プリフィルタ、ビットセット集約、ルール優先度即Breakを採用。

### Fixed
- #203.1 - ラジアルセレクタが反応しない問題を修正。背景画像とラジアルセレクタを別のShadowHostで管理するようにした。

## [#202] - 2025-10-23

### Added
- mlink-video-controllerのwatch-background-selector-moduleで背景画像の反映をShadow DOMで行うようにした。

## [#201] - 2025-10-20

### Changed
- background-image-settings.tsでimage-validatorを使用して背景画像の有効性をチェックするようにした。

## [#200] - 2025-10-15

### Added
- watch-hisotryに直近7日間の活動と視聴ハイライトを統計ページに追加。

### Fixed
- watch-historyの視聴時間の計算ロジックを改善。
- watch-historyの視聴履歴の表示幅を改善。
- auto-updater.pywをfilter-matomeの最新リリースをダウンロードする機能に更新・簡略化。自動展開は無くなった。

### Changed
- watch-historyの日別視聴グラフのラベルを見やすくする変更。

## [#199] - 2025-10-13

### Changed
- Material Design Iconsをローカルファイル管理からbun管理に変更した。これにより、一部のアーカイバで解凍に時間がかかっていた問題を解消した。
- mylist2の動画要素選択チェックボックスを豪華にした。

## [#198] - 2025-10-02

### Changed
- mlink-video-controllerから不要となったヘッダー一行化サブモジュールを削除。機能ON時にページ遷移時にエラーを引き起こしていたのを修正。

## [#197] - 2025-09-29

### Added
- movie-infoダッシュボードを追加し、thumb-infoとnl-media-infoを廃止した。movie-infoダッシュボードで統合的に情報を確認できる。
- mlink-video-controllerから不要となったリンク(nlMediaInfo、概要コメ情報、キャッシュ情報)を削除しmovie-infoダッシュボードに統合した。

### Other
- api-infoフォルダにapi情報を集約した。

## [#196] - 2025-09-29

### Added
- mlink-video-controllerでタブセッション制限緩和モジュールを追加。
- video-playerで共通ヘッダを追加。背景画像のCSSに!importantを追加して確実に上書きされるようにした。

### Changed
- video-playerでコメントリストのヘッダを削除。

### Other
- スクリプトのファイル名をケバブケースに統一。

## [#195] - 2025-09-23

### Added
- video-playerでスタンドアロンプレイヤーか公式プレーヤーを選べる機能を追加。

### Changed
- #195.1: video-playerでキャッシュ情報APIを使用してキャッシュ情報を取得するようにした。CustomCacheReturnerの情報を取得するようにした。

## [#194] - 2025-09-21

### Added
- video-playerでmlink-video-controller, comment-filter2, 背景画像モジュール、マトリックス風背景モジュールが動作するように改良した。
- video-playerでfloating-playerの代わりにスタンドアロンプレイヤーで削除動画が再生できるようにした。
- #194.1: convert_to_hls.pyを追加。動画をHLS形式に変換するスクリプト。
- #194.2: スタンドアロンプレイヤーでウォッチトラッカーとコメントヒートマップが動作するよう拡張した。

### Fixed
- 削除動画検出モジュールが動作するように修正。
- #194.1: comment-filter2のログ送信機能を修正。大量送信を引き起こしていたバグを修正し処理後に一括送信するようにした。
- #194.4: スタンドアロンプレイヤーで全画面でコメントヒートマップが下部に表示されるように修正。

### Changed
- #194.2: 共通ライブラリに動画ID抽出のヘルパを追加して各プロジェクトでフォールバックとして追加して統一。
- #194.3: 動画ID抽出処理を共通ヘルパーに統一。(comment-filter2, video-player)
- #194.5: スタンドアロンプレイヤーのコメントレーン数を8から13行に拡張した。

## [#193] - 2025-09-19

### Added
- video-playerの再生形式を変更。動画埋め込み式からスタンドアロンのローカルプレイヤーにリダイレクトするようにした。パフォーマンスが改善した。動画再生が少し不安定で、何度か強制再読み込み(Ctrl+F5)する必要があるかもしれない。

### Fixed
- #193.1: スタンドアロンプレイヤーの再生安定性を向上させた
- #193.2: スタンドアロンプレイヤーの再生安定性を向上させた2
- #193.3: faststart変換スクリプトとvideo-playerから動画を一時停止してキャッシュをクリアする機能をコメントアウト。
- #193.4: video-playerのキャッシュ・マネジメントシステムを削除してfaststart変換スクリプトに依存するようにした。

## [#192] - 2025-09-09

### Added
- mlink-video-controllerに視聴履歴へのリンクを追加。

### Other
- リファクタリング：mlink-video-controllerの重複リンク管理を解消。
- リファクタリング：nico-api-fetcherとcomment-fetcherのコメント取得処理をcommon-helperに統合。

## [#191] - 2025-08-30

### Added
- mylist2のエクスポート機能とインポート機能を拡大。より幅広いクラウドストレージに対応。OneDrive, Dropboxに対応。（APIキー入力の必要あり）Megaは未実装。
- mylist2にカラースキームの変更機能を追加。

### Fixed
- #191.1 - mylist2のモーダルが透明で見えなかったので修正。リンク化を追加。動画アイテム移動時とコピー時にタグと説明を保持するようにした。一括操作時の情報更新時に更新モーダルとお知らせモーダルのレイヤーが逆になっている問題を修正。メモ機能を追加。

### Other
- AGENTS.mdを追加。

## [#190] - 2025-08-16

### Added
- mylist2にGoogleDriveへのバックアップ機能と復元機能を追加。エクスポートボタンにデータベースクリアボタンを追加。

## [#189] - 2025-08-12

### Added
- mylist2に詳細ボタンを追加し、tagとdescriptionを表示するようにした。tagとdescriptionは新しく追加した動画から表示可能。

## [#188] - 2025-08-01

### Added
- watch-historyに履歴の「一括削除」、「個別削除」 、「x回視聴回数以下且つx%以下の視聴進捗率の条件付き削除」機能を追加。

## [#187] - 2025-07-19

### Added
- watch-historyにシリーズタブとシリーズアラートを追加した。シリーズ動画のナビゲーションとシリーズで新規投稿された動画がシリーズアラートで通知されるようにした。データベース永続化とマイグレーションを追加。

### Fixed
- #187.1 - watch-historyの期間フィルタを一括クリアできるようにした。その他のUI微調整。

## [#186] - 2025-07-17

### Added
- 視聴履歴のページを追加し(https://www.nicovideo.jp/local/features/dist/src/watch-history/index.html)、視聴ログを表示するようにした。ブラウザの容量が許す限り履歴を保存するようにした。統計も利用可能。

## [#185] - 2025-06-26

### Added
- mylist2で、小さい画面での操作性が向上した。自動で右側上部のコントロールが隠れるようになり、カーソルホバーで表示されるようになった。常時表示のチェックボックス切り替えも完備。

### Fixed
- #185.1 - コメントコマンド設定のデフォルト値を変更。コメントコマンドも設定値としてエクスポートされるようにした。インポートしたときにUIに即座に反映されるように修正。
- #185.3 - ヒートマップコントロールをplaybackTemplateに統合。コメント検索をSPA対応に修正。
- #185.4 - mlink-video-controllerのUIを微調整。
- #185.5 - ヒートマップのカラースキーム切り替えでFABが自動で閉じないように修正。
- #185.6 - ヒートマップの現在地を表す赤線が再生位置に合わせて移動するように修正。

### Changed
- #185.2 - mylist2で動画コントロールの三段目は使用頻度が高いので常時表示するように変更した。リードミーを拡充した。mylist2のDB名が変更になった（現状に合わせた）ので再インポート推奨。

## [#184] - 2025-06-14

### Added
- CommentFilter2でCSV形式からJSON Lines形式へ移行した。

### Fixed
- #184.1 - メディア情報ページのURLを修正。
- #184.2 - CommentFilter2のCSSファイルをテンプレートリテラルにした。
- #184.3 - マテリアルアイコンアダプションを行った。
- #184.4 - UI微調整。
- #184.5 - mlink-video-controllerの背景オーバーレイを追加。幅が400pxになった。背景画像設定UIでのアイコン色変更。list.jsでのヘッダーのリンク変更。list.jsのTypeScript化。
- #184.6 - エクスポートとインポートのアイコンが逆だったので直した。Mylist2のリンク名を変更。
- #184.7 - mylist2とthumb-infoのリファクタ。comment-filter2のjsonlのhtmlエスケープを行うようにした。サニタイズユーティリティーで<>が\&lt;と\&gt;になっていたので直した。mylist2-docsの修正

## [#183] - 2025-06-13

### Added
- CommentFilter2でログ出力を行いCommentFilterLogger.javaと連携するようにした。

### Fixed
- video-playerの二重コメント問題の修正。
- video-playerで16:9でない場合に中央配置に設定。
- video-playerでHLS再生に対応。
- #183.1 - CSSをテンプレートリテラルにして、JSファイルを単一ファイルにした。

## [#182] - 2025-06-10

### Changed
- srcの整理・リードミーの拡充・ネストの深さ軽減・ケバブケースに統一・srcへの依存解消、distへの一本化

## [#181] - 2025-06-07

### Added
- CommentsFilterを廃止し、CommentFilter2を新規に作成。CommentFilter2はCommentsFilterの機能を引き継ぎ、ミニマムで必要十分な機能になった。

### Fixed
- CommentFilter2の説明ページを更新。
- #181.1 - コメントフィルタリングのデータをvideo_playerと連携するようにした。
- #181.2 - CommentFilter2のニコる数指定ルールがマッチした場合にフィルタリング処理から除外されるように修正。パフォーマンスの向上。
- #181.3 - 修正したはずのロジックが間違っていたので更に修正した。
- #181.4 - CommentFilter2とlinksVideoControllerで入力フィールドにフォーカス時のキーボードショートカット伝搬を完全停止。ニコニコ動画の全29個のキーボードショートカット（f, k, l, j, Space, 矢印キー, Shift組み合わせ等）に対応し、テキスト入力中に誤って動画操作されることを防止。正規表現フラグ（g,i,m,u,y）の説明をCommentFilter2説明ページに追加。CSVパーサを追加してNGワードルールのパースを行うようにした。
- #181.5 - 正規表現フラグの保存対応。

## [#180] - 2025-06-05

### Added
- #180.2 - links_video_controllerでvideo_playerを操作出来るようになった。video_playerとcomments_filterが連携して動作するようになりcomments_filterのコメントフィルタリングがvideo_playerでも動作するようになった。

### Fixed
- #180.1 - ラジアルメニューのデザイン問題を修正。FAB外クリックで閉じるようにした。再生・一時停止ボタンの再生ステータスによるアイコン変更を反映。
- #180.3 - video_playerとcomments_filterの連携を強化・修正。

### Changed
- マテリアルアイコンに完全移行

## [#179] - 2025-06-05

### Other
- src内の一部のファイルがツール不具合によりコピー出来ていなかった(src/links_video_controller/links/templates)為バックアップ

## [#178] - 2025-05-31

### Added
- links_video_controllerに背景画像の設定画面を追加し、URLとファイルから選択できるようになった。
- インポートとエクスポート、デフォルトボタンも追加

### Fixed
- #178.1 - CommentsFilterが「NGワード」と「NG正規表現」以外が動作していなかったので修正
- #178.2 - モジュールマネージャーの初期化を最速化。特にビジュアル系モジュールを最優先で初期化するようにした。
- #178.3 - 型定義の最適化
- #178.4 - video_playerの設定メニューの位置を調整。その他細かな調整。
- #178.5 - デバッグログなどの出力を最小化しwindow.loggerに統一。フェッチ関連機能を廃止。タグカウンター（WatchPageModule）の機能不全を修正。
- #178.6 - WatchPageModuleのSPA遷移検知機能を修正。FAB内にコメントヒートマップの設定メニューを追加。コメントヒートマップのSPA遷移検知機能を修正。
- #178.7 - コメントヒートマップの設定メニューの背景を変更。コメントヒートマップの高さを修正してもう少し高く表示されるようにした。タブ位置を下部に変更。

## [#177] - 2025-05-26

### Added
- links_video_controllerにモジュール機能を追加し、散らばっていた機能を統合し、設定画面から管理出来るようになった。

### Fixed
- #177.1 - ラジアルメニューで境界線近くでカーソルがあってもガタガタしなくなるアップデート

### Changed
- #177.2 - video_player(107_video_player.txt)に削除済み動画の再生機能を追加。
- `player.es.js`の廃止

## [#176] - 2025-05-24

### Added
- linksとvideo_controllerを廃止しlinks_video_controllerを導入。FAB(フローティングアクションボタン) で視聴ページから起動できる。

### Fixed
- 大量のバグフィックス。

## [#175] - 2025-05-20

### Changed
- 全面的にTypescriptに移行。機能的には何ら変わりません。

### Other
- フォルダ構造が変わったのでクリーンインストール推奨。

## [#174] - 2025-05-13

### Fixed
- #174.1 - fullscreen時のショートカットキー Fキーで正しく全画面にならないバグを修正

### Changed
- needPaymentsVideo.jsをTypescript+Viteでリファクタリング。本体はvideoPlayerフォルダ、distフォルダのnico-cache-player.mjsでソースはsrcにあります。

## [#173] - 2025-03-31

### Changed
- backgroundSelector - ラジアルメニューになった。
- CommentFilter & CommentFilterLogger - ログを一度に送信するように変更
- LinkAndStatus - 関連サービス追加

## [#172] - 2025-03-10

### Added
- TagCounter - タイトルと短いリンクを即コピーできる共有ボタン追加
- blockWritingTabSessions - 動画を切り替えたときに次の動画自動再生自動OFF
- unavailableVideo, player - スタイル追加

## [#171] - 2025-02-13

### Added
- LocalFLV現代化#4 ソースコード見直し・リファクタリング

### Fixed
- #171.1 LocalFLVのタイトルにタイポあったので修正
- #171.1 110_commentFilter.txtのパス修正
- #171.2 READMEの更新のみ
- #171.3 README更新 & common.jsのfetchWatchPage修正のみ

### Changed
- LocalFLV - IndexedDB廃止
- LocalFLV - API廃止(LazyAPIに変更、詳細情報取得時のみ動作)
- LocalFLV - Classベース、FlexSearch、簡素化、速度最優先

## [#170] - 2025-02-02

### Added
- LocalFLV現代化#3 検索機能追加
- downloadThruFFmpeg.javaを作成。LocalFLV経由でmp4やaacに変換して保存できるようになった。
- #170.6 背景画像切り替え機能追加。

### Fixed
- LinkAndStatusのダウンロードリンクも修正。
- #170.1 downloadThruFFmpeg.javaが保存取消後も処理を続行するバグ修正
- #170.2 downloadThruFFmpeg.javaが保存取消後も処理を続行するバグ修正#2
- #170.3 カテゴリフィルタの選択状態が維持されないバグを修正
- #170.4 list.jsのsmid取り出し部分修正、downloadThruFFmpeg.javaで変換後ファイルが再生されないよう修正
- #170.5 list.js動画カードのクリアボタンで全表示になってしまうバグ修正
- #170.7 CustomMylist2でタイトルが空白文字の場合にリンクが表示されない不具合修正"無題"と表示

## [#169] - 2025-01-28

### Added
- CommentFilterにSuperNG置換を実装し、ニコられ除外がオンのときもコメントを置換できるようにした。
- #169.1 list.jsとlist.cssを更新してLocalFLVを現代化
- #169.2 現代化2 カテゴリ追加

### Fixed
- oneRawCommonHeader→oneRowCommonHeaderに修正

### Changed
- blockWritingTabSessionsのデバッグ表示抑制

## [#168] - 2025-01-17

### Fixed
- 動画の切り替わりでエラーが起きたり一時停止トグルボタンが効かなくなっていたので防御的プログラミングを実施。

### Changed
- common.jsのMainVideoPlayerWidthHeightReturnerを更新してコメントリストの位置も返せるようにした
- LinkAndStatusがコメントリストの右側に表示されるように変更

## [#167] - 2025-01-14

### Fixed
- PlaybackrateChanger2のCommentSearchを修正し、拡張検索モードであればフル情報が表示されるようにした。
- LinkAndStatusの解像度の項目にN/Aを追加して対応させた。360p-mid,360p-low,360p-lowestに対応。
- CustomMylist2の動画移動時に時間のパースを間違えていたので修正

## [#166] - 2025-01-12

### Added
- CustomMylist2で、検索窓にクリアボタンを設置
- 視聴ページのマイリスト追加フェーズでSuggested Mylistを実装。 タグを考慮して追加オススメのマイリストを提案

## [#165] - 2025-01-09

### Added
- versatileVideoFilterで視聴ページ以外（video_top,search,tag,ranking）でも動画サムネイルを非表示できるようになりました

### Fixed
- nlFiltersのURLを修正

### Changed
- watchVideoFilterをversatileVideoFilterに変更
- rankingNGHiddenを廃止

## [#164] - 2025-01-06

### Changed
- フォルダ構造の最適化・整理
- nlFiltersのファイル名統一
- クリーンインストールを推奨します

## [#163] - 2025-01-05

### Added
- CustomMylist2: キーワードもインポートとエクスポートする機能追加し忘れていたので追加
- キーワードも一括操作対応
- カスタムアラートとカスタム確認画面

## [#162] - 2025-01-03

### Added
- blockWritingTabSessions.js:タブセッション管理を無効化して3窓以上を有効にする
- CustomMylist2にキーワード検索、タグ検索、マイリスト検索のキーワードを保存する機能を追加
- キーワード検索、タグ検索、マイリスト検索画面でLinkAndStatusのマイリスト追加ボタンを押すとマイリストメニューが表示されてキーワード追加出来るようになりました

## [#161] - 2024-12-31

### Added
- 視聴ページの2行になっているコモンヘッダーを一行にするスクリプト(WatchPageMisc/js/OneRawCommonHeader.js)
- needPaymentsVideo.jsの大型アップデート オルターネイティブプレイヤーを実装し、同期や一時停止等が効くようになった

### Fixed
- 諸々

### Changed
- 諸々

## [#160] - 2024-12-23

### Fixed
- LinkAndStatusのスタイリング

## [#159] - 2024-12-21

### Fixed
- #159.1 ChromeでCommentFilterが開かない問題に対処
- #159.1 watchVideoFilter.jsのスタイル

### Changed
- CustomMylist2マイリスト追加ボタンをLinkAndStatusに移動
- watchVideoFilter.jsの動画非表示設定ボタンをLinkAndStatusに移動

## [#158] - 2024-12-20

### Added
- 削除済み動画や非公開動画のランディングページを検知してキャッシュがあれば再生

### Fixed
- needPaymentsVideo.jsでのCustomCacheのhlsフォルダの処理。
- CustomMylist2とPlaybackrateChanger2の連携で、lengthが取得できない問題。
- #158.4 動画非表示設定が効かなくなっていたものの修正

### Changed
- PlaybackrateChanger2とLinkAndStatusのUIを現代化
- #158.1 ミニマイズ機能を1本化
- #158.2 Draggable.jsの最適化
- #158.3 CustomMylist2のサービスワーカーを改善してサムネイル画像をキャッシュ（一年間）
- その他諸々の変更

## [#157] - 2024-12-16

### Added
- CustomMylist2に動画時間の表示と並び替えを追加
- 視聴ページでの動画非表示機能追加しました。

### Fixed
- CustomMylist2で、起動時並び替えが適用されていないことがあったのが修正

## [#156] - 2024-12-16

### Added
- CustomMylist2でマイリスト一覧並び替えとマイリスト内の並び替えを記憶して次回起動時に再現するようになりました
- CustomMylist2の動画視聴ページでの追加ボタンでマイリストを名前で検索出来るようになりました

### Changed
- JQueryとJQuery-UIから脱却

## [#155] - 2024-12-15

### Added
- CommentHeatmapを実装。画面上部にコメントヒートマップ（ヒートチャート）が表示されます。
- CustomFilters/PlaybackrateChanger2/src/config.jsのFEATURES.COMMENT_HEATMAP.ENABLEDで切り替えできます。
- CustomCacheReturner.javaを実装。/local/CustomCache/フォルダにあるキャッシュファイルをJSONで返答。キャッシュファイルがうまく動かない場合のフォールバックとして活用。

### Fixed
- PlaybackrateChanger2の同期機能を修正。時間取得をプログレスバーから取得するようにした。(フォールバックとして従来の方法も可能)

### Changed
- CommentFilterのフィルタモードによって非表示になる機能がややこしいので削除
- PlaybackrateChanger2の音量調整を人間の聴覚特性に合わせて比例関数から対数関数にした。

## [#154] - 2024-12-09

### Changed
- CommentFilterのサニタイズを最適化

## [#153] - 2024-12-08

### Fixed
- PlaybackrateChanger2の同期がより少ない試行回数で済むように調整
- 無料公式動画で同期機能がバグっているのを修正

## [#152] - 2024-12-07

### Fixed
- PlaybackrateChanger2のSyncボタンを修正
- #152.1 公式動画でコメント検索が上手くいくように修正

### Changed
- 公式有料動画の場合にコメントと動画の再生位置を30秒毎に自動同期させるようにした
- より柔軟に同期かつ大きな時間差に自動同期するようになった
- コメントが若干前後するような動作がありますが同期しているのでご了承ください。

## [#151] - 2024-12-06

### Fixed
- 106_CommonHeaderPrivacyFilter.txtで、ユーザーアイコンが一律で非表示になる（もしくはズレる）問題を修正して正しく動作させるようにした。
- PlaybackRateChanger2で公式動画で再生一時停止トグルボタンが公式プレイヤーと同期しながら再生・一時停止するように修正
- PlaybackRateChanger2でツールチップ表示
- PlaybackRateChanger2で再生トグル・シーク・トラッカーの修正
- #151.1 上記の修正の更に修正
- READMEを更新
- #151.1 READMEの修正

### Changed
- nlFilterのファイル名を変更（中身も整理、localの方も一部整理）

## [#150] - 2024-12-05

### Added
- SuperNGワードの正規表現対応(CommentFilter)

### Fixed
- LinkAndStatusでキャッシュ完了後にプログレスバーが正常に表示されない問題を修正
- CommentFilterでニコられ除外が上手く適用されない問題を修正
- LinkAndStatusの縮小ボタンが動作するようになりました

## [#149] - 2024-12-04

### Fixed
- 全体的に少しリファクタリングした。
- ドラッグで要素が追従しない問題を修正。

### Changed
- PlaybackRateChangerからPlaybackRateChanger2に移行。
- UserPageからLinkAndStatusに移行。

## [#148] - 2024-12-04

### Fixed
- CommentFilterLoggerのログを綺麗にスタイリングするようにした。
- CommentFilterのDEBUGモードでフィルターに引っかかったワードを詳細表示する機能を修正
- #148.1 CommentFilterで内部的に動画IDが取得できない問題に対処(特定動画NG用)

## [#147] - 2024-12-03

### Added
- CommentFilterの新機能
- SuperNGワード、SuperNGユーザー（ニコられ除外オン時にNGワードとNGユーザーを有効にする。ホワイトリストは対象外）
- 特定動画NGユーザー、特定動画NGワード
- フィルターに引っかかたワードをCommentFilterLogger拡張機能でNicoCache_nlのログウィンドウに表示（タブ）
- 説明用html(CommentFilterExp.html)追加

### Changed
- up.jsからNGCommentProxyリンクを削除
- NGCommentProxyからCommentFilterに完全移行してください。

## [#146.1] - 2024-12-03

### Added
- NGCommentProxyの後継、CommentFilterを導入しました。可能なこと：
- NGCommentProxyで出来たことはほぼ全て出来ます。
- デバッグモードでフィルターに引っかかったワードを詳細表示
- ニコられ3回以上でフィルターから除外
- ブラックリスト・ホワイトリスト・非表示の切り替え
- 投稿者コマンド・通常コマンド・簡単コマンドにコマンド指定
- NGワード指定（通常）（ブラックリスト用）
- NG正規表現（ブラックリスト用）
- NGユーザー指定（ブラックリスト用）
- 正規表現で置換
- OKワード（ホワイトリスト用）
- OK正規表現（ホワイトリスト用）
- 除外ユーザー
- 除外動画ID指定
- インポート・エクスポート(NGCommentProxyのレガシーデータ対応)
- IndexedDBに完全移行（最大容量制限はCドライブの半分までになります）
- ConstructorやClass,モジュールで洗練されたソースに
- #146.1 CommentFilterでコマンドの設定問題を修正

### Fixed
- #146.1 CommentSearchが動かない問題に対処（カスタムマイリストのコメント追加ボタン関数削除忘れ）
- #146.2 UIの修正完全一致→部分一致

### Changed
- up.jsからCustomMylistを削除
- up.jsにCommentFilterのリンク
- pc.jsからカスタムマイリストのマイリスト追加ボタンを削除
- カスタムマイリストを削除（カスタムマイリスト2に完全移行してください）

## [#145] - 2024-11-29

### Added
- CustomMylist2を導入しました。可能なこと：
- 複数のマイリストの作成・削除・ソート（名前順・作成順・動画数順のそれぞれ昇順降順）
- 各マイリストの名前変更
- マイリストを名前で検索
- エクスポートとインポート（CustomMylist1のバックアップデータインポート対応済み）
- 動画IDか視聴ページのURLでの手動マイリスト追加
- マイリスト内での動画ソート（投稿日時・タイトル・再生数・コメント数・マイリスト数・追加日時の昇順降順）
- マイリスト内での検索（タイトルと投稿者名）
- 全選択・全解除
- マイリスト動画の一括操作 移動・コピー・削除・情報取得
- 各マイリスト動画の個別の 移動・コピー・削除・情報取得
- ヘッダー固定・追従
- キーワード検索等
- リンク一覧

### Fixed
- ContextMenu.jsで挿入するメニュー位置
- whenAddedNGCommentViaNVApiProxy.js

### Changed
- up.jsにCustomMylist2を追加
- pc.jsにカスタムマイリスト2用のマイリスト追加ボタンを追加
- NGCommentProxy v13.0

## [#144] - 2024-11-24

### Added
- expired_sourceChanger.jsで一番最初の再生時のみ同時にコメントの再生も（ほぼ）同期再生する機能を追加
- pc.jsの再生・一時停止トグルボタン、トラッカー、シーカーでコメントの再生も同期しながら再生・一時停止、追従、スキップする機能
- pc.jsのSyncボタンで同期する機能（同期機能は計算で割り出してるので最大5秒ほどズレる可能性があります）
- pc.jsで30秒ごとにコメントを自動同期する機能(もっぱらexpired_sourceChanger.jsでの動作を想定)
- pc.jsで音量が公式プレイヤーの音量レンジとほぼ同期する機能(expired_SourceChanger.jsで動画を埋め込んでるときは公式プレイヤーの音量設定に意味がありません)

### Fixed
- pc.jsとup.jsで動画を変更した際にタイトルやIdが追従しない問題に対処
- ContextMenu.jsのコンテキストメニュー表示位置修正

### Other
- READMEをかなり厳しめの文で書くようにした。（特に単一フィルタを抜き出して使う行為について）
- README読まない人には無力だが、言い訳にはなる
- そもそも単一で動くように出来ていない！

## [#143] - 2024-10-03

### Changed
- NGCommmentProxy v11.0
- NGCommentProxyでChromeで利用中幅が異様に狭くなる問題に対処
- NGCommentProxyのコンテキストメニューを整備(ContextMenu.js)
- NGCommentProxyのDefault.jsにコメントコマンドのデフォルトを記述
- whenAddedNGCommentViaNVApiProxy.jsが動かないけど原因わかる方いますか？

## [#142] - 2024-09-18

### Changed
- 101_PremiumStatusModificator.txt -> 復活。resource.video.nimg.jp/~/\_web.watch.\_id\._-C_62cQCm.jsをハックすることで同時再生窓数上限を無制限にする。公式の再生速度も選択可能になるが、選択しても効果は適用されない。"スキップ秒数"と"反転再生"は選択不可（一応プレミアムのマークは消える）
- 106_PlaybackrateChanger.txt -> 再生速度調整が利用可能になった。0.01倍速から200倍速まで調整可能。    nimg:ChangeWatchPlayerPremiumStatusかnimg:KillOfficialPlaybackrateControllingのどちらか若しくは両方を有効にすることで効果を適用可能。こちらでスキップ秒数もプレイバックも再生速度も調整できるのでわざわざ公式の機能を使う必要はない。

## [#141.1] - 2024-09-16

### Changed
- 全体的に事件前と同じように動くようになった。
- 106_PlaybackrateChanger.txt -> 再生速度調整利用不可。なぜかnimg:KillOfficialPlaybackrateControllingが効かない。
- 108_UserPage.txt -> 利用可能になった。
- 112_CustomMylistFilter.txt -> CustomMylistButtonをPlaybackrateChanger(pc.js)の5タブ目に統合。
- #141.1
- pc.cssの調整とTagCounterのスタイル調整。
- pc.jsのComment Searchの実行タイミング調整。

## [#140] - 2024-08-31

### Changed
- 102_ExpiredPurchasedMovieCacheUse.txt -> 一応動くようにした。

## [#139] - 2024-08-27

### Changed
- 101_PremiumStatusModificator.txt -> 廃止。ハックの方法が潰された為。
- 102_ExpiredPurchasedMovieCacheUse.txt -> Nアニメ動画系が復活していないので現在利用不可。
- 103_WatchReconstruct.txt -> 背景画像のみ変更可。MatrixRainは使えるか不明。
- 104_WatchReconstructBackground.txt -> 同上。
- 105_WatchReconstructAddition.txt -> デバッグ用。
- 106_PlaybackrateChanger.txt -> とりあえず音量とシークだけ使える。再生速度調整とコメント検索利用不可。その他コピー機能も利用不可。
- 107_NGCommentProxy.txt -> URL変更のみだったのでフル機能が使えるはず。
- 108_UserPage.txt -> キャッシュ進捗は利用不可。それ以外はとりあえず利用可能。
- 109 ~ 113 変更なし。使えたらラッキー。

## [#138] - 2024-06-20

### Changed
- NGCommentProxy が v8.0 にアップデート。
- toBoolean関数をContextMenu.jsからNGCommentProxy.jsに移動させないとNGCommentProxyが動作しなかったので其の為。

## [#137.3] - 2024-06-08

### Changed
- NGCommentProxy が v7.0 にアップデート。
- 新機能:インビジブルモードが搭載。ブラックリストモードと非表示の合体を目指して開発したが完全に非表示にする方法が不明なためリストの最後に追いやっている。
- wr_PlayEndCardNGHidden.js:watch ページの動画視聴後エンドカードの NG。
- wr_PlayerPanelContainerVideosNGHidden.js:watch ページのプレイヤーパネルのオススメビデオの NG。
- @super_ng@と@super_user@も実装しました。
- これはそれぞれデリミタの後に NG ワード（正規表現可）と UserId を書くことで「ニコられた」モードが ON の場合にも NG できるようにするものです。
- 137.1 リードミーの更新
- 137.2 expired_sourceChanger.js「開発版 23 をご使用の場合に、/cache/<smid>/auto/movie で再生できない問題の応急的処置」のマージ
- 137.2 pc.js の sourceNothing2 の修正
- 137.3 expired_sourceChanger.js「開発版 23 をご使用の場合に、/cache/<smid>/auto/movie で再生できない問題の応急的処置v2」のマージ

## [#136] - 2024-06-05

### Changed
- NGCommentProxyがv6.0にアップデート
- 新機能:動画ID(smid)限定のNGワード・置換ワードを指定可能になった。ひとつのNGワードに対して複数smidを指定することも可能。
- 削除された機能:「コメント職人」についてコメントが言及しているとき動作除外→実際に言及しているコメントはほとんど無かったため。
- 削除された機能:「職人」についてコメントが言及しているとき動作除外→誤爆が多いため。
- ファイル名を変えたのでファイルが滅茶苦茶になるのが嫌な人はクリーンインストール推奨。

## [#135.2] - 2024-06-01

### Changed
- NGCommentProxy v5.0にアップデート
- 新機能:BlackListとWhiteListの切り替え
- 新機能:OKWordの指定
- ホワイトリストモードというより強力なフィルタが使えるようになりました。OKWordにワード指定するとそのワードだけがコメントとして表示されます。
- ブラックリストモードは従来のNGWordです。
- 135.1 READMEの表現修正
- 135.1 NGCommentProxyのデフォルトOKWord一部修正
- 135.2 NGCommentProxyのデフォルトOKWord一部修正(追加)

## [#134] - 2024-05-26

### Changed
- NGCommentProxy v4.0 - 変更なしだけどバージョン番号は上がります
- up.jsとpc.jsとMylistButton.js,wr_TagCounter.jsがmp4ソースとauto/movieソースを考慮していなかったので修正

## [#133] - 2024-05-23

### Changed
- NGCommentProxy v3.0
- 投稿者コメントに指定するコマンドを追加
- 正規表現「アホ」に関するものが「ア」で始まる文章にマッチするように誤爆していたので修正
- CustomMylistManager で popThumb の切り替えが出来るようになった。
- expired_SourceChanger 等でトースト表示するようになった。
- up.js で関連サービスを追加
- pc.js でカスタムシーク等追加
- NGCommentProxy の右クリックメニュー追加・最適化
- フッターコンテナをアコーディオン表示
- ランキングでNG追加(デフォルトでは「ホモと見る」で始まるタイトル)

## [#132.1] - 2024-05-13

### Changed
- NGCommentProxyがv2.0にアップデート。
- 新機能:たくさんニコられているコメントを削除・置換・色の置き換え等の全てから除外します。(n>5)
- 新機能:「コメント職人」についてコメントが言及している場合に自動的に動作から除外します。
- 新機能:「職人」についてコメントが言及している場合に自動的に動作から除外します。
- 新機能:特定キーワードをトリガーにNGCommentProxyの動作から動画を除外(コメント職人などに)
- 新機能:削除・置換・色の置き換え等の全てから除外するユーザーID(コメント職人などに)
- 新機能:whenAddedNGCommentViaNVApiProxy.jsでニコニコ動画のプレイヤーでコメントをNG追加したときやNGユーザーIDしたときにNGCommentProxyにも自動追加されるようになった
- 削除された機能:たくさんニコられているコメントを金色にする(n>9)
- CustomMylistManagerでヘッダが追従するようになった。
- CustomMylistManagerでキーワード、タグ、マイリスト、静画、生放送、チャンネル、大百科の検索が出来るようになった
- 132.1:GM_config.jsの内部スプリットワードを<code>\n</code>から=fugafuga=にした。
- 132.1:NGCommentProxy v2.0の説明文(label)でexlude→excludeに修正

## [#131] - 2024-05-08

### Changed
- UserPageのデザイン変更
- NGCommentProxyの導入。UserScriptの「かんたんコメントクリーナー」と「GM_Config(eight's version).js」をベースに開発。
- 遂にJavascript単体でNGワードが可能になった。
- NGワード指定/コメントコマンド指定/置換ワード指定/NGユーザーID指定　が行える。
- 細かい説明はREADMEを読むこと。
- CustomMylistで高画質サムネイルを積極的に使うようになった
- PlaybackrateChangerの拡張コメント検索とUserPageの概要、コメ情報ページでより詳しくコメント情報を表示
- UserPageの概要、コメ情報ページでvposMs（動画内でのコメント出現順）でソートするようにした

## [#130] - 2024-05-05

### Changed
- CustomMylistでdmcCacheなのにリンクが赤色になる問題の修正
- CustomMylistでサムネイルやリンクでカーソルホバーするとpopThumbで埋め込み表示されるようになった
- pc.jsのリファクタリング
- pc.jsからPlayPositionを廃止しPlaySeekに統合
- up.jsのデザイン変更、リンクをselect要素から選択する形に
- up.jsのプログレスバーデザイン変更
- pc.jsとup.jsのドラッグ方法をjquery+jquery-uiから変更

## [#129] - 2024-04-21

### Changed
- CustomMylistでキャッシュファイルが存在するリンクの色が変わりキャッシュアイコンが表示されるようになった
- ファイル構造の整理・不要ファイル削除

## [#128.2] - 2024-04-18

### Changed
- CustomMylist更新(マイリスト追加に新機能、videoidやurlから自動でサムネイルURLとタイトルを取得する機能)
- PlaybackRateChangerのコメント検索に新機能「拡張」が追加、userIdやpostedAt,vposMsが追加表示
- PlaybackRateChangerのコメント検索でコメントを直接クリックしてコピー出来るようになった（→ドラッグ切り替え廃止）
- UserPageに「新着動画」と「新着コメント」リンク追加
- 115_searchResultMultiColumnist.txtとsearchResultMultiColumnist.cssの追加 /tag/ /search/ /newarrival /recent で8列表示
- up_ext.jsとup_nv.jsの表示がリッチになった
- (128.1)CustomMylistのマイリスト追加時（手動）に前後にダブルクォーテーションが入る問題の修正
- (128.2)pc.jsで動画遷移時にコメントが引き継がれる問題の修正

## [#127] - 2024-04-17

### Changed
- README更新(Unlicense LicenseとCC0の全文追加、その他細々)
- wr.css更新(HeaderContainerとBottomContainerの新しいスタイル)
- CustomMylist更新(iframeだと余りにも表示が遅いので変更)
- マイリスト再登録してください。
- PlaybackRateChangerとUserPageが正確にプレイヤーの右隣と左隣に位置するようになった。
- common.jsの更新(window.customCommon.WatchPageWidthHeightReturnerの追加)

## [#126] - 2024-04-04

### Changed
- nv-comment.nicovideo.jpへの移行対応漏れに対応(101_PremiumStatusModificator.txt)
- README更新

## [#125] - 2024-04-03

### Changed
- nvcomment.nicovideo.jpからnv-comment.nicovideo.jpへの移行対応
- ニコニコ市場撤退に伴うwr.cssの一部コード削除とTagIchibaCounter.jsからTagCounter.jsへリネーム・一部コード削除

## [#124] - 2023-10-29

### Changed
- /local/CustomCache/(動画ID)/から/local/CustomCache/(動画ID).hls/に変更(NicoCacheとmp42hls.vbsの仕様に合わせた)
- 一括でフォルダをリネームする場合FlexibleRenamerがおすすめ
- 高度なリネームにチェックを入れて正規表現、検索欄に「(.*)」、置換欄に「\1\.hls」で一括リネームできます
- mp4の再生にも柔軟に対応 /local/CustomCache/(動画ID).mp4という風に置いてください。

## [#123] - 2023-10-15

### Changed
- common.js,pc,js,expired_sourceChanger.jsの更新
- pc.jsにsourceNothing2実行ボタンを実装
- https://www.nicovideo.jp/cache/videoid/auto/movie/ (videoid/master.m3u8も含めて)が404 Not Foundになる対策として、
- /local/CustomCache/(動画ID)/にキャッシュを置くことで期限切れの公式動画を再生出来るようになった
- 作動しない場合はsourceNothing2ボタンを押してください

## [#122] - 2023-10-14

### Changed
- カスタムマイリストに削除を実装した
- マイリストした動画を削除する場合はチェックボックスに✔を入れて削除ボタンを押してください

## [#121] - 2023-10-07

### Changed
- CustomMylistManager.html(.js)の更新
- マイリスト管理モードでも手入力で動画IDを入力することでマイリスト登録出来るようになった
- 上までスクロールするボタン追加
- 未だに削除が実装不能なのでIndexedDBから不要な動画は直接削除してください

## [#120.1] - 2023-10-02

### Changed
- wr.cssの調整
- wr_MylistUadLikeButtonToggle.jsからカスタムマイリストボタンを削除（位置が変わった為）
- トラッカーと音量コントローラがビデオタグを取得するタイミングがずれる為pc.jsに手動ボタン設置
- 再生速度200倍までサポート
- CustomMylistManager.htmlを調整
- CustomMylistManager.jsを修正
- MylistButton.jsを修正
- MylistLibrary.jsを単純化し機能を削ぎ落とした
- カスタムマイリストのエクスポートデータの互換性はありません、lz-stringで解凍して[{"id":1,"vid":"meta"},{"id":2,"vid":"smxxxxxxx"},]の形式でテキストファイルに平文に書けばインポート可能です
- up.jsから不要部分削除、キャッシュ情報太字化

## [#119] - 2023-07-26

### Changed
- 101_PremiumStatusModificator.txtで、有効化していると視聴画面でエラーになるバグを修正

## [#118] - 2023-03-11

### Changed
- pc.jsとup_nv.jsでのコメント取得方法を新方式に完全移行
- pc.jsのトラッカーにmouseenterすると時間が表示されるようになった
- pc.jsの音量にプリセットを配置した
- pc.jsからMinimumVolumeを廃止
- up.jsでリンクをアイコンに
- コメントリストと動画リストのタブスイッチでマイリストボタン・ニコニ広告ボタン・Likeボタン・カスタムマイリストボタンが消えるようにした(wr_MylistUadLikeButtonToggle.js)
- チャンネル動画がwindow.customCommon.retryによって失敗しづらくなった

## [#117.1] - 2023-02-26

### Changed
- wr.cssの更新
- pc.jsで公式動画（ニコニコチャンネルのアニメ等）でコメント検索できるようになった

## [#117] - 2023-02-25

### Changed
- wr_BackgroundHTML5.cssの背景画像 jpg→avif
- READMEの画像 png→avif
- wr.cssの更新
- MylistButton.css,MylistButton.jsの更新
- expired_isDummuReloaderの削除

## [#116] - 2022-11-10

### Changed
- wr.cssを主に改修
- ツールチップを追加(up.js,pc.js)

## [#115] - 2021-12-14

### Changed
- pc.jsのCommentSearchでso+のidでも無効化されるよう拡張
- 要望に応えてみた
- その他マイナーアップデート（更新日が更新されているファイル）

## [#114] - 2021-12-13

### Changed
- キャッシュ済み有効期限切れ動画の再生方法を単純化した

## [#113] - 2021-12-13

### Changed
- up.jsにて__videoplayer.duration()経由の取得ではなくエレメントからdurationを取得するように変更した
- pc.jsにてPlayPosition等を__videoplayerを経由しなくてもよいように両対応させた
- pc.jsにてTrackerとVolumeを追加し、ニコニコ動画の動画コントローラに依存する必要がなくなった
- pc.jsにてCommentSearchが公式動画やチャンネル動画で非対応であることが明確に分かるように変更した
- pc.jsにてCommentSearchが無効になっているときに出るヘルプの対応を追加した
- pc.jsにてMinimum Volumeをトグルスイッチにした
- common.jsを更新してキャッシュ済み有効期限切れ動画を閲覧可能にした 見るときは「is-sourceNothing Remover」を押してください
- (諸事情によりコメントレンダラ等の全てのレイヤの上に動画が描画されるようにしています、従って動画上でコメントは見れませんしリストも追従しません)
- (動画プレイヤーの再生・一時停止、戻し、送り、繰り返し、次の動画などの操作も一切効きませんし、再生時間も表示されません)
- なのでPlaybackrateChangerで操作してください

## [#112] - 2021-12-11

### Changed
- カスタムマイリストが三列表示するようになりました
- カスタムマイリストにマイリスト、シリーズ、検索キーワード、検索タグを追加出来るようになりました
- カスタムマイリストの下まで自動スクロールボタンが滑らかになりました
- カスタムマイリストのマイリスト、シリーズをドラッグ・アンド・ドロップ出来るように切り替えるボタンを配置しました
- カスタムマイリストの追加総数を表示するようにしました
- カスタムマイリストの再生数などがカンマで表示されるようになりました
- pc.jsで再生レートの変更が要素の変更後即座に表れるようになりました
- pc.jsのPlayPositionに再生一時停止トグルボタンを追加しました

## [#111.1] - 2021-08-23

### Changed
- up_nmsg.jsの更新(nvcomment対応)
- カスタムマイリストをドラッグ・アンド・ドロップでサムネイル削除できるようにしました
- カスタムマイリストをインポート・エクスポート出来るようにしました
- watchページから直接カスタムマイリストに登録可能になりました
- fetchAll(マ)とfetchAll(投)に分かれていたのを一つに統合しました
- 108_CommentModifier.txtをnvcommentに対応させました（動作未確認）
- 102_ExpiredPurchasedMovieCacheUse.txtを現在の仕様に更新しました
- かんたんコメントエリアにも背景画像が適用されるようになりました
- 全画面表示でかんたんコメントエリアに背景画像が表示されてしまうバグを修正しました
- wr_TagIchibaCounter.jsの市場カウンターを復活させました

## [#110] - 2021-08-15

### Changed
- 101_PremiumStatusModificator.txtの更新

## [#109] - 2021-05-31

### Changed
- expired_sourceChanger.jsを更新しis-sourceNothing Removerを使用しなくても再生できるようにした
- wr.cssを更新しis-sourceNothingを実質的に無効化した
- 112_rankingMovieFetcherFilter.txtのjsを更新して現在の仕様にあわせた

## [#108] - 2021-04-16

### Changed
- 102_ExpiredPurchasedMovieCacheUse.txtとpc.js

## [#107] - 2021-03-27

### Changed
- pc.js,up_LinkInseart.js,up_nmsg.js,MylistLibrary.jsのapi仕様変更対応

## [#106] - 2021-03-19

### Changed
- 仕様変更に対応
- ■UserPage
- progressbar.jsを追加してプログレスバーを表示するようにした
- ■WatchReconstruct
- 仕様変更に対応

## [#105] - 2021-02-07

### Changed
- ■UserPage
- リンクを強調表示
- キャッシュリスト改造
- up_LinkInsert.jsにて内部情報等リンクをext+flapi+nmsgに統合
- ■CustomMylist
- マイリスト作成機能を追加（現在無効化）

## [#104] - 2020-11-05

### Changed
- ■PlaybackRateChanger
- ミニモードを搭載
- localstoragを使用してミニモードを記憶するようにした
- ■UserPage
- ミニモードを搭載
- localstoragを使用してミニモードを記憶するようにした
- こちらからでもカスタムマイリストに追加可能にした
- キャッシュ率を表示するようにした
- ■カスタムマイリスト
- CMManagerの上部にリンクを表示

## [#103] - 2020-10-09

### Changed
- ■カスタムマイリスト
- lz-string.jsでlzw圧縮するようになりました
- ■PlaybackRateChanger
- 大幅に改修しました
- タブ形式にして小型化
- ■watchページ整形フィルタ
- Backdrop filterを全面採用しました
- Chromeでは追加の操作は必要ありませんが、Firefoxではlayout.css.backdrop-filter.enabledをtrueにする必要があります

## [#102] - 2020-10-05

### Changed
- ■カスタムマイリスト
- 重複のマイリスト登録を弾くようになりました
- 登録したマイリストを削除出来るようになりました
- トーストを表示するようになりました(toastr.js)
- 順番通りに表示するようになりました
- storeidの一番最後にマイリストを追加するようになりました
- ■UserPage
- 「その他」を追加 ext,flapi,nmsgの情報をまとめて表示するようになりました

## [#101.01] - 2020-10-02

### Changed
- ■カスタムマイリストを追加しました。
- IndexedDB APIを使用してマイリスト（風）にブラウザのローカルストレージに保存します。
- Firefoxの場合はストレージの半分まで保存できるようです（500GBのSSDなら、250GBまで）
- 追加と閲覧だけができます。他は開発が面倒くさすぎて諦めました。5年後くらいに完成したりしていなかったりするかも知れません。
- コントリビューションお待ちしています。
- ■ランキングにフェッチリンクを追加しました。
- ■#fetchAllBoxに「カスタムマイリスト」リンクと「マイメモリー保存」リンクを追加しました
- 101->101.01 軽微な修正

## [#101] - 2020-10-02

### Changed
- ■カスタムマイリストを追加しました。
- IndexedDB APIを使用してマイリスト（風）にブラウザのローカルストレージに保存します。
- Firefoxの場合はストレージの半分まで保存できるようです（500GBのSSDなら、250GBまで）
- 追加と閲覧だけができます。他は開発が面倒くさすぎて諦めました。5年後くらいに完成したりしていなかったりするかも知れません。
- コントリビューションお待ちしています。
- ■ランキングにフェッチリンクを追加しました。
- ■#fetchAllBoxに「カスタムマイリスト」リンクと「マイメモリー保存」リンクを追加しました

## [#100] - 2020-09-16

### Changed
- 変更点が多すぎて書ききれません

## [#99] - 2020-06-21

### Changed
- watch_page_reconstruct.cssニコニコ市場修正
- javascriptの全体的なリファイン
- PlayerbackrateChanger.jsにdraggable切り替え追加

## [#98] - 2020-05-04

### Changed
- Tag_Ichiba_Counter.js >>658を修正 ul要素の中にカウンターを挿入する場合は、li要素を使用
- watch_page_reconstruct_OptimizeHeader.jsを追加 動画タイトル要素の後に挿入された疑似要素の高さを自動調整
- watch_page_reconstruct.css body.is-autoResize .FlexChild.HeaderContainer-searchBox,body.is-autoResize .SearchBoxContainerのwidth調整 457行目
- matrixrain.jsを追加 - 背景をマトリックスのプログラムコード風にします 使うときは104_watchページ整形フィルタ(画面サイズ変更用）.txtのwatch:背景画像指定を無効化し、watch:matrixを有効化します。（この2つは排他的処理です）同時に両方を有効化すると指定した背景画像の上にマトリックスのプログラムコードが流れます。

## [#97] - 2020-04-28

### Changed
- Tag_Ichiba_Counter.jsを大幅に改良
- jsソースコードの見直し
- flashplayerのサポート廃止
- fetchAll.jsの修正

## [#96.1] - 2020-03-08

### Changed
- タイトルをAero風に戻した(watch整形フィルタ)
- 仕様変更により崩れたニコニコ市場を修正(watch整形フィルタ)
- Tag_Ichiba_Counter.jsを修正してリンクとニコニコ市場カウンターを修正した

## [#94 (#95)] - 2019-11-25

### Changed
- フォロー中のタグにtext-shadow追加(watch整形フィルタ);
- 設定にAeroエフェクト適用(watch整形フィルタ)
- 112_seiga整形フィルタ.txt追加
- 106_コメントのコマンドを削除.txtの「nmsg:草生やすな」を更新
- ツールチップ表示位置改善(watch整形フィルタ)
- PlaybackrateChanger.jsを修正（オマケを削除）してコメント検索を再び使えるようにした
- Tag_Ichiba_Counter.jsを更新してfetchを登録できるようにした
- nicoTop_Heightを廃止(107_広告削除CSS.txt)
- 広告削除要素の追加(dicAll_remove.css)

## [#94.02] - 2019-11-24

### Changed
- 94.02 FGVC(Fine-Grained Volume Controller)とPCE(PlaybackRate Changer)が上手く動かないので関数化を外して修正
