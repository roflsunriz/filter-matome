/**
 * ニコニコ動画視聴履歴拡張 - 視聴追跡スクリプト
 * 
 * @description 視聴ページで動画メタデータを取得し、視聴状況を追跡する
 * @author roflsunriz
 */

import { WatchHistoryEntry, WatchLogEntry, WatchEvent, WatchEventType, VideoStats, SeriesInfo, SeriesVideoInfo } from '@/types/watch-history-types';
import { NicoApiData } from '@/types/common-types';
import { watchHistoryDB } from '@/watch-history/database';
import { logger } from '@/common/logger';

const WATCH_PAGE_PATH_REGEX = /^\/watch\/[a-z]{2}\d+$/;
const VIDEO_ID_IN_PATH_REGEX = /[a-z]{2}\d+/;
const VIDEO_ID_PARAM_REGEX = /^[a-z]{2}\d+$/;
const STANDALONE_PLAYER_PATH = '/local/features/dist/src/video-player/standalone/index.html';

const extractVideoIdFromQuery = (search: string): string | null => {
  if (typeof search !== 'string' || search.length === 0) {
    return null;
  }

  try {
    const params = new URLSearchParams(search);
    const videoId = params.get('videoId');
    if (videoId && VIDEO_ID_PARAM_REGEX.test(videoId)) {
      return videoId;
    }
  } catch (error) {
    logger.warn('[WatchTracker] URLSearchParamsの解析に失敗しました', error);
  }

  return null;
};

const isStandalonePlayerLocation = (loc: Location = location): boolean => {
  if (loc.pathname !== STANDALONE_PLAYER_PATH) {
    return false;
  }

  return extractVideoIdFromQuery(loc.search) !== null;
};

const isWatchPageLocation = (loc: Location = location): boolean => {
  return WATCH_PAGE_PATH_REGEX.test(loc.pathname);
};

/**
 * 視聴追跡クラス
 */
export class WatchTracker {
  private currentVideoId: string | null = null;
  private currentEntry: WatchHistoryEntry | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private progressTimer: number | null = null;
  private startTime: number = 0;
  private isWatching: boolean = false;
  private previousTime: number = 0; // 前回の再生位置
  private lastSessionRecordTime: number = 0; // 最後にセッションを記録した時刻
  private readonly PROGRESS_INTERVAL = 15000; // 15秒間隔
  private readonly COMPLETION_THRESHOLD = 0.95; // 95%完走とみなす
  private readonly REPEAT_DETECTION_THRESHOLD = 5; // 5秒以上の後戻りで繰り返し再生と判定
  private readonly SESSION_RECORD_INTERVAL = 10000; // 10秒以内の重複記録を防ぐ

  constructor() {
    void this.initialize();
  }

  /**
   * 初期化処理
   */
  private async initialize(): Promise<void> {
    try {
      
      // データベースを初期化
      await watchHistoryDB.initialize();
      
      
      // 動画IDを取得
      this.currentVideoId = this.extractVideoId();
      
      
      if (!this.currentVideoId) {
        logger.warn('[WatchTracker] 動画IDが取得できませんでした');
        return;
      }

      // commonHelperの存在確認
      if (!window.commonHelper || !window.commonHelper.fetchWatchPage) {
        logger.error('[WatchTracker] commonHelper.fetchWatchPageが利用できません');
        return;
      }
      

      // 動画メタデータを取得
      
      await this.fetchVideoMetadata();
      
      
      // 視聴追跡を開始
      
      await this.startWatching();
      
      
    } catch (error) {
      logger.error('[WatchTracker] 初期化エラー:', error);
    }
  }

  /**
   * 動画IDを抽出する
   */
  private extractVideoId(): string | null {
    // URLから動画IDを取得
    const pathMatch = VIDEO_ID_IN_PATH_REGEX.exec(location.pathname);
    if (pathMatch) {
      return pathMatch[0];
    }

    return extractVideoIdFromQuery(location.search);
  }

