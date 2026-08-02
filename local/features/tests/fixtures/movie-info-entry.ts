import { startMovieInfo } from "@/movie-info";
import type {
  CommentData,
  CommentThread,
  IntegratedNicoData,
  NicoApiData,
} from "@/types/common-types";

type FailureSource = "watch" | "cache" | "thumb" | "gpac" | "comments";

const apiData: NicoApiData = {
  comment: {
    nvComment: {
      server: "https://nvcomment.nicovideo.jp",
      params: {
        targets: [{ id: "thread-main", fork: "main" }],
        language: "ja-jp",
      },
      threadKey: { threadkey: "fixture", force184: "0" },
    },
  },
  video: {
    title: "テスト動画",
    description:
      '<p>movie-info の<strong>動的UIテスト</strong>用動画です。<br><a href="https://example.com/details" onclick="alert(1)">詳細</a><script>window.injected = true</script><a href="javascript:alert(1)">危険なリンク</a></p>',
    duration: 319,
    count: { view: 12345, comment: 321, mylist: 45 },
  },
  owner: { nickname: "テスト投稿者" },
};

const comments: CommentData[] = [
  {
    id: "comment-1",
    no: 1,
    vposMs: 1000,
    body: "最初のコメント",
    commands: [],
    userId: "anonymous-user",
    isPremium: false,
    score: 0,
    postedAt: "2026-07-12T00:00:00+09:00",
    nicoruCount: 0,
    nicoruId: "",
    source: "fixture",
    isMyPost: false,
    fork: "main",
    threadId: "thread-main",
  },
  {
    id: "comment-2",
    no: 2,
    vposMs: 2000,
    body: "かんたんコメント",
    commands: [],
    userId: "anonymous-user-2",
    isPremium: false,
    score: 0,
    postedAt: "2026-07-12T00:00:01+09:00",
    nicoruCount: 1,
    nicoruId: "nicoru-1",
    source: "fixture",
    isMyPost: false,
    fork: "easy",
    threadId: "thread-easy",
  },
];

const threads: CommentThread[] = [
  {
    id: "thread-main",
    fork: "main",
    commentCount: 1,
    comments: [comments[0]!],
  },
  {
    id: "thread-easy",
    fork: "easy",
    commentCount: 1,
    comments: [comments[1]!],
  },
];

const integratedComments: IntegratedNicoData = {
  apiData,
  threads,
  comments,
  mainThread: threads[0]!,
};

const thumbXml = `<?xml version="1.0" encoding="UTF-8"?>
<nicovideo_thumb_response status="ok"><thumb>
  <video_id>sm100</video_id><title>テスト動画</title><description>説明</description>
  <thumbnail_url>https://example.invalid/thumb.jpg</thumbnail_url>
  <first_retrieve>2026-07-12T00:00:00+09:00</first_retrieve><length>5:19</length>
  <movie_type>mp4</movie_type><view_counter>12345</view_counter>
  <comment_num>321</comment_num><mylist_counter>45</mylist_counter>
  <last_res_body>テスト</last_res_body><watch_url>https://www.nicovideo.jp/watch/sm100</watch_url>
  <thumb_type>video</thumb_type><embeddable>1</embeddable><no_live_play>0</no_live_play>
  <tags><tag lock="1">テスト</tag><tag>音楽</tag></tags><genre>音楽・サウンド</genre>
  <user_id>100</user_id><user_nickname>テスト投稿者</user_nickname><user_icon_url></user_icon_url>
</thumb></nicovideo_thumb_response>`;

let failureSource: FailureSource | null = null;

const failIfSelected = (source: FailureSource): void => {
  if (failureSource === source) throw new Error(`${source} fixture failure`);
};

Object.assign(window, {
  logger: {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  },
  toastr: { success: () => undefined, error: () => undefined },
  NicoCommon: {
    createHeader: (containerId: string, options: { title?: string }) => {
      const container = document.getElementById(containerId);
      if (container) container.textContent = options.title ?? "";
    },
  },
  commonHelper: {
    getVideoIdWithFallback: async () => null,
    fetchWatchPage: async () => {
      failIfSelected("watch");
      return { apiData, serverContext: {} };
    },
    fetchRequest: async (url: string) => {
      if (url.includes("cache/info/v2")) {
        failIfSelected("cache");
        return new Response(
          JSON.stringify({
            sm100: {
              preferred: "sm100[720p].hls",
              cacheIds: ["sm100[720p].hls"],
              cachings: [],
              completes: ["sm100[720p].hls"],
              caches: {
                main: {
                  videoId: "sm100",
                  cacheId: "sm100[720p].hls",
                  complete: true,
                  economy: false,
                  dmc: true,
                  movieType: "mp4",
                  size: 1048576,
                  title: "テスト動画",
                  filename: "sm100.mp4",
                  ts: 1,
                  caching: false,
                },
              },
            },
          }),
          { status: 200 },
        );
      }
      if (url.includes("getthumbinfo")) {
        failIfSelected("thumb");
        return new Response(thumbXml, { status: 200 });
      }
      failIfSelected("gpac");
      return new Response(
        JSON.stringify({
          creatingLibrary: {
            name: "GPAC",
            version: "GPAC-26.07-test",
            url: "https://gpac.io",
          },
          media: {
            "@ref": "sm100.mp4",
            Input: "sm100.mp4",
            InputType: "media file",
            track: [
              {
                "@type": "General",
                Format: "GPAC inspect",
                FileName: "sm100.mp4",
                StreamCount: "4",
                VideoCount: "1",
                AudioCount: "1",
                OtherCount: "1",
                DurationSeconds: "319",
                OverallBitRate: "5128000",
                FileSize: "1048576",
                MediaDataSize: "203161600",
                GpacInspection: "inspect:xml:stats:allp",
                GpacQuality: "direct",
              },
              {
                "@type": "Video",
                Format: "AVC",
                Codec: "avc1.640028",
                CodecID: "avc1",
                Profile: "High",
                Level: "4.0",
                Width: "1920",
                Height: "1080",
                PixelFormat: "yuv420p",
                ColorSpace: "BT.709",
                ColorRange: "limited",
                ColorPrimaries: "BT.709",
                TransferCharacteristics: "BT.709",
                MatrixCoefficients: "BT.709",
                FrameRate: "60",
                FrameCount: "19140",
                BitRate: "5000000",
                Maxrate: "5500000",
                DurationSeconds: "319",
                StreamSize: "199136000",
              },
              {
                "@type": "Audio",
                Format: "MPEG-4 AAC Audio",
                Codec: "mp4a.40.2",
                SampleRate: "48000",
                Channels: "2",
                ChannelLayout: "stereo",
                BitRate: "128000",
                FrameCount: "14954",
                DurationSeconds: "319",
                StreamSize: "5100000",
                Language: "jpn",
              },
              {
                "@type": "Scene",
                Format: "GPAC Scene",
                SceneType: "metadata",
                DurationSeconds: "319",
              },
            ],
          },
          gpac: {
            tool: "GPAC-26.07-test",
            analysis: "full-duration PID inspection",
            quality: "direct media input",
          },
        }),
        { status: 200 },
      );
    },
    fetchNicoDataWithComments: async () => {
      failIfSelected("comments");
      return integratedComments;
    },
  },
  MovieInfoTest: {
    start: (failure: FailureSource | null = null) => {
      failureSource = failure;
      startMovieInfo();
    },
  },
});
