# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- 【comment-filter2】非表示ルールに一致したコメントを空本文と`invisible`コマンドへ変換せずレスポンスからエントリごと除去し、未取得分を含む累計を壊さないよう、スレッド件数と同一スレッドIDの全体件数から実際の除去数だけを差し引く方式へ変更した。

## [#245.2] - 2026-08-20

### Changed

- 【features・README】リリース番号を`245.2`へ更新し、latestバッジを`#245.2`へ変更した。

### Fixed

- 【common・video-player・movie-info】NicoCache_nlのキャッシュ検索APIが移行途中の一覧ラッパーを返す環境でも検索結果が0件にならないよう、完成キャッシュだけを実際の検索語で絞り込み、取得中キャッシュを除外する互換処理と両画面の回帰テストを追加した。

## [#245.1] - 2026-08-20

### Changed

- 【features・README】リリース番号を`245.1`へ更新し、latestバッジを`#245.1`へ変更した。

### Fixed

- 【matome-toolbox/media】H.264変換とadaptive変換のMP4をFirefoxで再生できるよう、再エンコード時の映像をHigh profile・8-bit 4:2:0へ統一し、FastStartを維持した。adaptiveとHLSはcodec名だけでコピーせず、Main／High系の8-bit 4:2:0だけをコピーし、High 10・4:2:2・4:4:4などは互換形式へ再エンコードするよう修正した。
- 【features/build】`#245.1`のような小数点付きリリースでも正式な配布物を生成できるよう、package versionの検証を整数または1段の小数形式へ対応させ、整数限定でビルドが停止する問題を修正した。
- 【release】小数点付きタグと同名のCHANGELOG節がある場合は整数部の旧リリース節をフォールバック追記せず、リリースノートへ今回と前回の変更が重複掲載される問題を修正した。
- 【matome-toolbox】設定などを同一ミリ秒内に連続保存しても既存バックアップと衝突しないよう、バックアップ名をファイルシステム上で予約し、競合時は次の番号へ進める共通処理へ統一した。

## [#245] - 2026-08-20

### Added

- 【comment-filter2・nlFilters】描画済みコメントを右クリックした公式Reactメニューから、コメントのコピー、Google検索、本文全体がHTTP(S) URLの場合の新規タブ表示、comment-filter2への全動画NGワード・NGユーザーID追加を行えるようにした。DOMや生成class名を探索せず公式コメントモデルを版付きAPIへ渡し、NG追加は重複防止・無効ルール再有効化後にコメントだけを再取得して即時反映する。
- 【sandbox・tests】公式メニュー資産の更新へ追従できるよう、React children生成点へのMatchが全captureで一意であること、置換後ES Moduleの構文、既存公式NG操作、版付きメニューAPI接続を検証する解析コマンド、観測履歴、単体テストを追加した。
- 【comment-filter2・nlFilters】ルール変更後も視聴ページを維持したまま公式コメントだけを再取得して反映できるよう、公式コメントストアの再取得actionを版付きの最小APIとして公開し、comment-filter2から呼び出す経路を追加した。公式資産が更新されAPIを利用できない場合は自動再読み込みせず、一度だけ必要なハード再読み込み方法を通知する。
- 【sandbox・tests】公式資産の更新へ安全に追従できるよう、取得済みES Moduleを実行せずメモリー上でde-minifyし、コメント再取得action、追加取得条件、nlFilterのMatchを検証する解析コマンドと回帰テストを追加した。Cookieのない一時BrowserContextで現行Watchページを開き、コメント再取得のHTTP応答、comment-filter2への再入力、ページ全体が再読み込みされないことを検証する隔離実験も追加した。
- 【sandbox・nlFilters・docs】将来Matchを安全に汎化できるよう、公式資産ごとのURL、ハッシュ、サイズ、一致断片、意味上の安定点と変動点を時系列で残し、3版以上・対象1件・他資産0件・置換後構文・動的再取得を採用条件とする履歴文書を追加した。

### Changed

- 【features・README】リリース番号を`245`へ更新し、latestバッジを`#245`へ変更した。
- 【開発環境】隔離解析やテストが作成する一時ファイルを誤って追跡しないよう、`.tmp/`をGitの除外対象へ追加した。

- 【matome-toolbox・CI・release】ツールの正式名称を`matome-toolbox`へ統一し、Mavenプロジェクトを
  `scripts/matome-toolbox`、生成JARを`matome-toolbox-0.1.0-SNAPSHOT.jar`へ改名した。
  CIとリリース作成時に新しいパスのJARを実行検証し、そのJARだけを配布アーカイブへ同梱するようにした。
  旧既定データディレクトリは、初回起動時に新しい`~/.matome-toolbox`へ自動移行する。

### Removed

- 【cache-data-manager・matome-toolbox・docs】NicoCache_nlのキャッシュ一覧を独自UIへ置き換える
  cache-data-managerを廃止し、ソース、専用型、Playwrightテスト、遅延読込、ビルド入口、
  `local/list.js`と`list.js.map`の一括・個別リンク作成機能と案内を撤去した。
  mlink-video-controllerのキャッシュリストはNicoCache_nl本体の`/cache`を直接開く導線として維持し、
  旧版からの更新時はfilter-matomeを参照する既存シンボリックリンクだけを確認して削除する手順へ変更した。

### Fixed

- 【comment-filter2】公式コメント再取得APIの公開が少し遅れただけで通常再読み込みへフォールバックしないよう短時間待機し、更新前から開いているページでは効果のない通常再読み込みを自動実行せず、一度だけ必要なハード再読み込み方法を通知するよう修正した。
- 【CI】Ubuntu hosted runnerでPlaywrightのOS依存パッケージ再導入が外部`apt`待ちのまま
  タイムアウトしないよう、既存ランタイム依存を利用してChromium本体だけを取得するようにした。

## [#244] - 2026-08-19

### Added

- 【Java Toolbox/media】キャッシュ動画のrenameで仮の720p・192kbpsを使わず、dry-runを含め
  実ファイルをffprobeで解析し、利用不能・情報不足時はGPACへフォールバックして、実測した
  解像度と音声ビットレートからNicoCache互換名を自動構築するようにした。GUIとCLIで
  `auto`、`ffprobe`、`gpac`を選択でき、両解析器が不足する場合は理由を表示して変更しない。

### Changed

- 【features・README】リリース番号を`244`へ更新し、latestバッジを`#244`へ変更した。

## [#243] - 2026-08-18

### Changed

- 【全NicoCache連携】本体の旧`/cache/*`管理API廃止に合わせ、キャッシュ照会・検索・再生・
  保存・削除と全Java拡張APIを`https://nicocachenl.test/api/v1`へ完全移行した。
- 【common・video-player・movie-info】動画単位のREST資源からCMAF/Domandキャッシュ情報を取得し、
  専用ホストの再生・エクスポート経路を使うよう、型検証、URL生成、fixture、UI表示を更新した。
- 【video-player・nlMovieFetcher】旧`www.nicovideo.jp/cache/file/*`への内部配信依存を除去し、
  本体の論理メディアAPIと`nicocachenl.test/media/v1`の再生セッション経路へ移行した。
- 【extensions】movie-fetcher、smart-fetcher、GPAC、nicochart、シリーズアラート、
  コメントログを`/api/v1/extensions/filter-matome`へ統一した。
- 【features・README】リリース番号を`243`へ更新し、latestバッジを`#243`へ変更した。

### Fixed

- 【cache-data-manager・tests】一括削除の確認を受け入れた直後に結果ダイアログが返る場合も、
  利用者操作E2Eが通知を取り逃さず内容確認と閉じる操作を完了するよう待機順序を修正した。

