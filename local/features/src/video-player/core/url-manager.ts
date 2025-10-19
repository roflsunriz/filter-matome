import { VideoUrlInfo } from '@/types/index';
import { URLS } from '@/video-player/config/constants';
import type { CacheInfoResponse } from '@/types/video-types';

/**
 * 動画URLの管理クラス
 * キャッシュサーバーからURLを取得するなどの機能を提供します
 */
export class UrlManager {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = URLS.BASE;
  }

  /**
   * 指定された動画IDに対する利用可能なURLを取得します
   * @param videoId ニコニコ動画のID
   * @returns 利用可能なURLの情報
   */
  public async getUrls(videoId: string): Promise<VideoUrlInfo> {
    try {
      // 基本的なURLセット
      const urls: VideoUrlInfo = {
        auto: `/cache/${videoId}/auto/movie`,
        ref: `/cache/file/nicocachenl_refcache=${videoId}.hls//master.m3u8`
      };

      // /cache/info/v2 からキャッシュ情報を取得
      const cacheInfoUrls = await this.getCacheInfoUrls(videoId);

      // /cache/find_cache からCustomCacheReturnerの情報を取得
      const customCacheUrls = await this.getCustomCacheUrls(videoId);

      // 両方の情報を統合
      const allUrls = { ...urls, ...cacheInfoUrls, ...customCacheUrls };

      // 従来のパスをフォールバックとして追加
      if (!allUrls.customHls) allUrls.hls = `/local/cache/${videoId}.hls/master.m3u8`;
      if (!allUrls.customMp4) allUrls.mp4 = `/local/cache/${videoId}.mp4`;

      return allUrls;
    } catch (error) {
      window.logger.error("キャッシュ検索エラー:", error);

      // エラー時は従来のURLを返す
      return {
        auto: `/cache/${videoId}/auto/movie`,
        ref: `/cache/file/nicocachenl_refcache=${videoId}.hls//master.m3u8`,
        hls: `/local/cache/${videoId}.hls/master.m3u8`,
        mp4: `/local/cache/${videoId}.mp4`
      };
    }
  }

  /**
   * /cache/info/v2 からキャッシュ情報を取得してURLを生成
   * @param videoId 動画ID
   * @returns キャッシュ情報から生成されたURL
   */
  private async getCacheInfoUrls(videoId: string): Promise<Partial<VideoUrlInfo>> {
    try {
      const response = await fetch(`https://www.nicovideo.jp/cache/info/v2?${encodeURIComponent(videoId)}`);

      if (!response.ok) {
        window.logger.warn(`Cache info fetch failed: ${response.status}`);
        return {};
      }

      const data: CacheInfoResponse = await response.json() as CacheInfoResponse;
      const videoCacheInfo = data[videoId];

      if (!videoCacheInfo) {
        return {};
      }

      const urls: Partial<VideoUrlInfo> = {};

      // preferred キャッシュIDを使用
      if (videoCacheInfo.preferred) {
        const cacheId = videoCacheInfo.preferred;
        const customCacheUrls = await this.getCustomCacheUrls(cacheId);
        Object.assign(urls, customCacheUrls);
      }

      // caches オブジェクトからキャッシュIDを取得
      if (videoCacheInfo.caches && typeof videoCacheInfo.caches === 'object') {
        const cacheRecord = videoCacheInfo.caches as Record<string, unknown>;
        for (const cacheId of Object.keys(cacheRecord)) {
          const customCacheUrls = await this.getCustomCacheUrls(cacheId);
          Object.assign(urls, customCacheUrls);
        }
      }

      return urls;
    } catch (error) {
      window.logger.warn('Cache info fetch error:', error);
      return {};
    }
  }

  /**
   * CustomCacheReturner からキャッシュ情報を取得
   * @param cacheId キャッシュID (so30413239 形式)
   * @returns CustomCacheReturnerのレスポンスから生成されたURL
   */
  private async getCustomCacheUrls(cacheId: string): Promise<Partial<VideoUrlInfo>> {
    try {
      const response = await fetch(`${this.baseUrl}/cache/find_cache?${cacheId}`);

      if (!response.ok) {
        throw new Error(`Custom cache search failed: ${response.status}`);
      }

      const data: unknown = await response.json();
      const availablePaths = (data && typeof data === 'object' && 'paths' in (data as Record<string, unknown>)
        ? (data as { paths?: unknown }).paths
        : []) as unknown[];

      const urls: Partial<VideoUrlInfo> = {};

      // パスをそのまま追加
      for (const path of availablePaths) {
        if (typeof path === 'string') {
          if (path.endsWith(".hls")) {
            urls.customHls = `/local/cache/${path}/master.m3u8`;
          } else if (path.endsWith(".mp4")) {
            urls.customMp4 = `/local/cache/${path}`;
          }
        }
      }

      return urls;
    } catch (error) {
      window.logger.warn(`Custom cache search error for ${cacheId}:`, error);
      return {};
    }
  }

  /**
   * URLが存在するかチェック
   * @param url チェックするURL
   * @returns 存在する場合はtrue
   */
  public async checkUrlExists(url: string): Promise<boolean> {
    try {
      // cc.checkCache404を使用
      if (window.commonHelper && typeof window.commonHelper.checkCache404 === 'function') {
        const result = await window.commonHelper.checkCache404(url);
        // 結果がbooleanの場合だけ直接返す
        if (typeof result === 'boolean') {
          return result;
        }
        // voidやundefinedの場合はフォールバック処理へ
      }
      
      // フォールバック
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      window.logger.error(`URL存在チェックエラー (${url}):`, error);
      return false;
    }
  }

  /**
   * 相対URLを絶対URLに変換
   */
  public getFullUrl(path: string): string {
    if (path.startsWith('http')) return path;
    return `${this.baseUrl}${path}`;
  }

  /**
   * 複数の候補から有効なURLを検索
   * @param videoId 動画ID
   * @returns 最初に見つかった有効なURL
   */
  public async findFirstAvailableUrl(videoId: string): Promise<string | null> {
    const urls = await this.getUrls(videoId);
    const urlKeys: (keyof VideoUrlInfo)[] = [
      'customHls', 'customMp4', 'hls', 'mp4', 'auto', 'ref'
    ];
    
    for (const key of urlKeys) {
      const url = urls[key];
      if (url) {
        const fullUrl = this.getFullUrl(url);
        const exists = await this.checkUrlExists(fullUrl);
        if (exists) {
          return fullUrl;
        }
      }
    }
    
    return null;
  }
} 