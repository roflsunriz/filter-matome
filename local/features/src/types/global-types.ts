/**
 * グローバル型定義
 */

import { ApiData, ExtendedApiData } from '@/types/video-types';
import { Mylist2DB } from '@/mylist2/components/database';
import { Mylist2Manager } from '@/mylist2/components/manager-refactored';
import { Mylist2ManagerUI } from '@/mylist2/ui/ui-refactored';
import { ToastrInstance } from '@/types/toastr-types';
import { CommentApiResponse } from '@/types/comment-types';
import { IVideoPlayerBridge } from '@/types/video-player-bridge-types';
import { CommentFilter2GlobalData, CompatibleCommentFilter2GlobalData } from '@/types/filter-types';

// Logger関連の型定義
export enum LogLevel {
  NONE = 0,
  INFO = 1,
  LOG = 2,
  WARN = 3,
  ERROR = 4,
  DEBUG = 5,
}

// 削除済み動画プレーヤーのインターフェース
export interface DeletedVideoPlayerInterface {
  play: (videoIdOrUrl: string, title?: string) => void;
  hide: () => void;
  help: () => void;
}

// インターフェースを先に定義
export interface NicoCache_nlInterface {
  watch: {
    getVideoID: () => string;
    apiData: ApiData;
    addEventListener: (event: string, listener: () => Promise<void> | void) => void;
  };
  cacheUtil: {
    formatCacheInfo: () => Promise<boolean>;
  };
  handleError: (context: string, method: string, error: Error) => void;
  deletedVideoPlayer?: DeletedVideoPlayerInterface;
}

// Window名前空間の拡張用インターフェース
interface WindowExtensionInterface {
  NicoCache_nl: NicoCache_nlInterface;
  Mylist2DB: typeof Mylist2DB;
  Mylist2Manager: typeof Mylist2Manager;
  Mylist2ManagerUI: typeof Mylist2ManagerUI;
  copy_ext: (event: MouseEvent) => void;
  EstimatedProcessingTime: (commentNum: string, videoLength: string) => string;
  EPTWrapper: (message: string) => void;
  nicofetch: (element: string | HTMLElement, videoId: string, option: number) => void;
  toastr: ToastrInstance;
  // CommentFilter2 VideoPlayerBridge Singleton関連
  __CF2_BRIDGE__?: IVideoPlayerBridge;
  // CommentFilter2 グローバルデータ
  CommentFilter2Data?: CommentFilter2GlobalData;
  // 後方互換用（任意）
  commentFilter2GlobalData?: CompatibleCommentFilter2GlobalData;
  logger: {
    info: (...args: unknown[]) => void;
    log: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
    handleError: (component: string, method: string, error: unknown) => void;
    measurePerformance: (component: string, method: string, callback: () => void) => void;
    setLevel: (level: LogLevel) => void;
    enableLogging: (filePattern: string) => void;
    disableLogging: (filePattern: string) => void;
  };
  opener: {
    NicoCache_nl: {
      watch: {
        apiData: {
          comment: {
            nvComment: {
              threadKey: string;
              params: Record<string, unknown>;
            };
            threads: Array<{
              id: string;
              forkLabel: string;
              isDefaultPostTarget: boolean;
            }>;
          };
          video: {
            id: string;
            title: string;
          };
        };
      };
    };
  };
  apiUtils: {
    fetchData: (url: string, options?: RequestInit) => Promise<Response>;
    copyToClipboard: (content: string, label: string) => Promise<void>;
    getApiData: {
      thumb: (url: string) => Promise<Document>;
      comment: (url: string, params: object, threadKey: string) => Promise<CommentApiResponse>;
    };
  };
}

// グローバル名前空間を拡張
declare global {
  interface Window extends WindowExtensionInterface {}
}

/**
 * NicoCache_nlの拡張型を定義
 */
export interface ExtendedNicoCache_nl extends NicoCache_nlInterface {
  watch: {
    getVideoID: () => string;
    apiData: ExtendedApiData;
    addEventListener: (event: string, listener: () => Promise<void> | void) => void;
  };
} 
