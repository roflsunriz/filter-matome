import type { CommentData, NicoApiData } from "@/types/common-types";
import type { CacheInfoEntry } from "@/types/cache-info-types";

export type PanelStatus = "idle" | "loading" | "success" | "error";

export interface ThumbTagInfo {
  name: string;
  locked: boolean;
}

export interface ThumbOwnerInfo {
  id: string;
  nickname: string;
  iconUrl: string;
}

export interface ThumbInfo {
  status: "ok" | "fail";
  source?: "ext-thumb" | "watch-api";
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  firstRetrieve: string;
  length: string;
  movieType: string;
  viewCounter: number;
  commentNum: number;
  mylistCounter: number;
  lastResBody: string;
  watchUrl: string;
  thumbType: string;
  embeddable: boolean;
  noLivePlay: boolean;
  tags: ThumbTagInfo[];
  isR18?: boolean;
  genre: string;
  cache?: string | null;
  owner?: ThumbOwnerInfo;
  channel?: ThumbOwnerInfo;
  raw: Record<string, unknown>;
}

export interface GpacTrack extends Record<string, unknown> {
  "@type"?: string;
  Format?: string;
  Duration?: string;
  BitRate?: string;
  Width?: string;
  Height?: string;
  SamplingRate?: string;
  Channels?: string;
}

export interface GpacItem {
  creatingLibrary?: Record<string, unknown>;
  media?: {
    "@ref"?: string;
    track?: GpacTrack[];
    [key: string]: unknown;
  } & Record<string, unknown>;
  [key: string]: unknown;
}

export type GpacResponse = GpacItem;

export interface CommentPreview {
  note: string;
  totalCount: number;
  threadCount: number;
  forks: string[];
  sampleComments: CommentData[];
}

export interface DashboardState {
  videoId: string | null;
  apiData: NicoApiData | null;
  cacheInfo: CacheInfoEntry | null;
  thumbInfo: ThumbInfo | null;
  gpacInfo: GpacResponse | null;
  commentPreview: CommentPreview | null;
}

export interface DownloadDescriptor {
  fileName: string;
  payloadSupplier: () => string;
}

export interface ErrorModalItem {
  label: string;
  message: string;
  action?: string;
}

export interface ErrorModalDetails {
  title: string;
  lead: string;
  videoId?: string | null;
  items: ErrorModalItem[];
}

export interface PanelSummaryBuilder<T> {
  (data: T): HTMLElement;
}
