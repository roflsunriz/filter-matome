# nlGpac JSON

APIエンドポイント: `https://www.nicovideo.jp/cache/gpac?{video_id}`

`extensions/nlGpac.class`が、キャッシュされた通常のメディアファイルまたはHLS/CMAFのプレイリストをGPACで解析して返すJSONです。MediaInfoやFFmpegは使用しません。

HLS/CMAFのディレクトリは`master.m3u8`（なければ曖昧でない単一の`.m3u8`）を入力にし、GPACの`dashin`で最高帯域の映像品質と依存する音声を選択します。`inspect:xml:stats:allp`で全期間のPIDプロパティと統計を取得するため、セグメントごとの配列ではなく、`General`・`Video`・`Audio`などのストリームを一つのレスポンスにまとめます。

キャッシュ解析では外部取得を行わないよう、プレイリストに`http`、`https`、`ftp`、`rtmp`、`udp`、`srt`、`ws`、`wss`のURLが含まれる場合は失敗させます。

## レスポンス構造

- `creatingLibrary`: GPACの名前、実行時バージョン、公式URL。
- `media.@ref`: 解析対象の元キャッシュパス。GPACが内部で参照した一時ファイルではありません。
- `media.Input`: GPACへ渡したファイルまたはプレイリスト。
- `media.track`: `General`を先頭に、GPACが検出した各PIDを格納します。`Video`には`Width`、`Height`、`CodecID`、`BitRate`、`Maxrate`、`FrameCount`、`FrameRate`、`DurationSeconds`など、`Audio`には`CodecID`、`SampleRate`、`Channels`、`BitRate`、`FrameCount`などを含みます。GPACが返したその他の属性も保持します。
- `gpac`: 全期間解析と品質選択の条件。

```json
{
  "creatingLibrary": {
    "name": "GPAC",
    "version": "GPAC-26.07-rev0-ga07cbfff-master",
    "url": "https://gpac.io"
  },
  "media": {
    "@ref": "C:\\NicoCache_nl\\local\\cache\\sm9.hls",
    "InputType": "HLS/DASH manifest",
    "track": [
      {
        "@type": "General",
        "VideoCount": "1",
        "AudioCount": "1",
        "DurationSeconds": "7.04",
        "OverallBitRate": "140440"
      },
      {
        "@type": "Video",
        "Format": "AVC",
        "Codec": "avc1.640028",
        "Width": "1920",
        "Height": "1080",
        "BitRate": "5000000",
        "Maxrate": "5500000",
        "FrameCount": "422",
        "FrameRate": "60",
        "DurationSeconds": "7.04"
      },
      {
        "@type": "Audio",
        "Format": "MPEG-4 AAC Audio",
        "Codec": "mp4a.40.2",
        "SampleRate": "48000",
        "Channels": "2",
        "BitRate": "128000"
      }
    ]
  },
  "gpac": {
    "analysis": "full-duration PID inspection",
    "quality": "highest bandwidth representation"
  }
}
```

値はキャッシュに含まれる実際のCodecや構成によって変わります。HLSマスターが複数品質を持つ場合、レスポンスは`gpac`の`max_bw`選択で得た品質を示します。すべての品質を比較したい場合は、各バリアントのプレイリストを個別の対象として解析してください。
