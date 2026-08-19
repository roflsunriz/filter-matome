# Java Toolbox

`java-toolbox` は、`scripts/` に分散していたPython、PowerShell、バッチの利用導線を、JDKだけで起動できるクロスプラットフォームJavaアプリへまとめる後継ツールです。

## 解消した注意点

- Python、`tkinterdnd2`、`requests`、PowerShell、`.bat`への依存をホストアプリから除去しました。
- `C:\filter-matome`、`C:\NicoCache_nl`、`%USERPROFILE%`を実行時の必須固定値にせず、`--repo-root`、`--data-dir`、`--config`などで対象を変更できます。
- 空白や日本語を含むパスをシェル経由で解釈せず、`ProcessBuilder`の引数配列で渡します。
- 既存出力は既定でスキップし、上書き時はバックアップを作成します。変換系には`--dry-run`を用意しています。
- 設定ファイルは文字コードをUTF-8、Windows-31J、EUC-JPから判定し、コメントと順序を維持して保存します。
- GUIと同じ処理を`--headless`で実行できます。CIやタスクスケジューラーから標準出力・終了コードを利用できます。
- GUIへ表示するREADMEをプラグインごとに持ち、外部プラグインの追加・削除をホスト変更なしで行えます。
- E2Eは`@TempDir`配下の専用データ・リポジトリ・ホームを使い、実機の設定やNicoCache_nlへ接続しません。ffmpeg/ffprobe、ローカル更新API・動画情報APIはテスト用偽実装／localhostへ差し替えます。

FFmpeg、FFprobe、GPACなど、処理そのものに必要な外部実行ファイルは自動インストールせず、実行時に検出して不足理由を表示します。

## 配布版の利用

GitHubのリリースアーカイブには、ビルド済みの
`scripts/java-toolbox/target/filter-matome-toolbox-0.1.0-SNAPSHOT.jar` を同梱しています。JDK 17以上があれば実行でき、通常利用者がMaven、Bun、ソースコードからビルドする必要はありません。

```bash
java -jar scripts/java-toolbox/target/filter-matome-toolbox-0.1.0-SNAPSHOT.jar
java -jar scripts/java-toolbox/target/filter-matome-toolbox-0.1.0-SNAPSHOT.jar --headless --self-test --data-dir ./toolbox-data
```

## 開発用ビルドと起動

ソースから変更・検証する場合だけJDK 17以上とMavenが必要です。

```bash
cd scripts/java-toolbox
mvn verify
java -jar target/filter-matome-toolbox-0.1.0-SNAPSHOT.jar
```

テストはJUnit 5で、単体（CLI・JSON・properties・ファイル安全性・OS別パス解決・プロセス制御）、機能（組み込みプラグインのヘッドレス操作）、結合（ServiceLoader外部JAR・開発補助アクション・ローカルHTTPのETag更新）、E2E（実際の`Main`子プロセス、組み込み機能の成功／拒否／バックアップ／`.part`／副作用、シンボリックリンク、GUIタブ構築とREADME・defaults辞書の操作部品）を検証します。E2Eの外部コマンドは偽実装が引数と生成物を記録し、更新・動画情報APIはlocalhostのHTTPサーバーだけを使うため、実機の設定、証明書ストア、レジストリ、Firefoxプロファイル、GitHubへ触れません。シンボリックリンク権限がないOSでは、作成成功ではなく安全な拒否と既存ファイル保護を検証します。GUIを表示できない環境では実ウィンドウのGUI E2Eだけ自動的にスキップし、ヘッドレスGUI構築とCLI E2Eは実行します。全検証には`mvn verify`を使用してください。

プラグイン一覧と自己診断:

```bash
java -jar target/filter-matome-toolbox-0.1.0-SNAPSHOT.jar --list-plugins
java -jar target/filter-matome-toolbox-0.1.0-SNAPSHOT.jar --headless --self-test --data-dir ./toolbox-data
```

表示サーバーがない環境でも全プラグインのSwingビューを構築するには、`--headless --gui-smoke`を使用します。実ウィンドウの操作確認は表示可能な環境でのみGUI E2Eが実行されます。

## ヘッドレス例

