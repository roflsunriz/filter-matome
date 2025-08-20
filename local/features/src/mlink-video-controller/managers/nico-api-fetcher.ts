import { NicoVideoPlayer } from '../services/nico-video-player';
import { MlinkVideoComment, NicoApiResponse, NicoApiData } from '@/types/mlink-video-controller-types';
import { CommentThread } from '@/types/comment-types';

export class NicoApiFetcher {
  private static instance: NicoApiFetcher;
  private player: NicoVideoPlayer;
  private apiData: NicoApiData | null = null;
  private comments: MlinkVideoComment[] = [];

  private constructor() {
    this.player = NicoVideoPlayer.getInstance();
  }

  public static getInstance(): NicoApiFetcher {
    if (!NicoApiFetcher.instance) {
      NicoApiFetcher.instance = new NicoApiFetcher();
    }
    return NicoApiFetcher.instance;
  }

  public async fetchApiData(videoId: string): Promise<void> {
    try {
      const response = await fetch(`https://www.nicovideo.jp/watch/${videoId}`);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const metaElement = doc.querySelector('meta[name="server-response"]');
      
      if (!metaElement) {
        throw new Error('APIデータが見つかりませんでした');
      }

      const content = decodeURIComponent(metaElement.getAttribute('content') || '');
      const data = JSON.parse(content) as NicoApiResponse;
      this.apiData = data.data.response;

      await this.fetchComments();
    } catch (error) {
      window.logger.error('APIデータの取得に失敗しました:', error);
      throw error;
    }
  }

  private async fetchComments(): Promise<void> {
    if (!this.apiData?.comment?.nvComment) {
      throw new Error('コメントデータが見つかりませんでした');
    }

    const { server, params, threadKey } = this.apiData.comment.nvComment;
    const url = `${server}/v1/threads`;

    // デバッグ用にリクエスト情報をログ出力
    
    

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-client-os-type': 'others',
          'X-Frontend-Id': '6',
          'X-Frontend-Version': '0',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          params: params,
          threadKey: threadKey,
          additionals:{}
        })
      });

      if (!response.ok) {
        throw new Error(`APIリクエスト失敗: ${response.status} ${response.statusText}`);
      }

      const data: unknown = await response.json();
      const threads = (data as { data?: { threads?: CommentThread[] } })?.data?.threads ?? [];
      
      // メインスレッドを選択（forkがmainでコメント数が最多のもの）
      const mainThread = threads
        .filter(thread => thread.fork === 'main')
        .sort((a, b) => b.commentCount - a.commentCount)[0];
      if (mainThread) {
        this.comments = mainThread.comments.map(comment => ({
          ...comment,
          vposMs: comment.vposMs ?? 0,
          postedAt: comment.postedAt ? String(comment.postedAt) : undefined
        }));
      } else {
        throw new Error('メインスレッドが見つかりませんでした');
      }
    } catch (error) {
      window.logger.error('コメントの取得に失敗しました:', error);
      throw error;
    }
  }

  public getComments(): MlinkVideoComment[] {
    return this.comments;
  }

  public getCommentsCountAtTime(timeMs: number): number {
    // 指定時間の前後500msのコメント数を返す
    const range = 500;
    return this.comments.filter(comment => {
      return Math.abs(comment.vposMs - timeMs) <= range;
    }).length;
  }

  public searchComments(query: string, options: { enableRegexp: boolean } = { enableRegexp: false }): MlinkVideoComment[] {
    if (!query) return [];

    try {
      if (options.enableRegexp) {
        const regex = new RegExp(query, 'i');
        return this.comments.filter(comment => regex.test(comment.body));
      } else {
        const lowerQuery = query.toLowerCase();
        return this.comments.filter(comment => 
          comment.body.toLowerCase().includes(lowerQuery)
        );
      }
    } catch (error) {
      window.logger.error('コメント検索に失敗しました:', error);
      return [];
    }
  }

  public getCommentDensityData(segments: number = 100): { time: number; count: number }[] {
    if (this.comments.length === 0) return [];

    const duration = Math.max(...this.comments.map(c => c.vposMs));
    const segmentDuration = duration / segments;
    const density: number[] = Array.from({ length: segments }, () => 0);

    // 各コメントを対応するセグメントに振り分ける
    this.comments.forEach(comment => {
      const segmentIndex = Math.floor(comment.vposMs / segmentDuration);
      if (segmentIndex < segments) {
        density[segmentIndex]++;
      }
    });

    // 時間とカウントのペアの配列を作成
    return density.map((count, i) => ({
      time: i * segmentDuration,
      count
    }));
  }
} 