  /**
   * 動画メタデータを取得する
   */
  private async fetchVideoMetadata(): Promise<void> {
    if (!this.currentVideoId) {
      throw new Error('動画IDが設定されていません');
    }

    try {
      
      // commonHelper.fetchWatchPageを使用してメタデータを取得
      const watchPageResult = await window.commonHelper.fetchWatchPage(this.currentVideoId);
      
      
      if (!watchPageResult) {
        throw new Error('動画データが取得できませんでした');
      }

      const apiData = watchPageResult.apiData;
      
      
      // 既存エントリを確認
      const existingResult = await watchHistoryDB.getEntry(this.currentVideoId);
      
      
      const now = Date.now();
      
      if (existingResult.success && existingResult.data) {
        
        // 既存エントリがある場合は更新
        this.currentEntry = {
          ...existingResult.data,
          // メタデータを更新
          title: this.extractTitle(apiData) || existingResult.data.title,
          ownerId: this.extractOwnerId(apiData) || existingResult.data.ownerId,
          ownerName: this.extractOwnerName(apiData) || existingResult.data.ownerName,
          lengthSec: this.extractLengthSec(apiData) || existingResult.data.lengthSec,
          stats: this.extractStats(apiData) || existingResult.data.stats,
          tags: this.extractTags(apiData) || existingResult.data.tags,
          thumbnailUrl: this.extractThumbnailUrl(apiData) || existingResult.data.thumbnailUrl,
          series: this.extractSeries(apiData) || existingResult.data.series,
          // 視聴情報を更新
          watchedAt: now,
          lastPosition: 0,
          completed: false,
          watchCount: existingResult.data.watchCount + 1,
          watchLogs: [...(existingResult.data.watchLogs || [])]
        };
      } else {
        
        // 新規エントリを作成
        this.currentEntry = {
          videoId: this.currentVideoId,
          title: this.extractTitle(apiData) || 'タイトル不明',
          ownerId: this.extractOwnerId(apiData) || 'unknown',
          ownerName: this.extractOwnerName(apiData) || '投稿者不明',
          lengthSec: this.extractLengthSec(apiData) || 0,
          watchedAt: now,
          firstWatchedAt: now,
          lastPosition: 0,
          completed: false,
          watchCount: 1,
          watchLogs: [],
          stats: this.extractStats(apiData),
          tags: this.extractTags(apiData) || [],
          thumbnailUrl: this.extractThumbnailUrl(apiData) || '',
          memo: '',
          series: this.extractSeries(apiData)
        };
      }

      

      // データベースに保存
      
      await watchHistoryDB.saveEntry(this.currentEntry);
      
      
    } catch (error) {
      console.error('[WatchTracker] 動画メタデータ取得エラー:', error);
      throw error;
    }
  }

  /**
   * 視聴追跡を開始する
   */
  private async startWatching(): Promise<void> {
    if (!this.currentEntry) {
      console.error('[WatchTracker] 視聴エントリが設定されていません');
      return;
    }

    
    // video要素を取得
    this.videoElement = document.querySelector('video');
    if (!this.videoElement) {
      console.warn('[WatchTracker] video要素が見つかりません。後で再試行します。');
      // 5秒後に再試行
      setTimeout(() => { void this.startWatching(); }, 5000);
      return;
    }

    

    // イベントリスナーを設定
    this.setupVideoEventListeners();
    
    // 視聴開始イベントを発行
    this.emitWatchEvent('start', 0);
    
    this.isWatching = true;
    this.startTime = Date.now();
    this.previousTime = 0; // 前回時刻を初期化
    
    // 新しい視聴セッションを開始（完了を待つ）
    await this.startNewWatchSession();
    
    // 進捗追跡はメタデータが読み込まれてから開始する（duration が 0 / Infinity となる事象を回避）
    // loadedmetadata でリスナを張るため、ここでは開始せぬよう変更した。
    
  }

  /**
   * 新しい視聴セッションを開始する
   */
  private async startNewWatchSession(): Promise<void> {
    if (!this.currentEntry) return;

    const now = Date.now();
    
    // 新しい視聴セッションを watchLogs に追加
    const newWatchLog: WatchLogEntry = {
      date: now,
      position: 0,
      completed: false
    };
    
    this.currentEntry.watchLogs.push(newWatchLog);
    
    // データベースに保存
    try {
      await watchHistoryDB.saveEntry(this.currentEntry);
      logger.debug('[WatchTracker] 新しい視聴セッションを開始しました:', {
        videoId: this.currentEntry.videoId,
        sessionCount: this.currentEntry.watchLogs.length
      });
    } catch (error) {
      logger.error('[WatchTracker] 新しい視聴セッション開始エラー:', error);
    }
  }

