1. local/features/package.jsonのバージョンを更新する（例：300 -> 301）（特に指示がない場合は基本的にメジャー更新を行うこと）
2. CHANGELOG.mdを更新しチェンジログを記録する（Keep a Changelog形式に従う）。前回のリリースタグからのコミット履歴を全て参照して詳しく記録する。
3. README.mdのlatestバッジのバージョンを更新する
4. 最後にコミットとプッシュを行う
5. git tag "#(version)"
6. git push origin "#(version)" の操作でGithub Actionsが自動でリリースを作成する。

## scripts Java Toolboxの更新

`scripts/java-toolbox` は独立したMavenプロジェクトです。リリースワークフローがJDK 17で`mvn verify`を実行し、生成したJARを配布アーカイブへ同梱します。変更時はローカルでも次を実行し、4層の自動テスト、GUI起動、`--list-plugins`、`--headless --self-test`の順に確認します。

```bash
cd scripts/java-toolbox
mvn --batch-mode verify
java -jar target/filter-matome-toolbox-0.1.0-SNAPSHOT.jar --list-plugins
java -jar target/filter-matome-toolbox-0.1.0-SNAPSHOT.jar --headless --self-test --data-dir ./toolbox-data
```

GUIを表示できないCIやサーバーではGUI E2Eだけスキップされます。CLI E2E、組み込みプラグイン、外部プラグインSPI、ローカルHTTPによるETag更新テストはヘッドレスで実行されます。

JavaToolboxのE2Eは、`@TempDir`配下にアプリルート、データルート、リポジトリ、ユーザーホームを作る隔離フィクスチャです。ffmpeg/ffprobe・Java/javac・setxなどは偽コマンド、更新APIと動画タイトルAPIはlocalhostのHTTPサーバーへ差し替えるため、実機のNicoCache_nl、証明書ストア、Windowsレジストリ、Firefoxプロファイル、外部GitHubへ接続しません。旧`nicocache-utility.py`の起動、強制停止、本体ビルド、拡張コンパイル、JAVA_HOME、管理画面、Webリンクまで同じ隔離環境で確認します。OSにシンボリックリンク作成権限がない場合も、リンク作成の拒否と既存通常ファイルの保護を検証します。

変換やNicoCache操作を行う場合は、対象パスを明示し、最初に`--dry-run`で予定を確認してください。失敗時はアプリデータディレクトリの設定バックアップと、各処理の`.bak-*`／`.part`を確認して復旧します。

リリースアーカイブ作成時は、`scripts/java-toolbox/target`の開発用生成物を除去し、実行JARだけを同じパスへコピーします。配布物の検証では、アーカイブ内のJARが存在し、`--list-plugins`と`--headless --self-test`を実行できることを確認します。
