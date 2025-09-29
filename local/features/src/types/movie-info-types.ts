import type { CommentData, CommentThread, NicoApiData } from "./common-types";

export type PanelStatus = "idle" | "loading" | "success" | "error";

export interface CacheItem {
  videoId: string;
  cacheId: string;
  complete: boolean;
  economy: boolean;
  dmc: boolean;
  movieType: string;
  size: number;
  title: string;
  filename: string;
  ts: number;
  caching: boolean;
  dmcMovieType?: {
    videoMode?: string;
    videoBitrate?: number;
    audioBitrate?: number;
    [key: string]: unknown;
  } | null;
  subFolder?: string | null;
  preferredQuality?: string | null;
  [key: string]: unknown;
}

export interface CacheEntry {
  preferred: string | null;
  preferredHTML5?: string | null;
  preferredFlash?: string | null;
  preferredSmile?: string | null;
  preferredDmc?: string | null;
  preferredDmcFlv?: string | null;
  preferredDmcHls?: string | null;
  cacheIds: string[];
  cachings: string[];
  completes: string[];
  caches: Record<string, CacheItem>;
  reEncoded?: string | null;
  reEncodedBitrate?: number | null;
  [key: string]: unknown;
}

export type CacheInfoResponse = Record<string, CacheEntry>;

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
  genre: string;
  cache?: string | null;
  owner?: ThumbOwnerInfo;
  channel?: ThumbOwnerInfo;
  raw: Record<string, string>;
}

export interface MediaInfoTrack extends Record<string, unknown> {
  "@type"?: string;
  Format?: string;
  Duration?: string;
  BitRate?: string;
  Width?: string;
  Height?: string;
  SamplingRate?: string;
  Channels?: string;
}

export interface MediaInfoItem {
  creatingLibrary?: Record<string, unknown>;
  media?: {
    "@ref"?: string;
    track?: MediaInfoTrack[];
    [key: string]: unknown;
  } & Record<string, unknown>;
  [key: string]: unknown;
}

export type MediaInfoResponse = MediaInfoItem | MediaInfoItem[];

export interface CommentPreview {
  note: string;
  totalCount: number;
  mainThread: CommentThread;
  sampleComments: CommentData[];
}

export interface DashboardState {
  videoId: string | null;
  apiData: NicoApiData | null;
  cacheInfo: CacheEntry | null;
  thumbInfo: ThumbInfo | null;
  mediaInfo: MediaInfoResponse | null;
  commentPreview: CommentPreview | null;
}

export interface DownloadDescriptor {
  fileName: string;
  payloadSupplier: () => string;
}

export interface PanelSummaryBuilder<T> {
  (data: T): HTMLElement;
}