### Removed

- 【common・cache-data-manager・mlink-video-controller・video-player】削除、検索、再生可否、
  動画・音声保存をNicoCache_nl本体APIへ直接接続し、重複していた`FilterMatomeCacheControl`、
  `CustomCacheReturner`、`downloadThruFFmpeg`のソース、クラス、配布・リンク設定を削除した。
  HLS限定削除と取得中の変種単位予約は本体の`hls-cache-entries`へ移し、非HLS保持を維持する。

## [#242] - 2026-08-16

### Changed

- 【common・video-player・movie-info】NicoCache_nlの現行CMAF/Domand HLSキャッシュだけを正確に扱えるよう、ローカルキャッシュ取得を`/cache/info/v3`へ移行した。`%LOCALAPPDATA%\NicoCache_nl\src`の実装に合わせてnullable値と取得中メタデータを検証し、完成状態はキャッシュ実体を正として判定し、推奨品質を優先して再生する。
- 【api-info・tests】v2固有フィールドへの依存を防ぐため、cache info仕様書、movie-info表示、ブラウザーfixtureをv3の`videoMode`・`audioBitrate`・`legacyLow`形式へ更新し、v2形式の拒否、キャッシュ0件、取得中、完成済み、HTTPエラーを単体テストで固定した。
- 【features・README】リリース番号を`242`へ更新し、latestバッジを`#242`へ変更した。

## [#241] - 2026-08-15

### Fixed

- 【mlink-video-controller/原宿風Watch】公式CommonHeaderへ追加されたNicoCacheメニューが原宿テーマの汎用ボタン配色を継承して浮かないよう、トリガーの背景をヘッダーへ馴染む透明色に戻し、ホバーで開くメニューを白背景・黒文字へ統一した。
- 【mlink-video-controller/ヘッダープライバシー】`101_disable_official_function.txt`で`sessionUser.type`を`premium`へ変更した場合も、画像ではなく黄色い円形背景として描画されるアバターと新しいクラス名のユーザー名を、CommonHeaderの安定したアカウントリンク構造から判定して非表示にするよう修正した。

### Changed

- 【features・README】リリース番号を`241`へ更新し、latestバッジを`#241`へ変更した。

## [#240] - 2026-08-09

### Added

- 【movie-fetcher・extensions】smartFetcher専用SPAの取得履歴を、確認後に1件ずつまたは一括で削除できるようにした。履歴削除APIは履歴レコードだけを永続化対象から除き、予約と取得済み動画キャッシュを保持する。

### Fixed

- 【extensions】全10種のJava extensionがNicoCacheGUIの検索・履歴機能を備えた専用ログタブを登録し、成功・警告・失敗を各タブへ出力するよう、旧式の独自タブと通常ログ直書きをNicoCache_nl標準のextension loggerへ統一した。
- 【release】`#`を含むタグ名がGitHub Actionsのartifact転送時に`.`へ変換され、公開アーカイブ名とリリースノートが一致しない問題を防ぐため、配布ファイル名を数値版の`filter-matome-<version>.7z`へ統一した。
- 【extensions】smartFetcherのWatch APIとaccess-rights交渉をNicoCache_nl自身のプロキシーへ通し、動画IDとタイトルを本体のタイトルキャッシュへ登録した。全CMAFリソースを転送しただけでは成功にせず、本体の完成キャッシュが実在することを完了条件にした。対象キャッシュ0件から`sm46636056`と`sm43303546`を実取得し、既存完成キャッシュと同じファイル名形式、`complete=true`、ディスク上の断片群が作られることを確認した。
- 【movie-fetcher】専用SPAを複数回初期化しないようにし、古い状態応答を破棄するとともに、リリース番号付きURLでブラウザーバンドルを読み込むようにした。「更新」「編集」「今すぐ実行」の直後から5秒後まで予約と履歴が残ることを実API接続のChromeとFirefoxで確認した。
- 【movie-fetcher・extensions】media playlistが返した`asset.domand.nicovideo.jp`の24桁識別子・音声／映像・数値階層・品質・CMAF断片という実測形状と、NicoCache_nlの自己プロキシーが返すキャッシュ用playlistだけを用途別に許可し、`playlist contains a disallowed URL`で失敗する問題を修正した。

### Changed

- 【features・README】リリース番号を`240`へ更新し、latestバッジを`#240`へ変更した。
- 【movie-fetcher】smartFetcher専用SPAの予約登録を「動画」「日時」「確認」の3段階ウィザードへ変更した。通信・容量判定は、選択中の帯域モードで使う入力だけを表示し、「利用割合」の基準と、旧「容量安全率」がディスク容量ではなく推定サイズへ掛ける時間判定用の余裕であることを画面と文書へ明記した。
- 【extensions】`nlMovieFetcher`と`FilterMatomeSmartFetcher`が登録時に毎回出していた単なる拡張読込完了ログを削除し、全Java拡張に同種の起動ログがないことを自動検証する。
- 【README・docs】NicoCache_nlの本体ルートとデータルート、現行Java拡張10種、動画取得スケジューラー、完成キャッシュを成功条件とする動作を反映した。

## [#239] - 2026-08-09（撤回済み）

> 一部のJava extensionでNicoCacheGUIの専用ログタブまたは検索UIが表示されず、動作ログも通常ログへ混在する問題が残っていたため公開を撤回した。修正と全10 extensionの実GUI検証を含む後継は`#240`。

### Added

- 【movie-fetcher・extensions】smartFetcher専用SPAの取得履歴を、確認後に1件ずつまたは一括で削除できるようにした。履歴削除APIは履歴レコードだけを永続化対象から除き、予約と取得済み動画キャッシュを保持する。

### Fixed

- 【release】`#`を含むタグ名がGitHub Actionsのartifact転送時に`.`へ変換され、公開アーカイブ名とリリースノートが一致しない問題を防ぐため、配布ファイル名を数値版の`filter-matome-<version>.7z`へ統一した。
- 【extensions】smartFetcherのWatch APIとaccess-rights交渉をNicoCache_nl自身のプロキシーへ通し、動画IDとタイトルを本体のタイトルキャッシュへ登録した。全CMAFリソースを転送しただけでは成功にせず、本体の完成キャッシュが実在することを完了条件にした。対象キャッシュ0件から`sm46636056`と`sm43303546`を実取得し、既存完成キャッシュと同じファイル名形式、`complete=true`、ディスク上の断片群が作られることを確認した。
- 【movie-fetcher】専用SPAを複数回初期化しないようにし、古い状態応答を破棄するとともに、リリース番号付きURLでブラウザーバンドルを読み込むようにした。「更新」「編集」「今すぐ実行」の直後から5秒後まで予約と履歴が残ることを実API接続のChromeとFirefoxで確認した。
- 【movie-fetcher・extensions】media playlistが返した`asset.domand.nicovideo.jp`の24桁識別子・音声／映像・数値階層・品質・CMAF断片という実測形状と、NicoCache_nlの自己プロキシーが返すキャッシュ用playlistだけを用途別に許可し、`playlist contains a disallowed URL`で失敗する問題を修正した。

### Changed

- 【features・README】リリース番号を`239`へ更新し、latestバッジを`#239`へ変更した。
- 【movie-fetcher】smartFetcher専用SPAの予約登録を「動画」「日時」「確認」の3段階ウィザードへ変更した。通信・容量判定は、選択中の帯域モードで使う入力だけを表示し、「利用割合」の基準と、旧「容量安全率」がディスク容量ではなく推定サイズへ掛ける時間判定用の余裕であることを画面と文書へ明記した。
- 【extensions】`nlMovieFetcher`と`FilterMatomeSmartFetcher`が登録時に毎回出していた単なる拡張読込完了ログを削除し、全Java拡張に同種の起動ログがないことを自動検証する。
- 【README・docs】NicoCache_nlの本体ルートとデータルート、現行Java拡張10種、動画取得スケジューラー、完成キャッシュを成功条件とする動作を反映した。