  /**
   * 最新の視聴セッションを更新する
   */
  private updateLatestWatchSession(currentTime: number, isCompleted: boolean, duration?: number): void {
    if (!this.currentEntry) {
      logger.warn('[WatchTracker] currentEntryが存在しません');
      return;
    }

    if (!this.currentEntry.watchLogs) {
      logger.warn('[WatchTracker] watchLogsが存在しません');
      return;
    }

    if (this.currentEntry.watchLogs.length === 0) {
      logger.warn('[WatchTracker] watchLogsが空です - 新しいセッションを作成します');
      // 空の場合は新しいセッションを作成
      this.currentEntry.watchLogs.push({
        date: Date.now(),
        position: 0,
        completed: false
      });
    }

    // 最新の視聴セッションを取得
    const latestSession = this.currentEntry.watchLogs[this.currentEntry.watchLogs.length - 1];
    
    // 日時はセッション開始時のまま保持し、上書きしません
    latestSession.position = currentTime;
    latestSession.completed = isCompleted;
    
    // durationの計算 - 引数で渡されたものか、video要素から取得、または既存の値を使用
    const videoDuration = duration || this.videoElement?.duration || this.currentEntry.lengthSec || 1;
    
    logger.debug('[WatchTracker] 最新の視聴セッションを更新しました:', {
      videoId: this.currentEntry.videoId,
      position: currentTime,
      completed: isCompleted,
      progressPercent: Math.round((currentTime / videoDuration) * 100),
      sessionCount: this.currentEntry.watchLogs.length,
      duration: videoDuration
    });
  }

  /**
   * video要素のイベントリスナーを設定する
   */
  private setupVideoEventListeners(): void {
    if (!this.videoElement) return;

    // メタデータ読込完了
    this.videoElement.addEventListener('loadedmetadata', () => {
      // 二重開始防止
      if (!this.progressTimer) {
        this.startProgressTracking();
      }
    });

    // 既にメタデータが読み込まれている場合（readyState >= 1）にも即時開始する
    if (this.videoElement.readyState >= 1 && !this.progressTimer) {
      this.startProgressTracking();
    }

    // 再生開始
    this.videoElement.addEventListener('play', () => {
      this.emitWatchEvent('resume', this.videoElement!.currentTime);
    });

    // 一時停止
    this.videoElement.addEventListener('pause', () => {
      const currentTime = this.videoElement!.currentTime;
      this.emitWatchEvent('pause', currentTime);
      
      // 一時停止時にも現在の視聴セッションを記録
      void this.recordCurrentSession();
    });

    // 終了
    this.videoElement.addEventListener('ended', () => {
      void this.handleVideoEnded();
    });

    // 時間更新（デバウンス処理）
    let timeUpdateTimeout: number | null = null;
    this.videoElement.addEventListener('timeupdate', () => {
      if (timeUpdateTimeout) clearTimeout(timeUpdateTimeout);
      
      timeUpdateTimeout = setTimeout(() => { void this.handleTimeUpdate(); }, 1000); // 1秒デバウンス
    });
  }

  /**
   * 進捗追跡を開始する
   */
  private startProgressTracking(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
    }

