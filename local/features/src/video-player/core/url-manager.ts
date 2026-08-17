import { VideoUrlInfo } from "@/types/index";

/**
 * 動画URLの管理クラス
 * キャッシュサーバーからURLを取得するなどの機能を提供します
 */
export class UrlManager {
  private readonly urlPriority: (keyof VideoUrlInfo)[] = ["auto"];

  /**
   * 指定された動画IDに対する利用可能なURLを取得します
   * @param videoId ニコニコ動画のID
   * @returns 利用可能なURLの情報
   */
  public getUrls(videoId: string): Promise<VideoUrlInfo> {
    return Promise.resolve({
      auto: `https://nicocachenl.test/api/v1/videos/${encodeURIComponent(videoId)}/media`,
    });
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
   * 優先度順に並べた動画URL候補を取得
   */
  public async getCandidateUrls(videoId: string): Promise<string[]> {
    const urls = await this.getUrls(videoId);
    return this.urlPriority
      .map((key) => urls[key])
      .filter((url): url is string => url !== undefined);
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