## [#238] - 2026-08-09（撤回済み）

> キャッシュが作られない問題とSPAの表示消失が残っていたため公開を撤回した。修正と再検証を含む後継は`#239`。

### Added

- 【movie-fetcher・extensions】smartFetcher専用SPAの取得履歴を、確認後に1件ずつまたは一括で削除できるようにした。履歴削除APIは履歴レコードだけを永続化対象から除き、予約と取得済み動画キャッシュを保持する。

### Fixed

- 【movie-fetcher・extensions】smartFetcher専用SPAで古い定期取得応答が追加・更新直後の予約と履歴を空表示へ戻す競合を防ぎ、状態APIをブラウザーキャッシュから常に除外した。実際の予約取得でmedia playlistが返した`asset.domand.nicovideo.jp`の24桁識別子・音声／映像・数値階層・品質・CMAF断片という固定形状と、NicoCache_nlの自己プロキシーが返すキャッシュ用playlistだけを用途別に許可し、`playlist contains a disallowed URL`で失敗する問題を修正した。

### Changed

- 【features・README】リリース番号を`238`へ更新し、latestバッジを`#238`へ変更した。
- 【movie-fetcher・extensions】smartFetcher専用SPAの予約登録を「動画」「日時」「確認」の3段階ウィザードへ変更し、曜日・祝日・優先度・再試行と通信・容量判定を折りたたみ式の詳細設定へ整理した。`nlMovieFetcher`と`FilterMatomeSmartFetcher`が登録時に毎回出していた単なる拡張読込完了ログを削除し、全Java拡張に同種の起動ログがないことを自動検証する。
- 【README・extensions】プロジェクト構成から現行のJava拡張と役割を正しく把握できるよう、ログ受信、キャッシュ検索、メディア出力、動画情報取得、取得予約を含む全10種の一覧へ更新した。
- 【docs/USAGE】本体と実行時データを誤った場所へ配置・削除しないよう、`NICO_APP_ROOT` と `NICO_DATA_ROOT` を区別した導入・クリーンインストール・シンボリックリンク・キャッシュ・背景画像の手順へ更新し、現行10拡張と動画取得ページを反映した。

## [#237] - 2026-08-08

### Fixed

- 【extensions/nlMovieFetcher】転送済みバイト数を状態APIへ追加し、帯域上限に応じて各レスポンスの読み込みを抑制できるようにした。不完全なリソース取得は完了扱いにせず、smartFetcher側で再試行・失敗記録する。
- 【mylist2・watch-history】`/local/`配信ではnlFilterによる正本のキャッシュ表示JS・CSSが自動挿入されず、CMAF/Domand品質バッジの共通表示スクリプトも不足していたためアイコンが表示されない問題を修正した。両SPAが共通表示、リンク装飾、スタイルの正本を依存順に読み込み、画質・音質バッジへ対応する。mylist2はService Workerの旧HTMLキャッシュも更新時に破棄する。
- 【common・movie-fetcher・extensions】動画情報取得と検索一覧からの取得交渉で常にゲスト用Watch APIを呼び、ログイン中にHTTP 400 `FORBIDDEN`で停止する問題を修正した。通常版を優先し、未ログインを示す`UNAUTHORIZED`の場合だけゲスト版へ切り替える。現行media playlistの`/cache/file/`配下にある音声・映像CMAF URLも固定ホスト・固定パス形状に限定して許可し、Java拡張が`playlist contains a disallowed URL`で停止しないようにした。
- 【extensions・movie-fetcher】現行access-rights APIで必須の`X-Request-With`を送信し、一覧からのDomand取得が`INVALID_PARAMETER`で失敗する問題を修正した。Java拡張が自己プロキシーのHTTPS証明書を検証するときはユーザーデータのローカルCAを使用し、配信取得へ公式サイトの`Origin`、`Referer`と配信対象Cookieだけを付けて、`PKIX path building failed`またはHTTP 403で停止しないようにした。APIエラーコードをボタンのツールチップとブラウザーコンソールへ表示して、Java GUIログへ到達しない交渉失敗も診断できるようにした。

### Added

- 【mlink-video-controller・movie-fetcher】ニコニコ動画から動画取得予約へ直接移動できるよう、filter-matome専用機能リンクへsmartFetcherを追加した。視聴ページから開いた場合は現在の動画IDを予約フォームへ引き継ぐ。
- 【movie-fetcher・extensions】6年前のsmartFetcher構想を現行Domand/CMAF向けに実装した。開始・停止日時と日／週／月／年の予約、日本の祝日、うるう年と時計補正に耐える次回実行、固定・割合・実測学習の帯域上限、全予約の推定容量判定、優先度、再試行、中止、失敗・完了履歴、再起動復旧を備える。
- 【movie-fetcher】動画カードに予約ボタンを追加し、動画情報・推定サイズ取得、プリセット、転送設定、予約一覧、実行中状態、履歴を一画面で扱えるレスポンシブな多言語SPAを追加した。

- 【mylist2・watch-history】ローカルキャッシュの有無と品質を一覧から判別できるよう、動画サムネイルをNicoCache_nl正本のキャッシュアイコン処理へ接続した。mylist2の一覧、watch-historyの履歴・詳細・シリーズ内動画で表示される。
- 【extensions/nlMovieFetcher】ブラウザー側の交渉失敗とJava側の取得失敗を利用者が共有・診断できるよう、NicoCacheGUIへ専用ログタブを追加した。動画ID、処理段階、件数、進捗、完了・中止・失敗理由を表示し、署名URLやCookieなどの秘密情報は記録しない。
- 【extensions・movie-fetcher】一覧カードから現行Watch APIとaccess-rights APIで最高利用可能画質・音質を選び、NicoCache_nl本体のDomand/CMAF処理を経由して映像・音声・初期化断片・鍵を最後までキャッシュするnlMovieFetcherを追加した。SPAカード追従、進捗、中止、多言語ラベル、署名URLのホスト制限に対応した。
- 【開発者向け】旧nlMovieFetcher配布物、2026-07-24版NicoCache_nl、2026-08-06のheadless Chrome実測を突き合わせ、Watch API、access-rights、映像・音声分離CMAF、安定DOM属性、秘密情報を保存しない再調査手順を文書化した。

### Changed

- 【CI・release・Docs】GitHub ActionsのNode 20非推奨警告を解消するため、公式ActionsをNode 24対応の現行メジャーへ更新した。
- 【features・README】リリース番号を`237`へ更新し、latestバッジを`#237`へ変更した。
- 【mlink-video-controller/原宿風Watch】公式の詳細アコーディオンを操作せず動画説明を確認できるよう、watchページの`server-response`から説明HTMLを事前取得して安全な専用DOMへ描画し、空・短文はコンパクトに、長文は最大高まで伸長した後だけ内部スクロールする表示へ変更した。

### Removed

- 【extensions/nlMovieFetcher】現行Domand/CMAFだけを必要十分に扱うため、利用側で管理していて参照されない開始・終了時刻の状態と、実測済み配信で使わない`asset.domand`・旧形式汎用パスの互換許可を削除した。

### Security