    this.progressTimer = setInterval(() => {
      void this.updateProgress();
    }, this.PROGRESS_INTERVAL);
  }

  /**
   * 進捗を更新する
   */
  private async updateProgress(): Promise<void> {
    if (!this.videoElement || !this.currentEntry) {
      logger.debug('[WatchTracker] updateProgress: videoElementまたはcurrentEntryが存在しません');
      return;
    }

    const currentTime = this.videoElement.currentTime;
    // duration のフォールバック処理：Infinity や 0 が返る場合は API から取得した lengthSec を用いる
    let duration = this.videoElement.duration;
    if (!isFinite(duration) || duration === 0) {
      duration = this.currentEntry.lengthSec || 0;
    }

    if (isNaN(currentTime) || !isFinite(duration) || duration === 0) {
      logger.debug('[WatchTracker] updateProgress: currentTimeまたはdurationが無効です', {
        currentTime,
        duration
      });
      return;
    }

    const now = Date.now();
    
    // 進捗を更新
    this.currentEntry.lastPosition = currentTime;
    this.currentEntry.watchedAt = now;
    
    // 完走判定
    const completionRate = currentTime / duration;
    if (completionRate >= this.COMPLETION_THRESHOLD && !this.currentEntry.completed) {
      this.currentEntry.completed = true;
      this.emitWatchEvent('complete', currentTime);
    }

    logger.debug('[WatchTracker] 進捗を更新中:', {
      videoId: this.currentEntry.videoId,
      currentTime,
      duration,
      completionRate: Math.round(completionRate * 100),
      watchLogsLength: this.currentEntry.watchLogs?.length || 0
    });

    // 最新の視聴セッションを更新
    this.updateLatestWatchSession(currentTime, completionRate >= this.COMPLETION_THRESHOLD, duration);

    // データベースへの書き込みは過剰にならぬよう間引く
    if (now - this.lastSessionRecordTime >= this.SESSION_RECORD_INTERVAL) {
      try {
        await watchHistoryDB.saveEntry(this.currentEntry);
        this.lastSessionRecordTime = now;
      } catch (error) {
        console.error('進捗保存エラー:', error);
      }
    }
  }

  /**
   * 時間更新を処理する
   */
  private async handleTimeUpdate(): Promise<void> {
    if (!this.videoElement || !this.currentEntry) return;

    const currentTime = this.videoElement.currentTime;
    
    // 繰り返し再生の検出（大幅な時間の後戻り）
    if (this.previousTime > 0 && 
        currentTime < this.previousTime && 
        (this.previousTime - currentTime) > this.REPEAT_DETECTION_THRESHOLD) {
      
      console.log('[WatchTracker] 繰り返し再生を検出:', {
        previousTime: this.previousTime,
        currentTime: currentTime,
        timeDiff: this.previousTime - currentTime
      });
      
      // 前のセッションを100%完了として記録
      await this.recordRepeatCompletion();
    }
    
    // 前回時刻を更新
    this.previousTime = currentTime;
    
    this.emitWatchEvent('progress', currentTime);
  }

  /**
   * 繰り返し再生時に前のセッションを100%完了として記録する
   */
  private async recordRepeatCompletion(): Promise<void> {
    if (!this.currentEntry || !this.videoElement) return;

    const duration = this.videoElement.duration;
    const now = Date.now();
    
    
    
    // 前のセッションを100%完了として記録
    this.currentEntry.completed = true;
    this.currentEntry.lastPosition = duration; // 動画の最後まで視聴したものとして記録
    this.currentEntry.watchedAt = now;
    
    // 最新の視聴セッションを100%完了として更新
    this.updateLatestWatchSession(duration, true, duration);
    
    // 視聴回数を増加
    this.currentEntry.watchCount++;
    
    // 新しい視聴セッションを開始
    await this.startNewWatchSession();
    
    // データベースに保存
    try {
      await watchHistoryDB.saveEntry(this.currentEntry);
      
    } catch (error) {
      console.error('[WatchTracker] 繰り返し再生による完了記録の保存エラー:', error);
    }
    
    // 完了イベントを発行
    this.emitWatchEvent('complete', duration);
  }

  /**
   * 動画終了を処理する
   */
  private async handleVideoEnded(): Promise<void> {
    if (!this.videoElement || !this.currentEntry) return;

    const currentTime = this.videoElement.currentTime;
    const now = Date.now();
    
    // 完走とマーク
    this.currentEntry.completed = true;
    this.currentEntry.lastPosition = currentTime;
    this.currentEntry.watchedAt = now;
    
    // 最新の視聴セッションを完了として更新
    this.updateLatestWatchSession(currentTime, true, this.videoElement?.duration);
    
    // データベースに保存
    try {
      await watchHistoryDB.saveEntry(this.currentEntry);
    } catch (error) {
      console.error('視聴完了保存エラー:', error);
    }
    
    this.emitWatchEvent('complete', currentTime);
    this.stopWatching();
  }

  /**
   * 視聴追跡を停止する
   */
  private stopWatching(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    
    this.isWatching = false;
    
    logger.debug('[WatchTracker] 視聴追跡を停止しました');
  }

  /**
   * 視聴イベントを発行する
   */
  private emitWatchEvent(type: WatchEventType, currentTime: number): void {
    if (!this.currentEntry) return;

    const event: WatchEvent = {
      type,
      videoId: this.currentEntry.videoId,
      currentTime,
      duration: this.videoElement?.duration || 0,
      timestamp: Date.now()
    };

    // カスタムイベントを発行
    const customEvent = new CustomEvent('watchHistoryEvent', {
      detail: event
    });
    
    document.dispatchEvent(customEvent);
  }

  /**
   * 破棄処理
   */
  public async destroy(): Promise<void> {
    logger.debug('[WatchTracker] 破棄処理を開始します');
    
    // 進捗追跡を先に停止
    this.stopWatching();
    
    // 破棄時は重複記録防止を無効化して確実に記録
    this.lastSessionRecordTime = 0;
    await this.recordCurrentSession();
    
    this.currentEntry = null;
    this.videoElement = null;
    this.currentVideoId = null;
    this.previousTime = 0;
    this.lastSessionRecordTime = 0;
    
    logger.debug('[WatchTracker] 破棄処理が完了しました');
  }

  /**
   * 同期的な破棄処理（beforeunload用）
   */
  public destroySync(): void {
    logger.debug('[WatchTracker] 同期的な破棄処理を開始します');
    
    // 進捗追跡を先に停止
    this.stopWatching();
    
    // 破棄時は重複記録防止を無効化して確実に記録
    this.lastSessionRecordTime = 0;
    this.recordCurrentSessionSync();
    
    this.currentEntry = null;
    this.videoElement = null;
    this.currentVideoId = null;
    this.previousTime = 0;
    this.lastSessionRecordTime = 0;
    
    logger.debug('[WatchTracker] 同期的な破棄処理が完了しました');
  }

  /**
   * ページが背後に回った際など、一時的に進捗のみ保存する公開メソッド
   */
  public async saveSnapshot(): Promise<void> {
    await this.recordCurrentSession();
  }

  /**
   * 現在の視聴セッションを記録する
   */
  private async recordCurrentSession(): Promise<void> {
    if (!this.videoElement || !this.currentEntry || !this.isWatching) return;

    const currentTime = this.videoElement.currentTime;
    const duration = this.videoElement.duration;
    
    if (isNaN(currentTime) || isNaN(duration) || duration === 0) return;

    const now = Date.now();
    
    // 短時間での重複記録を防ぐ
    if (now - this.lastSessionRecordTime < this.SESSION_RECORD_INTERVAL) {
      logger.debug('[WatchTracker] 短時間での重複記録をスキップしました');
      return;
    }

    // 現在の視聴セッションを記録
    const completionRate = currentTime / duration;
    const isCompleted = completionRate >= this.COMPLETION_THRESHOLD;
    
    // 最新の視聴セッションを更新（新しいセッションを作成しない）
    this.updateLatestWatchSession(currentTime, isCompleted, duration);
    
    this.currentEntry.lastPosition = currentTime;
    this.currentEntry.watchedAt = now;
    this.lastSessionRecordTime = now;
    
    if (isCompleted && !this.currentEntry.completed) {
      this.currentEntry.completed = true;
    }
    
    // データベースに保存
    try {
      await watchHistoryDB.saveEntry(this.currentEntry);
      logger.debug('[WatchTracker] 視聴セッションを記録しました:', {
        videoId: this.currentEntry.videoId,
        position: currentTime,
        completed: isCompleted,
        completionRate: Math.round(completionRate * 100)
      });
    } catch (error) {
      logger.error('[WatchTracker] 視聴セッション記録エラー:', error);
    }
  }

  /**
   * 現在の視聴セッションを同期的に記録する（beforeunload用）
   */
  private recordCurrentSessionSync(): void {
    if (!this.videoElement || !this.currentEntry || !this.isWatching) {
      logger.debug('[WatchTracker] recordCurrentSessionSync: 必要な要素が存在しません');
      return;
    }

    const currentTime = this.videoElement.currentTime;
    const duration = this.videoElement.duration;
    
    if (isNaN(currentTime) || isNaN(duration) || duration === 0) {
      logger.debug('[WatchTracker] recordCurrentSessionSync: currentTimeまたはdurationが無効です');
      return;
    }

    // 現在の視聴セッションを記録
    const now = Date.now();
    const completionRate = currentTime / duration;
    const isCompleted = completionRate >= this.COMPLETION_THRESHOLD;
    
    // 最新の視聴セッションを更新（新しいセッションを作成しない）
    this.updateLatestWatchSession(currentTime, isCompleted, duration);
    
    this.currentEntry.lastPosition = currentTime;
    this.currentEntry.watchedAt = now;
    
    if (isCompleted && !this.currentEntry.completed) {
      this.currentEntry.completed = true;
    }
    
    // データベースに同期的に保存を試みる（IndexedDBは実際には非同期だが、可能な限り）
    try {
      void watchHistoryDB.saveEntry(this.currentEntry);
      logger.debug('[WatchTracker] 視聴セッションを同期的に記録しました:', {
        videoId: this.currentEntry.videoId,
        position: currentTime,
        completed: isCompleted,
        completionRate: Math.round(completionRate * 100)
      });
    } catch (error) {
      logger.error('[WatchTracker] 同期的視聴セッション記録エラー:', error);
    }
  }

  // ===== メタデータ抽出メソッド =====

  /**
   * タイトルを抽出する
   */
  private extractTitle(apiData: NicoApiData): string | null {
    try {
      // 複数の可能性を試す
      const videoData = apiData.video as { title?: string; name?: string; [key: string]: unknown };
      return videoData?.title || 
             videoData?.name || 
             document.querySelector('h1.VideoTitle')?.textContent ||
             document.title.replace(' - ニコニコ動画', '') ||
             null;
    } catch (error) {
      console.warn('タイトル抽出エラー:', error);
      return null;
    }
  }

  /**
   * 投稿者IDを抽出する
   */
  private extractOwnerId(apiData: NicoApiData): string | null {
    try {
      const ownerData = apiData.owner as { id?: string | number; [key: string]: unknown };
      const channelData = apiData.channel as { id?: string | number; [key: string]: unknown };
      const videoData = apiData.video as { owner?: { id?: string | number; [key: string]: unknown }; [key: string]: unknown };
      
      const id = ownerData?.id || 
                 channelData?.id ||
                 videoData?.owner?.id ||
                 null;
      return id ? String(id) : null;
    } catch (error) {
      console.warn('投稿者ID抽出エラー:', error);
      return null;
    }
  }

  /**
   * 投稿者名を抽出する
   */
  private extractOwnerName(apiData: NicoApiData): string | null {
    try {
      const ownerData = apiData.owner as { nickname?: string; [key: string]: unknown };
      const channelData = apiData.channel as { name?: string; [key: string]: unknown };
      const videoData = apiData.video as { owner?: { nickname?: string; [key: string]: unknown }; [key: string]: unknown };
      
      return ownerData?.nickname || 
             channelData?.name ||
             videoData?.owner?.nickname ||
             document.querySelector('.VideoOwner-name')?.textContent ||
             null;
    } catch (error) {
      console.warn('投稿者名抽出エラー:', error);
      return null;
    }
  }

  /**
   * 動画長を抽出する
   */
  private extractLengthSec(apiData: NicoApiData): number | null {
    try {
      const videoData = apiData.video as { duration?: number; length?: number; [key: string]: unknown };
      return videoData?.duration || 
             videoData?.length ||
             (this.videoElement?.duration || 0);
    } catch (error) {
      console.warn('動画長抽出エラー:', error);
      return null;
    }
  }

  /**
   * 統計情報を抽出する
   */
  private extractStats(apiData: NicoApiData): VideoStats | null {
    try {
      const videoData = apiData.video as { 
        count?: { view?: number; comment?: number; mylist?: number; like?: number; [key: string]: unknown }; 
        registeredAt?: string; 
        [key: string]: unknown 
      };
      
      return {
        viewCount: videoData?.count?.view || 0,
        commentCount: videoData?.count?.comment || 0,
        mylistCount: videoData?.count?.mylist || 0,
        likeCount: videoData?.count?.like || 0,
        uploadedAt: videoData?.registeredAt ? new Date(videoData.registeredAt).getTime() : Date.now()
      };
    } catch (error) {
      console.warn('統計情報抽出エラー:', error);
      return null;
    }
  }

  /**
   * タグを抽出する
   */
  private extractTags(apiData: NicoApiData): string[] | null {
    try {
      const tagData = apiData.tag as { items?: { name?: string; [key: string]: unknown }[]; [key: string]: unknown };
      return tagData?.items?.map((tag) => tag.name || '') || 
             Array.from(document.querySelectorAll('.VideoTag')).map(el => el.textContent || '') ||
             [];
    } catch (error) {
      console.warn('タグ抽出エラー:', error);
      return null;
    }
  }

  /**
   * サムネイルURLを抽出する
   */
  private extractThumbnailUrl(apiData: NicoApiData): string | null {
    try {
      const videoData = apiData.video as { 
        thumbnail?: { url?: string; [key: string]: unknown }; 
        thumbnailUrl?: string; 
        [key: string]: unknown 
      };
      
      return videoData?.thumbnail?.url || 
             videoData?.thumbnailUrl ||
             document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
             null;
    } catch (error) {
      console.warn('サムネイルURL抽出エラー:', error);
      return null;
    }
  }

  /**
   * シリーズ情報を抽出する
   */
  private extractSeries(apiData: NicoApiData): SeriesInfo | null {
    try {
      const seriesData = apiData.series as {
        id?: number;
        title?: string;
        description?: string;
        thumbnailUrl?: string;
        video?: {
          prev?: unknown;
          next?: unknown;
          first?: unknown;
        };
        [key: string]: unknown;
      };
      
      if (!seriesData || !seriesData.id) {
        return null;
      }

      return {
        id: seriesData.id,
        title: seriesData.title || '',
        description: seriesData.description || '',
        thumbnailUrl: seriesData.thumbnailUrl || '',
        video: {
          prev: seriesData.video?.prev as SeriesVideoInfo | null,
          next: seriesData.video?.next as SeriesVideoInfo | null,
          first: seriesData.video?.first as SeriesVideoInfo | null
        }
      };
    } catch (error) {
      console.warn('シリーズ情報抽出エラー:', error);
      return null;
    }
  }
}

