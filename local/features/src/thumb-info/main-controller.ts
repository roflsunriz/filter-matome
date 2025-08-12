"use strict";

import "./api-util.js";
import { applyThumbInfoStyles } from './styles.js';
import { createMaterialIcon } from '../common/material-icons.js';
import { VideoInfoHandler } from './video-info-handler.js';
import { CommentHandler } from './comment-handler.js';
import { videoIdUtils, estimationUtils, uiUtils } from './shared-utils.js';

/**
 * メインコントローラー - アプリケーション全体の初期化と制御を管理
 */

export class MainController {
  private videoInfoHandler: VideoInfoHandler;
  private commentHandler: CommentHandler;
  private currentVideoId: string | null = null;

  constructor() {
    this.videoInfoHandler = new VideoInfoHandler();
    this.commentHandler = new CommentHandler();
  }

  // アプリケーションの初期化
  async initialize(): Promise<void> {
    window.logger.debug('[DEBUG] MainController: Initializing...');
    
    // スタイルを適用
    applyThumbInfoStyles();
    
    // アイコンを初期化
    this.initializeIcons();
    
    // イベントリスナーを設定
    this.setupEventListeners();
    
    // videoIdの取得を試行
    const videoId = videoIdUtils.getBestVideoId();
    
    if (videoId) {
      await this.initializeWithVideoId(videoId);
    } else {
      // videoIdが取得できない場合は入力UIを表示
      this.showVideoIdInputUI();
    }
    
    window.logger.debug('[DEBUG] MainController: Initialization completed');
  }

  // videoIdで初期化
  private async initializeWithVideoId(videoId: string): Promise<void> {
    window.logger.debug(`[DEBUG] MainController: Initializing with videoId: ${videoId}`);
    
    this.currentVideoId = videoId;
    
    // 各ハンドラーにvideoIdを設定
    this.videoInfoHandler.setVideoId(videoId);
    this.commentHandler.setVideoId(videoId);
    
    // タイトルを一時的に設定
    const videoInfoTitle = document.getElementById('video-info-title');
    if (videoInfoTitle) videoInfoTitle.textContent = `Loading... (${videoId})`;
    
    // グローバル関数を設定（既存のシステムとの互換性のため）
    this.setupGlobalFunctions();
    
    try {
      // ビデオ情報を表示
      window.logger.debug(`[DEBUG] MainController: Starting video info display...`);
      await this.videoInfoHandler.displayVideoInfo(videoId);
      
      // APIデータを取得（common.tsの統合関数使用）
      window.logger.debug(`[DEBUG] MainController: Fetching API data...`);
      const fetchResult = await window.commonHelper.fetchWatchPage(videoId);
      if (fetchResult) {
        window.logger.debug(`[DEBUG] MainController: API data fetched successfully`);
      }
      
      window.logger.debug(`[DEBUG] MainController: Initialization with videoId completed`);
      
    } catch (error) {
      window.logger.error('MainController: Failed to initialize with videoId:', error);
      this.showError('初期化中にエラーが発生しました', error);
    }
  }

  // グローバル関数を設定（互換性のため）
  private setupGlobalFunctions(): void {
    // videoId設定関数
    window.setCurrentVideoId = (videoId: string) => {
      this.currentVideoId = videoId;
      this.videoInfoHandler.setVideoId(videoId);
      this.commentHandler.setVideoId(videoId);
      window.logger.debug(`[DEBUG] MainController: currentVideoId set to ${videoId}`);
    };

    // コメント処理開始関数
    window.startCommentProcessingWithVideoId = async (videoId: string) => {
      await this.commentHandler.startCommentProcessing(videoId);
    };

    // コピー関数
    window.copy_ext = (event: MouseEvent) => {
      this.videoInfoHandler.handleCopy(event);
    };

    // 推定処理時間計算関数
    window.EstimatedProcessingTime = (commentNum: string, videoLength: string) => {
      return estimationUtils.calculateProcessingTime(commentNum, videoLength);
    };

    // 推定処理時間表示関数
    window.EPTWrapper = (message: string) => {
      window.toastr.info(message);
    };
  }

  // イベントリスナーを設定
  private setupEventListeners(): void {
    // コメント取得ボタン
    const commentExecBtn = document.getElementById("nicovideoCommentExec");
    if (commentExecBtn) {
      commentExecBtn.addEventListener("click", () => {
        if (this.currentVideoId) {
          void this.commentHandler.startCommentProcessing(this.currentVideoId);
        } else {
          window.toastr.error(
            "動画IDが設定されていません",
            "先に動画情報を取得してください",
            { timeOut: 5000 }
          );
        }
      });
    }

    // 推定処理時間計算ボタン
    const estimateBtn = document.getElementById("estimateProcessingTime");
    if (estimateBtn) {
      estimateBtn.addEventListener("click", () => {
        const commentNum = document.getElementById('comment-num')?.textContent || "0";
        const videoLength = document.getElementById('video-length')?.textContent || "0:00";
        estimationUtils.showProcessingTimeToast(commentNum, videoLength);
      });
    }
  }

  // アイコンを初期化
  private initializeIcons(): void {
    // コピーアイコン
    const copyIcons = document.querySelectorAll('.copy-icon[data-icon]');
    copyIcons.forEach((iconElement) => {
      const iconName = iconElement.getAttribute('data-icon');
      if (iconName) {
        const icon = createMaterialIcon(iconName, {
          style: 'outlined',
          color: 'white',
          size: 'small'
        });
        iconElement.innerHTML = icon;
      }
    });

    // アクションアイコン
    const actionIcons = document.querySelectorAll('.action-icon[data-icon]');
    actionIcons.forEach((iconElement) => {
      const iconName = iconElement.getAttribute('data-icon');
      if (iconName) {
        const icon = createMaterialIcon(iconName, {
          style: 'outlined',
          color: 'white',
          size: 'medium'
        });
        iconElement.innerHTML = icon;
      }
    });

    // リンクアイコン
    const linkIcons = document.querySelectorAll('.link-icon[data-icon]');
    linkIcons.forEach((iconElement) => {
      const iconName = iconElement.getAttribute('data-icon');
      if (iconName) {
        const icon = createMaterialIcon(iconName, {
          style: 'outlined',
          color: 'white',
          size: 'small'
        });
        iconElement.innerHTML = icon;
      }
    });
  }

  // videoId入力UIを表示
  private showVideoIdInputUI(): void {
    const onSubmit = (videoId: string) => {
      void this.initializeWithVideoId(videoId);
    };

    const onCancel = () => {
      const apiStatus = document.getElementById('api-status');
      const videoInfoTitle = document.getElementById('video-info-title');
      if (apiStatus) apiStatus.textContent = 'Error: No video ID provided';
      if (videoInfoTitle) videoInfoTitle.textContent = 'No video selected';
    };

    uiUtils.createVideoIdInputUI(onSubmit, onCancel);
  }

  // エラー表示
  private showError(title: string, error: unknown): void {
    let message = "";
    if (error instanceof Error) {
      message = error.message;
    } else {
      message = String(error);
    }
    
    window.toastr.error(title, message, { timeOut: 5000 });
    window.logger.error(`${title}:`, error);
  }
}

// メインコントローラーのインスタンスを作成・初期化
const mainController = new MainController();

// DOMContentLoadedイベントで初期化
document.addEventListener('DOMContentLoaded', () => {
  void mainController.initialize();
});