import { NicoVideoPlayer } from '@/mlink-video-controller/services/nico-video-player';
import { MlinkVideoComment } from '@/types/mlink-video-controller-types';

export class NicoApiFetcher {
  private static instance: NicoApiFetcher;
  private player: NicoVideoPlayer;
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

  public async fetchAll(videoId: string): Promise<boolean> {
    try {
      const res = await window.commonHelper.fetchNicoDataWithComments(videoId);
      if (!res) {
        window.logger.warn('[NicoApiFetcher] 統合データの取得に失敗しました (レスポンスなし)');
        this.comments = [];
        return false;
      }
      this.comments = res.comments.map(c => ({
        ...c,
        vposMs: c.vposMs ?? 0,
        postedAt: c.postedAt ? String(c.postedAt) : undefined,
      }));
      return true;
    } catch (error) {
      window.logger.error('統合データの取得に失敗しました:', error);
      this.comments = [];
      return false;
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
