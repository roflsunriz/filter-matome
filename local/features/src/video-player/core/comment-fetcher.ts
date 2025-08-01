import { CommentApiResponse, CommentApiData } from '../../types/comment-types.js';

/**
 * ニコニコ動画のコメントを取得するクラス
 */
export class CommentFetcher {
  /**
   * 動画IDからAPIデータを取得
   */
  async getApiData(videoId: string, signal?: AbortSignal): Promise<CommentApiData> {
    try {
      window.logger.info(`APIデータの取得を開始するのじゃ！ VideoID: ${videoId}`);
      const response = await this.makeRequest({
        method: "GET",
        url: `https://www.nicovideo.jp/watch/${videoId}`,
      }, signal);

      // HTML文字列からserver-responseのメタデータを探す
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.responseText, "text/html");
      const metaElement = doc.querySelector('meta[name="server-response"]');

      if (!metaElement) {
        throw new Error("server-responseが見つからないのじゃ...");
      }

      // APIデータをパース
      const apiData = JSON.parse(decodeURIComponent(metaElement.getAttribute('content') || '')).data.response;
      window.logger.info("APIデータを取得したのじゃ！");

      return {
        threadKey: apiData.comment.nvComment.threadKey,
        params: apiData.comment.nvComment.params,
        server: apiData.comment.nvComment.server,
      };
    } catch (error) {
      window.logger.error("APIデータの取得に失敗したのじゃ...", {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : '',
        videoId,
      });
      throw error;
    }
  }

  /**
   * XHRリクエストを実行
   */
  private makeRequest(options: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    data?: string;
  }, signal?: AbortSignal): Promise<{ status: number; responseText: string; headers: string }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(options.method, options.url);

      // ヘッダーの設定
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }

      xhr.onload = () =>
        resolve({
          status: xhr.status,
          responseText: xhr.responseText,
          headers: xhr.getAllResponseHeaders(),
        });

      xhr.onerror = () => reject(new Error("ネットワークリクエストが失敗したのじゃ..."));

      // AbortSignalを設定
      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }

      xhr.send(options.data);
    });
  }

  /**
   * APIデータからコメントを取得
   */
  async getComments(apiData: CommentApiData, signal?: AbortSignal): Promise<CommentApiResponse> {
    try {
      const url = `${apiData.server}/v1/threads`;
      window.logger.info("コメントサーバーへのリクエスト内容なのじゃ：", {
        url: url,
        params: apiData.params,
        threadKey: apiData.threadKey,
      });

      const response = await this.makeRequest({
        method: "POST",
        url: url,
        headers: {
          "x-client-os-type": "others",
          "X-Frontend-Id": "6",
          "X-Frontend-Version": "0",
          "Content-Type": "application/json",
        },
        data: JSON.stringify({
          params: apiData.params,
          threadKey: apiData.threadKey,
          additionals: {},
        }),
      }, signal);

      // レスポンスが空でないか確認
      if (!response.responseText) {
        throw new Error("サーバーからの応答が空なのじゃ...");
      }

      return JSON.parse(response.responseText);
    } catch (error) {
      window.logger.error("コメント取得エラーなのじゃ！", error);
      throw error;
    }
  }

  /**
   * 動画IDからAPIデータを取得し、コメントを取得
   */
  async fetchAllComments(videoId: string, signal?: AbortSignal): Promise<CommentApiResponse> {
    const apiData = await this.getApiData(videoId, signal);
    return await this.getComments(apiData, signal);
  }
} 