1. local/features/package.jsonのバージョンを更新する（例：300 -> 301）（特に指示がない場合は基本的にメジャー更新を行うこと）
2. CHANGELOG.mdを更新しチェンジログを記録する（Keep a Changelog形式に従う）。前回のリリースタグからのコミット履歴を全て参照して詳しく記録する。
3. README.mdのlatestバッジのバージョンを更新する
4. 最後にコミットとプッシュを行う
5. git tag "#(version)"
6. git push origin "#(version)" の操作でGithub Actionsが自動でリリースを作成する。

## nlMovieFetcherの追従確認

ニコニコ動画の配信仕様変更へ追従するときは、`local/features/src/api-info/nl-movie-fetcher-api.md` のraw CDP手順で、Watch API、access-rights API、映像・音声分離playlistを再観測します。Java拡張は対象NicoCache_nlのJARをclasspathにしてコンパイルし、`nlMovieFetcher.class` 以外の追加classが生成されないことを確認してください。TypeScript側は通常の `bun run verify` でカードDOM、API交渉、SPA追加を検証します。

## scripts Java Toolboxの更新

`scripts/java-toolbox` は独立したMavenプロジェクトです。リリースワークフローがJDK 17で`mvn verify`を実行し、生成したJARを配布アーカイブへ同梱します。変更時はローカルでも次を実行し、4層の自動テスト、GUI起動、`--list-plugins`、`--headless --self-test`の順に確認します。

```bash
cd scripts/java-toolbox
mvn --batch-mode verify
java -jar target/filter-matome-toolbox-0.1.0-SNAPSHOT.jar --list-plugins
java -jar target/filter-matome-toolbox-0.1.0-SNAPSHOT.jar --headless --self-test --data-dir ./toolbox-data
```

GUIを表示できないCIやサーバーではGUI E2Eだけスキップされます。CLI E2E、組み込みプラグイン、外部プラグインSPI、ローカルHTTPによるETag更新テストはヘッドレスで実行されます。

JavaToolboxのE2Eは、`@TempDir`配下にデータディレクトリ、リポジトリ、ユーザーホームを作る隔離フィクスチャです。ffmpeg/ffprobeなどの外部コマンドは偽実装、更新APIと動画タイトルAPIはlocalhostのHTTPサーバーへ差し替えるため、実機の設定、証明書ストア、Windowsレジストリ、Firefoxプロファイル、外部GitHubへ接続しません。メディア、設定編集、更新、開発者向け操作を同じ隔離環境で確認し、OSにシンボリックリンク作成権限がない場合も安全な拒否と既存通常ファイルの保護を検証します。

変換や設定編集を行う場合は、対象パスを明示し、最初に`--dry-run`で予定を確認してください。失敗時はアプリデータディレクトリの設定バックアップと、各処理の`.bak-*`／`.part`を確認して復旧します。NicoCache_nl本体の管理操作は本体側の案内に従ってください。

リリースアーカイブ作成時は、`scripts/java-toolbox/target`の開発用生成物を除去し、実行JARだけを同じパスへコピーします。配布物の検証では、アーカイブ内のJARが存在し、`--list-plugins`と`--headless --self-test`を実行できることを確認します。
