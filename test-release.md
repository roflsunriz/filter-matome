# リリーステスト手順

## 🧪 #188 テストリリース実行手順

### 1. 事前確認
```bash
# 現在のブランチとステータス確認
git status
git branch

# リモートの最新状態を取得
git fetch origin

# 作業ディレクトリがクリーンであることを確認
git diff --staged
```

### 2. テストタグの作成
```bash
# テスト用タグを作成（既存の場合は削除してから）
git tag -d "#188" 2>/dev/null || true
git push origin --delete "#188" 2>/dev/null || true

# 新しいタグを作成
git tag "#188"

# タグをプッシュしてGitHub Actionsを実行
git push origin "#188"
```

### 3. 実行状況の確認方法

1. **GitHub Web UI で確認**
   - リポジトリページ → **Actions** タブ
   - "Release" ワークフローが実行されているか確認
   - 実行ログでエラーがないかチェック

2. **コマンドラインで確認**
```bash
# GitHub CLI を使用（インストール済みの場合）
gh run list --workflow=release.yml

# 特定の実行の詳細確認
gh run view [RUN_ID]
```

### 4. 期待される結果

✅ **成功時に作成されるもの**:
- GitHubリリースページに "#188" リリースが作成
- `NicoCache_nl-#188.zip` ファイル
- `NicoCache_nl-#188.tar.gz` ファイル
- 自動生成されたリリースノート

✅ **確認ポイント**:
- ビルドプロセスが正常完了
- アーカイブファイルが正しく作成
- 不要ファイル（node_modules等）が除外されている
- リリースノートが適切に生成されている

### 5. トラブルシューティング

❌ **よくある問題と対処法**:

1. **権限エラー**
   ```
   Error: Resource not accessible by integration
   ```
   → リポジトリの Actions permissions を確認

2. **ビルドエラー**
   ```
   bun install failed
   ```
   → package.json の存在と依存関係を確認

3. **Java環境エラー**
   ```
   Java setup failed
   ```
   → setup-java@v4 の設定を確認

### 6. テスト後のクリーンアップ（任意）
```bash
# テストタグを削除したい場合
git tag -d "#188"
git push origin --delete "#188"

# GitHubリリースページからも手動削除
```

## 📋 実行チェックリスト

- [ ] リポジトリの Actions permissions を確認
- [ ] 作業ディレクトリがクリーン
- [ ] 全ての変更がコミット済み
- [ ] タグ "#188" を作成・プッシュ
- [ ] GitHub Actions の実行開始を確認
- [ ] ビルドログでエラーがないことを確認
- [ ] リリースファイルが正しく作成されることを確認