# mylist2

## 役割

ブラウザーのIndexedDBへ保存する独自マイリストを管理するSPAです。マイリスト、動画、キーワード、メモ、検索・並び替え、一括操作、インポート・エクスポート、データベース管理を提供します。

- 配信URL: `https://www.nicovideo.jp/local/features/dist/pages/mylist2/index.html`
- HTML生成元: `index.html`
- 起動関数: `startMylist2()`
- Service Worker: `dist/mylist-service-worker.js`

## 構成

- `index.ts`: 共通ヘッダー、スタイル、グローバル互換クラス、UIの起動。
- `components/database.ts`: `Mylist2DB` のスキーマ、移行、永続化要求、健全性検証、バックアップ。
- `components/manager-refactored.ts`: UIから利用する操作の調停。
- `components/selector.ts`: 他ページからマイリストを選択して動画を追加するUI。
- `services/`: マイリスト、動画、キーワード、設定、入出力、Google Drive、DB管理、外部API。
- `ui/mylist-ui-core.ts`, `ui/mylist-ui-rendering.ts`, `ui/mylist-ui-events.ts`, `ui/ui-refactored.ts`: 一覧基盤、項目描画、イベント配線、詳細・設定モーダル。
- `ui/`: 上記に加え、一括操作、仮想スクロール、アクションメニューなどのUI部品。
- `utils/linkify.ts`: 動画リンク、ローカルプレイヤーURL、説明文の安全なリンク化。
- `service-worker.ts`: 本体ファイルとサムネイルのキャッシュ戦略。

## データとマイグレーション

DB名は `Mylist2DB` です。主なストアは次のとおりです。

- `mylists`: マイリスト情報。
- `videos`: 動画情報、所属、タグ、メモ。
- `manager`: 管理状態。
- `keywords`: マイリスト別キーワード。
- `metadata`: DB作成、バックアップ、健全性、移行履歴。

現在のバージョン、ストア、インデックス、移行手順は `components/database.ts` を正とします。型だけを更新して既存DBを暗黙に互換扱いせず、明示的な移行とバックアップを追加してください。

## 主な連携

- `mlink-video-controller/handlers/mylist2.ts`: 視聴中動画をmylist2へ追加する導線。
- `common/thumbnail-fallback.ts`: サムネイル欠落時の表示。
- `common` の共通ヘッダーと通知。
- ニコニコ動画API: 動画情報更新と公開状態確認。
- Google Drive: ユーザーが明示的に認証・操作した場合のバックアップ連携。

動画リンクは設定に応じてニコニコ動画またはローカルvideo-playerへ移動します。削除済み・非公開・ローカルキャッシュの状態を混同しないでください。

## Service Worker

`service-worker.ts` は `features.js`、mylist2のHTML、サムネイルをキャッシュします。変更時はキャッシュ名、scope、期限、更新失敗時のフォールバックを確認し、古いキャッシュが無期限に残らないようにします。

## 変更時の確認

- DB変更: 移行、健全性検証、緊急バックアップ、入出力形式を更新する。
- 一覧変更: 仮想スクロール、選択状態、全選択と中間状態、一括操作を確認する。
- API変更: 外部書き込みをテストから除外し、失敗時の復旧操作を表示する。
- Google Drive変更: 認証情報を保存・出力せず、ユーザー操作なしに通信しない。
- 説明文表示: `linkify.ts` のサニタイズを迂回しない。

## テスト

- `tests/mylist2.spec.ts`: 実IndexedDBを使う一覧、検索、ソート、詳細、設定、選択、一括操作。
- `tests/mylist2-video-service.test.ts`: 動画情報更新と公開状態のサービス境界。
- `tests/mlink-video-controller-mylist2.test.ts`: mlinkからの追加導線。

```powershell
cd local/features
bun run test:unit
bunx playwright test tests/mylist2.spec.ts
bun run type-check
bun run build
```
