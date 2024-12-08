import { PlaybackController } from './src/components/PlaybackControl.js';
import { CommentSearchController } from './src/components/CommentSearch.js';
import { TabController } from './src/components/TabControl.js';
import { VolumeController } from './src/components/VolumeControl.js';
import { eventHandlers } from './src/utils/eventHandler.js';
import { template } from './src/templates/UI.js';
import { CustomMylist2AddButton } from './src/components/CustomMylist2AddButton.js';
import { DragController as DragEvents } from './src/components/DragEvents.js';
import { debugLog, debugError, debugWarn } from './src/config.js';

class VideoControllerApp {
  constructor() {
    try {
      this.initialized = false;
      this.controllers = {
        playback: null,
        comments: null,
        tab: null,
        volume: null,
        mylist2: null,
        drag: null
      };
      
      // 先にイベントリスナーを設定
      this.setupEventListeners();
      
      this.init().catch(error => {
        debugError('VideoControllerApp初期化エラー:', error);
      });
    } catch (error) {
      debugError('VideoControllerAppコンストラクタエラー:', error);
    }
  }

  setupEventListeners() {
    // NicoCacheのイベントハンドリング
    NicoCache_nl.watch.addEventListener('initialized', async (videoId, apiData) => {
      try {
        debugLog('NicoCache initialized イベント受信');
        if (!this.initialized) {
          await this.init();
          this.handleVideoInit(videoId, apiData);
        }
      } catch (error) {
        debugError('NicoCache初期化エラー:', error);
      }
    });

    NicoCache_nl.watch.addEventListener('videoChanged', async (videoId, apiData) => {
      try {
        debugLog('NicoCache videoChanged イベント受信');
        await this.handleVideoChange(videoId, apiData);
      } catch (error) {
        debugError('動画変更エラー:', error);
      }
    });
  }

  async init() {
    try {
      debugLog('VideoControllerApp: init開始');
      
      if (!document.documentElement) {
        throw new Error('document.documentElementが見つかりません');
      }

      // テンプレート挿入は既に存在しない場合のみ行う
      if (!document.querySelector('#PlaybackrateChangerContainer')) {
        document.documentElement.insertAdjacentHTML('beforeend', template);
        debugLog('VideoControllerApp: テンプレート挿入完了');
      }
      
      const video = document.querySelector('video');
      debugLog('VideoControllerApp: video要素取得:', video);
      
      if (!video) {
        throw new Error('video要素が見つかりません');
      }

      const container = document.querySelector('#PlaybackrateChangerContainer');
      if (!container) {
        throw new Error('PlaybackrateChangerContainerが見つかりません');
      }

      await this.initializeControllers(container, video);
      await this.setupEventListeners();
      
      // 初期化完了後にhandleVideoInitを呼び出す
      if (NicoCache_nl.watch.apiData) {
        await this.handleVideoInit(NicoCache_nl.watch.apiData.video.id, NicoCache_nl.watch.apiData);
      }
      
      this.initialized = true;
      debugLog('VideoControllerApp: 初期化完了');
    } catch (error) {
      debugError('VideoControllerApp初期化エラー:', error);
      throw error;
    }
  }