- 【extensions/FilterMatomeSmartFetcher】認証に必要なCookie名だけを許可し、AES-GCM暗号文と256ビット鍵を状態JSONとは別の所有者限定ファイルへ保存する。Cookie、署名URL、アクセス権キーは状態APIとログへ返さず、管理画面から保存Cookieだけを削除できる。
- push前監査で検出されたDOMPurifyのXSS脆弱性を解消するため、直接依存とロックファイルを修正版`3.4.13`へ更新した。
- push前監査で検出された`brace-expansion`のDoS脆弱性を解消するため、overrideとロックファイルを安全版`5.0.9`へ更新した。

## [#236] - 2026-08-02

### Fixed

- 【CI・Java Toolbox】macOSの`/private`退避パス、Windowsの8.3短縮パス、Windowsの`cmd.exe`ラッパーをテストで安定して扱い、Linux/macOS/WindowsのヘッドレスE2Eが環境依存で失敗しないようにした。
- 【CI・release】ビルド成果物でJava Toolboxの実行JARと`nlGpac`の`.java`／`.class`を実在確認してからアーカイブするようにし、削除済みの旧NicoCacheランチャー・停止スクリプトを配布対象から除外した。

### Changed

- 【ドキュメント・運用】最近削除した旧スクリプトとNicoCache本体管理導線の参照をリポジトリ全体で整理し、NicoCache_nl本体の標準ランチャーを使う説明へ統一した。

### Added

- 【scripts/Java Toolbox】開発補助プラグインへ、旧`create-all-symlinks.ps1`と`create-listjs-symlink.ps1`相当の一括リンク・`list.js`リンクを追加した。Windowsの`C:\filter-matome`／`%LOCALAPPDATA%\NicoCache_nl`、Linux/macOSの標準設定領域を初期値として解決し、通常ファイルを保護したままGUI・ヘッドレスで実行できるようにした。
- 【scripts/Java Toolbox】シンボリックリンクのOS別既定値、`list.js.map`の条件付き作成、既存リンクの再作成、安全な拒否を単体・機能・結合・隔離E2Eで検証し、Linux/macOSとヘッドレス環境でも実行できるテスト経路を追加した。
- 【scripts】Python、PowerShell、バッチへ分散していたメディア変換、properties編集、GitHub更新の導線を、GUIとヘッドレスで共通利用できるJava Toolboxへ統合した。プラグインJAR、READMEヘルプ辞書、実行時パス解決を採用し、OSやリポジトリの固定パスに依存しない構成にした。
- 【scripts/Java Toolbox】JUnit 5による単体・機能・結合・E2Eテストを追加し、CLI、GUIタブ、ヘッドレスプラグイン、外部プラグインSPI、ETag付き更新、空白入りパス、キャンセルを自動検証できるようにした。
- 【scripts/Java Toolbox】実機から切り離した一時ディレクトリで`Main`を子プロセス起動し、全組み込みアクションの成果物、バックアップ、`.part` cleanup、確認拒否、外部コマンド引数、localhost更新APIを検証する隔離E2Eフィクスチャを追加した。
- 【scripts/Java Toolbox】旧`nicocache-utility.py`の専用管理導線を削除し、NicoCache_nl本体側の管理機能を使用する構成へ整理した。
- 【scripts/Java Toolbox】READMEダイアログの初期サイズを拡大し、設定エディタの初期設定ファイルをOS標準のユーザー設定領域へ変更した。defaults辞書の値をダブルクリックで設定一覧へ入力できるGUI操作と回帰テストを追加した。
- 【release/CI】Java ToolboxをJDK 17で自動テスト・パッケージ化し、ビルド済み実行JARをリリースアーカイブとCIアーティファクトへ同梱するようにした。通常利用者はMavenやBunでのビルドなしに起動できる。

### Changed

- 【scripts】既存出力の無確認上書き、シェルによるパス分割、Python GUI依存、固定されたWindowsパスをJava共通基盤から排除し、ドライラン、バックアップ、原子的保存、明示的な副作用確認を標準化した。`nicocache-utility.py`と専用READMEは削除済みで、NicoCache_nl本体と重複する管理機能はJavaToolboxへ持たせない構成にした。
- 【scripts/Java Toolbox】JSONの整数を条件演算子の数値昇格で`Double`へ変換していたためリリースIDが`42.0`になる不具合を修正し、整数を`Long`として保持するようにした。nullの安全なファイル名も`untitled`へ正規化し、更新APIのエンドポイントを設定で差し替えられるようにした。
- 【scripts/Java Toolbox】メディアの動画情報APIを設定可能なエンドポイントへ分離し、診断時の外部ツール差し替えと`--dry-run`を追加して、隔離検証と安全な自動運用を可能にした。

### Fixed

- 【extensions/nlGpac】セグメントごとのMediaInfo解析でCMAF/Domandの実体仕様を確認できなかった問題を解消するため、旧`nlMediaInfo`拡張を削除してGPACの全期間PID解析へ置き換え、`/cache/gpac?<動画ID>`とmovie-infoへ解像度、ビットレート、フレーム、音声仕様をまとめて接続した。
- 【extensions・scripts/create-all-symlinks・release】`nlGpac`を単一の`.class`で完結する構成へ修正し、補助クラスの配置漏れによる解析リクエスト時の`NoClassDefFoundError`と接続切断を防止した。
- 【movie-info・cache-data-manager・mylist2・video-player】動画情報取得を共通クライアントへ集約し、現行Watch APIのJSONと旧ext-thumb XMLを動画種別に依存せず正規化するよう修正した。公式チャンネル、R18フラグ、削除・非公開、欠落項目を含むレスポンスを個別に扱い、既存の公開状態チェックとタイトル・タグ・カウンター表示を維持する。

### Security

- push前監査で検出された既知の依存脆弱性を解消するため、安全版へ依存関係とロックファイルを更新した。

### Changed

- 【movie-info】GPACビューを強化し、コンテナ・解析条件、再生時間、解像度、ビットレート、フレーム、色、音声、その他のPID属性をストリーム別に確認できる詳細表示を追加した。
- 作業開始時の共通指針見落としを防ぐため、調査やコマンド実行より前に `COMMON-AGENTS.md` を先頭から末尾まで読み、EOFを確認する必須ゲートを追加した。

### Added

- 【開発者向け】ログイン済みChromeへraw CDPで接続して公式watchページが読み込んだJavaScriptだけを隔離保存し、外部通信を遮断した一時BrowserContextの検証と、公式コードを実行しない機能シグナル静的解析を行える研究用サンドボックスを追加した。
- 【開発者向け】未ログイン・一般会員の匿名化済み視聴コンテキスト比較、公式ES Moduleの依存関係取得、外部通信遮断下でのプレミアム分岐実行により、会員種別とチャンネル会員・PPVなど動画権利の機能差を再調査できるサンドボックスと研究メモを追加した。
- 【開発者向け】公式シークバーへのraw CDPホバー観測と外部通信遮断下のStoryboardモデル実行により、サムネイルスプライトの取得経路、時間・セル変換、会員別表示条件を再調査できるツールと研究メモを追加した。
- 【開発者向け】raw CDPによる画質・音質候補、access-rights、分離HLS配信の匿名化観測と、外部通信遮断下での公式品質選択ロジック実行により、会員別利用可否、自動・手動切り替え、選択・読込・再生状態を再調査できるツールと研究メモを追加した。
- 【nlFilters・runtime/開発者向け】watch HTMLの`server-context`メタタグを単一のReplaceブロックで捕捉し、通知、言語、トラッキング、時刻、公式通信先、ログインユーザー、サイト集計、トップレベル真偽値を項目ごとの設定JSONから編集できるプレースホルダーを追加した。書き換え、型・パス検証、元会員種別を尊重するnvComment投稿保護は同期実行するTypeScript製の専用バンドルへ分離し、動画種別による未知フラグを保持して存在しない項目を無視する。