// ページ読み込み時に自動初期化
let watchTracker: WatchTracker | null = null;

async function initializeWatchTracker(): Promise<void> {
  
  
  
  
  // 視聴ページまたはスタンドアロンプレイヤーかチェック
  const isWatchPage = isWatchPageLocation();
  const isStandalonePlayer = isStandalonePlayerLocation();
  if (!isWatchPage && !isStandalonePlayer) {
    return;
  }
  
  
  
  // 既存のトラッカーがあれば破棄
  if (watchTracker) {
    await watchTracker.destroy();
  }
  
  // 新しいトラッカーを作成
  
  watchTracker = new WatchTracker();
}

// DOM読み込み完了時に初期化



if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { void initializeWatchTracker(); });
} else {
  void initializeWatchTracker();
}

// ページ遷移時の対応（SPA対応）
let currentUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== currentUrl) {
    
    currentUrl = location.href;
    
    // 視聴ページかスタンドアロンプレイヤーかをチェック
    if (isWatchPageLocation() || isStandalonePlayerLocation()) {
      
      // 少し待ってから初期化（DOM更新完了を待つ）
      setTimeout(() => { void initializeWatchTracker(); }, 1000);
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// ページ離脱時の処理
window.addEventListener('beforeunload', () => {
  
  if (watchTracker) {
    // beforeunloadでは非同期処理ができないので、同期的に記録を試みる
    watchTracker.destroySync();
  }
});

// ページの可視性変更時の処理（タブ切り替え、最小化など）
document.addEventListener('visibilitychange', () => {
  if (watchTracker && document.visibilityState === 'hidden') {
    logger.debug('[WatchTracker] ページが非表示になりました - 進捗を一時保存します');
    void watchTracker.saveSnapshot();
    // 背景でも tracking は継続するゆえ destroy は行いません
  }
});

// ページ離脱時の処理（より確実にキャッチ）
window.addEventListener('pagehide', () => {
  if (watchTracker) {
    logger.debug('[WatchTracker] ページが離脱されました - 視聴セッションを記録します');
    void watchTracker.destroy();
  }
}); 
