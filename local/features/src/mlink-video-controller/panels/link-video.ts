import { BasePanel } from '../panels/base';
import { basePanelStyles } from '../panels/base';
import { NicoVideoPlayer } from '../services/nico-video-player';
import { LinkManager } from '../services/link-manager';
import { CommentManager } from '../managers/comment';
import { HeatmapManager } from '../managers/heatmap';
import { PlaybackHandler } from '../handlers/playback';
import { VolumeHandler } from '../handlers/volume';
import { SpeedHandler } from '../handlers/speed';
// import removed: Mylist2Handler no longer needed after unification

// 🆕 新規追加: モジュール管理システム
import { ModuleManager } from '../module-handlers/module-manager';
import { ModuleRegistry } from '../module-handlers/module-registry';
import { SettingsManager } from '../module-handlers/settings-manager';
import { SettingsUI } from '../module-handlers/settings-ui';

// 型定義のインポート
import { LinkGroup, LinkData, MlinkVideoComment } from '@/types/mlink-video-controller-types';
import { TimerHandle } from '@/types/util-types';

// テンプレートの静的インポート
import { panelTemplate } from '../templates/panel';
import { linksTemplate } from '../templates/links';
import { commentsTemplate } from '../templates/comments';
import { playbackTemplate } from '../templates/playback';
import { speedTemplate } from '../templates/speed';
import { volumeTemplate } from '../templates/volume';
import { settingsTemplate } from '../templates/settings';

// スタイルの静的インポート
import { panelStyles } from '../styles/panel';
import { controlsStyles } from '../styles/controls';
import { commentsStyles } from '../styles/comments';
import { heatmapStyles } from '../styles/heatmap';
import { settingsStyles } from '../styles/settings';
import { materialIconsStyles, createMaterialIcon } from '../../common/material-icons';

export class MlinkVideoController extends BasePanel {
  private player: NicoVideoPlayer | null = null;
  private linkManager: LinkManager | null = null;
  private commentManager: CommentManager | null = null;
  private heatmapManager: HeatmapManager | null = null;
  private playbackHandler: PlaybackHandler | null = null;
  private volumeHandler: VolumeHandler | null = null;
  private speedHandler: SpeedHandler | null = null;
  private timeUpdateInterval: TimerHandle | null = null;
  private isLoopEnabled: boolean = false; // 繰り返し再生フラグ

  // SPAコメントデータ更新の購読解除用
  private commentDataChangedUnsubscribe: (() => void) | null = null;

  // UIコンポーネント（テンプレートベースに移行したためコメントアウト）
  // private playbackControls: PlaybackControls | null = null;
  // private volumeControls: VolumeControls | null = null;
  // private speedControls: SpeedControls | null = null;
  // private commentControls: CommentControls | null = null;
  // private heatmapControls: HeatmapControls | null = null;

  // 🆕 新規追加: モジュール管理システム
  private moduleManager: ModuleManager;
  private moduleRegistry: ModuleRegistry;
  private settingsManager: SettingsManager;
  private settingsUI: SettingsUI;
  private isWatchPage: boolean = false;

  constructor() {
    super();
    
    // ページタイプを判定
    this.isWatchPage = this.detectWatchPage();
    
    
    // 🆕 新規追加: モジュール管理システムの初期化
    this.moduleManager = ModuleManager.getInstance();
    this.moduleRegistry = ModuleRegistry.getInstance();
    this.settingsManager = SettingsManager.getInstance();
    this.settingsUI = SettingsUI.getInstance();
    
    // LinkManagerは全ページで利用（リンク定義と実行を一元化）
    this.linkManager = LinkManager.getInstance();

    // 視聴ページの場合のみ動画関連サービスを初期化
    if (this.isWatchPage) {
      this.player = NicoVideoPlayer.getInstance();
      this.commentManager = CommentManager.getInstance();
      this.heatmapManager = HeatmapManager.getInstance();
      this.playbackHandler = new PlaybackHandler();
      this.volumeHandler = new VolumeHandler();
      this.speedHandler = new SpeedHandler();
    }
    
    void this.render();
    
    // 視聴ページの場合のみ動画関連の初期化を実行
    if (this.isWatchPage) {
      this.setupVideoEndedListener(); // 動画終了監視を追加
    }
    
    void this.initializeModuleSystem(); // モジュールシステムの初期化
  }

  /**
   * 現在のページが視聴ページかどうかを判定
   */
  private detectWatchPage(): boolean {
    const pathname = window.location.pathname;
    return pathname.includes('/watch/');
  }

  private async loadStyles(): Promise<string> {
    await Promise.resolve();
    return `
      ${basePanelStyles}
      ${panelStyles}
      ${controlsStyles}
      ${commentsStyles}
      ${heatmapStyles}
      ${settingsStyles}
      ${materialIconsStyles}
    `;
  }

  private loadTemplates(): {[key: string]: string} {
    return {
      panel: this.generatePanelTemplate(),
      links: linksTemplate,
      comments: commentsTemplate,
      playback: playbackTemplate,
      speed: speedTemplate,
      volume: volumeTemplate,
      settings: settingsTemplate
    };
  }

  /**
   * ページタイプに応じたパネルテンプレートを生成
   */
  private generatePanelTemplate(): string {
    if (this.isWatchPage) {
      // 視聴ページでは全タブを表示
      return panelTemplate();
    } else {
      // その他のページでは動画関連タブを非表示
      return `
<button id="fab"></button>
<div class="panel">
  <div id="links" class="tab active">
    <!-- links.htmlの内容がここに挿入されます -->
  </div>

  <div id="settings" class="tab">
    <!-- settings.htmlの内容がここに挿入されます -->
  </div>

  <nav>
            <button data-tab="links" data-active>${createMaterialIcon('link', { style: 'outlined', classes: 'tab-icon', color: 'white' })}</button>
        <button data-tab="settings">${createMaterialIcon('settings', { style: 'outlined', classes: 'tab-icon', color: 'white' })}</button>
  </nav>
</div>
`;
    }
  }

