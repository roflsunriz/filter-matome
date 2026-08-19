// グローバルオブジェクトの型定義
import { ToastrInstance } from "@/types/toastr-types";
import { NicoCache_nlInterface } from "@/types/global-types";
import { CommentFilterInterface } from "@/types/comment-types";
import { VideoPlayerInstance } from "@/types/video-player-bridge-types";
import {
  NicoApiData,
  CommentData,
  IntegratedNicoData,
  ExtendedFetchWatchPageResult,
  FetchOptions,
  FetchNicoCommentsOptions,
  CommentThread,
} from "@/types/common-types";

type CommonHelperVideoIdSource =
  | string
  | URL
  | Location
  | {
      href?: string | null;
      pathname?: string | null;
      search?: string | null;
      hash?: string | null;
    };

declare global {
  // グローバルスコープでのtoastr宣言（型のみ。値は存在する前提）
  const toastr: ToastrInstance;

  interface Window {
    FilterMatomeCommentApi?: {
      version: 1;
      reload: () => Promise<unknown>;
    };
    NicoCache_nl: NicoCache_nlInterface;
    commonHelper: {
      // 既存の関数
      extractVideoIdFromUrl: (
        input?: CommonHelperVideoIdSource | null,
      ) => string | null;
      // NicoCache_nl.watch.getVideoIDをチェックして、取得できない場合にURLから動画IDを抽出するフォールバック機能
      getVideoIdWithFallback: (
        input?: CommonHelperVideoIdSource | null,
      ) => Promise<string | null>;
      checkCache404: (url: string) => Promise<boolean | void>;
      fetchWatchPage: (
        SMID?: string,
      ) => Promise<ExtendedFetchWatchPageResult | void>;

      // 新しい関数
      fetchNicoComments: (
        apiData: NicoApiData,
        options?: FetchNicoCommentsOptions,
      ) => Promise<{
        threads: CommentThread[];
        comments: CommentData[];
        mainThread: CommentThread;
      } | void>;
      fetchNicoDataWithComments: (
        SMID?: string,
        options?: FetchNicoCommentsOptions,
      ) => Promise<IntegratedNicoData | void>;

      // 共通fetch関数（内部使用）
      fetchRequest: (url: string, options?: FetchOptions) => Promise<Response>;
    };
    toastr: ToastrInstance;
    logger: {
      info: (...args: unknown[]) => void;
      log: (...args: unknown[]) => void;
      warn: (...args: unknown[]) => void;
      error: (...args: unknown[]) => void;
      debug: (...args: unknown[]) => void;
      handleError: (component: string, method: string, error: unknown) => void;
      measurePerformance: (
        component: string,
        method: string,
        callback: () => void,
      ) => void;
    };
    EstimatedProcessingTime?: (
      commentNum: string,
      videoLength: string,
    ) => string;
    CommentFilter?: CommentFilterInterface;
    CommentFilterState?: {
      isVideoPlayerActive: boolean;
      fetchProxyEnabled: boolean;
    };
    videoPlayer?: VideoPlayerInstance;
    // CommentFilter2のグローバルデータ
    [key: string]: unknown; // 動的プロパティアクセス用
  }
}

export {};
