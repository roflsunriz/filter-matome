# runtime

## 役割

`runtime/` は、軽量ブートストラップの `features.js` を読み込んだページが、どの機能エントリーを遅延ロードして起動すべきか判断する境界です。ページ判定は `page-context.ts`、SPA遷移通知は `navigation.ts` に集約されています。公式コードより先に同期実行する必要がある `server-context` の書き換えだけは、専用の軽量バンドルへ分離しています。

## 公開契約

- `getFeaturePage()`: 静的HTMLの `<html data-feature-page="...">` から `mylist`、`movie-info`、`video-player`、`watch-history` を判定する。
- `isNiconicoPage()`: `nicovideo.jp` とそのサブドメインかを判定する。
- `isCommonHeaderPage()`: CommonHeaderを使う`nicovideo.jp`系ページとNicoFTかを判定する。
- `isMlinkPage()`: mlink-video-controllerを有効にする既知のサブドメインかを判定する。
- `isWatchPage()`: `www.nicovideo.jp/watch/<動画ID>` の厳密なパスかを判定する。
- `filter-matome:navigation`: `pushState`、`replaceState`、`popstate`、`hashchange`を一度だけ捕捉して各機能へ配信する共通イベント。
- `server-context-override-entry.ts`: `101_disable_official_function.txt` の設定JSONを検証し、既存パスだけを同期的に書き換える。
- `server-context-override.ts`: 設定の型・実行時検証、パス適用、元の会員種別を尊重するコメント投稿保護。

`src/features.ts` がこれらの結果を使い、共通機能と各プロジェクトの `start*` 関数を起動します。
NicoFTではCommonHeader機能だけを起動し、動画一覧・視聴ページ専用機能は起動しません。

## 変更時の注意

- ホストやパスを広げる前に、対象外ページでDOM監視・API捕捉・UI挿入が起きないことを確認する。
- 静的ページを追加する場合は、`FeaturePage`、対象HTMLの `data-feature-page`、`features.ts`、`scripts/build.ts` の出力契約をまとめて更新する。
- `server-context-override.js` は `server-context` メタタグの直後で defer なしに読み込む。通常の `features.js` へ統合して実行を遅らせない。
- nlFilter側は設定JSONだけを持つ。設定形式を変える場合は `server-context-override.test.ts` と `101_disable_official_function.txt` を同時に更新する。
- SPA遷移時には同じ起動関数が再評価されるため、各 `start*` 関数の多重初期化防止を維持し、機能ごとにHistory APIを上書きしない。
- ページ判定の変更は全機能へ波及するため、型チェック、全Playwrightテスト、全体ビルドを実行する。