  private async render() {
    try {
      const style = document.createElement('style');
      style.textContent = await this.loadStyles();
      
      const templates = this.loadTemplates();
      if (!templates.panel) {
        throw new Error('パネルテンプレートが見つかりません');
      }

      const template = document.createElement('template');
      
      // パネルテンプレートにタブコンテンツを挿入
      let panelHtml = templates.panel;
      
      // リンクテンプレートにリンクを挿入
      let linksHtml = templates.links;
      linksHtml = linksHtml
        .replace('<!-- カスタムリンクがここに挿入されます -->', this.renderLinkGroup('custom'))
        .replace('<!-- 関連サービスのリンクがここに挿入されます -->', this.renderLinkGroup('services'))
        .replace('<!-- データ管理のリンクがここに挿入されます -->', this.renderLinkGroup('dataManagement'));
      
      panelHtml = panelHtml
        .replace('<!-- links.htmlの内容がここに挿入されます -->', linksHtml)
        .replace('<!-- comments.htmlの内容がここに挿入されます -->', templates.comments)
        .replace('<!-- playback.htmlの内容がここに挿入されます -->', templates.playback)
        .replace('<!-- speed.htmlの内容がここに挿入されます -->', templates.speed)
        .replace('<!-- volume.htmlの内容がここに挿入されます -->', templates.volume)
        .replace('<!-- settings.htmlの内容がここに挿入されます -->', templates.settings);
      
      template.innerHTML = panelHtml;

      this.shadow.appendChild(style);
      this.shadow.appendChild(template.content.cloneNode(true));

      this.initializeComponents();
      this.setupEventListeners();
      
      // FABの設定（ページタイプに応じて変更）
      if (this.isWatchPage) {
        this.setupFab(createMaterialIcon('sports_esports', { style: 'outlined', classes: 'fab-icon', color: 'white' }), 'mlink-video-controller');
      } else {
        this.setupFab(createMaterialIcon('link', { style: 'outlined', classes: 'fab-icon', color: 'white' }), 'mlink-video-controller');
      }
      
      // 視聴ページの場合のみヒートマップを初期化
      if (this.isWatchPage) {
        this.initializeHeatmap();
      }
      
          // 設定タブの初期化
    this.initializeSettingsTab();
    
    // キー伝搬停止処理を設定
    this.setupKeyPropagationPrevention();
    } catch (error) {
      window.logger.error('パネルのレンダリングエラー:', error);
      throw error;
    }
  }

  private initializeComponents() {
    // テンプレートベースのUIを使用するため、重複するコンポーネントの追加をコメントアウト
    
    // 再生コントロール - playbackTemplateで既に実装済み
    // this.playbackControls = new PlaybackControls(this.playbackHandler);
    // const playbackContainer = this.shadow.querySelector('#playback');
    // if (playbackContainer) {
    //   playbackContainer.appendChild(this.playbackControls);
    // }

    // 音量コントロール - volumeTemplateで既に実装済み
    // this.volumeControls = new VolumeControls(this.volumeHandler);
    // const volumeContainer = this.shadow.querySelector('#volume');
    // if (volumeContainer) {
    //   volumeContainer.appendChild(this.volumeControls);
    // }

    // 再生速度コントロール - speedTemplateで既に実装済み
    // this.speedControls = new SpeedControls(this.speedHandler);
    // const speedContainer = this.shadow.querySelector('#speed');
    // if (speedContainer) {
    //   speedContainer.appendChild(this.speedControls);
    // }

    // コメントコントロール - commentsTemplateで既に実装済み
    // this.commentControls = new CommentControls(this.commentManager);
    // const commentContainer = this.shadow.querySelector('#comments');
    // if (commentContainer) {
    //   commentContainer.appendChild(this.commentControls);
    // }
    // ヒートマップコントロール - playbackTemplateで統合実装済み
    // this.heatmapControls = new HeatmapControls(this.heatmapManager);
    // const heatmapContainer = this.shadow.querySelector('#heatmap');
    // if (heatmapContainer) {
    //   heatmapContainer.appendChild(this.heatmapControls);
    // }
  }