```bash
# 変換予定だけを確認
java -jar target/filter-matome-toolbox-0.1.0-SNAPSHOT.jar \
  --headless --plugin media --action hls --input "動画フォルダ" --recursive --dry-run

# FastStart化。既存出力は既定でスキップ
java -jar target/filter-matome-toolbox-0.1.0-SNAPSHOT.jar \
  --headless --plugin media --action faststart --input "movie.mp4"

# 動画IDを含むMP4を実測した画質・音質と動画タイトルでNicoCache互換名へ変更
# autoはffprobeを優先し、利用不能・情報不足ならGPACへフォールバック
java -jar target/filter-matome-toolbox-0.1.0-SNAPSHOT.jar \
  --headless --plugin media --action rename --input "sm9.mp4" \
  --inspector auto --yes

# GPACへ明示的に固定して、変更予定だけを表示
java -jar target/filter-matome-toolbox-0.1.0-SNAPSHOT.jar \
  --headless --plugin media --action rename --input "sm9.mp4" \
  --inspector gpac --gpac "/path/to/gpac" --dry-run

# 設定を一覧表示
java -jar target/filter-matome-toolbox-0.1.0-SNAPSHOT.jar \
  --headless --plugin config-editor --action list --config "/path/to/config.properties"

# リポジトリとNicoCache_nlのリンク予定を確認
java -jar target/filter-matome-toolbox-0.1.0-SNAPSHOT.jar \
  --headless --plugin developer --action links --dry-run

```

削除、リネーム、リンク再作成、上書きなど副作用のある操作は、`--yes`、`--force`、`--overwrite`を明示しない限り実行しません。NicoCache_nl本体の起動・停止・ビルドなどの管理操作は本体側の機能を使用してください。

## プラグイン

起動時にアプリデータディレクトリの`plugins/`にあるJARを`ServiceLoader`で検出します。外部プラグインは`jp.roflsunriz.filtermatome.toolbox.ToolPlugin`を実装し、JARの`META-INF/services/`へ実装クラスを登録してください。JAR内の`README.md`はプラグインのヘルプ辞書として表示できます。

組み込みプラグイン:

- `media`: 10秒／60秒切り出し、FastStart、HLS、H.264／HEVC／AV1変換、ffprobe／GPAC実測によるキャッシュ動画リネーム。`--inspector auto|ffprobe|gpac`、`--gpac PATH`、`tools.gpac`に対応
- `config-editor`: properties編集とdefaults辞書。GUIの初期設定ファイルはWindowsでは`%LOCALAPPDATA%/NicoCache_nl/config.properties`、Linuxでは`~/.config/NicoCache_nl/config.properties`、macOSでは`~/Library/Application Support/NicoCache_nl/config.properties`です。defaults辞書の値はダブルクリックで設定一覧へ入力できます。
- `updater`: GitHub Releases API、ETag、`.part`ダウンロード
- `developer`: `create-claude-link`相当の安全な相対リンク作成、`create-all-symlinks.ps1`相当の一括リンク、依存関係診断

`nicocache-utility.py`と専用READMEは削除済みです。NicoCache_nl本体の管理機能と重複するため、JavaToolboxにはNicoCache管理プラグインを組み込んでいません。MkDocsのビルドフックなど、用途が異なるスクリプトは残しています。

## OS固有機能

シンボリックリンクなど一部の開発者向け操作はOSの権限・仕様に依存します。開発補助プラグインのSource初期値はWindowsでは`C:\filter-matome`、Linux/macOSでは現在のリポジトリです。Target初期値はWindowsでは`%LOCALAPPDATA%/NicoCache_nl`、Linuxでは`$XDG_CONFIG_HOME/NicoCache_nl`（未設定時は`~/.config/NicoCache_nl`）、macOSでは`~/Library/Application Support/NicoCache_nl`です。パスは`--source-root`、`--target-root`、`--target`、`--link-dir`で変更できます。通常ファイルを削除せず、既存シンボリックリンクの再作成だけに`--force`を使用します。メディア／設定／更新処理はプラットフォーム非依存です。NicoCache_nl本体のOS固有操作は本体側の案内に従ってください。