## [#235] - 2026-07-20

### Added

- 【watch-history】視聴履歴とシリーズアラートをGoogle DriveへZIPで保存し、Drive上のwatch-history用バックアップを選択して現在の履歴へマージできるエクスポート・インポート機能を追加した。
- 【mylist2】複数のマイリストから目的の動画を探せるよう、動画検索欄の右側に「選択マイリストのみ」と「全マイリスト横断検索」の範囲切替を追加した。
- 【video-player】ローカルキャッシュ再生中にもニコニコ動画へコメントを投稿できるよう、動画直下・動画全幅の投稿フォームを追加した。パレット、選択済みコマンド、本文、投稿ボタンを一行に並べ、公式と同じサイズ・位置・通常色・プレミアム色のボタン選択からコマンドを自動生成する。全画面では投稿フォームを画面最下部、その直上にプレイヤーコントローラを配置して表示を連動し、パレット本体をコントローラより手前に表示する。投稿成功時は一覧と流れるコメントを即時更新して、このページで投稿したコメントを再読み込みまで黄色い矩形枠で示す。公式視聴ページと同じ投稿キー取得・nvComment送信・184補完を行い、未ログイン、投稿禁止、レート制限、CAPTCHA要求は理由と次の操作を表示する。
- 【開発者向け】公式公開バンドルを製品コードやGit管理から分離してコメント投稿APIを再調査できるよう、`local/features/src/sandbox` に取得スクリプト、隔離規則、確認済みAPI契約を追加した。
- 【開発者向け】comment-filter2の最重ホットパスを移植判断に使えるよう、TypeScript、常駐Java HTTP endpoint、Rust/WASMで正規表現最終判定を同一入力比較し、必須トークン索引によるアルゴリズム改善とも区別して測定する試作ベンチマークを追加した。

### Changed

- 【features】`package.json`の`version`を`235`へ更新した。
- 【README】latestバッジを`#235`へ更新した。
- 【開発環境】Visual Studioが生成する`.vs/`をGit管理対象外へ追加した。
- 【common/mylist2/watch-history】Google Identity Services認証、`drive.file` API、ZIP圧縮・展開を`common/google-drive-backup-service.ts`へ共通化し、機能ごとの保存フォルダーとファイル接頭辞を設定して利用する構成へ変更した。
- 【開発者向け】巨大化していたcomment-filter2、mlink-video-controller、mylist2、video-player、watch-historyのUI・IndexedDB・メタデータ・再生処理・CSS・HTMLを責務別モジュールへ分割し、各ソースファイルを1,000行以下に整理した。背景設定、原宿UI、視聴トラッカーの動的回帰テストと、上限超過を検出する構造テストも追加した。
- 【CI/開発者向け】依存解決の再現性とローカル検証との差をなくすため、CI・リリースのBun導入を`--frozen-lockfile`へ変更し、TypeScript全体のPrettier差分検査とPlaywright Chromium E2Eを独立ジョブとして必須化した。ローカルには`format:check`、`test:e2e`、全検証をまとめる`verify`を追加した。
- 【watch-history】大量の履歴を一度にDOMへ展開しないよう、一覧を25・50・100件単位のページ表示へ変更した。IndexedDBにはインデックスカーソルで指定範囲だけを保持するページ取得APIを追加し、一覧取得済みデータを統計計算へ再利用して重複する全件読み込みも削減した。
- 【runtime】SPA遷移のたびに複数機能がHistory APIを重ねて上書きし、URL確認用の全DOM監視を常駐させる負荷をなくすため、`pushState`、`replaceState`、`popstate`、`hashchange`を単一の`filter-matome:navigation`イベントへ集約した。mlink、comment-filter2、video-player、watch-historyは共通イベントを購読し、追跡対象外へ移動したwatch-historyトラッカーを破棄する。
- 【features】全ページで全機能とHLS再生ライブラリを解析する負荷を減らすため、`features.js`をページ判定用の軽量ブートストラップへ変更し、各機能を独立したminify済みES Modulesとして必要時だけ読み込む構成に変更した。NicoCache_nl固定の`list.js`経路は、同期登録した遅延プロキシーからcache-data-managerを読み込むことで互換性を維持する。
- 【comment-filter2】コメントコマンド適用時に、設定したコマンドと同じカテゴリーだけを置換して他の既存コマンドを保持する方式をデフォルトに変更し、従来どおり全コマンドを除去してから上書きする方式をトグルで選択可能にした。既存設定はデフォルトのオフへ自動移行し、両フィルターエンジンとモックcanvasへ渡るコメント列を自動テストで確認する。
- 【comment-filter2】複雑な正規表現を全コメントへ総当たりする負荷を減らすため、ECMAScript正規表現ASTから全分岐に必ず現れる安全なリテラルを抽出し、ルール間でレアな候補から最終判定対象を逆引きする索引を追加した。抽出不能な構文とUnicode case-foldingは通常評価へ戻し、動的なルール切替・追加・削除と置換後本文のモックcanvas反映を自動テストで保証する。
- 【comment-filter2】大量ルール適用時の待ち時間と割り当てを減らすため、ニコる免除ルールと通常アクションルールを事前分離し、通常ルールの重複正規表現判定、確定済みリテラルの再判定、ログ無効時のイベント生成、コメントごとのコマンド設定再構築を省略した。sticky正規表現の状態もコメント間で持ち越さないようにし、2,000コメント・1,000ルールの固定条件で比較できる開発者向けベンチマークを追加した。

### Fixed

- 【watch-history】タイトルとタグなど別々の項目に一致する複数語で0件にならないよう、空白区切りの検索語をメタデータ横断のAND条件として照合するよう修正した。
- 【mylist2】動画をメタデータから見つけられるよう、検索対象へ動画ID、タグ、説明文、公開状態と理由を追加し、空白区切りの複数語にも対応した。
- 【watch-history/mlink】SPA遷移後も古い動画要素のイベントリスナー、デバウンス、動画探索・タグ探索タイマーが残る経路を修正した。視聴トラッカーの破棄時に全登録を解除し、遅れて完了した初期化を世代番号で無効化する。タグカウンターは独自のURL用全DOM監視を廃止し、共通SPAライフサイクルで再初期化する。

## [#234.1] - 2026-07-17

### Fixed

- 【video-player】ESCキーでネイティブ全画面を解除した際にフォールバック用の全画面クラスが残り、プレイヤーがビューポート全体へ拡大されたままになる問題を、ブラウザーの全画面状態変更イベントに合わせて独自クラスを同期するよう修正した。

### Changed

- 【features】`package.json` の `version` を `234.1` に更新した。
- 【README】latest バッジを `#234.1` に更新した。

## [#234] - 2026-07-17

### Changed

- 【video-player】固定コメントの可変高配置・幅フィットと、横流れコメントの4秒横断式・動画終端3秒前への表示時刻上限を反映し、ニコニコ動画公式プレイヤーに近いコメント描画にするため `comment-overlay` を v4.1.4 へ更新した。
- 【features】`package.json` の `version` を `234` に更新した。
- 【README】latest バッジを `#234` に更新した。

## [#233] - 2026-07-14

### Added

