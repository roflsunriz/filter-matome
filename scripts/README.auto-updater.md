# Filter Matome Auto Updater

## 概要
GitHub の最新安定版リリースを定期的に確認し、アセットを自動ダウンロードするシンプルなアップデーターです。旧来のスクレイピング機能やカスタム更新設定は削除され、保存先と更新間隔だけを指定する構成になりました。

## 主な機能
- `GET /repos/roflsunriz/filter-matome/releases/latest` を利用した最新安定版の取得
- ETag を用いた条件付き GET によるレート制限対策
- 取得したアセット (`assets[*].browser_download_url`) の一括ダウンロード
- 更新間隔の指定、開始・停止、ログ確認、設定保存といった基本操作のみを備えた簡潔な GUI

## 必要環境
- Python 3.8 以上
- `requests` パッケージ  
  インストール例: `python -m pip install requests`

## 使い方
1. `scripts/auto-updater.pyw` を実行します。コンソールを表示したい場合は `python scripts/auto-updater.pyw` を使用してください。
2. 保存先ディレクトリを指定し、必要に応じて更新間隔（分）を調整します。
3. `開始` を押すと監視が始まり、`停止` で終了します。`設定保存` で現在の保存先と更新間隔が `scripts/config.json` に保存されます。
4. アセットが更新されると、指定した保存先に `.part` 拡張子の一時ファイル経由でダウンロードされ、完了後に正式なファイル名へリネームされます。

## 認証について
公開リポジトリの最新リリースを取得するためにアクセストークンは必須ではありませんが、プライベートリポジトリやレート制限緩和が必要な場合は GitHub Personal Access Token を利用してください。

- 環境変数 `GITHUB_TOKEN` に設定すると自動で使用されます。
- もしくは `config.json` 内の `github_token` に手動で記述できます（GUI からの編集はできません）。

## 設定ファイル
`scripts/config.json` に以下の情報を保存します。

| キー              | 説明                                              |
|-------------------|---------------------------------------------------|
| `target_dir`       | ダウンロード先ディレクトリ                        |
| `interval_minutes` | 更新間隔（分）                                    |
| `etag`             | 条件付き GET 用 ETag                              |
| `last_release_id`  | 最終ダウンロード済みリリース ID                   |
| `last_checked`     | 最終確認日時（UTC ISO 8601）                       |
| `github_token`     | オプションのアクセストークン（GUI では編集不可） |

## トラブルシューティング
- HTTP 304 が連続する場合は ETag により変更なしと判定されています。`config.json` の `etag` を削除すると強制再取得できます。
- HTTP 401/403 エラーが発生した場合はトークンの設定や権限を確認してください。
- ネットワークエラーが頻発する場合は更新間隔を伸ばし、GitHub のレート制限に注意してください。

## サポート
不具合や改善要望は GitHub Issue までお願いします。  
[filter-matome](https://github.com/roflsunriz/filter-matome/issues)
