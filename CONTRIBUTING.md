# Contributing to filter-matome

filter-matomeプロジェクトへの貢献に興味を持っていただき、ありがとうございます！このガイドでは、プロジェクトに貢献する方法について説明します。

## 🤝 貢献方法

### バグレポート
バグを発見した場合は、[Issue](https://github.com/roflsunriz/filter-matome/issues)を作成してください。

### 機能要求
新機能の提案は、[Feature Request](https://github.com/roflsunriz/filter-matome/issues)から行ってください。

### プルリクエスト
コードの改善や新機能の実装は、プルリクエストを通じて行ってください。

## 🛠️ 開発環境のセットアップ

### 前提条件
- Bun 1.3.8 以上
- Java Development Kit (JDK) 17 LTS 又は 21 LTS
- Maven（matome-toolboxの変更・テスト時）
- Git 2.52.0.windows.1 以上

### セットアップ手順

1. **リポジトリのフォーク**
   ```bash
   # GitHubでリポジトリをフォーク後
   git clone https://github.com/roflsunriz/filter-matome.git
   cd filter-matome
   ```

2. **依存関係のインストール**
   ```bash
   # Bunをインストール
   powershell -c "irm bun.sh/install.ps1|iex"
   # features モジュール
   cd local/features
   bun install
   ```

3. **ビルド実行**
   ```bash
   # features モジュール
   cd local/features
   bun run build
   ```

4. **エラーチェック**
   ESLintとTypeCheckを実行。
   ```bash
   # features モジュール
   cd local/features
   bun run error-check
   ```

5. **matome-toolboxのテスト**（matome-toolboxを変更した場合）
   ```bash
   cd scripts/matome-toolbox
   mvn --batch-mode verify
   ```

   `scripts/matome-toolbox/target/matome-toolbox-0.1.0-SNAPSHOT.jar` は`mvn verify`で生成されます。利用者向けリリースでは、このビルド済みJARをCIが配布アーカイブへ同梱するため、利用者にMavenの導入やビルドは要求しません。


## 📝 開発ガイドライン

### コーディング規約

#### TypeScript
- `local/features/package.json`で固定したTypeScriptを使用
- 型安全性を最優先に考慮
- ESLint + TypeCheck + Prettier の設定に従う

#### nlFilter
- ファイル名は `1XX_機能名.txt` の形式
- 100-199番台のみ編集対象
- 詳細は [nlFilters編集ガイド](nlFilters/nlFilters_編集ガイド.md) を参照

### ファイル構成
```
local/features/src/
├── common/           # 共通ライブラリ
├── [feature-name]/   # 各機能モジュール
│   ├── index.ts     # エントリーポイント
│   ├── README.md    # 機能説明
│   └── ...
└── types/           # 型定義
```

### コミットメッセージ
[Conventional Commits](https://www.conventionalcommits.org/) 形式を使用してください：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### 例
```bash
feat(mylist2): マイリスト検索機能を追加
fix(comment-filter): 正規表現エスケープの不具合を修正
docs: READMEの導入手順を更新
```

#### Type一覧
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `style`: コードスタイル変更
- `refactor`: リファクタリング
- `perf`: パフォーマンス改善
- `test`: テスト追加・修正
- `chore`: ビルド・設定変更

## 🧪 テスト

### 手動テスト
1. ローカルでビルド実行
2. NicoCache_nl環境で動作確認
3. 主要ブラウザ（Firefox、Chrome）での確認

### 自動テスト
```bash
cd local/features
bun run format:check # Prettier差分
bun run lint         # 静的解析
bun run type-check   # 型チェック
bun run test:unit    # 単体テスト
bun run test:e2e     # Playwright E2E
bun run build        # 全機能ビルド
```

すべてをCIと同じ順序で実行する場合は`bun run verify`を使用します。

## 📋 プルリクエストのガイドライン

### 作成前のチェックリスト
- [ ] 最新のmainブランチから分岐している
- [ ] コミットメッセージが規約に従っている
- [ ] ビルドが成功する
- [ ] 手動テストを実行した
- [ ] 自動テストを実行した
- [ ] 関連ドキュメントを更新した

### プルリクエストの流れ
1. **ブランチ作成**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **変更の実装**
   - 小さな単位でコミット
   - 意味のあるコミットメッセージ

3. **プッシュ**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **プルリクエスト作成**
   - テンプレートに従って記載
   - 関連するIssueをリンク
   - 詳細な説明とテスト方法を記載

## 🔍 コードレビュー

### レビュー観点
- 機能の正確性
- コードの可読性・保守性
- パフォーマンス
- セキュリティ
- 既存機能への影響

### レビュー後の対応
- フィードバックに対する建設的な議論
- 必要に応じた修正の実施
- 承認後のマージ

## 📚 ドキュメント

### 更新が必要な場合
- 新機能追加時
- 既存機能の大幅変更時
- 設定方法の変更時

### ドキュメントの種類
- README.md（概要・導入方法）
- 機能別README（詳細仕様）
- nlFilters編集ガイド
- リリースノート

## 🎯 重要な注意事項

### nlFilter編集時の注意
- **100-199番台のみ編集**
- 01-99番台は外部配布物のため編集禁止
- 依存関係を考慮した配置

### 互換性の維持
- 既存設定との互換性を保持
- 破壊的変更は事前に議論
- 移行手順の提供

### セキュリティ
- ユーザーデータの適切な取り扱い
- XSS対策の実施
- 外部APIとの安全な通信

## 🌟 貢献者への感謝

すべての貢献者の方々に心から感謝いたします。あなたの貢献により、filter-matomeはより良いソフトウェアになります。

### 貢献の種類
- コード貢献
- バグレポート
- 機能提案
- ドキュメント改善
- テスト・フィードバック
- コミュニティサポート

## 📞 質問・サポート

### 開発に関する質問
- [Discussion](https://github.com/roflsunriz/filter-matome/discussions)
- [Issue](https://github.com/roflsunriz/filter-matome/issues)

### コミュニティ
- [NicoCache_nl Wiki](https://w.atwiki.jp/nicocachenlwiki/)
- [開発スレッド](https://sportschan.org/librejp/thread/16592.html)

## 🚀 リリース手順

### メンテナー向けリリース作成
```bash
# 次のバージョン番号でタグを作成（例：#190）
git tag "#190"
git push origin "#190"

# 間違えてリリースを作った場合、タグを削除して再度リリースを作成
git tag -d "#190"
git push origin :refs/tags/#190

# GitHub Actionsが自動的に実行され、以下が行われます：
# 1. TypeScript/Bunプロジェクトのビルド
# 2. リリースファイルの作成（ZIP/TAR.GZ）
# 3. GitHubリリースページの作成
# 4. 自動リリースノートの生成
```

### バージョン管理
- **形式**: `#188`, `#189`, `#190` など
- **履歴**: [CHANGELOG.md](CHANGELOG.md)

---

**貢献してくださる皆様、ありがとうございます！一緒に素晴らしいソフトウェアを作り上げましょう！** 🚀