- 【カバー画像】主要機能のREADMEプレビューを現行UIに合わせて更新し、リリース時に表示される機能紹介画像を刷新した。
- 【運用スクリプト】NicoCache_nl以外のJavaプロセスを誤って終了しないよう、`-jar ...\NicoCache_nl.jar`の指紋があるPIDだけを特定し、正常終了を待ってから確認付きで強制終了できる`stop-nicocache.ps1`を追加した。CUI版や自動処理ではGUI終了経路と対話確認を個別に省略できる。
- 【watch-history/extensions】視聴履歴ページやブラウザを閉じていてもシリーズ新着を確認できるよう、アラート設定を同期してNicoCache_nlの60秒定期イベントから公開ウォッチページを確認し、OS通知またはGUIログ・通知音を出す`FilterMatomeSeriesAlerts`拡張を追加した。通知クリックから新着動画を開け、設定は`data/`へ原子的に永続化する。
- 【extensions】`FilterMatomeSeriesAlerts`が内部クラスを生成しない構成にし、配置が必要な生成物を単一の`.class`ファイルにまとめた。

### Changed

- 【開発者向け】実際の構成と更新内容に追従できるよう、watch-history、nlFilter、スクリプト、各機能のREADMEと関連ドキュメントを整理し、重複・陳腐化した補助説明を削除または更新した。
- 【CI/ドキュメント】リリースとドキュメント公開のワークフローを現行の検証・公開構成に合わせて更新し、開発者向けのNicoCache_nl連携規則と変更履歴の運用を明文化した。
- 【開発者向け】NicoCache_nlの終了・再起動で安全な経路を一貫して選べるよう、`AGENTS.md`を`stop-nicocache.ps1`中心の対象確認、正常終了、CUI-only、確認付き強制終了、起動後確認の順に再編した。
- 【watch-history】ページ内タイマーとNotifications APIによるシリーズ確認を常駐extensionへ移し、シリーズアラート画面をextension管理データの完全なフロントエンドへ変更した。追加・有効化・削除・手動確認・インポート／エクスポートはextension APIへ直接行い、旧IndexedDBアラートだけを初回起動時に移行する。
- 【watch-history】4,000行を超えていたSPA実装を、入口、共通状態、履歴一覧、ダッシュボード、シリーズ、削除、DB管理の責務別モジュールへ分割し、各ファイルを1,000行以下に整理した。

- 【nlFilters】共通ヘッダー更新後もプレミアム会員勧誘を非表示にできるよう、生成ハッシュ付きクラスへの依存をやめ、登録リンクの安定したURL属性から対象コンテナを特定するよう変更した。
- 【開発者向け】機能ごとの責務、起動条件、永続化、外部API、テスト対象を実装から判断できるよう、`local/features` と各プロジェクトのREADMEを現在の構成へ全面整理し、資料専用の `api-info` と起動境界の `runtime` にREADMEを追加した。固定ファイルサイズ、廃止済みパス、存在しない開発コマンドなど陳腐化した説明を削除した。
- 【開発者向け】エージェントが実在するパスと正式な検証手順を迷わず選べるよう、`AGENTS.md` のEnvironment項を現在のソース、テスト、文書、画像、フィルター、Java拡張の構成に合わせて再編し、Bunの一括ビルドと生成物の扱いを明記した。
- 【開発者向け】NicoCache_nl連携を安全に扱えるよう、ブラウザー側ヘルパーとHTTP APIの区別、シンボリックリンクの向き、オーバーレイビルドの影響範囲、対象PIDを限定した再起動手順、実行フォルダーの確認済み用途をエージェント向け規則へ明記した。

### Fixed

- 【運用スクリプト/CI】PowerShell 5.1で日本語を正しく扱い、非対話環境でも出力を捕捉できるようPowerShellスクリプトのエンコーディング、情報出力、未使用値、空の例外処理、`ShouldProcess`対応を整理し、GitHub Release actionをNode 24対応の`v3`へ更新した。
- 【watch-history】シリーズアラート削除前に開始した自動再取得の古い応答が削除後のUIへ適用され、数秒後にアラートが一時的に復活する競合を修正した。
- 【watch-history】シリーズタブを先に開かないと、シリーズアラート追加画面のシリーズ選択肢を取得できない初期化依存を修正した。

## [#232] - 2026-07-13

### Added

- 【features】`package.json` の `version` を `232` に更新した。
- 【README】latest バッジを `#232` に更新した。
- 【scripts】各実行スクリプトから対応する説明へ辿れるよう、READMEがなかった7本（10秒・60秒切り出し、拡張ビルド、Claudeリンク、list.jsリンク、Python依存導入、MkDocsフック）に個別READMEを追加した。
- 【extensions】cache-data-managerとmlink-video-controllerから安定したHLS削除処理を利用できるよう、完了済み・停止済みHLSの一括削除、ダウンロード中HLSの削除予約、状態確認をJSON APIで提供する `FilterMatomeCacheControl` を追加した。ユーザーが用意した可能性のあるMP4・FLV・SWFは削除対象から除外する。
- 【video-player】ニコニコ動画のウォッチページから動画情報を取得できない場合でもキャッシュ動画のタイトルや説明を確認できるよう、nicochart.jp の公開情報を最終フォールバックとして取得する読み取り専用NicoCache_nl拡張を追加した。接続先と動画IDを制限し、nicochart 側にも情報がない場合は従来どおりローカルキャッシュのみで再生を試みる。
- 【video-player】コメント表示を背景へ切り替えて視認性を調整できるよう、スタンドアロンプレーヤーへ背景モードの切替トグルを追加した。
- 【common】各ローカル機能へ直接移動しやすくするため、共通ヘッダーの「その他」メニューで video-player の直後に movie-info へのリンクを追加した。
- 【video-player】キャッシュ済み動画をタイトルから探して直接再生できるよう、NicoCache_nl の検索APIを利用したキーワード検索、画質違いをまとめた結果一覧、検索中・0件・失敗時の案内を動画指定ナビゲーションへ追加した。
- 【video-player】パンくずリスト直下から動画URLまたは `videoId` を指定して再生できるよう、動画ID抽出付きの入力欄と共通Material Design Iconsの再生ボタンを追加した。

### Changed

- 【release】`#232` の配布アーカイブで新しいNicoCache_nl拡張を利用できるよう、`FilterMatomeCacheControl` と `NicochartInfoProxy` のJavaソースおよびコンパイル済みクラスをリリース対象へ追加した。
- 【common】検索クリア操作を簡潔に識別できるよう、共通ヘッダーのクリアボタンを `clear_all` アイコンから `close` アイコンへ変更した。
- 【common】検索欄の大きさがヘッダー幅に左右されないよう入力幅を240pxに固定し、検索対象のプルダウンと入力欄の高さを36pxへ統一した。
- 【common】目的のリンクを短時間で見つけられるよう、共通ヘッダーのナビゲーションを「メイン」「その他」「filter-matome」の3サブメニューへ再編した。
- 【scripts】一括シンボリックリンク作成時に、新しく追加された `FilterMatomeCacheControl.class` と `NicochartInfoProxy.class` もNicoCache_nlの `extensions` へリンクするよう更新した。
- 【cache-data-manager/mlink-video-controller】不安定だったNicoCache_nl本体の `ajax_rm` / `ajax_rmtmp` 呼び出しを廃止し、HLS限定・ダウンロード中の削除予約・構造化された結果判定に対応する `FilterMatomeCacheControl` APIへ移行した。
- 【docs】NicoCache_nl拡張の導入・更新時に役割や依存関係を判断できるよう、`docs/USAGE.md`へ`extensions/`全般の説明、同梱クラス一覧、再起動手順、外部コマンド要件、注意事項、トラブルシュートを追加した。
- 【common/video-player/movie-info】動画ID・URL入力と完成済みキャッシュのタイトル検索を両画面で一貫して利用できるよう、検索API、結果一覧、動画指定フォーム、レスポンシブスタイルを common へ集約し、movie-info でも検索結果からデータ取得できるようにした。
- 【video-player/mlink-video-controller】背景切替トグルの形状を角張った印象を保つ6pxの角丸へ変更し、原宿風 Watch の汎用ボタン規則がスタンドアロンUIを上書きしないよう適用範囲を公式プレイヤーの `#root` 配下へ限定した。
- comment-filter2 のルール入力画面で一致プレビューをアコーディオン化し、必要なときだけテスト入力欄と結果を展開できるようにした。
- 共通ヘッダーの「その他」メニューから video-player へ移動できるよう、キャッシュ管理リンクの直後に導線を追加した。

