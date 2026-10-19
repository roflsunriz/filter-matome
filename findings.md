# 調査知見

- `NICO_APP_ROOT`（本体・source/JAR）と `NICO_DATA_ROOT`（runtime data）を分ける。data rootは設定/起動propertyで変わるため固定pathを仮定しない。成果物のsymlinkは置換前に `LinkType` と `Target` を確認する。
- Java extensionは1個の実行class fileだけで完結させる。inner/anonymous/helper classを生成せず、Bun buildとは別にNicoCache本体とJDKでcompileする。
- 公式assetをNicoCache経由でcaptureすると別filter適用済みの場合がある。SHAだけでCDN原本とみなさずmarker・対象class・本文hashを確認し、同一内容の複製を別世代に数えない。
- nlFilterによる公式API変更はfilter、公開API、API status menu/probe、型、翻訳、test、文書を一体更新する。最低3世代+PC/responsiveで意味境界、一致数、対象外0、構文、参照関係を検証し、minify名のwildcard化で逃げない。
- 自動probeは存在/版/method/markerだけを副作用なしで確認する。notification refresh、再取得、再生変更、menu操作などを診断目的で呼ばない。
- 全編先読みはv2のplan/stateだけを公開し、browser bufferへ全編保持するv1を復活させない。同品質の完成cacheをNicoCache側で確認して100%とし、HLS limit・再生stateを変えない。
- cache品質IDはcodec prefixを除いて `lowest` 等を保持し、実pixel heightと同一視しない。audioは数値kbps部分を使い、`hr` をbitrateと誤認しない。
- Firefox実profileはES module fetchが新版でもscript読込が旧cacheのことがある。一時的にHTTP cacheを無効化して取得し、通常へ戻した再読込後のAPI値と動作で確認する。API版だけで反映済みと断定しない。
- 公式Watchのseekは公式mediaの `seek`→`setCurrentTime` 境界を使う。HTMLVideoElementだけ変えると内部時計が旧値へ戻す。local playerは別時計。
- `window.NicoCache_nl.watch` はURL/media実体から取れないmetadataのfallbackに限定する。cache状態は `/api/v1/.../cache-entries`、実mediaは `/media/v1` を使い、旧 `/cache/*` を使わない。
- 原宿panelは公式inline `left/top` に勝つ対象5panelの座標だけ `!important` を許可する。CSS更新時はcontractとnlFilterの版付きURLを揃え、同URL cache残留を避ける。
- control endpointのport/tokenはdata rootのpropertyから読む。debug変更は元値を記録し、検証後に戻して再起動する。log/証明書/dataには秘密があるため出力・commitしない。
- `scripts/build.ts` は軽量bootstrap、feature entry、Worker、静的HTMLを一括生成する。旧「単一bundle」説明を根拠にせず、`local/features` 全体buildと必要file検査を行う。
