import { VideoUrlInfo } from "@/types/index";
import { URLS } from "@/video-player/config/constants";
import {
  fetchCacheInfoEntry,
  getCacheIdsInPriorityOrder,
} from "@/common/cache-info-api";

/**
 * 動画URLの管理クラス
 * キャッシュサーバーからURLを取得するなどの機能を提供します
 */
export class UrlManager {
  private readonly baseUrl: string;
  private readonly urlPriority: (keyof VideoUrlInfo)[] = [
    "customHls",
    "customMp4",
    "hls",
    "mp4",
    "auto",
    "ref",
  ];

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
        ref: `/cache/file/nicocachenl_refcache=${videoId}.hls//master.m3u8`,
      };

      // /cache/info/v3 と /cache/find_cache を並列で取得
      const [cacheInfoUrls, customCacheUrls] = await Promise.all([
        this.getCacheInfoUrls(videoId),
        this.getCustomCacheUrls(videoId),
      ]);

      // 両方の情報を統合
      const allUrls = { ...urls, ...cacheInfoUrls, ...customCacheUrls };

      // 従来のパスをフォールバックとして追加
      if (!allUrls.customHls)
        allUrls.hls = `/local/cache/${videoId}.hls/master.m3u8`;
      if (!allUrls.customMp4) allUrls.mp4 = `/local/cache/${videoId}.mp4`;

      return allUrls;
    } catch (error) {
      window.logger.error("キャッシュ検索エラー:", error);

      // エラー時は従来のURLを返す
      return {
        auto: `/cache/${videoId}/auto/movie`,
        ref: `/cache/file/nicocachenl_refcache=${videoId}.hls//master.m3u8`,
        hls: `/local/cache/${videoId}.hls/master.m3u8`,
        mp4: `/local/cache/${videoId}.mp4`,
      };
    }
  }

  /**
   * /cache/info/v3 からキャッシュ情報を取得してURLを生成
   * @param videoId 動画ID
   * @returns キャッシュ情報から生成されたURL
   */
  private async getCacheInfoUrls(
    videoId: string,
  ): Promise<Partial<VideoUrlInfo>> {
    try {
      const cacheInfo = await fetchCacheInfoEntry(videoId);
      for (const cacheId of getCacheIdsInPriorityOrder(cacheInfo)) {
        const urls = await this.getCustomCacheUrls(cacheId);
        if (urls.customHls || urls.customMp4) {
          return urls;
        }
      }
      return {};
    } catch (error) {
      window.logger.warn("Cache info fetch error:", error);
      return {};
    }
  }

  /**
   * CustomCacheReturner からキャッシュ情報を取得
   * @param cacheId キャッシュID (so30413239 形式)
   * @returns CustomCacheReturnerのレスポンスから生成されたURL
   */
  private async getCustomCacheUrls(
    cacheId: string,
  ): Promise<Partial<VideoUrlInfo>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/cache/find_cache?${cacheId}`,
      );

      if (!response.ok) {
        throw new Error(`Custom cache search failed: ${response.status}`);
      }

      const data: unknown = await response.json();
      const availablePaths = (
        data &&
        typeof data === "object" &&
        "paths" in (data as Record<string, unknown>)
          ? (data as { paths?: unknown }).paths
          : []
      ) as unknown[];

      const urls: Partial<VideoUrlInfo> = {};

      // パスをそのまま追加
      for (const path of availablePaths) {
        if (typeof path === "string") {
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
      if (
        window.commonHelper &&
        typeof window.commonHelper.checkCache404 === "function"
      ) {
        const result = await window.commonHelper.checkCache404(url);
        // 結果がbooleanの場合だけ直接返す
        if (typeof result === "boolean") {
          return result;
        }
        // voidやundefinedの場合はフォールバック処理へ
      }

      // フォールバック
      const response = await fetch(url, { method: "HEAD" });
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
    if (path.startsWith("http")) return path;
    return `${this.baseUrl}${path}`;
  }

  /**
   * 優先度順に並べた動画URL候補を取得
   */
  public async getCandidateUrls(videoId: string): Promise<string[]> {
    const urls = await this.getUrls(videoId);
    return this.urlPriority
      .map((key) => urls[key])
      .filter((url): url is string => url !== undefined)
      .map((url) => this.getFullUrl(url));
  }

  /**
   * 複数の候補から有効なURLを検索
   * @param videoId 動画ID
   * @returns 最初に見つかった有効なURL
   */
  public async findFirstAvailableUrl(videoId: string): Promise<string | null> {
    const candidates = await this.getCandidateUrls(videoId);
    const results: Array<boolean | undefined> = candidates.map(() => undefined);

    return new Promise((resolve) => {
      if (candidates.length === 0) {
        resolve(null);
        return;
      }

      let settledCount = 0;

      const tryResolve = (): void => {
        for (let index = 0; index < candidates.length; index++) {
          const result = results[index];
          if (result === true) {
            resolve(candidates[index]);
            return;
          }
          if (result === undefined) {
            return;
          }
        }

        if (settledCount === candidates.length) {
          resolve(null);
        }
      };

      candidates.forEach((candidateUrl, index) => {
        void this.checkUrlExists(candidateUrl)
          .then((exists) => {
            results[index] = exists;
          })
          .catch((error) => {
            window.logger.warn(`URL存在チェック失敗 (${candidateUrl}):`, error);
            results[index] = false;
          })
          .finally(() => {
            settledCount++;
            tryResolve();
          });
      });
    });
  }
}
