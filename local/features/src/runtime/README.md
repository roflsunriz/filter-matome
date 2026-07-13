# runtime

## 役割

`runtime/` は、単一の `features.js` を読み込んだページがどの機能を起動すべきか判断する境界です。現在の実装は `page-context.ts` に集約されています。

## 公開契約

- `getFeaturePage()`: 静的HTMLの `<html data-feature-page="...">` から `mylist`、`movie-info`、`video-player`、`watch-history` を判定する。
- `isNiconicoPage()`: `nicovideo.jp` とそのサブドメインかを判定する。
- `isMlinkPage()`: mlink-video-controllerを有効にする既知のサブドメインかを判定する。
- `isWatchPage()`: `www.nicovideo.jp/watch/<動画ID>` の厳密なパスかを判定する。

`src/features.ts` がこれらの結果を使い、共通機能と各プロジェクトの `start*` 関数を起動します。

## 変更時の注意

- ホストやパスを広げる前に、対象外ページでDOM監視・API捕捉・UI挿入が起きないことを確認する。
- 静的ページを追加する場合は、`FeaturePage`、対象HTMLの `data-feature-page`、`features.ts`、`scripts/build.ts` の出力契約をまとめて更新する。
- SPA遷移時には同じ起動関数が再評価されるため、各 `start*` 関数の多重初期化防止を維持する。
- ページ判定の変更は全機能へ波及するため、型チェック、全Playwrightテスト、全体ビルドを実行する。
