# 公式HLSの全編先読み

## 現行v2（2026-09-13）

v1の全編保持は、動画がブラウザーのSourceBuffer容量を超えると失敗する。HLS側の秒数を増やしてもブラウザーの容量上限は解除できない。[MDNのappendBuffer例外](https://developer.mozilla.org/en-US/docs/Web/API/SourceBuffer/appendBuffer)もこの上限を説明している。

v2は公式HLSの再生用バッファーを操作せず、現在の画質・音質の取得計画を読み取る。`full-preload.ts`が両方のmedia playlistを先に取得し、その後は同時2要求以内で初期化情報・鍵・CMAF断片をストリームとして消費する。応答を巨大なArrayBufferやSourceBufferへ蓄積せず、NicoCache_nlの通常のキャッシュ経路へ渡す。

- `FilterMatomeBufferingApi.version`: `2`
- `getState()`: `{videoId, videoQualityId, audioQualityId, videoMode, audioBitrate, ready}` または未準備時の`null`。
- `getPlan()`: 同じ状態と`resources: [{url, rangeStart?, rangeEnd?}]`。Rangeの終了はexclusive。未準備・ライブでは`null`。
- 取得元はHLSの現在の`loadLevel`（なければ`currentLevel`）と`audioTracks[audioTrack]`。公式`getQualityByLevelIndex()`で品質を対応付け、映像の`height`と音声ID末尾の`kbps`からNicoCache_nlの品質と照合する。
- `initSegment`、`decryptdata.uri`、断片URL、byte rangeを収集して重複除去する。署名付きURLはメモリー内だけで使い、ログ・文書・検証JSONへ出さない。
- v1の`setEnabled()`とHLSの上限・読込位置の書き換えは削除した。CommonHeaderはv2の`getState/getPlan`を検査するが、呼び出さない。
- GET対象はHTTPSの公式Domand 2ホストと`nicocachenl.test/media/v1/playback-sessions/`のみ。認証はブラウザーの通常のCookie処理に任せ、Cookieを取り出さない。
- 同じ`videoMode`・`audioBitrate`のNicoCache_nl完成キャッシュをREST APIで確認して100%とする。異なる品質の完成キャッシュ、取得数だけの完了、失敗した要求を100%としない。
- 既に同じ品質が完成していれば転送せず完了する。中止・動画/品質切り替え・破棄はAbortControllerで止め、取得済みキャッシュは削除しない。

HLSの計画取得に使うプロパティと生成境界は下記6ビルドで確認し、現行の配信資産名は2026-09-12T20:48:10.207Zの再captureでも`PlayerSeekBar-dUxtfLwS.js`だった。自動検証は3世代以上の一致・非対象0件・構文に加え、計画取得の各参照を検査する。全編取得は再生用バッファーの100%保持を意味しない。

192MiB相当を64KiBのチャンクとして消費する単体テスト、両playlistの先行取得、異なる品質の完成を無視するブラウザーテストを追加した。実Watchの公開動画sm9では現在の360p/128kの完成キャッシュと100%表示を確認した。報告された`sm45650421`・360p/192kはログイン必須のため、ログイン環境での最終確認が残る。詳細は`verification.md`に記録する。

A-Bと通常シークの同期は[再生位置同期API](playback-control-bridge.md)を参照する。

## 旧v1の解析と検証履歴（現在は使用しない）

2026-09-12に既存sandboxの`PlayerSeekBar`資産を解析し、現行Watchも再取得した。HLS sessionの生成順は、`this.hlsjs`の構築 → `attachMedia(this.video)` → `MANIFEST_PARSED`登録 → 公式`setBufferingLimit()` → access-rights取得・`loadSource()`である。

- sessionの通常設定は`maxBufferSize: 0`、`maxBufferLength: 180`、`maxMaxBufferLength: 600`。動画全体の30%という割合ではない。
- `setBufferingLimit()`は公式controllerからsessionの再生成後にも呼ばれ、指定秒数を1～180へ制限する。上限値を一度書き換えるだけでは維持できない。
- プレビュー専用の`context.isPreview`では`bufferLengthLimit`に達すると`stopLoading()`する。プレビューへはAPIを公開しない。
- HLSの映像・音声controllerの`getLoadPosition()`は再生開始後に`media.currentTime`を優先する。[HLS.jsのstartLoad API](https://hlsjs.video-dev.org/api-docs/hls.js.hls.startload)にはseekを省略する引数があるが、`startLoad(0, true)`だけでは先頭側の穴を継続して埋められない。これは資産内の実装でも確認した。

全編先読み中だけ両controllerの読込位置を、それぞれのSourceBufferの先頭から見た最初の穴へ向ける。先読み上限を`duration + 1`秒、後方保持を無制限にし、映像・音声を通常のHLS要求で読み込む。`currentTime`、`playbackRate`、`paused`、公式画質・認可・Cookieを変更しない。

解除時には元の上限と公式が途中で指定した最新の制限へ戻す。HLSの容量超過・致命的エラー時も通常設定へ戻し、停止理由を返す。破棄されたsessionのAPIは消し、新しいsessionのAPIを消さない。ブラウザーの物理的なバッファー容量を越えて100%を保証するものではなく、容量不足はUIへ明示する。

## 旧v1の公開契約

`globalThis.FilterMatomeBufferingApi`の版は`1`。

- `getState()` → `{ enabled: boolean, error: null | "buffer-limit" | "load-error", videoId: string }`
- `setEnabled(boolean)` → 更新後の同じ状態。準備前・破棄後の開始は拒否する。
- 公開・解除・エラー・破棄で`filter-matome:api-status-change`を送出する。
- CommonHeaderの`full-buffer`項目は版と必須メソッドだけを検査する。自動プローブは`getState()`も`setEnabled()`も呼ばない。
- UIは現在URLの動画IDとAPIの動画IDを照合し、動画切り替えで解除する。進捗は`HTMLMediaElement.buffered`（音声・映像の共通範囲）全体から計算し、先頭や途中に穴があるのに末尾だけで100%にしない。トラックの端数差に限り0.1秒の許容を設ける。

Matchは次の隣接境界へ1回だけ適用する。HLS識別子をcaptureし、同じオブジェクトの`Events`を使う。対象URLは公式Watchの`PlayerSeekBar-*.js`だけ。

```text
this\.hlsjs\.attachMedia\(this\.video\),this\.hlsjs\.on\(([A-Za-z_$][\w$]*)\.Events\.MANIFEST_PARSED,
```

公式コードをfeaturesへ複製せず、101番のclosureへHLS参照を閉じ込める。内部controllerや認可データをグローバルへ渡さない。通常のAPIにないHLS内部の読込位置を使うため、追従時はMatchだけでなくcontrollerのメソッドとバッファーの参照関係を必ず検証する。

## 世代比較

URLの共通部分は`https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/`。下表のファイル名を末尾へ付ける。各行は異なる公式ビルドであり、同一URLの改変コピーを世代数へ加えない。すべてMatchは1回、置換後ES Moduleの構文は合格。

| 資産 | 取得日時（UTC） | bytes | SHA-256 | HLS識別子 / 上限変数 | 前の世代との差分 |
| --- | --- | ---: | --- | --- | --- |
| `PlayerSeekBar-DhFwmJ0e.js` | 既存資産・取得時刻未記録。2026-09-12再確認 | 1,383,802 | `493fbda6d276b40b6a1cc903a2d867729aace173d61df0843010a2b70d5e9205` | `OA / cj` | 参考の旧資産。ほかの時刻付き5ビルドとは別に記録 |
| `PlayerSeekBar-DV9Bs-dx.js` | 2026-07-23T20:02:30.173Z | 1,385,964 | `031e174456308e80863ad1f9fd8dd61d45706c1a2f6aa75562e0185c9651f646` | `OA / sj` | 旧資産と上限変数名が異なる。生成境界は維持 |
| `PlayerSeekBar-DzqrqG09.js` | 2026-08-19T23:45:24.377Z | 1,387,716 | `0a2046ec57d9a19f386dd3c8a02e9867837ad3874b167abd8728b702a49d43d9` | `kA / cj` | HLS・上限変数名が変更。sessionの参照関係は同じ |
| `PlayerSeekBar-CRVaxiiz.js` | 2026-08-24T15:44:21.093Z | 1,397,325 | `2c232bec978e5bdb9a0bbea6fde081317dbb3176319be43ed89a2b8acb4d6a62` | `Jj / DM` | さらに識別子が変化。映像・音声の読込位置制御は同じ |
| `PlayerSeekBar-BKS3ifbV.js` | 2026-08-26T06:46:01.350Z | 1,397,190 | `93922c43a79b90f56f74c7b11cc906503695ba1bc38e839688cf53bc1712e949` | `Yj / OM` | 識別子が再変更。通常上限と生成順は維持 |
| `PlayerSeekBar-dUxtfLwS.js` | 2026-09-12T12:35:46Z（CDNへ直接取得） | 1,397,349 | `446d727f213f7101f54188553d3daed20b9665cb4e6d9666e6221baf387f6e02` | `Yj / OM` | 前版比+159 bytes。HLS session本文SHA-256は前版と同じ |

同一URLの適用済みcaptureも比較した。

- 2026-08-19T23:43:43.991Z、DzqrqG09、1,387,298 bytes、`f4b828e1c7379eee61f08bd98011d1be1ff512b6f3dbb6e3600521396a742b30`にはsession外の旧コメントAPI挿入がある。HLS session本文のハッシュは無改変コピーと一致し、別世代として数えない。
- 2026-09-12T12:12:51.224Z、dUxtfLwS、1,397,811 bytes、`416871e0a3fe8b127c1c7c9832c6a42201e173b195195c113de22aacea01589b`にはsession外の再生速度API挿入がある。同じHLS session本文ハッシュで、CDN原本とも一意一致を確認した。

`analyze-full-buffer.ts`は6ビルド・8資産の一致数、生成境界、通常上限、session本文ハッシュ、構文を記録し、対象外の異なるJavaScript 526資産で0回を確認した。HLS session本文自体は5種類（BKS3ifbVとdUxtfLwSは同一）であり、minify識別子が変わる複数世代を含む。取得時刻が未記録の参考資産を除いても最低3世代の条件を満たす。旧CDN URLの再取得は403だったため保管済み資産を利用し、現在のCDN応答と過去のcaptureを混同していない。

PCの通常Watchと現在の動画を扱う同じHLS sessionが対象。プレビュー、MP4 session、スタンドアロンvideo-playerへ全編先読みAPIを適用しない。

## v1実装時の動作検証（2026-09-12）

- 単体: 通常設定の復元、公式制限の更新、音声と映像の異なる穴、100%の誤判定防止、容量超過・致命的エラー、破棄・新API保護、プレビュー非公開。
- ブラウザー: 現在位置と時刻入力、無効時刻、0.1秒境界、一時停止、A-B反復・解除・クリア、終端B、動画要素の置換、SPAと再接続、キーボード、360/800/1920px、日本語・英語・RTL。
- 実Watch: `sm9?from=230`で初期buffer `[228.228, 233.964262]`を観測した後、100秒で一時停止し全編先読み。`[0, 320.086432]`、100%へ到達し、100秒・一時停止を維持。100～101秒のA-B反復、解除、API一覧の自動`active`も確認。Chrome 153.0.8010.36、通常のNicoCache_nl経路、認証情報なし、キャッシュ/SW迂回なし、features手動注入なし。
- Firefox 153.0の隔離プロフィールでも同じ実Watchを開き、全編`[0, 320.086433]`、100秒・一時停止維持、100～101秒の反復、API一覧`active`を確認した。公式の初期自動再生がまだ保留中の時点でpauseしても、最初の操作で自動再生が始まる場合があるため、初期再生の準備完了後に一時停止してから先読みを開始する条件で確認した。利用者の通常プロフィールは使っていない。

`verification.md`にも実行結果を記録する。API状態の`active`はAPI契約の存在を表し、メディアの100%取得成功とは別に検証する。

```powershell
cd local/features
bun run sandbox:analyze-full-buffer
bun run sandbox:verify-playback-tools
bun run sandbox:verify-api-status-menu
```

A-Bリピートは標準の動画イベントを使い、公式資産に新しいAPIを追加しない。`ended`のcapture listenerは有効な区間の反復時だけ次動画の終了処理を止め、解除後は通常のイベントへ戻す。開始・点変更・動画切り替え・破棄でタイマーとイベントを明示的に管理する。
