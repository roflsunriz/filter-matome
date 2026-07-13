# features テストガイド

## 実行方法

`local/features/` で実行します。

```powershell
bun run test:unit
bun run test
```

- `test:unit`: `scripts/test-unit.ts` が `tests/*.test.ts` を実行する。
- `test`: 単体テストに続けて、`package.json` で列挙した `*.spec.ts` をPlaywrightのヘッドレスChromiumで実行する。
- `test-results/`: Playwrightの一時生成物。編集・コミットしない。

## fixture方針

- `tests/fixtures/` には、対象機能が依存するDOM、データ、イベントだけを保存する。
- 実ページ由来のfixtureは採取元と採取日をコメントに残し、ユーザー名、ID、Cookie、トークンなどを匿名化する。
- 外部API、NicoCache_nlのグローバル、localStorage、通知、クリップボード、ダウンロードは、検証する契約に必要な最小スタブにする。
- CSSセレクター、data属性、レスポンス形状は実環境で確認した値を使い、表示言語や生成クラス名へ依存させない。
- HTMLを直接配信するfixtureはdoctype、言語、UTF-8指定を含む完全な文書にする。

## テストの分担

- `cache-data-manager.spec.ts`: `tempList`・`cacheList` を使う一覧、検索、絞り込み、ソート、詳細、削除、一括操作。
- `comment-filter2.spec.ts`: 実IndexedDBを使う設定UI、ルールCRUD、即時適用、正規表現プレビュー。
- `mlink-video-controller.spec.ts`: パネル、各タブ、モジュール設定、インポート・正規化、主要UI操作。
- `movie-info.spec.ts`: 基本4ソース、任意コメント取得、部分失敗、JSON・コピー・ダウンロード操作。
- `mylist2.spec.ts`: 実IndexedDBを使うマイリスト・動画・設定・詳細・一括操作。
- `video-player.spec.ts`: スタンドアロンUIと背景モードなどのブラウザー統合。
- `watch-history.spec.ts`: 実IndexedDBを使う履歴・統計・シリーズ・削除・入出力・DB管理。
- `*.test.ts`: フィルター、削除条件、URL生成、API正規化、設定判断など、DOMから分離できる境界値と回帰。

## 追加・変更時の原則

- バグ修正では、原因に最も近い層へ再発防止テストを追加する。
- UI操作は表示確認だけで終わらせず、クリック、入力、選択、キャンセル、保存、再表示まで検証する。
- IndexedDBのテストはストア作成だけでなく、既存データ、マイグレーション、破損時の復旧を必要に応じて含める。
- 実サービスへの書き込み、削除、通知送信は行わず、境界でスタブ化する。
- fixtureを更新した場合は、実装の不具合を期待値へ取り込んでいないか差分を確認する。
