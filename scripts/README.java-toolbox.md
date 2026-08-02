# Java Toolbox

`java-toolbox` は、`scripts/` に分散していたPython、PowerShell、バッチの利用導線を、JDKだけで起動できるクロスプラットフォームJavaアプリへまとめる後継ツールです。

## 解消した注意点

- Python、`tkinterdnd2`、`requests`、PowerShell、`.bat`への依存をホストアプリから除去しました。
- `C:\filter-matome`、`C:\NicoCache_nl`、`%USERPROFILE%`を実行時の必須固定値にせず、`--repo-root`、`--app-root`、`--data-root`、`--data-dir`で変更できます。
- 空白や日本語を含むパスをシェル経由で解釈せず、`ProcessBuilder`の引数配列で渡します。
- 既存出力は既定でスキップし、上書き時はバックアップを作成します。変換系には`--dry-run`を用意しています。
- 設定ファイルは文字コードをUTF-8、Windows-31J、EUC-JPから判定し、コメントと順序を維持して保存します。
- GUIと同じ処理を`--headless`で実行できます。CIやタスクスケジューラーから標準出力・終了コードを利用できます。
- GUIへ表示するREADMEをプラグインごとに持ち、外部プラグインの追加・削除をホスト変更なしで行えます。
- E2Eは`@TempDir`配下の専用データ・アプリ・リポジトリ・ホームを使い、実機の設定やNicoCache_nlへ接続しません。ffmpeg/ffprobe、Java/javac、ローカル更新API・動画情報APIはテスト用偽実装／localhostへ差し替えます。

FFmpeg、FFprobe、JDK、NicoCache_nl本体など、処理そのものに必要な外部実行ファイルは自動インストールせず、実行時に検出して不足理由を表示します。

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

テストはJUnit 5で、単体（CLI・JSON・properties・ファイル安全性・プロセス制御）、機能（組み込みプラグインのヘッドレス操作）、結合（ServiceLoader外部JAR・ローカルHTTPのETag更新）、E2E（実際の`Main`子プロセス、全組み込みアクション、成功／拒否／バックアップ／`.part`／副作用、GUIタブ構築）を検証します。E2Eの外部コマンドは偽実装が引数と生成物を記録し、更新・動画情報APIはlocalhostのHTTPサーバーだけを使うため、実機のNicoCache設定、証明書ストア、レジストリ、Firefoxプロファイル、GitHubへ触れません。シンボリックリンク権限がないOSでは、作成成功ではなく安全な拒否と既存ファイル保護を検証します。GUIを表示できない環境ではGUI E2Eだけ自動的にスキップし、CLI E2Eは実行します。全検証には`mvn verify`を使用してください。

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

# 設定を一覧表示
java -jar target/filter-matome-toolbox-0.1.0-SNAPSHOT.jar \
  --headless --plugin config-editor --action list --config "/path/to/config.properties"

# シンボリックリンク予定の確認
java -jar target/filter-matome-toolbox-0.1.0-SNAPSHOT.jar \
  --headless --plugin nicocache --action links --source-root "/path/to/filter-matome" \
  --data-root "/path/to/NicoCache_nl" --dry-run
```

削除、停止、リネーム、リンク再作成、拡張コンパイル、上書きなど副作用のある操作は、`--yes`、`--force`、`--overwrite`を明示しない限り実行しません。

`nicocache stop`は既定で`--app-root/NicoCache_nl.jar`を`-jar`引数として持つプロセスだけを対象にします。対象PIDを隔離して明示できる自動運用では、さらに`--pid PID --yes`を指定できます。`open`は`--dry-run`ならブラウザーを起動せず、開く予定のURLだけを記録します。

## プラグイン

起動時にアプリデータディレクトリの`plugins/`にあるJARを`ServiceLoader`で検出します。外部プラグインは`jp.roflsunriz.filtermatome.toolbox.ToolPlugin`を実装し、JARの`META-INF/services/`へ実装クラスを登録してください。JAR内の`README.md`はプラグインのヘルプ辞書として表示できます。

組み込みプラグイン:

- `media`: 10秒／60秒切り出し、FastStart、HLS、H.264／HEVC／AV1変換、キャッシュ動画リネーム
- `config-editor`: properties編集とdefaults辞書
- `updater`: GitHub Releases API、ETag、`.part`ダウンロード
- `nicocache`: 診断、起動・停止、シンボリックリンク、Java拡張コンパイル
- `developer`: `create-claude-link`相当の安全な相対リンク作成と依存関係診断

完全にJava Toolboxへ移行できた旧スクリプトは削除しました。MkDocsのビルドフックと、Java Toolboxにまだ含まれていないWindows固有のメニューを持つ`nicocache-utility.py`は互換経路として残しています。新しい自動処理ではJava Toolboxを使用してください。

## OS固有機能

シンボリックリンク、証明書ストア、レジストリ、タスクスケジューラーはOSの権限・仕様に依存します。ホストとメディア／設定／更新処理はプラットフォーム非依存ですが、NicoCacheのOS固有操作は診断で利用可否を判定し、通常ファイルを削除して置き換えることはありません。