### Fixed

- 【video-player】背景モードへ切り替えてラジアルメニューから画像を選んでもページ背景に現れない問題を、mlink の背景変数を使う固定レイヤーとコンテンツの積層順を明示して修正した。

## [#231] - 2026-07-13

### Added

- 【features】`package.json` の `version` を `231` に更新。
- 【README】latest バッジを `#231` に更新。

### Changed

- mylist2 の検索操作と動画情報を読み取りやすくするため、検索クリアボタンを入力内へ収めて白抜きアイコンを中央配置し、動画カード全体のクリック／キーボード操作で詳細を開くよう変更した。再生数、コメント数、マイリスト数、再生時間、投稿者、投稿日には白抜きMaterialアイコンを追加した。
- watch-history の情報密度と一貫性を高めるため、アイコンを白抜きへ統一し、タグクラウドを補助面色のピル型バッジへ変更し、シリーズ一覧をデスクトップ2列・狭幅1列へ変更した。
- comment-filter2 の低い画面でも全操作へ到達できるよう、タブ領域をモーダルヘッダー下の残り高さへ固定し、はみ出す内容を内部スクロール化してアイコンを白抜きへ統一した。
- video-player で同じ動画を継続視聴できるよう、連続再生の隣へ永続化される繰り返し再生チェックを追加し、両方が有効な場合は繰り返し再生を優先する終了時制御を追加した。

- mylist2、watch-history、comment-filter2、video-player のスタイルシートを共通テーマへの継ぎ足しではなくゼロから再構築し、ページ背景を `#11151b`、サーフェスを `#1a2029`、補助面・バッジを `#242c37` へ統一した。共通値は `common/visual-theme.ts` を唯一の定義元とし、mylist2 のテーマ切替は面色を固定したままアクセントだけを変更する。

- mylist2 が共通ヘッダーと重ならず画面全体を使えるように、旧固定モーダル配置と白いページ背景を廃止し、ヘッダー直下を埋めるダークテーマのフレックスレイアウトへ変更した。ページ全体を正確に1ビューポートへ固定し、設定・ヘルプと左右の一覧下端が画面外へ伸びないよう、左右それぞれの一覧だけを内部スクロールさせる構成にした。
- comment-filter2 のルールスタジオと watch-history のシリーズタブで情報階層を読み取りやすくするため、入れ子のカード枠を減らし、余白と区切り線を中心としたフラットな構成へ変更した。

- cache-data-manager のクリーンでミニマルなデザインを全機能で共有できるように、共通ビジュアルトークンを追加し、共通ヘッダー、comment-filter2、mlink-video-controller、movie-info、mylist2、video-player、watch-history の背景・サーフェス・境界・主操作・角丸・影・フォーカス表現を統一した。

- 【mlink-video-controller】原宿風Watchの詳細情報を簡潔にするため、右上表示と重複する投稿日時～ギフトの統計を非表示にし、別DOM階層にある現在のランキング順位と、ジャンル・登録シリーズを3列グリッドの同じ行へ配置した。各項目内も折返しなしFlexでアイコン・項目名・値を一行に揃えた。
- 【mlink-video-controller】原宿風Watchの投稿者情報を右上へ集約したため、「動画の詳細情報」内で重複していた投稿者ブロックと、その直前の区切り線を非表示にした。
- 【tests】ローカル実行時にもブラウザウィンドウが開かないよう、Playwrightテストを常にヘッドレスChromiumで実行する設定へ変更した。
- 【comment-filter2】フィルター適用の導線を概要へ集約するため、設定タブの重複していた「再読み込みして適用」ボタンを削除した。
- 【cache-data-manager】目的のキャッシュを素早く見つけ、安全に操作できるよう、検索・絞り込み・並び替えを一つの操作領域へ集約し、一括削除とカードの副操作をメニューへ整理した。
- 【cache-data-manager】仮想スクロールの正確な行位置を維持しながら表示密度と可読性を改善するため、カードの300px固定高を維持し、レンダラーの初期行高をカード高と16pxの行間に一致させた。
- 【cache-data-manager】狭幅画面やキーボード操作でも利用しやすくするため、レスポンシブ配置、フォームラベル、フォーカス表示、モーション抑制設定を刷新した。
- 【cache-data-manager】長時間のキャッシュ管理でも眩しさを抑えられるよう、画面全体をダークテーマへ変更し、NicoCache_nlの名称が重複していたバージョン表示を修正した。
- 【cache-data-manager】視聴履歴へ直接移動できるよう、ヘッダーのリンク一覧にwatch-historyを追加した。

### Added

- 【mlink-video-controller】原宿風Watchで投稿者を確認して操作しやすくするため、watchページの `apiData` から投稿者アイコン・投稿者名・投稿動画リンクを再構築し、公式のフォロー・サポーター登録・その他メニュー操作とともに右上へ表示する投稿者欄を追加した。
- 【cache-data-manager】特殊な配信環境に依存せず動的UIの回帰を検出できるよう、本番スクリプトをローカル文書へ注入し、検索・フィルター・ソート・モーダル・カード操作・一括操作を検証するPlaywrightテストを追加した。

### Fixed

- 【mylist2】マイリスト検索のクリアボタンがサイドバーの左右余白分だけ入力欄の外へずれないよう、入力欄内の右端へ配置を補正した。
- 【mlink-video-controller】原宿風Watchで動画詳細を閉じると右上の「その他」ボタンが無効になる問題を、公式と同じユーザー動画非表示メニューを常設し、公式確認ダイアログへ橋渡しする方式で修正した。
- 【mlink-video-controller】原宿風Watchで動画詳細を閉じると投稿者DOMが削除されて右上の投稿者欄が消える問題を、共通ヘルパーがwatchページのmetaタグから取得する `apiData` を基に投稿者情報を再構築して修正した。
- 【comment-filter2】概要の「今すぐ適用」で変更が表示へ反映されるよう、video_player では再フィルタリング後に即時同期し、公式プレイヤーでは確認後に再読み込みする分岐と回帰テストを追加した。
- 【common/watch-history】完走済み動画の「もう一度」で `outlined/replay` が未登録扱いになる問題を修正し、内蔵SVGを共通アイコンマップから表示できるようにした。
- 【cache-data-manager】カードの「その他」メニューを開く操作で動画詳細まで同時に表示されないよう、メニュー内クリックを詳細表示イベントから除外した。
- 【watch-history】履歴の検索・状態把握・再生再開を短い導線で行えるよう、検索と適用中条件を一覧上部へ移し、各動画行に「続きから／もう一度」を追加。低頻度ソートと詳細フィルタは折りたたみ、削除・入出力・DB管理は管理導線へ集約した。
- 【watch-history】カードが連続する重い画面構成を、境界線中心の履歴ワークスペースへ刷新し、狭幅では操作と動画情報が自然に積み重なるレスポンシブ配置へ変更した。