  async initializeControllers(container, video) {
    try {
      this.controllers.tab = new TabController();
      window.PlaybackrateChanger2Controllers.tab = this.controllers.tab;
      debugLog('VideoControllerApp: TabController初期化完了');
      
      this.controllers.volume = new VolumeController({ video });
      window.PlaybackrateChanger2Controllers.volume = this.controllers.volume;
      debugLog('VideoControllerApp: VolumeController初期化完了');
      
      this.controllers.playback = new PlaybackController({ video });
      window.PlaybackrateChanger2Controllers.playback = this.controllers.playback;
      debugLog('VideoControllerApp: PlaybackController初期化完了');
      
      // キーボードショート�ットの設定を別途行う
      if (this.controllers.playback) {
        eventHandlers.playbackController = this.controllers.playback;
        if (typeof eventHandlers.setupKeyboardShortcuts === 'function') {
          eventHandlers.setupKeyboardShortcuts();
          debugLog('キーボードショートカット設定完了');
        } else {
          debugWarn('setupKeyboardShortcutsが見つかりません');
        }
      }
      
      this.controllers.drag = new DragEvents(container);
      window.PlaybackrateChanger2Controllers.drag = this.controllers.drag;
      debugLog('VideoControllerApp: DragController初期化完了');
      
      const commentContainer = document.getElementById('CommentSearchContainer');
      if (!commentContainer) {
        throw new Error('CommentSearchContainerが見つかりません');
      }
      
      this.controllers.comments = new CommentSearchController({ container: commentContainer });
      window.PlaybackrateChanger2Controllers.comments = this.controllers.comments;
      debugLog('VideoControllerApp: CommentSearchController初期化完了');
      
      const mylistContainer = container.querySelector('#MiscContainer');
      if (mylistContainer) {
        this.controllers.mylist2 = new CustomMylist2AddButton({ container: mylistContainer });
        window.PlaybackrateChanger2Controllers.mylist2 = this.controllers.mylist2;
        debugLog('VideoControllerApp: CustomMylist2AddButton初期化完了');
      } else {
        debugError('マイリストコンテナが見つかりません');
      }

    } catch (error) {
      debugError('コントローラー初期化エラー:', error);
      throw error;
    }
  }

  async handleVideoInit(videoId, apiData) {
    try {
      debugLog("this.controllers.playbackの存在", this.controllers.playback);
      await this.controllers.playback?.initializeDisplays();
      this.controllers.playback?.updateVideo(videoId, apiData);
      this.controllers.comments?.updateComments(apiData);
      
      // 初期再生時の同期処理を追加
      if (this.controllers.playback) {
        this.controllers.playback.handleInitialPlay();
      }
      
      debugLog('動画初期化完了');
    } catch (error) {
      debugError('動画初期化エラー:', error);
    }
  }

  async handleVideoChange(videoId, apiData) {
    try {
      // 既存のコントローラーをクリーンアップ
      this.cleanup();
      
      // 新しいビデオ用に再初期化
      await this.init();

      // コンテナの位置を更新
      if (this.controllers.drag) {
        this.controllers.drag.updatePosition();
      }
    } catch (error) {
      debugError('動画変更エラー:', error);
    }
  }

  cleanup() {
    try {
      Object.entries(this.controllers).forEach(([name, controller]) => {
        if (controller && typeof controller.destroy === 'function') {
          try {
            controller.destroy();
            window.PlaybackrateChanger2Controllers[name] = null;
            debugLog(`${name}コントローラーのクリーンアップ完了`);
          } catch (error) {
            debugError(`${name}コントローラーのクリーンアップエラー:`, error);
          }
        }
      });
    } catch (error) {
      debugError('クリーンアップ処理エラー:', error);
    }
  }
}

// アプリケーションの起動
window.addEventListener('load', async () => {
  try {
    debugLog('DOM読み込み開始');
    
    // video要素の存在を確認（複数回試行）
    let video = null;
    let retryCount = 0;
    const maxRetries = 5;
    
    while (!video && retryCount < maxRetries) {
      video = document.querySelector('video');
      if (!video) {
        retryCount++;
        debugLog(`video要素を待機中... (${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!video) {
      throw new Error('video要素が見つかりませんでした');
    }

    // VideoControllerAppのインスタンス化（テンプレート挿入を含む）
    const app = new VideoControllerApp();
    
    // テンプレート挿入後にコンテナの存在を確認
    await new Promise(resolve => setTimeout(resolve, 100)); // DOMの更新を待つ
    
    const containers = {
      main: document.getElementById('PlaybackrateChangerContainer'),
      tab: document.getElementById('PlayerControllContainer'),
      comment: document.getElementById('CommentSearchContainer'),
      misc: document.getElementById('MiscContainer')
    };
    
    // 必須コンテナの存在チェック
    const missingContainers = Object.entries(containers)
      .filter(([_, element]) => !element)
      .map(([name]) => name);
    
    if (missingContainers.length > 0) {
      throw new Error(`必要なコンテナが見つかりません: ${missingContainers.join(', ')}`);
    }
    
    debugLog('全ての必要な要素が確認できました');
    
  } catch (error) {
    debugError('初期化エラー:', error);
  }
});