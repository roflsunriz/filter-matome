# nv-comment API（コメントサーバ）仕様

## APIエンドポイント
- https://public.nvcomment.nicovideo.jp/v1/threads
- または 実際のホスト（ベースURL）は再生ページのAPIデータ `apiData.comment.nvComment.server` により提供される。
- よって、ベースURL+パス = apiData.comment.nvComment.server + "/v1/threads"

## server, params, threadKey
- server: 実際のホスト（ベースURL）は再生ページのAPIデータ `apiData.comment.nvComment.server` により提供される。
- params: 再生ページから取得される `apiData.comment.nvComment.params` をそのまま使用する。
- threadKey: 再生ページから取得される `apiData.comment.nvComment.threadKey` をそのまま使用する。

## 目的
- `common.ts` のコメント取得ロジックに従い、コメントサーバ（nv-comment）のリクエスト/レスポンス仕様を明文化する。

## 前提
- クライアントは再生ページから取得した `params` と `threadKey` をそのまま POST ボディとして送信する。
- `common.ts` の現行実装を忠実に反映する（ヘッダ、HTTP メソッド、エンドポイント、レスポンス処理）。

## 作戦（Plan）
1. `POST {server}/v1/threads` に対して JSON ボディを送信する。
2. レスポンス JSON の `data.threads` 配列から `fork === "main"` のスレッドを抽出し、`commentCount` が最大のものをメインスレッドとする。
3. メインスレッドの `comments` を呼び出し元で利用できる形で返す（`common.ts` の挙動に準拠）。

## 変更差分（作成ファイル）
- 作成: `local/features/src/api-info/nv-comment-api.md`（本ファイル）

## エンドポイント
- メソッド: `POST`
- パス: `/v1/threads`

## リクエスト
- Headers（`common.ts` 実装に合わせて送信）:
  - `x-client-os-type`: `others`
  - `X-Frontend-Id`: `6`
  - `X-Frontend-Version`: `0`
  - `Content-Type`: `application/json`

- Body（JSON）: `common.ts` は以下の形のオブジェクトを送信する:
```json
{
  "params": /* apiData.comment.nvComment.params の値（構造はサーバが決める） */,
  "threadKey": "/* apiData.comment.nvComment.threadKey */"
}
```
- 備考: `params` と `threadKey` は再生ページ（server-response/meta）から取得される値をそのまま使用する。型や中身はサーバ実装に依存するため、クライアントは値を検証せずに送信する（サーバ側で検証される想定）。

## レスポンス（想定スキーマ）
- `common.ts` は `response.json()` を `CommentApiResponse` 型として扱っています。最低限期待される形は次の通りです:
```json
{
  "meta": { /* 任意のメタ情報 */ },
  "data": {
    "threads": [
      {
        "id": "string",
        "fork": "main" | "easy" | "owner",
        "commentCount": 123,
        "comments": [
          {
            {
            "id": "917323642487013376",
            "no": 415505,
            "vposMs": 490,
            "body": "大　東　亜　以　下　⑨",
            "commands": [
                "shita",
                "big",
                "red",
                "184" (コマンド:white, red, pink, orange, yellow, green, cyan, blue, purple, black, white2, red2, pink2, orange2, yellow2, green2, cyan2, blue2, purple2, black2, _live, invisible, full, ender, patissier, ca, big, medium, small, defont, gothic, mincho, ue, naka, shita)
                (その他サーバー側が使用する、ユーザーには意味のないコマンド: 3ds, 184, etc...)
            ],
            "userId": "36mGMlnZz_zf5RP4wkizwFH64_Q",
            "isPremium": true,
            "score": 0,
            "postedAt": "2021-12-06T16:56:39+09:00",
            "nicoruCount": 18,
            "nicoruId": null,
            "source": "nicoru",
            "isMyPost": false
            }
          }
        ]
      }
    ]
  }
}
```
- 備考: 実装は `data.threads` 配列に依存し、各スレッドは `fork`, `commentCount`, `comments`（配列）を含む必要がある。

## メインスレッド選択ロジック（`common.ts` の挙動）
- `threads` の中から `thread.fork === "main"` を抽出する。
- 抽出後、`commentCount` が最大のスレッドを選ぶ（reduce による最大値比較）。
- メインスレッドが未検出の場合は空スレッド（`{ id: "", fork: "main", commentCount: 0, comments: [] }`）を返す実装にフォールバックする。

## エラーハンドリング
- HTTP ステータスが `ok` でない場合、`common.ts` はコンソールにエラーログを出力し `Error` を投げる／例外処理を行う。
- ネットワークや JSON パースに失敗した場合、catch 節でログ出力され `void` を返す（呼び出し元での追加処理推奨）。

## 実装参照箇所
- `local/features/src/common/common.ts` の `fetchNicoComments` 関数：
```startLine:endLine:local/features/src/common/common.ts
170:217:local/features/src/common/common.ts
```
（上記に記載された処理フローとヘッダ/ボディの組み立てがそのまま仕様となる）

## 検証手順（Runbook）
1. 開発環境で再生ページから取得される `apiData.comment.nvComment` をコンソールで出力して `server`, `params`, `threadKey` が存在することを確認する。
2. `fetchNicoComments` を実行して `POST {server}/v1/threads` が発生することをネットワークタブで確認する。
3. レスポンスの `data.threads` が上記スキーマに合致し、`main` スレッドが選ばれて `comments` が返ることを確認する。
4. 異常系（404/500/ネットワーク断）でエラーハンドリングが動作し、過度に例外を投げないことを確認する。

## ロールバック手順
- 本ドキュメントは静的ドキュメントのためロールバック不要。実装変更を加えた場合は元の `fetchNicoComments` 実装に戻す（Git リバート）。

## 備考・未確定点
- `params` の内部構造や各コメントオブジェクトの完全なフィールドはサーバ実装に依存するため、詳細スキーマはサーバ側の仕様書または `CommentApiResponse` 型定義を参照すること。
- 追加で型安全を強化する場合、`src/types` 下に `nv-comment` 用の型定義を作成し、Zod 等でランタイム検証を行うことを推奨する。


---

作成日: 2025-09-29
