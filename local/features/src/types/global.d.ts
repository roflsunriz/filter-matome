// グローバルオブジェクトの型定義
import { ToastrInstance } from "./toastr-types";
import { NicoCache_nlInterface } from "./global-types";
import { CommentFilterInterface } from "./comment-types";
import { VideoPlayerInstance } from "./video-player-bridge-types";
import { 
  NicoApiData, 
  CommentData, 
  IntegratedNicoData, 
  ExtendedFetchWatchPageResult,
  FetchOptions,
  CommentThread
} from "./common-types";

declare global {
  // グローバルスコープでのtoastr宣言（型のみ。値は存在する前提）
  const toastr: ToastrInstance;

  interface Window {
    NicoCache_nl: NicoCache_nlInterface;
    commonHelper: {
      // 既存の関数
      checkCache404: (url: string) => Promise<boolean | void>;
      fetchWatchPage: (SMID?: string) => Promise<ExtendedFetchWatchPageResult | void>;
      
      // 新しい関数
      fetchNicoComments: (apiData: NicoApiData) => Promise<{ comments: CommentData[], mainThread: CommentThread } | void>;
      fetchNicoDataWithComments: (SMID?: string) => Promise<IntegratedNicoData | void>;
      
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
      measurePerformance: (component: string, method: string, callback: () => void) => void;
    };
    EstimatedProcessingTime?: (commentNum: string, videoLength: string) => string;
    CommentFilter?: CommentFilterInterface;
    CommentFilterState?: {
      isVideoPlayerActive: boolean;
      fetchProxyEnabled: boolean;
    };
    videoPlayer?: VideoPlayerInstance;
    // thumb-info関連の関数
    setCurrentVideoId?: (videoId: string) => void;
    startCommentProcessingWithVideoId?: (videoId: string) => Promise<void>;
    // CommentFilter2のグローバルデータ
    [key: string]: unknown; // 動的プロパティアクセス用
  }
}

export {}; 