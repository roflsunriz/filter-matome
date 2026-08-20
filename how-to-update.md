1. local/features/package.jsonのバージョンを更新する（例：300 -> 301）（特に指示がない場合は基本的にメジャー更新を行うこと）
2. CHANGELOG.mdを更新しチェンジログを記録する（Keep a Changelog形式に従う）。前回のリリースタグからのコミット履歴を全て参照して詳しく記録する。
3. README.mdのlatestバッジのバージョンを更新する
4. 最後にコミットとプッシュを行う
5. git tag "#(version)"
6. git push origin "#(version)" の操作でGithub Actionsが自動でリリースを作成する。タグは`#238`、配布アーカイブはURLフラグメントとの衝突を避けた`filter-matome-238.7z`のように、ファイル名側だけ`#`を除く。

## 公式コメント再取得APIの追従確認

ニコニコ動画の公式資産更新でcomment-filter2の「今すぐ適用」がページ再読み込み確認へ戻った場合は、`local/features/src/sandbox/README.md`の手順で公開視聴ページ資産を再取得します。Cookie、認証ヘッダー、HTMLは保存せず、取得済みES Moduleを実行しないでください。

Matchを変更する前に、`local/features/src/sandbox/comment-reload-match-history.md`へ公式原本のURL、SHA-256、サイズ、Matchと一致数、前版との差分、意味上の根拠を追記します。履歴が3版以上あり、minify名が実際に変化した版を含み、全履歴で対象に1回・他資産に0回だけ一致することを確認できるまでは、識別子を無条件にワイルドカード化しません。

```powershell
cd local/features
bun run sandbox:analyze-comment-reload
bun run sandbox:verify-comment-reload
bun test tests/comment-reload-nlfilter.test.ts tests/official-player-bridge.test.ts
bunx playwright test tests/comment-filter2.spec.ts
```

解析が失敗した場合は、最新資産をde-minifyして`POST /v1/threads`の再実行、直前の追加取得条件、成功後の公式ストア更新と描画更新を追跡します。`nlFilters/102_comment_reload_api.txt`は確認できたactionへだけ接続し、ストア本体やWatchデータをグローバルへ公開しません。新しいMatchで解析コマンドとテストが成功しない限り置き換えず、旧Matchが外れた環境では通常再読み込みを自動実行せず、一度だけ必要なハード再読み込み方法を通知します。変更前へ戻す場合は`102_comment_reload_api.txt`だけを以前の版へ戻し、ブラウザーキャッシュを消してWatchページをハード再読み込みします。

## nlMovieFetcherの追従確認

ニコニコ動画の配信仕様変更へ追従するときは、`local/features/src/api-info/nl-movie-fetcher-api.md` のraw CDP手順で、Watch API、access-rights API、映像・音声分離playlistを再観測します。Java拡張は対象NicoCache_nlのJARをclasspathにして`nlMovieFetcher.java`と`FilterMatomeSmartFetcher.java`を同時にコンパイルし、生成物が同名の2クラスだけであることを確認してください。URL許可や取得処理を変更した場合は署名URLの取得だけで終了せず、公開動画をsmartFetcherから実行し、履歴が`completed`、nlMovieFetcherの`completed`と`total`が一致、`bytesTransferred`が0より大きいことまで確認します。署名クエリー、Cookie、アクセス権キーは検証記録へ残しません。TypeScript側は通常の `bun run verify` でカードDOM、API交渉、スケジューラーSPAを検証します。

smartFetcherの永続形式を変更するときは、`data/filter-matome-smart-fetcher.json`の旧データ復旧、破損退避、再起動時の`running`回収を確認します。Cookieは状態JSONへ混在させず、許可名を`nicosid`、`domand_bid`、`user_session`、`user_session_secure`に限定したまま、AES-GCM暗号文と256ビット鍵を別ファイルへ保存してください。平文Cookie、署名URL、アクセス権キーをテスト出力やログへ含めてはいけません。

## scripts matome-toolboxの更新

`scripts/matome-toolbox` は独立したMavenプロジェクトです。リリースワークフローがJDK 17で`mvn verify`を実行し、生成したJARを配布アーカイブへ同梱します。変更時はローカルでも次を実行し、4層の自動テスト、GUI起動、`--list-plugins`、`--headless --self-test`の順に確認します。

旧名称の既定データディレクトリ`~/.filter-matome-toolbox`があり、`~/.matome-toolbox`がまだない場合は、初回起動時に設定、プラグイン、ログを新しいディレクトリへ自動移行します。`--data-dir`を明示した場合は指定先をそのまま使用します。

```bash
cd scripts/matome-toolbox
mvn --batch-mode verify
java -jar target/matome-toolbox-0.1.0-SNAPSHOT.jar --list-plugins
java -jar target/matome-toolbox-0.1.0-SNAPSHOT.jar --headless --self-test --data-dir ./toolbox-data
```

GUIを表示できないCIやサーバーではGUI E2Eだけスキップされます。CLI E2E、組み込みプラグイン、外部プラグインSPI、ローカルHTTPによるETag更新テストはヘッドレスで実行されます。

matome-toolboxのE2Eは、`@TempDir`配下にデータディレクトリ、リポジトリ、ユーザーホームを作る隔離フィクスチャです。ffmpeg/ffprobeなどの外部コマンドは偽実装、更新APIと動画タイトルAPIはlocalhostのHTTPサーバーへ差し替えるため、実機の設定、証明書ストア、Windowsレジストリ、Firefoxプロファイル、外部GitHubへ接続しません。メディア、設定編集、更新、開発者向け操作を同じ隔離環境で確認し、OSにシンボリックリンク作成権限がない場合も安全な拒否と既存通常ファイルの保護を検証します。

変換や設定編集を行う場合は、対象パスを明示し、最初に`--dry-run`で予定を確認してください。失敗時はアプリデータディレクトリの設定バックアップと、各処理の`.bak-*`／`.part`を確認して復旧します。NicoCache_nl本体の管理操作は本体側の案内に従ってください。

リリースアーカイブ作成時は、`scripts/matome-toolbox/target`の開発用生成物を除去し、実行JARだけを同じパスへコピーします。配布物の検証では、アーカイブ内のJARが存在し、`--list-plugins`と`--headless --self-test`を実行できることを確認します。
