/** NicoCache_nl REST APIのキャッシュ実体。 */
export interface CacheInfoItem {
  videoId: string;
  cacheId: string;
  complete: boolean;
  caching: boolean;
  videoMode: string | null;
  audioBitrate: number;
  legacyLow: boolean;
  size: number;
  cachingSize?: number;
  title: string | null;
  subFolder: string | null;
  filename: string | null;
  ts: number | null;
}

/** NicoCache_nl REST APIの動画単位エントリ。 */
export interface CacheInfoEntry {
  videoId: string | null;
  preferred: string | null;
  cacheIds: string[];
  cachings: string[];
  completes: string[];
  caches: Record<string, CacheInfoItem>;
}

/** 動画IDをキーにした一括キャッシュ照会レスポンス。 */
export type CacheInfoResponse = Record<string, CacheInfoEntry>;
