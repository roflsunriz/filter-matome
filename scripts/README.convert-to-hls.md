# HLS変換ツール (convert-to-hls.py)

## 概要
`convert-to-hls.py` は、入力動画が H.264/MP4 の場合は映像・音声をコピーして高速に CMAF 構成の HLS (fMP4) を生成し、それ以外のコーデックは H.264/AAC に再エンコードして同じ構成へ変換する Python スクリプトです。

## 主な機能
- H.264/MP4 は映像・音声ストリームをコピーして高速変換
- 非 H.264 の動画は libx264 + AAC (ステレオ) で再エンコード
- 出力は `<ファイル名>.HLS` 配下の `master.m3u8` / `video.m3u8` / `audio.m3u8` と `.cmfv`/`.cmfa` の CMAF セグメント
- フォルダ入力や再帰探索、複数動画の一括処理に対応
- `--dry-run` で ffmpeg コマンドを確認、`--overwrite` で再出力時の掃除が容易

## 出力構成
```
(ファイル名).HLS
│  audio.m3u8
│  master.m3u8
│  video.m3u8
│
├─audio
│      001.cmfa
│      002.cmfa
│      ...
│      init01.cmfa
│
└─video
        001.cmfv
        002.cmfv
        ...
        init01.cmfv
```

## 必要要件
- Python 3.8 以降
- FFmpeg (ffmpeg / ffprobe が PATH に通っていること)

## 使い方
1. ターミナルまたは PowerShell で `scripts` ディレクトリへ移動します。
   ```powershell
   cd C:\filter-matome\scripts
   ```

2. 変換したい動画ファイルを指定して実行します。
   ```powershell
   python convert-to-hls.py "C:\Videos\sample.mp4"
   ```
   - 出力は入力ファイルと同じ階層に `sample.HLS` フォルダとして生成されます。

3. 複数ファイルをまとめて処理する場合は、フォルダを指定します。
   ```powershell
   python convert-to-hls.py "D:\BatchTargets" --recursive
   ```
   - `--recursive` を付けるとサブフォルダも探索します。

4. 出力ルートをまとめたい場合は `--output` を指定します。
   ```powershell
   python convert-to-hls.py "C:\Videos\movie.mkv" "C:\Videos\clip.mov" --output "D:\HLS-Outputs"
   ```
   - 各ファイルごとに `<ファイル名>.HLS` フォルダが `D:\HLS-Outputs` 配下に作成されます。

5. コマンドだけを確認したい場合は `--dry-run` を利用します。
   ```powershell
   python convert-to-hls.py "sample.mp4" --dry-run
   ```

## 主なオプション
| オプション | 説明 | 既定値 |
| --- | --- | --- |
| `--segment-duration` | HLS セグメント長 (秒) | `6` |
| `--crf` | 再エンコード時の CRF 値 | `20` |
| `--preset` | libx264 のプリセット | `veryfast` |
| `--audio-bitrate` | AAC ビットレート | `192k` |
| `--overwrite` | 既存の出力フォルダがあれば削除して再生成 | - |
| `--dry-run` | ffmpeg コマンドを表示するだけで実行しない | - |
| `--recursive` | フォルダ入力時にサブフォルダも探索 | - |

## 注意事項
- 出力フォルダが既に存在する場合、`--overwrite` を付けないと処理を停止します。
- 非 H.264 の動画は再エンコードが入るため、変換時間が伸びる場合があります。
- 生成された `master.m3u8` は `video.m3u8` と `audio.m3u8` を参照する CMAF VOD プレイリストです。`.cmfv`/`.cmfa` と合わせてアップロードしてください。
- FFmpeg が `PATH` に設定されていない場合は、事前に環境変数を調整してください。

## トラブルシューティング
1. **「ffmpeg/ffprobe が見つかりません」と表示される**
   - FFmpeg をインストールし、実行ファイルのパスを環境変数 `PATH` に追加してください。
2. **「出力ディレクトリが既に存在します」と表示される**
   - 既存の出力を削除するか、`--overwrite` を付けて再実行してください。
3. **変換が途中で失敗する**
   - 元ファイルが破損していないか確認し、コマンド出力された ffmpeg ログを参照してください。

## ライセンス
This software is released under the MIT License.
For more information, please refer to <https://opensource.org/licenses/MIT>

## 不具合報告
filter-matomeのGitHubのIssueにて報告をお願いします。
[filter-matome](https://github.com/roflsunriz/filter-matome/issues)

Issueに含めるべき情報について
*OS環境 (例：Windows 10/11, macOS 10.15, Linux Ubuntu 20.04)
*NicoCache_nlのバージョン (例：2025-08-26)
*Pythonのバージョン (例：3.7.0)
*Javaのバージョン (例：17.0.11)
*PowerShellのバージョン (例：7.3.5)
*filter-matomeのバージョン (例：#193.2)
*コンソールログ
*エラーログ
*実行コマンド
