// フィルターログ送信ユーティリティ - CommentFilterLogger.javaとの連携
import { CF2FilterLogEntry } from '@/types/filter-types';

export class FilterLogger {
  // ローカル環境でCommentFilterLogger.javaが動作していることを想定
  private static readonly FILTER_LOG_ENDPOINT = window.location.origin + '/cache/filter_logs';
  private static readonly MAX_BATCH_SIZE = 100; // 一度に送信するログの最大数
  private static readonly RETRY_ATTEMPTS = 3; // リトライ回数
  private static readonly RETRY_DELAY = 1000; // リトライ間隔（ミリ秒）

  /**
   * フィルターログを一括でCommentFilterLogger.javaに送信
   */
  public static async sendFilterLogs(logs: CF2FilterLogEntry[]): Promise<boolean> {
    if (logs.length === 0) {
      window.logger?.debug('[FilterLogger] No logs to send');
      return true;
    }

    // ログを分割して送信
    const batches = this.splitIntoBatches(logs, this.MAX_BATCH_SIZE);
    let successCount = 0;

    for (const batch of batches) {
      const success = await this.sendBatchWithRetry(batch);
      if (success) {
        successCount++;
      }
    }

    const totalBatches = batches.length;
    const success = successCount === totalBatches;

    if (success) {
      window.logger?.info(`[FilterLogger] Successfully sent ${logs.length} filter logs in ${totalBatches} batches`);
    } else {
      window.logger?.warn(`[FilterLogger] Partial success: ${successCount}/${totalBatches} batches sent successfully`);
    }

    return success;
  }

  /**
   * ログ配列を指定サイズのバッチに分割
   */
  private static splitIntoBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * バッチをリトライ付きで送信
   */
  private static async sendBatchWithRetry(batch: CF2FilterLogEntry[]): Promise<boolean> {
    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        const success = await this.sendBatch(batch);
        if (success) {
          return true;
        }
      } catch (error) {
        window.logger?.warn(`[FilterLogger] Batch send attempt ${attempt} failed:`, error);
      }

      // 最後の試行でない場合は遅延
      if (attempt < this.RETRY_ATTEMPTS) {
        await this.delay(this.RETRY_DELAY * attempt); // 指数バックオフ
      }
    }

    window.logger?.error(`[FilterLogger] Failed to send batch after ${this.RETRY_ATTEMPTS} attempts`);
    return false;
  }

  /**
   * 単一バッチを送信
   */
  private static async sendBatch(batch: CF2FilterLogEntry[]): Promise<boolean> {
    try {
      const jsonData = JSON.stringify(batch);
      
      const response = await fetch(this.FILTER_LOG_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': jsonData.length.toString()
        },
        body: jsonData
      });

      if (response.ok) {
        window.logger?.debug(`[FilterLogger] Batch of ${batch.length} logs sent successfully`);
        return true;
      } else {
        window.logger?.warn(`[FilterLogger] Batch send failed with status: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      window.logger?.error('[FilterLogger] Batch send error:', error);
      return false;
    }
  }

  /**
   * 指定時間待機
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 動画タイトルを取得（DOM解析）
   */
  public static getVideoTitle(): string {
    try {
      // ニコニコ動画の動画タイトル要素を探す
      const titleSelectors = [
        'h1[data-testid="video-title"]', // 新UI
        '.VideoTitle', // 旧UI
        'h1.video-title', // 別の形式
        'title' // フォールバック（ページタイトル）
      ];

      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          let title = element.textContent.trim();
          
          // ページタイトルの場合はニコニコ動画の部分を除去
          if (selector === 'title') {
            title = title.replace(/\s*-\s*ニコニコ動画$/, '');
          }
          
          if (title.length > 0) {
            return title;
          }
        }
      }

      return '不明なタイトル';
    } catch (error) {
      window.logger?.warn('[FilterLogger] Failed to get video title:', error);
      return '不明なタイトル';
    }
  }

  /**
   * フィルター理由を生成
   */
  public static generateFilterReasons(ruleType: 'regex' | 'userId', matched: boolean, hidden: boolean): string[] {
    const reasons: string[] = [];

    if (matched) {
      if (ruleType === 'regex') {
        reasons.push('正規表現マッチ');
      } else if (ruleType === 'userId') {
        reasons.push('ユーザーID一致');
      }

      if (hidden) {
        reasons.push('コメント非表示');
      } else {
        reasons.push('コメント置換');
      }
    }

    return reasons;
  }

  /**
   * フィルター詳細を生成
   */
  public static generateFilterDetails(
    ruleType: 'regex' | 'userId', 
    pattern?: string, 
    userId?: string, 
    replace?: string
  ): Array<{ type: string; value: string | null }> {
    const details: Array<{ type: string; value: string | null }> = [];

    if (ruleType === 'regex' && pattern) {
      details.push({
        type: '正規表現',
        value: pattern
      });

      if (replace && replace !== 'EMPTY') {
        details.push({
          type: '置換文字列',
          value: replace
        });
      }
    } else if (ruleType === 'userId' && userId) {
      details.push({
        type: 'ユーザーID',
        value: userId
      });
    }

    return details;
  }
} 