## [#230] - 2026-07-11

### Added

- 【movie-info】動画入力、取得状態、全ソース切替、JSON操作、コメント任意取得、部分失敗モーダルを実DOM上で検証するPlaywright回帰テストを追加。
- 【comment-filter2】概要ダッシュボード、画面切替、コマンド設定、正規表現プレビュー、ルール追加・削除の動的要素を実DOMとIndexedDB上で操作するPlaywright回帰テストを追加。
- 【comment-filter2】正規表現ルールの誤爆を保存前に確認できるよう、任意のテスト文字列に対する一致箇所・一致件数・入力エラーをリアルタイム表示するプレビューを追加。
- 【mylist2】マイリスト作成・検索・ソート、動画検索・ソート・詳細、設定・テーマ、個別／全選択、一括操作5種の動的要素を実DOMとIndexedDB上で操作するPlaywright回帰テストを追加。
- 【watch-history】各ソート・フィルタ・タブ・モーダル・シリーズ・アラート・削除条件・インポート／エクスポート・DB管理・通知UIを実HTMLとIndexedDB上で操作するPlaywright回帰テストと、判定ロジックの境界値ユニットテストを追加。

### Changed

- 【common/watch-history/mylist2/cache-data-manager】内蔵フォールバックサムネイルとURL・読込エラー処理をcommonへ集約し、各動画一覧と詳細表示で同じ代替画像を使用するよう統一。
- 【movie-info】APIカードを常時並べる構成から、取得状況を俯瞰する概要、ソース切替タブ、選択中データの操作レールを備えた動画インスペクターへ刷新し、狭幅画面でも調査しやすい配置へ変更。
- 【movie-info】JSON・エラーモーダルを開いた際のフォーカス移動と、閉じた後の呼び出し元へのフォーカス復帰を追加。
- 【comment-filter2】状態、有効ルール数、対象動画、フィルター切替、即時適用、主要設定への移動を上段へ集約したクイック・コックピット中心のUIへ刷新。
- 【comment-filter2】旧モーダルのカード表現が新しいアプリシェル内で混在しないよう、ルール・コマンド・データ・設定画面の見出し、余白、入力配置、操作面、ボタン密度をワークスペース向けのフラットなデザインへ統一。
- 【comment-filter2】ルール作成の入力順序を明確にするため、フォームを条件・アクション・対象範囲・追加操作のセクション構成へ整理し、JSON Lines編集をファイル情報付きコードエディター風の操作面へ刷新。
- 【comment-filter2】ルール管理を設定フォームからRule Studioへ刷新し、IF・THEN・WHEREの視覚的なビルダー、JSON Editor、カード型Libraryを独立モードとして切り替える構成へ変更。
- 【mylist2】既存の2カラム構造と92px固定高の仮想リストを保ったまま視認性を高めるため、濃紺基調へ刷新。選択時に移動・コピー・削除・情報更新・公開状態チェックが展開する一括操作バー、動画行と一覧上部の常設チェックボックス、ホバー表示の詳細ボタン、サイドバー下部の設定・ヘルプ導線を追加し、動画検索欄を並び替えメニューと同じ高さの固定幅へ調整。テーマカラーが選択行・展開バー・ホバー・境界線・詳細操作まで一貫して反映されるよう配色変数を拡張。
- 【watch-history】画面制御と判定ロジックを独立して保守できるよう、履歴フィルタとお気に入り算出、条件削除ルール、シリーズフィルタを `app.ts` から専用モジュールへ分離。
- 【features/docs】Bunビルド後のHTMLページへ正しくアクセスできるよう、mylist2のビルド出力と実装内リンクを `dist/pages/mylist2/` に統一し、ユーザー向けガイドと各プロジェクトREADMEの配信URLを現行配置に更新。
- 【mylist2】Google Drive 連携サービスを他のサービスと同じ階層で管理できるよう、`services/cloud/` から `services/` 直下へ移動。
- 【mlink-video-controller】mylist2追加処理をSPA遷移後の現在URL基準へ統一し、視聴ページでは動画、検索・タグ・マイリスト検索ページではキーワードを追加できるよう変更。
- 【README】TypeScript 6.0.2、ESLint 10.6.0、typescript-eslint 8.63.0、Bun 1.3.14の開発環境情報と前提条件を更新。
- 【CI/Release】ローカル開発環境と同じBun 1.3.14をGitHub ActionsのCI・リリースワークフローでも使用するよう固定。
- 【features】TypeScript 6.0.2をCLIに導入し、TypeScript 6 APIを必要とするESLint解析系と共存できる依存構成へ更新。ESLint 10.6.0、typescript-eslint 8.63.0、Bun 1.3.14へ移行。
- 【mlink-video-controller】背景画像設定のエクスポート・インポート・デフォルト復元ボタンを、役割が分かりやすく設定画面になじむ配色へ変更。
- 【mlink-video-controller】未対応ページでサムネイルフィルターを有効化した際、空のCSSセレクターを検索して切り替えに失敗しないよう修正。
- 【mlink-video-controller】ニコニ広告のお知らせページでデイリー福引ハイライトを動作させ、モジュールの設定欄から対象ページへ移動できるリンクを追加。
- 【mlink-video-controller】設定画面で表示するモジュール名を「Watch Page統合」から「タグカウンター」へ変更。
- 【mlink-video-controller】モジュール設定画面から各モジュールのバージョン表記を削除。
- 【README】`local/features/src` の現行プロジェクト構成、ビルドターゲット、Vite バージョン、nlFilter ファイル名、機能説明に合わせて更新。
- 【cache-data-manager】動画ごとのキャッシュ情報から完了済みHLSとテンポラリHLSを判定し、それぞれ適切な削除APIで一括削除するよう変更。
- 【cache-data-manager】動画カードと検索結果カードの削除も同じキャッシュ情報ベースの削除処理へ統一。
- 【common】HLSキャッシュ削除処理を共通化し、`mlink-video-controller` と `cache-data-manager` から利用するよう変更。

### Fixed

- 【watch-history】サムネイルURLが空、不正、または画像読込に失敗した場合に、存在しない固定パスではなく内蔵SVGのフォールバックサムネイルを表示するよう修正。
- 【movie-info】Watch APIの動画説明文に含まれる安全なHTMLを正しく描画しつつ、スクリプト、イベント属性、危険なURLをDOMPurifyで除去するよう修正。
- 【watch-history】シリーズ詳細からアラート追加へ移動した際に、選択中シリーズを先に破棄して設定処理が例外になる問題を修正。
- 【common/mlink-video-controller】Watchページの `server-response` metaに生JSONや不完全な `%` シーケンスが含まれても動画情報を取得できるようにし、mylist2追加時の `URIError: malformed URI sequence` を修正。

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

- 【resources】共通ヘルパーの内蔵SVGへ置き換えたため、`local/images/fallback-thumbnail.svg`を削除。
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

- 視聴履歴のページを追加し(https://www.nicovideo.jp/local/features/dist/pages/watch-history/index.html)、視聴ログを表示するようにした。ブラウザの容量が許す限り履歴を保存するようにした。統計も利用可能。

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
- 106_PlaybackrateChanger.txt -> 再生速度調整が利用可能になった。0.01倍速から200倍速まで調整可能。 nimg:ChangeWatchPlayerPremiumStatusかnimg:KillOfficialPlaybackrateControllingのどちらか若しくは両方を有効にすることで効果を適用可能。こちらでスキップ秒数もプレイバックも再生速度も調整できるのでわざわざ公式の機能を使う必要はない。

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