  private setupEventListeners() {
    // メインタブの切り替え
    const tabs = this.shadow.querySelectorAll('[data-tab]');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tabId = target.dataset.tab;
        
        if (!tabId) return;
        
        // アクティブタブの更新
        tabs.forEach(t => t.removeAttribute('data-active'));
        target.setAttribute('data-active', '');

        // タブコンテンツの表示/非表示を切り替え
        const contents = this.shadow.querySelectorAll('.tab');
        contents.forEach(content => {
          if (content.id === tabId) {
            content.classList.add('active');
          } else {
            content.classList.remove('active');
          }
        });
      });
    });

    // サブタブの切り替え（リンクタブ内）
    const subtabs = this.shadow.querySelectorAll('[data-subtab]');
    subtabs.forEach(subtab => {
      subtab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const subtabId = target.dataset.subtab;
        
        if (!subtabId) return;
        
        // アクティブサブタブの更新
        subtabs.forEach(t => t.removeAttribute('data-active'));
        target.setAttribute('data-active', '');

        // サブタブコンテンツの表示/非表示を切り替え
        const subtabContents = this.shadow.querySelectorAll('.subtab');
        subtabContents.forEach(content => {
          if (content.id === subtabId) {
            content.classList.add('active');
          } else {
            content.classList.remove('active');
          }
        });
      });
    });

    // 視聴ページでのみ動画関連イベントを設定
    if (this.isWatchPage) {
      // プレイバックテンプレートのボタンイベント
      this.setupPlaybackTemplateEvents();

      // スピードテンプレートのボタンイベント
      this.setupSpeedTemplateEvents();

      // ボリュームテンプレートのボタンイベント
      this.setupVolumeTemplateEvents();

      // コメントテンプレートのイベント
      this.setupCommentTemplateEvents();
    }

    // コメントシークイベント（テンプレートベースのため直接処理）
    // this.commentControls?.addEventListener('comment-seek', ((e: CustomEvent<{time: number}>) => {
    //   const time = e.detail.time;
    //   this.player?.seek(time);
    // }) as EventListener);

    // ヒートマップシークイベント - playbackTemplateで統合実装済み
    // this.heatmapControls?.addEventListener('heatmap-seek', ((e: CustomEvent<{position: number}>) => {
    //   const position = e.detail.position;
    //   const duration = this.player?.getDuration();
    //   if (this.player && duration) {
    //     this.player.seek(position * duration);
    //   }
    // }) as EventListener);

    // アクションカードのクリックイベント
    const actionCards = this.shadow.querySelectorAll('.action-card');
    actionCards.forEach(card => {
      card.addEventListener('click', (e) => {
        void (async () => {
          const target = e.target as HTMLElement;
          const actionCard = target.closest('.action-card');
          if (actionCard instanceof HTMLElement && actionCard.dataset.action && this.linkManager) {
            await this.linkManager.handleAction(actionCard.dataset.action);
          }
        })();
      });
    });
  }

  private setupPlaybackTemplateEvents() {
    // トラッカーレンジ
    const trackerRange = this.shadow.querySelector('#playback .tracker-range') as HTMLInputElement;
    if (trackerRange) {
      trackerRange.addEventListener('input', (e) => {
        const position = parseFloat((e.target as HTMLInputElement).value) / 100;
        this.playbackHandler?.seekToPosition(position);
      });
    }

    // 時間表示の定期更新を開始
    this.startTimeUpdateInterval();

    // シークボタン
    const seekButtons = this.shadow.querySelectorAll('[data-seek]');
    seekButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const seekDirection = target.dataset.seek;
        const seekInput = this.shadow.querySelector('.seek-value') as HTMLInputElement;
        const seekValue = seekInput ? parseInt(seekInput.value) : 10;
        
        if (seekDirection === '+1' && this.playbackHandler) {
          this.playbackHandler.seek({ seconds: seekValue, direction: 'forward' });
        } else if (seekDirection === '-1' && this.playbackHandler) {
          this.playbackHandler.seek({ seconds: seekValue, direction: 'backward' });
        }
      });
    });

    // X秒ジャンプボタン
    const jumpButtons = this.shadow.querySelectorAll('[data-jump-seconds]');
    jumpButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const jumpSeconds = parseInt(target.dataset.jumpSeconds || '0');
        
        if (jumpSeconds > 0 && this.playbackHandler) {
          this.playbackHandler.seek({ seconds: jumpSeconds, direction: 'forward' });
        } else if (this.playbackHandler) {
          this.playbackHandler.seek({ seconds: Math.abs(jumpSeconds), direction: 'backward' });
        }
      });
    });

    // ヒートマップモード切り替えボタン
    const heatmapModeButtons = this.shadow.querySelectorAll('.heatmap-mode-btn');
    heatmapModeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const mode = target.dataset.mode as 'fab' | 'overlay' | 'off';
        
        if (mode && this.heatmapManager) {
          // アクティブボタンの更新
          heatmapModeButtons.forEach(btn => btn.removeAttribute('data-active'));
          target.setAttribute('data-active', '');
          
          // ヒートマップの表示モードを変更
          this.heatmapManager.setDisplayMode(mode);
          
        }
      });
    });

    // ヒートマップ詳細設定のイベントリスナー
    this.setupHeatmapSettingsEvents();
    
    // ヒートマップクリックでシーク
    const heatmapCanvas = this.shadow.querySelector('#playback .heatmap-canvas') as HTMLCanvasElement;
    const heatmapTooltip = this.shadow.querySelector('#playback .heatmap-tooltip') as HTMLElement;
    
    if (heatmapCanvas && heatmapTooltip) {
      // マウスオーバー時のツールチップ表示
      heatmapCanvas.addEventListener('mousemove', (e) => {
        const rect = heatmapCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const position = x / rect.width;
        
        this.heatmapManager?.showTooltip(position, heatmapTooltip);
      });

      heatmapCanvas.addEventListener('mouseleave', () => {
        this.heatmapManager?.hideTooltip(heatmapTooltip);
      });

      // クリックでシーク
      heatmapCanvas.addEventListener('click', (e) => {
        const rect = heatmapCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const position = x / rect.width;
        const duration = this.player?.getDuration();
        
        if (this.player && duration) {
          this.player.seek(position * duration);
        }
      });
    }

    // コントロールボタン（プレイバックテンプレート内）
    const controlButtons = this.shadow.querySelectorAll('#playback .control-btn');
    controlButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        switch (index) {
          case 0: // ⏮ (前の動画)
            // 前の動画への移動は実装されていないため、10秒戻る
            this.playbackHandler?.seek({ seconds: 10, direction: 'backward' });
            break;
          case 1: // ⏸/▶ (再生/一時停止)
            this.playbackHandler?.togglePlayPause();
            // 再生状態変更後にアイコンを更新
            setTimeout(() => this.updatePlayPauseButton(), 100);
            break;
          case 2: // ⏭ (次の動画)
            // 次の動画への移動は実装されていないため、10秒進む
            this.playbackHandler?.seek({ seconds: 10, direction: 'forward' });
            break;
          case 3: // 🔁 (リピート)
            this.toggleLoop();
            this.updateLoopButtonAppearance(button as HTMLElement);
            break;
        }
      });
      
      // 初期化時に繰り返し再生ボタンの見た目を設定
      if (index === 3) {
        this.updateLoopButtonAppearance(button as HTMLElement);
      }
    });

    // 動画の再生状態変更を監視してアイコンを更新
    this.setupPlayStateListener();
  }

  // ヒートマップ詳細設定のイベントリスナーを設定
  private setupHeatmapSettingsEvents(): void {
    if (!this.heatmapManager) return;

    // カラースキーム選択
    const colorSchemeSelect = this.shadow.querySelector('.heatmap-color-scheme') as HTMLSelectElement;
    if (colorSchemeSelect) {
      // 保存された設定をUIに反映
      colorSchemeSelect.value = this.heatmapManager.getColorScheme();
      
      // select要素とその親要素のクリックイベントでイベント伝播を停止
      const preventPanelClose = (e: Event) => {
        e.stopPropagation();
      };
      
      // select要素でのクリック、マウスダウン、マウスアップイベントの伝播を防ぐ
      colorSchemeSelect.addEventListener('click', preventPanelClose);
      colorSchemeSelect.addEventListener('mousedown', preventPanelClose);
      colorSchemeSelect.addEventListener('mouseup', preventPanelClose);
      
      colorSchemeSelect.addEventListener('change', (e) => {
        // イベント伝播を停止
        e.stopPropagation();
        
        if (this.heatmapManager) {
          this.heatmapManager.setColorScheme(colorSchemeSelect.value as 'default' | 'rainbow' | 'fire' | 'cool');
        }
      });
    }

    // スムージングトグル
    const smoothToggle = this.shadow.querySelector('.heatmap-smooth-toggle') as HTMLInputElement;
    if (smoothToggle) {
      // 保存された設定をUIに反映
      smoothToggle.checked = this.heatmapManager.getSmoothing();
      
      smoothToggle.addEventListener('change', (e) => {
        // イベント伝播を停止
        e.stopPropagation();
        
        if (this.heatmapManager) {
          this.heatmapManager.setSmoothing(smoothToggle.checked);
        }
      });
    }
  }

  private setupSpeedTemplateEvents() {
    // スピードプリセットボタン
    const speedPresets = this.shadow.querySelectorAll('#speed .speed-preset');
    speedPresets.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const speed = parseFloat(target.dataset.speed || '1.0');
        this.speedHandler?.setPlaybackRate({ value: speed });
        
        // スピードラベルとレンジを更新
        this.updateSpeedDisplay();
      });
    });

    // スピード調整ボタン
    const speedAdjustButtons = this.shadow.querySelectorAll('#speed .speed-adjust');
    speedAdjustButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const adjust = parseFloat(target.dataset.adjust || '0');
        this.speedHandler?.adjustPlaybackRate(adjust);
        
        // スピードラベルとレンジを更新
        this.updateSpeedDisplay();
      });
    });

    // スピードレンジスライダー
    const speedRange = this.shadow.querySelector('#speed .speed-range') as HTMLInputElement;
    if (speedRange) {
      speedRange.addEventListener('input', (e) => {
        const speed = parseFloat((e.target as HTMLInputElement).value);
        this.speedHandler?.setPlaybackRate({ value: speed });
        
        this.updateSpeedDisplay();
      });
    }

    // 外部変更を定期的にチェックして表示を更新
    setInterval(() => {
      this.updateSpeedDisplay();
    }, 1000);
  }

  private setupVolumeTemplateEvents() {
    // ボリュームプリセットボタン
    const volumePresets = this.shadow.querySelectorAll('#volume .volume-preset');
    
    volumePresets.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const volume = parseFloat(target.dataset.volume || '0.5');
        this.volumeHandler?.setVolume({ value: volume });
        
        // ボリュームラベルとレンジを更新
        this.updateVolumeDisplay();
      });
    });

    // ボリュームコントロールボタン
    const volumeControlButtons = this.shadow.querySelectorAll('#volume .control-btn');
    
    volumeControlButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        switch (index) {
          case 0: // 🔇 (ミュート)
            this.volumeHandler?.setVolume({ value: 0 }); // 0%に設定
            break;
          case 1: // 🔉 (小音量)
            this.volumeHandler?.setVolume({ value: 0.01 });
            break;
          case 2: // 🔊 (音量上げる)
            this.volumeHandler?.setVolume({ value: 0.5 });
            break;
        }
        
        // ボリュームラベルとレンジを更新
        this.updateVolumeDisplay();
      });
    });

    // ボリュームレンジスライダー
    const volumeRange = this.shadow.querySelector('#volume .volume-range') as HTMLInputElement;
    if (volumeRange) {
      volumeRange.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.volumeHandler?.setVolume({ value, isLogarithmic: true });
        
        this.updateVolumeDisplay();
      });
    }

    // 外部変更を定期的にチェックして表示を更新
    setInterval(() => {
      this.updateVolumeDisplay();
    }, 1000);
  }

  private setupCommentTemplateEvents() {
    const searchInput = this.shadow.querySelector('#comments .comment-search-input') as HTMLInputElement;
    const regexToggle = this.shadow.querySelector('#comments .regex-toggle') as HTMLInputElement;
    const extendedToggle = this.shadow.querySelector('#comments .extended-toggle') as HTMLInputElement;
    const searchBtn = this.shadow.querySelector('#comments .search-btn') as HTMLButtonElement;
    const clearBtn = this.shadow.querySelector('#comments .clear-btn') as HTMLButtonElement;
    const searchResults = this.shadow.querySelector('#comments .search-results') as HTMLElement;

    if (searchInput && regexToggle && extendedToggle && searchBtn && clearBtn && searchResults) {
      // 検索入力フィールドでのキーボードイベント処理を強化
      searchInput.addEventListener('keydown', (e) => {
        // イベントの伝播を停止してプレイヤーのショートカットを防ぐ
        e.stopPropagation();
        
        // 特定のキーのデフォルト動作を防ぐ
        const preventDefaultKeys = [
          ' ',           // スペースキー（再生/一時停止）
          'ArrowLeft',   // 左矢印（巻き戻し）
          'ArrowRight',  // 右矢印（早送り）
          'ArrowUp',     // 上矢印（音量アップ）
          'ArrowDown',   // 下矢印（音量ダウン）
          'f',           // フルスクリーン
          'F',           // フルスクリーン
          'm',           // ミュート
          'M',           // ミュート
          'k',           // 再生/一時停止
          'K',           // 再生/一時停止
          'j',           // 動画を10秒戻す
          'J',           // 動画を10秒戻す
          'l',           // 動画を10秒進める
          'L'            // 動画を10秒進める
        ];
        
        if (preventDefaultKeys.includes(e.key)) {
          e.preventDefault();
        }
        
        // Enterキーで検索実行（IME入力中は除外）
        if (e.key === 'Enter' && !e.isComposing) {
          e.preventDefault(); // デフォルト動作を防ぐ
          const searchText = searchInput.value.trim();
          if (searchText) {
            this.performCommentSearch(searchText, searchResults);
          }
        }
      });

      // 検索入力フィールドでのキーアップイベントも処理
      searchInput.addEventListener('keyup', (e) => {
        e.stopPropagation();
      });

      // 検索入力フィールドでのキープレスイベントも処理
      searchInput.addEventListener('keypress', (e) => {
        e.stopPropagation();
        // フォーム送信も念のため防ぐ
        if (e.key === 'Enter') {
          e.preventDefault();
        }
      });

      // フォーカス時とブラー時のイベント処理
      searchInput.addEventListener('focus', () => {
        
        // 必要に応じて追加の処理
      });

      searchInput.addEventListener('blur', () => {
        
        // 必要に応じて追加の処理
      });

      // 正規表現トグル
      if (regexToggle) {
        regexToggle.addEventListener('change', () => {
          this.commentManager?.setSearchOptions({
            enableRegexp: regexToggle.checked,
            enableExtended: extendedToggle.checked
          });
        });
      }

      // 詳細表示トグル
      if (extendedToggle) {
        extendedToggle.addEventListener('change', () => {
          this.commentManager?.setSearchOptions({
            enableRegexp: regexToggle.checked,
            enableExtended: extendedToggle.checked
          });
          if (searchInput.value) {
            this.performCommentSearch(searchInput.value, searchResults);
          }
        });
      }

      // 検索実行
      if (searchBtn) {
        searchBtn.addEventListener('click', () => {
          this.performCommentSearch(searchInput.value, searchResults);
        });
      }

      // 検索クリア
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          searchInput.value = '';
          searchResults.innerHTML = '<div class="no-results">コメントを検索してください</div>';
        });
      }
    }

    // コメントデータの初期取得
    this.commentManager?.fetchComments().then(() => {
      // コメントデータ取得後にヒートマップを更新
      this.heatmapManager?.updateComments();
      
    }).catch(error => {
      window.logger.error('コメントの取得に失敗しました:', error);
    });

    // ===============================
    // 🚀 SPA対応処理を追加
    // ===============================
    // URL変更を監視してコメントを自動更新
    this.commentManager?.startUrlWatching();

    // コメントデータが更新されたら検索結果をクリア
    this.commentDataChangedUnsubscribe = (this.commentManager?.onDataChanged(() => {
      // 入力と結果をリセット
      if (searchInput) {
        searchInput.value = '';
      }
      if (searchResults) {
        searchResults.innerHTML = '<div class="no-results">コメントを検索してください</div>';
      }
      // ヒートマップも更新
      this.heatmapManager?.updateComments();
    })) || null;
  }

  private performCommentSearch(searchText: string, searchResults: HTMLElement) {
    const result = this.commentManager?.searchComments(searchText);
    
    if (!result?.success) {
      searchResults.innerHTML = `<div class="error-message">${result?.error}</div>`;
      return;
    }

    if (!result.results || result.results.length === 0) {
      searchResults.innerHTML = '<div class="no-results">一致するコメントが見つかりませんでした</div>';
      return;
    }

    searchResults.innerHTML = '';
    const fragment = document.createDocumentFragment();

    result.results.forEach(comment => {
      const resultElement = this.createCommentElement(comment);
      fragment.appendChild(resultElement);
    });

    searchResults.appendChild(fragment);
    
    // コメント検索後にヒートマップを更新
    this.heatmapManager?.updateComments();
  }

  private createCommentElement(comment: MlinkVideoComment): HTMLElement {
    const container = document.createElement('div');
    container.className = 'comment-result';
    
    // 時間表示
    const timeElement = document.createElement('div');
    timeElement.className = 'comment-time';
    timeElement.textContent = `⏰ ${this.formatVpos(comment.vposMs || 0)}`;
    
    // コメント本文
    const bodyElement = document.createElement('div');
    bodyElement.className = 'comment-body';
    bodyElement.textContent = comment.body;
    
    // コピーボタン
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.innerHTML = createMaterialIcon('content_copy', { style: 'outlined', color: 'white' });
    copyButton.title = 'コメントをコピー';
    copyButton.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(comment.body)
        .then(() => this.showCopySuccess(copyButton))
        .catch(() => this.showCopyError(copyButton));
    };
    
    // ユーザー情報
    const userElement = document.createElement('div');
    userElement.className = 'comment-user';
    userElement.textContent = `👤 ${comment.userId || '不明'}`;
    
    // 基本的な情報を追加
    container.appendChild(timeElement);
    container.appendChild(bodyElement);
    container.appendChild(copyButton);
    container.appendChild(userElement);
    
    // 詳細情報（拡張モード時のみ）
    const searchOptions = this.commentManager?.getSearchOptions();
    if (searchOptions?.enableExtended && comment) {
      const detailsElement = document.createElement('div');
      detailsElement.className = 'comment-details';
      
      // フォーマットされた日時
      const postedDate = comment.postedAt ? new Date(comment.postedAt).toLocaleString('ja-JP') : '不明';
      
      const details = [
        `ID: ${comment.id || '-'}`,
        `No: ${comment.no || '-'}`,
        `投稿日時: ${postedDate}`,
        `コマンド: ${comment.commands ? comment.commands.join(' ') : '-'}`,
        `プレミアム: ${comment.isPremium ? createMaterialIcon('star', { style: 'outlined', color: 'white' }) : '-'}`,
        `スコア: ${comment.score || '-'}`
      ];
      
      detailsElement.innerHTML = details.join(' | ');
      container.appendChild(detailsElement);
    }
    
    // クリックで該当時間にシーク
    container.addEventListener('click', () => {
      if (comment.vposMs && this.player) {
        this.player.seek(comment.vposMs / 1000);
      }
    });
    
    return container;
  }

  private formatVpos(vposMs: number): string {
    const seconds = vposMs / 1000;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private showCopySuccess(button: HTMLElement): void {
    const tooltip = document.createElement('div');
    tooltip.className = 'copy-tooltip';
    tooltip.textContent = 'コピーしました';
    tooltip.style.position = 'absolute';
    tooltip.style.top = '-20px';
    tooltip.style.left = '0';
    
    button.style.position = 'relative';
    button.appendChild(tooltip);
    
    setTimeout(() => {
      tooltip.remove();
    }, 2000);
  }

  private showCopyError(button: HTMLElement): void {
    const tooltip = document.createElement('div');
    tooltip.className = 'copy-tooltip';
    tooltip.textContent = 'コピーに失敗しました';
    tooltip.style.position = 'absolute';
    tooltip.style.top = '-20px';
    tooltip.style.left = '0';
    tooltip.style.color = '#ff6b6b';
    
    button.style.position = 'relative';
    button.appendChild(tooltip);
    
    setTimeout(() => {
      tooltip.remove();
    }, 2000);
  }

  private renderLinkGroup(group: LinkGroup): string {
    const links = this.linkManager?.getLinks(group) || [];
    return links.map((link: LinkData) => `
      <div class="action-card" data-action="${link.action}">
        <img src="${link.icon}" alt="${link.title}" />
        <span>${link.title}</span>
      </div>
    `).join('');
  }


  
  // パネルが閉じられたときにインターバルをクリアする
  protected closePanel() {
    super.closePanel();
    if (this.isWatchPage) {
      this.stopTimeUpdateInterval();
      // ヒートマップの定期更新も停止
      if (this.heatmapManager) {
        this.heatmapManager.stopPeriodicUpdate();
      }
    }
  }
  
  // パネルが開かれたときにインターバルを再開する
  protected openPanel() {
    super.openPanel();
    if (this.isWatchPage) {
      this.startTimeUpdateInterval();
      // ヒートマップの定期更新も再開（表示モードがoffでなければ）
      if (this.heatmapManager && this.heatmapManager.getDisplayMode() !== 'off') {
        this.heatmapManager.startPeriodicUpdate();
      }
    }
  }

  private initializeHeatmap(): void {
    if (!this.heatmapManager || !this.commentManager) {
      window.logger.warn('[MlinkVideoController] ヒートマップまたはコメントマネージャーが初期化されていません');
      return;
    }

    // FAB内のヒートマップキャンバスとツールチップを取得
    const heatmapCanvas = this.shadow.querySelector('.heatmap-canvas') as HTMLCanvasElement;
    const heatmapTooltip = this.shadow.querySelector('.heatmap-tooltip') as HTMLElement;
    
    if (heatmapCanvas && heatmapTooltip) {
      this.heatmapManager.initialize(heatmapCanvas, heatmapTooltip);
      
      
      // 保存された設定をUIに反映
      this.applySavedHeatmapSettings();
      
      // ヒートマップ詳細設定の初期化
      this.initializeHeatmapDetailSettings();
      
      // コメントデータを取得してヒートマップに反映
      this.commentManager.fetchComments().then(() => {
        if (this.heatmapManager) {
          this.heatmapManager.updateComments();
          
        }
      }).catch(error => {
        window.logger.error('[MlinkVideoController] コメントデータの取得に失敗:', error);
      });
    } else {
      window.logger.warn('[MlinkVideoController] ヒートマップ要素が見つかりません');
    }
  }

  private applySavedHeatmapSettings(): void {
    // 保存された表示モードをUIに反映
    const currentMode = this.heatmapManager?.getDisplayMode();
    const heatmapModeButtons = this.shadow.querySelectorAll('.heatmap-mode-btn');
    
    heatmapModeButtons.forEach(button => {
      const buttonMode = (button as HTMLElement).dataset.mode;
      if (buttonMode === currentMode) {
        button.setAttribute('data-active', '');
      } else {
        button.removeAttribute('data-active');
      }
    });
    
    // 保存された設定で表示モードを適用
    if (this.heatmapManager && currentMode) {
      this.heatmapManager.setDisplayMode(currentMode);
    }
    
    
  }

  // ヒートマップ詳細設定の初期化
  private initializeHeatmapDetailSettings(): void {
    if (!this.heatmapManager) return;

    // カラースキーム選択の初期値設定
    const colorSchemeSelect = this.shadow.querySelector('.heatmap-color-scheme') as HTMLSelectElement;
    if (colorSchemeSelect) {
      colorSchemeSelect.value = this.heatmapManager.getColorScheme();
    }

    // スムージングトグルの初期値設定
    const smoothToggle = this.shadow.querySelector('.heatmap-smooth-toggle') as HTMLInputElement;
    if (smoothToggle) {
      smoothToggle.checked = this.heatmapManager.getSmoothing();
    }
  }

  // 音量表示を更新するヘルパーメソッド
  private updateVolumeDisplay(): void {
    const currentVolume = this.volumeHandler?.getVolume();
    const volumeLabel = this.shadow.querySelector('#volume .volume-label') as HTMLElement;
    const volumeRange = this.shadow.querySelector('#volume .volume-range') as HTMLInputElement;
    
    if (volumeLabel && currentVolume) volumeLabel.textContent = currentVolume.toFixed(2);
    if (volumeRange && currentVolume && this.volumeHandler) volumeRange.value = this.volumeHandler.linearToLogSliderValue(currentVolume).toString();
  }

  // 速度表示を更新するヘルパーメソッド
  private updateSpeedDisplay(): void {
    const currentRate = this.speedHandler?.getPlaybackRate();
    const speedLabel = this.shadow.querySelector('#speed .speed-label') as HTMLElement;
    const speedRange = this.shadow.querySelector('#speed .speed-range') as HTMLInputElement;
    
    if (speedLabel && currentRate) speedLabel.textContent = currentRate.toFixed(2);
    if (speedRange && currentRate) speedRange.value = currentRate.toString();
  }

  private startTimeUpdateInterval(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
    this.timeUpdateInterval = setInterval(() => {
      this.updateTimeDisplay();
      // ヒートマップ更新はHeatmapManagerに直接委譲
      this.heatmapManager?.render();
    }, 1000);
  }

  private stopTimeUpdateInterval(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  private updateTimeDisplay(): void {
    const timeLabel = this.shadow.querySelector('#playback .time-label') as HTMLElement;
    const trackerRange = this.shadow.querySelector('#playback .tracker-range') as HTMLInputElement;
    
    if (timeLabel && trackerRange && this.playbackHandler) {
      const state = this.playbackHandler.getPlaybackState();
      const currentTimeStr = this.playbackHandler.formatTime(state.currentTime);
      const durationStr = this.playbackHandler.formatTime(state.duration);
      
      timeLabel.textContent = `${currentTimeStr} / ${durationStr}`;
      
      // トラッカーの位置も更新
      if (state.duration > 0) {
        const progress = (state.currentTime / state.duration) * 100;
        trackerRange.value = progress.toString();
      }
    }
  }

  private toggleLoop(): void {
    this.isLoopEnabled = !this.isLoopEnabled;
    
  }

  private updateLoopButtonAppearance(button: HTMLElement): void {
    button.classList.toggle('active', this.isLoopEnabled);
  }

  /**
   * 再生・一時停止ボタンのアイコンを更新
   */
  private updatePlayPauseButton(): void {
    const playPauseBtn = this.shadow.querySelector('.play-pause-btn') as HTMLElement;
    if (!playPauseBtn || !this.player) return;

    const isPlaying = this.player.isPlaying();
    const iconName = isPlaying ? 'pause' : 'play_arrow';
    
    // アイコンを更新
    playPauseBtn.innerHTML = createMaterialIcon(iconName, { style: 'outlined', color: 'white' });
    playPauseBtn.setAttribute('data-playing', isPlaying.toString());
  }

  /**
   * 動画の再生状態変更を監視してアイコンを更新
   */
  private setupPlayStateListener(): void {
    if (!this.player) return;

    // 初回更新
    this.updatePlayPauseButton();

    // 定期的に再生状態をチェックしてアイコンを更新（ポーリング方式）
    setInterval(() => {
      this.updatePlayPauseButton();
    }, 250); // 250msごとにチェック
  }

  /**
   * 🆕 新規追加: モジュールシステムの初期化
   */
  private async initializeModuleSystem(): Promise<void> {
    try {
      
      
      // モジュールマネージャーを初期化
      await this.moduleManager.initialize();
      
      
      
      // 🔧 修正: ModuleManager の初期化完了後に SettingsUI のモジュールリストを更新
      if (this.settingsUI && this.settingsUI.getInitializationStatus()) {
        
        this.settingsUI.renderModuleList();
      }
    } catch (error) {
      window.logger.error('[MlinkVideoController] モジュールシステムの初期化に失敗しました:', error);
    }
  }

  /**
   * 🆕 新規追加: 設定タブの初期化
   */
  private initializeSettingsTab(): void {
    try {
      
      
      // SettingsUIにShadow DOMルートを設定
      this.settingsUI.setShadowRoot(this.shadow);
      
      // SettingsUIクラスを使用して設定UIを初期化
      this.settingsUI.initialize();
      
      
    } catch (error) {
      window.logger.error('[MlinkVideoController] 設定タブの初期化に失敗しました:', error);
    }
  }

  /**
   * 🆕 新規追加: 排他グループのUI更新
   */
  private updateExclusiveGroupUI(exclusiveGroup: string, enabledModuleId: string): void {
    const allModules = this.moduleRegistry.getAllConfigs();
    const sameGroupModules = allModules.filter(config => 
      config.exclusiveGroup === exclusiveGroup && config.id !== enabledModuleId
    );

    // 同じ排他グループの他のモジュールのトグルを無効化
    sameGroupModules.forEach(moduleConfig => {
      const moduleItem = this.shadow.querySelector(`[data-module-id="${moduleConfig.id}"]`);
      if (moduleItem) {
        const toggle = moduleItem.querySelector('.module-toggle') as HTMLInputElement;
        const status = moduleItem.querySelector('.module-status') as HTMLElement;
        
        if (toggle) {
          toggle.checked = false;
        }
        
        if (status) {
          status.textContent = 'inactive';
          status.className = 'module-status inactive';
        }
      }
    });

    
  }

  /**
   * 🆕 新規追加: 設定を即時適用
   */
  private async applySettingsImmediately(): Promise<void> {
    try {
      
      
      // 現在のページタイプを取得
      const currentPageType = this.moduleManager.getCurrentPageType();
      const targetModules = this.moduleRegistry.getModulesByPage(currentPageType);
      
      let appliedCount = 0;
      let errorCount = 0;
      
      // 各モジュールの設定状態をチェックして適用
      for (const moduleConfig of targetModules) {
        const isEnabled = this.settingsManager.isModuleEnabled(moduleConfig.id);
        const isLoaded = this.moduleManager.getLoadedModulesMap().has(moduleConfig.id);
        
        try {
          if (isEnabled && !isLoaded) {
            // 有効だが読み込まれていない場合は読み込み
            await this.moduleManager.loadModule(moduleConfig.id);
            appliedCount++;
            
          } else if (!isEnabled && isLoaded) {
            // 無効だが読み込まれている場合は削除
            await this.moduleManager.unloadModule(moduleConfig.id);
            appliedCount++;
            
          }
        } catch (error) {
          window.logger.error(`[MlinkVideoController] モジュール ${moduleConfig.id} の即時適用に失敗:`, error);
          errorCount++;
        }
      }
      
      // UI更新（SettingsUIクラスに委譲）
      // this.settingsUI.renderModuleList(); // SettingsUIクラス内で自動更新される
      
      // 結果を通知
      const message = `即時適用完了: ${appliedCount}個のモジュールを適用${errorCount > 0 ? `, ${errorCount}個でエラー` : ''}`;
      
      
      // 簡易通知（可能であれば）
      if (typeof window !== 'undefined' && 'toastr' in window) {
        (window as { toastr?: { success: (message: string) => void } }).toastr?.success(message);
      } else {
        alert(message);
      }
      
    } catch (error) {
      window.logger.error('[MlinkVideoController] 即時適用処理でエラー:', error);
      alert('即時適用中にエラーが発生しました。詳細はコンソールを確認してください。');
    }
  }

  private setupVideoEndedListener(): void {
    // 動画終了を定期的にチェック
    setInterval(() => {
      if (this.isLoopEnabled && this.player) {
        const currentTime = this.player.getCurrentTime();
        const duration = this.player.getDuration();
        
        // 動画が終了に近づいた場合（残り0.5秒以下）
        if (duration > 0 && currentTime > 0 && (duration - currentTime) <= 0.5) {
          
          this.player.seek(0);
          // 少し遅延させて再生を開始
          setTimeout(() => { void this.player?.play(); }, 100);
        }
      }
    }, 500); // 500msごとにチェック
  }

  /**
   * キー伝搬停止処理を設定（ビデオプレイヤーのショートカットを防ぐ）
   */
  private setupKeyPropagationPrevention(): void {
    // ニコニコ動画のショートカットキーを定義
    const nicoShortcutKeys: Record<string, string> = {
      // 特殊キー（常に無効化）
      ' ': 'スペースキー（再生/一時停止）',
      'ArrowLeft': '左矢印（10秒戻る）', 
      'ArrowRight': '右矢印（10秒進める）',
      'ArrowUp': '上矢印（音量5%アップ）',
      'ArrowDown': '下矢印（音量5%ダウン）',
      'Home': '動画の先頭に移動',
      'End': '動画の最後に移動',
      
      // 文字キー（入力フィールド以外で無効化）
      'f': 'フルスクリーンモード切替',
      'F': 'フルスクリーンモード切替',
      'p': 'プレーヤー位置に移動',
      'P': 'プレーヤー位置に移動', 
      'c': 'コメント入力欄にフォーカス',
      'C': 'コメント入力欄にフォーカス',
      's': '画面サイズの変更',
      'S': '画面サイズの変更',
      'k': '動画の再生/停止',
      'K': '動画の再生/停止',
      'j': '動画を10秒戻す',
      'J': '動画を10秒戻す',
      'r': 'リピート再生の有効/無効',
      'R': 'リピート再生の有効/無効',
      'n': '次の動画へ移動',
      'N': '次の動画へ移動',
      'm': 'ミュート/ミュート解除',
      'M': 'ミュート/ミュート解除',
      'o': 'コメント透過度の変更',
      'O': 'コメント透過度の変更',
      ',': '再生速度を下げる',
      '.': '再生速度を上げる',
      '<': '再生速度を下げる',
      '>': '再生速度を上げる'
    };

    // 特殊キー（常に無効化すべきキー）
    const specialKeys = [' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'];

    // 入力フィールドかどうかを判定
    const isInputElement = (element: Element | null): boolean => {
      if (!element) return false;
      const tagName = element.tagName.toLowerCase();
      const inputType = (element as HTMLInputElement).type?.toLowerCase();
      
      return (
        tagName === 'input' && 
        (inputType === 'text' || inputType === 'search' || inputType === 'password' || inputType === 'email' || inputType === 'url')
      ) || tagName === 'textarea' || 
         (element as HTMLElement).contentEditable === 'true';
    };

    // 入力フィールドに直接イベントリスナーを設定
    const setupInputFieldProtection = (input: HTMLElement) => {
      ['keydown', 'keypress', 'keyup'].forEach(eventType => {
        input.addEventListener(eventType, (e) => {
          const keyEvent = e as KeyboardEvent;
          
          // デバッグログ
          window.logger?.debug(`[MlinkVideoController] Input field key event: ${keyEvent.key} in ${input.tagName}`);
          
          // イベント伝搬を停止（これが重要！）
          keyEvent.stopPropagation();
          
          // 特殊キーのみ無効化、文字キーは完全に自由
          if (specialKeys.includes(keyEvent.key)) {
            keyEvent.preventDefault();
            window.logger?.debug(`[MlinkVideoController] Special key prevented in input: ${keyEvent.key}`);
          }
          // 文字キー（f, j, k, l, m など）は完全にそのまま通す
        }, true); // useCapture = true で早期にキャッチ
      });
    };

    // グローバルキーイベントハンドラー（入力フィールド以外用）
    const globalKeyHandler = (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      const target = keyEvent.target as Element;
      
      // 入力フィールドかどうかチェック
      if (isInputElement(target)) {
        // 入力フィールドの場合は何もしない（入力フィールド自体のリスナーが処理）
        return;
      }
      
      // Shadow DOM内の要素かどうかチェック
      const isInOurShadowDOM = this.shadow?.contains(target);
      if (!isInOurShadowDOM) return;

      // 入力フィールド以外 - ニコニコショートカットを無効化
      if (nicoShortcutKeys[keyEvent.key]) {
        // Ctrl+キーは除外（ブラウザのショートカットを保護）
        if (!keyEvent.ctrlKey) {
          keyEvent.preventDefault();
          keyEvent.stopPropagation();
          window.logger?.debug(`[MlinkVideoController] Nico shortcut prevented: ${keyEvent.key} (${nicoShortcutKeys[keyEvent.key]})`);
        }
      }
    };

    // 全ての入力フィールドに保護を設定
    const inputSelectors = [
      'input[type="text"]',
      'input[type="search"]',
      'input[type="password"]',
      'input[type="email"]',
      'input[type="url"]',
      'input[type="number"]',
      'textarea',
      '.comment-search-input',
      '.seek-value'
    ];

    inputSelectors.forEach(selector => {
      const elements = this.shadow?.querySelectorAll(selector) || [];
      elements.forEach((element) => {
        if (element instanceof HTMLElement) {
          setupInputFieldProtection(element);
          window.logger?.debug(`[MlinkVideoController] Protected input field: ${selector}`);
        }
      });
    });

    // Shadow DOM内でのグローバルキーイベントを監視（入力フィールド以外用）
    if (this.shadow) {
      this.shadow.addEventListener('keydown', globalKeyHandler, true);
      this.shadow.addEventListener('keypress', globalKeyHandler, true);
      window.logger?.debug('[MlinkVideoController] Global key prevention set up in Shadow DOM');
    }

    window.logger?.debug('[MlinkVideoController] Universal key propagation prevention setup completed');
  }

  // BasePanelのdisconnectedCallbackを上書きして購読解除を行う
  public disconnectedCallback(): void {
    // 親クラスのクリーンアップを実行
    super.disconnectedCallback();

    // コメントデータ変更イベントの購読を解除
    if (this.commentDataChangedUnsubscribe) {
      this.commentDataChangedUnsubscribe();
      this.commentDataChangedUnsubscribe = null;
    }
  }
}

customElements.define('mlink-video-controller', MlinkVideoController); 
