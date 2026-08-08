# Usage Guide

---

## 1. Installation

GitHubページの[リリースページ](https://github.com/roflsunriz/filter-matome/releases)からダウンロードすること。

このガイドでは、NicoCache_nl本体のルートを `NICO_APP_ROOT`、実行時データのルートを `NICO_DATA_ROOT` と表記する。現在確認しているWindows構成の例は次の通り。

| 表記 | 現行の例 | 主な内容 |
|---|---|---|
| `NICO_APP_ROOT` | `C:\Users\UserName\AppData\Local\NicoCache_nl` | NicoCache_nl本体、JAR、ランチャー、`config.properties`、`scripts` |
| `NICO_DATA_ROOT` | `C:\Users\UserName\Documents\NicoCache_nl` | `extensions`、`local`、`nlFilters`、`cache`、`data`、`NicoCacheGUI.property` |

`NICO_DATA_ROOT` は `NICO_APP_ROOT\config.properties` の `userDataRoot` で確認する。ランチャーや起動オプションで別のデータルートを指定している場合は、実際に `extensions`、`local`、`nlFilters` があるそのルートを使用する。ポータブル構成では2つのルートが同じ場合もある。

!!! warning "注意事項"

    - ディレクトリ構造を壊さず、`local`、`nlFilters`、`extensions` は `NICO_DATA_ROOT` の同名フォルダに上書きする。`scripts` は `NICO_APP_ROOT` に配置する。
    - シンボリックリンクを利用している場合は、削除や置換の前にリンク自体と参照先を確認する。
    - **フィルタの抜き差しは上級者向けなのでnlFiltersの文法を完全に理解し、HTML/CSS/JavaScriptの知識が十分にあり、デベロッパーコンソールを十全に扱え、自己解決できる者だけが自己の責任で対応すること。**

!!! note

    問題を発見した場合は[GitHubのIssue](https://github.com/roflsunriz/filter-matome/issues)にて報告する。あるいはIssueで相談してからPull Requestを送る。

### 標準手順

`$env:USERPROFILE\Downloads` にダウンロードし、上記のWindows構成を使う例。

1. 7zファイル `filter-matome-<version>.7z` を7-Zipで展開する。
2. NicoCache_nl本体のGUIまたは標準ランチャーで本体を終了する。Java ToolboxはNicoCache_nl本体のプロセス管理を行わない。
3. 展開先の `NicoCache_nl\extensions`、`NicoCache_nl\local`、`NicoCache_nl\nlFilters` を、それぞれ `NICO_DATA_ROOT` の同名フォルダへ上書きコピーする。
4. 必要な場合は、展開先の `NicoCache_nl\scripts` を `NICO_APP_ROOT\scripts` へ上書きコピーする。

    !!! note

        `scripts` フォルダにはビルド済みJava ToolboxのJARが含まれる。Java Toolboxを使わない場合はコピー必須ではない。

5. NicoCache_nl本体に付属する標準ランチャーから起動する。その後、ブラウザーで `Ctrl+F5` を押してハード再読み込みする。

### クリーンインストール手順

1. mylist2、comment-filter2、watch-history、mlink-video-controllerの各管理画面から必要な設定とデータをエクスポートし、`local\background-images` に自分で追加した画像も別の場所へバックアップする。
2. `NICO_APP_ROOT\config.properties` の `userDataRoot` を確認し、バックアップ後にNicoCache_nlを終了する。
3. `NICO_DATA_ROOT\extensions` から、「同梱される拡張機能」に記載した10種の `.class` と `.java` を削除する。旧版の `nlMediaInfo*` と `nlGpac$*.class` が残っている場合は、それらも削除する。
4. `NICO_DATA_ROOT\local` から `background-images`、`features`、`images`、`mime.types`、`list.js`、`list.js.map` のうちfilter-matomeが配置したものを取り除く。`background-images` に自分で追加した画像は残す。シンボリックリンクは参照先を確認し、リンク自体だけを削除する。
5. `NICO_DATA_ROOT\nlFilters` から `100_features.txt`、`101_disable_official_function.txt`、`105_premium_hide.txt`、`nlFilters_編集ガイド.md` のうちfilter-matomeが配置したものを取り除く。
6. Java Toolboxも入れ直す場合は、`NICO_APP_ROOT\scripts` がfilter-matomeのコピーまたはリンクであることを確認して取り除く。
7. 上記の標準手順で現行版を配置し、NicoCache_nlを起動してブラウザーをハード再読み込みする。

!!! warning "削除しないデータ"

    `NICO_DATA_ROOT\cache`、`data`、`certs`、`list`、`NicoCacheGUI.property` などの実行時データは、filter-matomeのクリーンインストールで削除しない。用途を確認できない通常ファイルや、他の拡張機能が配置したファイルも削除しない。

### 参考資料

- [拡張機能](https://roflsunriz.github.io/setup-nicocache-nl/extensions/)

---

### 1.1 extensions（NicoCache_nl拡張機能）

`extensions/` は、ブラウザへ挿入されるJavaScriptやCSSでは実行できないサーバー側の処理をNicoCache_nlへ追加するディレクトリである。ローカルキャッシュファイルの探索、外部コマンドの実行、NicoCache_nl GUIへのログ表示、外部サイトからの限定的な情報取得などを担当する。

配布物には、次の全10種について同名の `.class` と `.java` が含まれる。

- `.class`: NicoCache_nlが実行時に読み込むコンパイル済み拡張機能。本機能を利用するために必要。
- `.java`: 拡張機能のソースコード。通常利用時のコンパイルには使用せず、実装確認や開発用として同梱している。

#### 同梱される拡張機能

| ファイル | 役割 | 主な利用箇所・追加要件 |
|---|---|---|
| `CommentFilterLogger.class` | comment-filter2から送信されたフィルター結果を受け取り、NicoCache_nl GUIのログタブへ表示する | comment-filter2の「ログ送信」を有効にした場合に使用。GUIなしで起動した場合はログタブを表示しない |
| `CustomCacheReturner.class` | `local/cache`内のHLS・MP4候補を動画IDで検索し、JSONで返す | video-playerのローカル動画ソース探索に使用 |
| `downloadThruFFmpeg.class` | キャッシュ動画から動画または音声を書き出す | mlink-video-controllerとキャッシュ一覧の「保存:動画」「保存:音声」で使用。別途`ffmpeg`コマンドが必要 |
| `ExtUtil.class` | 拡張機能向けの共通処理を提供する補助クラス | 単独で操作する機能ではない。他の `.class` と一緒に配置する |
| `FilterMatomeCacheControl.class` | filter-matome向けにHLSキャッシュの一括削除と削除予約をJSON APIで提供する | 完了済み・停止済みHLSは削除し、ダウンロード中HLSは完了または中断後に削除する。MP4・FLV・SWFは削除しない |
| `FilterMatomeSeriesAlerts.class` | watch-historyのアラート設定を保持し、NicoCache_nlの60秒定期イベントからシリーズ新着を確認してOS通知を表示する | NicoCache_nlが起動していればwatch-historyやブラウザを閉じても動作する |
| `FilterMatomeSmartFetcher.class` | 動画取得の永続予約、暗号化Cookie、帯域・容量判定、再試行、取得履歴を管理する | `nlMovieFetcher.class`と組み合わせ、動画取得スケジューラーで使用する |
| `NicochartInfoProxy.class` | video-playerが通常の動画情報を取得できない場合だけ、サーバー側からnicochart.jpの公開情報を取得する | 接続先と動画IDを制限した読み取り専用処理。PACや`genCerts.bat` / `genCerts.sh`の変更は不要 |
| `nlGpac.class` | キャッシュファイルまたはHLS/CMAFプレイリストをGPACの`inspect:xml:stats:allp`で全期間解析し、映像・音声の仕様を一つのJSONへまとめて返す。HLSマスターは最高帯域の品質を選択する | movie-infoのGPAC表示と`/cache/gpac?<動画ID>`で使用。GPACの`gpac.exe`が必要 |
| `nlMovieFetcher.class` | 署名済みDomand playlistの全CMAFリソースをNicoCache_nl経由で取得し、進捗確認と中止APIを提供する | 一覧の即時取得とsmartFetcherの実行エンジンとして使用する |

`nlGpac.class`は単一クラスで完結し、キャッシュを変更せず、通常のメディアファイルはそのまま、`.hls`ディレクトリはローカルの`master.m3u8`を入力としてGPACへ渡す。HLS/CMAFでもセグメントごとの結果を返さず、GPACが全期間を消費して得たPIDの解像度、Codec、ビットレート、フレーム数、時間、音声サンプルレート、チャンネル数などをまとめる。movie-infoのGPACビューでは、これらに加えてコンテナ入力、GPACバージョン、品質選択、色空間、ピクセル形式、アスペクト比、チャンネル配置などをストリーム別に表示し、GPACが返した未知の属性も全属性表で確認できる。キャッシュ解析で意図せず外部配信へ接続しないよう、プレイリストにHTTP等のリモートURLが含まれる場合は解析を拒否する。GPACの実行ファイルは、`-Dgpac.path=...`、`GPAC_PATH`環境変数、`C:\PathArea\GPAC\gpac.exe`、ユーザーの`%LOCALAPPDATA%\Programs\GPAC\gpac.exe`、`C:\Program Files\GPAC\gpac.exe`、最後にPATHの順で探索する。

#### HLSキャッシュ削除API

`FilterMatomeCacheControl`は、cache-data-managerとmlink-video-controllerのキャッシュ削除で使用する。NicoCache_nl本体のソースを書き換えず、公開されているキャッシュAPIとシステムイベントだけを利用する。削除対象は動画IDに紐づく `.hls` に限定され、ユーザーが用意した可能性のあるMP4・FLV・SWFは保持される。

すべてのリクエストで `X-Filter-Matome-Cache-Control: 1` ヘッダーが必要。状態変更にはGETではなくPOSTを使用する。

```http
GET /cache/filter-matome/v1/capabilities
X-Filter-Matome-Cache-Control: 1
```

```http
POST /cache/filter-matome/v1/remove
Content-Type: application/json
X-Filter-Matome-Cache-Control: 1

{"videoId":"sm9","scope":"hls","activeDownload":"queue"}
```

完了済み・停止済みHLSは `deleted`、ダウンロード中HLSは `queued` として返る。`queued` は即時削除済みという意味ではなく、キャッシュ完了・中断イベントと定期再確認によって削除される。応答の `requestId` は次のAPIで確認できる。

```http
GET /cache/filter-matome/v1/remove-status?id=<requestId>
X-Filter-Matome-Cache-Control: 1
```

リクエスト全体の状態は `not_found`、`pending`、`completed`、`partial`、`failed` のいずれかとなる。NicoCache_nlを再起動すると処理中の削除予約は失われるため、`pending` の間はNicoCache_nlを終了しない。

#### watch-history常駐シリーズアラート

`FilterMatomeSeriesAlerts`がシリーズアラートの正本を管理し、watch-historyのシリーズアラート画面はextension APIから一覧取得・追加・変更・削除する管理フロントエンドとして動作する。NicoCache_nlは約60秒ごとに期限到来を確認し、対象動画の公開ウォッチページから次動画を検出する。ログインCookieやブラウザの通知権限には依存しない。

- Windowsなどシステムトレイ通知を利用できる環境ではOS通知を表示し、通知をクリックすると新着動画を開く。
- システムトレイ通知を利用できない環境では、NicoCache_nl GUIの`Series Alerts`タブへ記録し、可能なら通知音を鳴らす。
- 設定と最終確認状態は`NICO_DATA_ROOT\data\filter-matome-series-alerts.json`へ原子的に保存する。破損を検出した場合は同じ場所へ`.corrupt-<時刻>`付きで退避する。
- 旧版のIndexedDBにあるアラートは、更新後にwatch-historyを最初に開いた時点でextensionへ一度だけ移行される。以後の追加・変更・削除とJSON入出力はIndexedDBを経由しない。
- NicoCache_nlを停止している間は確認できない。再起動後、期限を過ぎたアラートは次の定期処理で確認する。
- シリーズアラート画面で`拡張DB: 接続済み・通知有効`または`拡張DB: 接続済み・GUIログ/通知音`と表示されることを確認する。`通知テスト`で実際の通知経路を確認できる。

#### 動画取得スケジューラー

ニコニコ動画の動画カードにあるカレンダーボタンから予約画面を開く。「動画を選ぶ」「日時を選ぶ」「内容を確認」の3段階に従い、動画情報と推定サイズを確認して保存する。通常は今夜・平日夜・週末の候補から選ぶだけでも登録できる。1回／日／週／月／年の繰り返しを選び、必要な場合だけ「予約の詳細設定」を開いて曜日、祝日、優先度、再試行回数を変更する。

帯域上限、推定サイズの余裕、タイムゾーンは「通信・容量判定の詳細設定」にまとめている。帯域モードを選ぶと、そのモードで使う項目だけが表示される。「固定」は指定B/s、「回線速度の割合」は設定した回線速度×利用割合、「自動学習」は初回を制限せずに測定して2回目以降を実測速度×利用割合に制限する。自動学習で実測値がない間だけ、回線速度を初回の完了可能時間判定に使う。「推定サイズの余裕」はディスク使用率や空き容量ではなく、時間判定で推定サイズに掛ける倍率で、120%なら20%を上乗せする。通常の予約登録では変更する必要はない。

NicoCache_nlが起動している間だけ約60秒ごとに期限を確認する。PC停止中に過ぎた実行枠は失敗履歴へ記録し、次回がある予約は将来へ進める。取得失敗・不完全取得は再試行後に履歴へ残り、NicoCache_nlの完成キャッシュが実在する場合だけ完了扱いにして次の予約へ自動的に進む。不要な取得履歴は各項目の「履歴から削除」、または見出しの「履歴をすべて削除」から確認後に消せる。この操作では予約と取得済み動画キャッシュは削除されない。予約画面は `/local/features/dist/pages/movie-fetcher/index.html` から直接開くこともできる。

認証Cookieは許可された4種類だけをAES-GCMで暗号化し、`NICO_DATA_ROOT\data` に状態とは別ファイルで保存する。ログイン中にニコニコ動画を一度開いてから予約画面の「保存Cookie」が保存済みであることを確認する。共有PCではNicoCache_nlのユーザーデータルートを他ユーザーから読めないようにし、不要になった場合は予約画面の「保存Cookieを削除」を実行する。

#### 配置と更新

1. 配布物の `extensions/` にある `.class` と `.java` を、ディレクトリ構造を変えずに `NICO_DATA_ROOT\extensions` へ上書きコピーする。
2. リリースノートで削除された拡張がある場合は、古い `.class` を `NICO_DATA_ROOT\extensions` から削除する。古い `.class` を残すと、廃止済みの処理が読み込まれ続ける場合がある。
3. NicoCache_nlを再起動する。ブラウザの再読み込みだけでは、追加・更新・削除した `.class` は反映されない。

!!! warning "拡張機能の取り扱い"

    - 拡張機能はNicoCache_nlと同じJavaプロセス内で動作し、ローカルファイルの読み取りや外部コマンドの起動、ネットワーク通信を行える。信頼できる配布元の `.class` だけを配置する。
    - `.java`だけを更新しても動作は変わらない。通常利用者は配布済みの `.class` を使用し、自分で再コンパイルしない。
    - 一部の拡張だけを任意に抜くと、対応する画面機能が404や取得失敗になる。基本的には配布物の一式を使用する。
    - `downloadThruFFmpeg.class`は従来どおり`ffmpeg`を使用する。`nlGpac.class`はGPACを外部プロセスとして呼び出すため、`gpac.exe`をPATHへ追加するか、`C:\PathArea\GPAC`やユーザー領域へ導入して`GPAC_PATH`または`-Dgpac.path=...`で指定する。

#### 動作しない場合

1. `.class` が `NICO_DATA_ROOT\extensions` 直下にあることを確認する。サブフォルダへ移動しない。
2. NicoCache_nlを再起動し、起動ログに対象拡張の読み込み失敗やJavaバージョンのエラーがないか確認する。
3. 保存機能では`ffmpeg -version`、GPAC機能では`gpac -h`または導入先の`gpac.exe -h`が成功するか確認する。GPACがPATHにない場合は、設定した`GPAC_PATH`または`C:\PathArea\GPAC\gpac.exe`の実体を確認する。
4. 更新後にだけ失敗する場合は、古い `.class` の残存を確認してから、標準手順で `extensions/` を再度上書きする。
5. `NicochartInfoProxy`が失敗してもvideo-playerはキャッシュ再生を継続する。詳細はNicoCache_nlの警告ログで `NicochartInfoProxy` を確認する。
6. HLS削除が `pending` のままの場合は対象動画のキャッシュが継続中か確認する。完了または中断後、最大約60秒の定期再確認で削除される。
7. シリーズアラートが`拡張DB: 未接続`の場合は、`FilterMatomeSeriesAlerts.class`が配置されているか、起動ログに`FilterMatomeSeriesAlerts`があるか確認してNicoCache_nlを再起動する。

---

### 1.2 Symlink Setup (Required)

NicoCache_nl はキャッシュデータ用スクリプトを、Targetの`local/list.js`という固定名で参照する。ビルド成果物（`local/features/dist/features.js`）へのシンボリックリンクが必要なため、Java Toolboxの開発補助プラグインを使って予定確認と作成を行う。

**要約（Windows / PowerShell）**

`--dry-run`は変更せず、`--yes`で実作成、`--force`で既存シンボリックリンクだけを再作成する。既存の通常ファイルやフォルダーは削除されない。

```powershell
java -jar "C:\Users\UserName\AppData\Local\NicoCache_nl\scripts\java-toolbox\target\filter-matome-toolbox-0.1.0-SNAPSHOT.jar" `
  --headless --plugin developer --action listjs `
  --source-root "C:\filter-matome" `
  --target-root "$env:USERPROFILE\Documents\NicoCache_nl" --dry-run

java -jar "C:\Users\UserName\AppData\Local\NicoCache_nl\scripts\java-toolbox\target\filter-matome-toolbox-0.1.0-SNAPSHOT.jar" `
  --headless --plugin developer --action listjs `
  --source-root "C:\filter-matome" `
  --target-root "$env:USERPROFILE\Documents\NicoCache_nl" --yes --force
```

`--target-root` にはJava Toolboxの既定値ではなく、`config.properties` で確認した実際の `NICO_DATA_ROOT` を指定する。`links`アクションでは`local`、`nlFilters`、`extensions`、`list.js`を一括作成できる。Linux/macOSでは同じJARをターミナルから実行し、Source/Targetを必要に応じて`--source-root`／`--target-root`で指定する。詳細な手順は [creating-symlink-for-listjs.md](creating-symlink-for-listjs.md) を参照。

---

## 2. Filter Descriptions

!!! warning "注意事項"

    - 毎回リリースノートを確認すること。
    - 各 nlFilter は`<link rel="...">`や`<script src="...">`で`./local/features/*`から呼び出す形になっているため、ファイルの更新日が変わっていないことがあることに注意する。更新による差分を見たいときは[WinMerge](https://winmerge.org/?lang=ja)が便利。
    - また、`nlFilters` フォルダから削除された nlFilter(txt)や、local/features から削除された css,js ファイル、または中身のないファイル群は deprecated(廃止予定)又は abolition(廃止)としているため削除すること。

**免責事項：**

- 全てのフィルタは同時使用を前提に設計しているため、自分で勝手に取捨選択した結果動作しなくても動作保証外・サポート（返信）対象外とする。
- 基本的にこのフィルタは私が使用しているものをお裾分けしているという形を取っている為、**あなたが自分で変更・改変・改造した結果不具合が起きても私は一切の責任を負わない。自身の力に於いて解決**すること。困ったらクリーンインストール！
- MITライセンス(MIT license)[(日本語訳リンク)](https://licenses.opensource.jp/MIT/MIT.html)を宣言する。改変・再配布・商用利用・非商用利用等自由、但し再配布する際に私の名前(roflsunriz)を明記すること。

---

### 100_features.txt

ページ判定用の軽量`features.js`をニコニコ動画全体に1回挿入するフィルタ。ページルーターがURLに応じて必要な共通機能、mlink-video-controller、comment-filter2、video-player、watch-trackerの分割ファイルだけを遅延読み込みして起動する。

#### HTMLページの配信URL

HTMLを使用する各機能は、NicoCache_nl経由で次のURLに配信される。

| 機能 | URL |
|---|---|
| mylist2 | `https://www.nicovideo.jp/local/features/dist/pages/mylist2/index.html` |
| movie-fetcher | `https://www.nicovideo.jp/local/features/dist/pages/movie-fetcher/index.html` |
| movie-info | `https://www.nicovideo.jp/local/features/dist/pages/movie-info/index.html` |
| video-player | `https://www.nicovideo.jp/local/features/dist/pages/video-player/index.html` |
| watch-history | `https://www.nicovideo.jp/local/features/dist/pages/watch-history/index.html` |

### 101_disable_official_function.txt

公式プレイヤーの再生速度調整機能を無効化するフィルタ。これによりfeatures.js内のmlink-video-controllerの再生速度調整機能が正常に動作するようになる。

#### mlink-video-controller

![リンクとステータス](resources/mlink-video-controller1.avif)

![リンクとステータス2](resources/mlink-video-controller2.avif)

ニコニコ動画の視聴ページを開くと、右下に紫色のメニューが現れる。そのメニューを開くと、順に、コメントヒートマップと再生関連の微調整タブ、音量微調整タブ、再生速度変更タブ、コメント検索タブ、関連リンクタブ、モジュール設定タブに切り替えられる。  

再生関連タブでは、シークバーによる位置調整、ヒートマップ切り替え、0:00に戻るボタン、再生一時停止切り替え、最後までスキップ、繰り返し再生、秒数指定スキップ、ワンクリック秒数スキップボタンがある。  

音量タブでは、音量バーによる調整、音量ゼロ、微小、最大、各パーセンテージによる調整ができる。  

再生速度タブでは再生速度調整バーとワンクリックボタンによる変更ができる。  

コメント検索タブでは通常表現と正規表現による検索ができる。詳細表示チェックボックスをオンにすると、ID, No., 投稿日時, コメントコマンド, プレミアムステータス, スコアといった情報が表示される。  

関連リンクタブでは、filter-matome関連リンク、niconico関連リンク、NicoCache_nlリンクが表示される。  
`キャッシュリスト`の使用には上記キャッシュデータ用マネージャのシンボリックリンクセットアップが必要。その他、`保存:動画`, `保存:音声`のリンクの動作には `downloadThruFFmpeg.class` が必要。 動画または音声の保存時はJavaによるファイルダイアログが出るのでタスクバーにあるNicoCacheのアイコンをダブルクリックしてファイルダイアログをフォアグラウンドに移動したほうがよい。（自動でフォアグラウンドにならないため） `Processing Started`となるとダウンロード処理開始。 `保存:コメント` は現在NicoCache_nl本体自体が最新のコメントデータ形式に未対応のため動作していない。  

モジュールタブではmlink-video-controllerに統合された各種機能モジュールのオン・オフができる。  

`ヘッダープライバシー`モジュールはニコニコ動画のコモンヘッダー（画面上部の黒いヘッダ）に表示されるユーザー名とアイコンを非表示にできる。モジュール設定タブの`ヘッダープライバシー`行にある`設定`から、ユーザー名とアイコンを個別にオン・オフできる。スクリーンショットでユーザー名を共有したくない場合に便利。  

`デイリー福引ハイライト`モジュールはニコニコインフォで配布されているニコニ広告用のポイント福引で、特定のキーワードを含むものをハイライトすることで簡単に福引にアクセスできるように支援する補助機能。  

`Watch Page統合`モジュールはタグカウンター（タグの個数を数える）など、視聴ページ向けの補助機能をまとめて有効化する。`Watch Page サブモジュール`は`Watch Page統合`モジュールの詳細設定。  

`原宿風Watch`モジュールはWatchページをニコニコ動画（原宿）風の表示に変更する。再生数・コメント数・マイリスト数・投稿日時の集約表示、ライト/ダークテーマ切り替え、カラースキームと背景画像の優先切り替えに対応する。  

`タブセッション拡張`モジュールは通常一般会員では同時に開ける視聴ページが3つまでに制限されているものを無制限に拡張する。  

`サムネイルフィルター`モジュールは検索ページやその他ページで非表示にしたい動画を指定してサムネイルを非表示にしてくれるモジュールだがニコニコ動画の構造変化が激しいため動作しないかもしれない。モジュール設定タブの`サムネイルフィルター`行にある`設定`から調整できる。キーワードの追加・削除・一時停止は保存直後に現在の一覧へ反映される。  

`削除動画検出器`モジュールは、投稿者が削除または非表示設定された動画を自動検知してキャッシュが存在する場合にローカルプレーヤーに自動ルーティングするモジュール。  

`背景セレクター`モジュールはラジアル背景画像セレクターと背景画像自動適用をオンにする。視聴ページの右横に半透明のハンドルにマウスホバーするとラジアル背景画像セレクターが現れ、回転とクリックで背景画像を変更可能。`背景画像設定`で変更可能。  

`マトリックス背景`は映画マトリックスシリーズに出てくる緑色の縦書きカタカナプログラムコードの動的表示背景を設定する。`背景セレクター`と排他的動作。

`即時適用`・・・すぐにモジュールの変更を適用（リロードなし）  
`再読み込みして適用`・・・ページをリロードして適用（より確実）  
`設定エクスポート`・・・モジュールの各種設定をローカルに保存  
`設定インポート`・・・モジュールの各種設定をローカルから読み込み  
`設定リセット`・・・デフォルト設定に戻す    


#### comment-filter2

![コメントフィルタ1](resources/comment-filter-2-1.avif)

![コメントフィルタ2](resources/comment-filter-2-2.avif)

詳しい使い方は[comment-filter2.md](comment-filter2.md)を参照されたい。

#### video-player

![カスタムキャッシュ](resources/cache.avif)

キャッシュ済みの有料期限切れ動画 / キャッシュ済み削除動画 / キャッシュ済み非公開動画 をローカルプレーヤーでコメント付きで再生するための機能。（ニコニコ動画の仕様上、いつの時点からか削除済み動画と非公開動画ではコメントも非公開になったのでコメントはうまく表示されないかもしれない）

#### 再生方法
- URLを直接指定する方法(https://www.nicovideo.jp/local/features/dist/pages/video-player/index.html?videoId=<動画ID>)
- mylist2に該当動画を登録して自動ルーティングさせる方法(https://www.nicovideo.jp/watch/soXXXXXXXX などを登録するとキャッシュがあれば自動でリダイレクトする)

動画IDは`soXXXXXXXX`に限らず、`smXXXXXXXX`、`nmXXXXXXXX`、`ssXXXXXXXX`などのニコニコ動画IDに対応する。

#### 任意で用意した動画をコメントを被せて再生
- [Hohoema](https://github.com/tor4kichi/Hohoema)を使用する方法
- `NICO_DATA_ROOT\cache`（現行例: `C:\Users\UserName\Documents\NicoCache_nl\cache`）に動画IDで名前を付けて保存`soXXXXXXXX.mp4`、`smXXXXXXXX.mp4`、`nmXXXXXXXX.mp4`、`ssXXXXXXXX.mp4`などとし、該当動画IDのページを開く。
- `NICO_DATA_ROOT\local\cache`に同様の名前で保存し、該当動画IDのページを開く。

!!! note
    mp4ファイルを配布済みJava ToolboxでFastStart変換すると、読み込みから再生開始までの待ち時間が短縮される。通常利用ではMavenなどのビルドは不要。

    ```powershell
    java -jar "C:\Users\UserName\AppData\Local\NicoCache_nl\scripts\java-toolbox\target\filter-matome-toolbox-0.1.0-SNAPSHOT.jar" --headless --plugin media --action faststart --input "C:\Users\UserName\Documents\NicoCache_nl\cache\movie.mp4" --dry-run
    ```

!!! note
    動画ファイルを追加した後はNicoCache_nlに認識させるためにNicoCache_nlの再起動が必要。


### 105_premium_hide.txt

![適用前](resources/premium-recruit-hide-1.png)

![適用後](resources/premium-recruit-hide-2.png)

コモンヘッダーのプレミアム会員勧誘要素を非表示にする。

#### watch-history

![視聴履歴](resources/watch-history.avif)

視聴履歴タブでは、視聴ページで再生した動画の履歴が表示される。左のサイドバーから検索、ソート、フィルタ、削除、簡易統計が可能。右サイドバーでは各動画をクリックすると動画IDや投稿者などの詳細情報が表示される。更にそこから動画を開いたりメモを追加することも可能。  

統計タブでは詳細な再生アクティビティを確認可能。  

シリーズタブでは投稿者が設定した動画シリーズのナビゲーションが利用可能。  

シリーズアラートでは`新規アラート追加`で対象と間隔を設定すると、NicoCache_nlの常駐extensionがページやブラウザを閉じていても新規動画を定期確認する。`手動チェック`で即時確認を依頼でき、`通知テスト`でOS通知またはGUIログ・通知音の経路を確認できる。NicoCache_nlを停止している間は確認されない。

画面上部の`管理`から、視聴履歴とシリーズアラートをローカルJSONへエクスポート・インポートできる。`Google Driveへエクスポート`では`Watch History Backups`フォルダーへZIPで保存し、`Google Driveからインポート`では一覧から選んだバックアップを現在の履歴へマージする。Google Drive連携はユーザー操作時だけ認証し、この機能が作成したファイルへアクセスする`drive.file`権限を使用する。

`データベース管理`では、より大容量の履歴を保存するためのデータベース永続化と、旧データからの自動マイグレーションなどの設定が可能。  
 

---

## 3. Enabling/Disabling Filters

[nlFilter の文法](https://roflsunriz.github.io/setup-nicocache-nl/nl-filters-syntax/)を参照

必要に応じフィルタを有効化する方法と無効化する方法を紹介する。フィルタのカギ括弧にシャープ記号を付けると無効状態になる。

**使用例：**

| 無効状態 | 有効状態 |
|---------|---------|
| `#[Replace]` | `[Replace]` |

!!! note
    VSCodeでのnlFiltersのシンタックスハイライト機能は[NLF Code](https://github.com/roflsunriz/NLF-Code)が利用可能。

![フィルタ切り替え画面](resources/toggle.png)

---

## 4. Watch Page Background Image Settings

![背景画像](resources/background-image-settings.avif)

[CSS: カスケーディングスタイルシート:MDN](https://developer.mozilla.org/ja/docs/Web/CSS)を参照

背景画像を変更するには、まず画像を[Squoosh](https://squoosh.app/)などでブラウザが扱える形式に変換する。変換は必須ではない。次に、NicoCache_nl の `local/background-images/favorites` など、`local` 配下の任意のフォルダに画像を配置する。NicoCache_nl から参照できるのは `local` 配下のファイルだけである。

そのうえで、mlink-video-controller の設定タブにある「背景画像設定」から背景画像を指定する。指定方法は URL 指定とファイル選択の 2 種類である。ファイル選択した画像は、IndexedDB に base64 形式で保存される。

URL は `https://www.nicovideo.jp/local/background.jpg` のように、`NICO_DATA_ROOT\local` 配下のファイルをそのまま指定するのが最も単純な例である。たとえば `C:\Users\UserName\Documents\NicoCache_nl\local\background-images\favorites\background1.avif` に画像を置いた場合、URL は `https://www.nicovideo.jp/local/background-images/favorites/background1.avif` になる。さらに、`local` フォルダ内の `hoge` フォルダに `image.jpg` がある場合は、`https://www.nicovideo.jp/local/hoge/image.jpg` になる。`https://www.nicovideo.jp/local/` 以外の外部 URL も指定できるが、読み込み時に外部サーバーへ無用な負荷をかけるおそれがあるため非推奨である。フォルダ構成や指定数に厳密な制限はないが、常識的な範囲で設定することを推奨する。

!!! warning "注意事項（nico_wallpaperG併用時）"
    nico_wallpaperGと併用している場合衝突が起きるので、そのときはどちらを優先するかによるが mlink-video-controller にて背景セレクターとマトリックス背景を無効化し、「wp1.css」に以下を追記する。（デフォルトの場合）

    ```css
    :root {
      --bg-img: url('https://www.nicovideo.jp/local/nico_wallpaperG/wp1.jpg') repeat center fixed !important;
    }
    ```

---

## 5. Important: Data Deletion Warning

### ブラウザデータ削除時の注意

以下の操作を行うと設定データが消去される：

- サイトデータの削除
- オフライン作業用データの削除
- Cookieと他のサイトデータの削除
- Cookieとサイトデータの削除
- …等の表記がある閲覧履歴データの削除

**削除されてしまう設定：**

- mlink-video-controller（IndexedDBに保存された背景画像の設定全般）
- mylist2（IndexedDBに保存されたマイリストのデータ全般）
- comment-filter2（IndexedDBに保存されたNGコメントの設定全般）
- その他「ローカルストレージ」に保存されている音量、再生速度設定等

**事前対策：**

1. 各機能の設定画面から「エクスポート」を実行
2. エクスポートファイルを安全な場所に保存
3. データ削除後に「インポート」で復元

保存されている各データはWebサイトにフォーカスがある状態でF12キーを押すと開発者ツールが開き、「ストレージ」タブや「アプリケーション」タブで確認できる。

### 各機能のエクスポート方法

**mylist2**

mylist2 > 「マイリスト設定」 > 「エクスポート」

**watch-history**

watch-history > 「管理」 > 「エクスポート」または「Google Driveへエクスポート」

**comment-filter2**

ニコニコ動画の視聴ページ > 画面右下のmlink-video-controller > 関連リンクタブの`comment-filter2` > 「データ管理」の`エクスポート`

---

## 6. License

!!! note "MIT LICENSE"

    The MIT License  
      
    Copyright 2017-2026 roflsunriz  
      
    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:  
      
    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.  
      
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.  


法的に有効なのは英語版のライセンス条文。詳細は[日本語訳](https://licenses.opensource.jp/MIT/MIT.html)と[英語原文](https://opensource.org/license/mit)を参照。

---

## 7. Related Links

### 開発ツール

- [Apache Ant (Javaビルドツール)](https://ant.apache.org/bindownload.cgi)
- [Adoptium Temurin OpenJDK 25 LTS](https://adoptium.net/temurin/releases/?version=25&os=any&arch=any)
- [BouncyCastle (暗号化ライブラリ)](https://www.bouncycastle.org/latest_releases.html)
- [GPAC (メディア解析)](https://gpac.io/downloads/gpac-nightly-builds/)
- [WinMerge (ファイル差分比較)](https://winmerge.org/?lang=ja)

### コミュニティ

- [5ちゃんねる 本スレッド](https://find.5ch.net/search?q=NicoCache)
- [おーぷん2ちゃんねる スレッド](https://ana.open2ch.net/test/read.cgi/software/1675001508/)
- [Talkスレッド](https://talk.jp/boards/software/1675038388)
- [開発スレッド](https://sportschan.org/librejp/thread/16592.html)
- [NicoCache_nl Usage Guide](https://roflsunriz.github.io/setup-nicocache-nl/regex/)
- [ファイル置き場 避難所3](https://nicocache.jpn.org/)

### 開発資料

- [MDN Web Docs](https://developer.mozilla.org/ja/)
- [HTML早見表](https://developer.mozilla.org/ja/docs/Learn/HTML/Cheatsheet)
- [正規表現早見表](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Regular_expressions/Cheatsheet)
- [正規表現テストツール](https://rubular.com/)
- [Markdown基本文法](https://www.markdownguide.org/basic-syntax/)

### 拡張機能

- [d-anime-nico-comment-renderer : dアニメでニコニコ動画のコメントをレンダリングするユーザースクリプト](https://github.com/roflsunriz/web-page-enhancement-scripts)
