import { BasePanel } from "@/mlink-video-controller/panels/base";
import { basePanelStyles } from "@/mlink-video-controller/panels/base";
import { NicoVideoPlayer } from "@/mlink-video-controller/services/nico-video-player";
import { LinkManager } from "@/mlink-video-controller/services/link-manager";
import { CommentManager } from "@/mlink-video-controller/managers/comment";
import type { HeatmapModule } from "@/mlink-video-controller/modules/heatmap-module";
import { PlaybackHandler } from "@/mlink-video-controller/handlers/playback";
import { VolumeHandler } from "@/mlink-video-controller/handlers/volume";
import { SpeedHandler } from "@/mlink-video-controller/handlers/speed";
// import removed: Mylist2Handler no longer needed after unification

// 🆕 新規追加: モジュール管理システム
import { ModuleManager } from "@/mlink-video-controller/module-handlers/module-manager";
import { ModuleRegistry } from "@/mlink-video-controller/module-handlers/module-registry";
import { SettingsManager } from "@/mlink-video-controller/module-handlers/settings-manager";
import { SettingsUI } from "@/mlink-video-controller/module-handlers/settings-ui";
import { CommentsTabController } from "@/mlink-video-controller/tab-controllers/comments-tab";
import { LinksTabController } from "@/mlink-video-controller/tab-controllers/links-tab";
import { PanelNavigationController } from "@/mlink-video-controller/tab-controllers/navigation";
import { PlaybackTabController } from "@/mlink-video-controller/tab-controllers/playback-tab";
import { SpeedTabController } from "@/mlink-video-controller/tab-controllers/speed-tab";
import { VolumeTabController } from "@/mlink-video-controller/tab-controllers/volume-tab";

// 型定義のインポート
import { LinkGroup } from "@/types/mlink-video-controller-types";
import type { ModuleEventListener } from "@/types/module-types";
import { TimerHandle } from "@/types/util-types";

// テンプレートの静的インポート
import { panelTemplate } from "@/mlink-video-controller/templates/panel";
import { linksTemplate } from "@/mlink-video-controller/templates/links";
import { commentsTemplate } from "@/mlink-video-controller/templates/comments";
import { playbackTemplate } from "@/mlink-video-controller/templates/playback";
import { speedTemplate } from "@/mlink-video-controller/templates/speed";
import { volumeTemplate } from "@/mlink-video-controller/templates/volume";
import { settingsTemplate } from "@/mlink-video-controller/templates/settings";

// スタイルの静的インポート
import { panelStyles } from "@/mlink-video-controller/styles/panel";
import { controlsStyles } from "@/mlink-video-controller/styles/controls";
import { commentsStyles } from "@/mlink-video-controller/styles/comments";
import { heatmapStyles } from "@/mlink-video-controller/styles/heatmap";
import { settingsStyles } from "@/mlink-video-controller/styles/settings";
import {
  materialIconsStyles,
  createMaterialIcon,
} from "@/common/material-icons";
import { isWatchLikePage } from "@/mlink-video-controller/utils/page-detect";

export class MlinkVideoController extends BasePanel {
  private player: NicoVideoPlayer | null = null;
  private linkManager: LinkManager | null = null;
  private commentManager: CommentManager | null = null;
  private heatmapModule: HeatmapModule | null = null;
  private playbackHandler: PlaybackHandler | null = null;
  private volumeHandler: VolumeHandler | null = null;
  private speedHandler: SpeedHandler | null = null;
  private timeUpdateInterval: TimerHandle | null = null;
  private playStateInterval: TimerHandle | null = null;
  private speedUpdateInterval: TimerHandle | null = null;
  private volumeUpdateInterval: TimerHandle | null = null;
  private videoEndedInterval: TimerHandle | null = null;
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
  private moduleEventListener: ModuleEventListener | null = null;
  private isWatchPage: boolean = false;
  private isHandlingSPANavigation: boolean = false; // SPA遷移処理中フラグ

  constructor() {
    super();

    // ページタイプを判定
    this.isWatchPage = this.detectWatchPage();

    // 🆕 新規追加: モジュール管理システムの初期化
    this.moduleManager = ModuleManager.getInstance();
    this.moduleRegistry = ModuleRegistry.getInstance();
    this.settingsManager = SettingsManager.getInstance();
    this.settingsUI = SettingsUI.getInstance();
    this.bindModuleEvents();

    // LinkManagerは全ページで利用（リンク定義と実行を一元化）
    this.linkManager = LinkManager.getInstance();

    // 視聴ページの場合のみ動画関連サービスを初期化
    if (this.isWatchPage) {
      this.initializeVideoServices();
    }
  }

  /**
   * Web Component がDOMに追加された時に呼ばれる
   */
  public connectedCallback(): void {
    window.logger?.debug("[MlinkVideoController] connectedCallback called");

    // 初期化を非同期で実行
    void (async () => {
      try {
        // 初回レンダリング
        await this.render();

        // 視聴ページの場合のみ動画関連の初期化を実行
        if (this.isWatchPage) {
          this.setupVideoEndedListener(); // 動画終了監視を追加
        }

        // モジュールシステムの初期化
        await this.initializeModuleSystem();

        window.logger?.debug(
          "[MlinkVideoController] connectedCallback initialization completed",
        );
      } catch (error) {
        window.logger?.error(
          "[MlinkVideoController] connectedCallback initialization failed:",
          error,
        );
      }
    })();
  }

  /**
   * 現在のページが視聴ページかどうかを判定
   * - /watch/ を含む公式視聴ページ
   * - /local/features/dist/pages/video-player/index.html?videoId=... も対象
   */
  private detectWatchPage(): boolean {
    return isWatchLikePage();
  }

  /**
   * SPA遷移時にページタイプを再判定してUIを更新
   */
  public async handleSPANavigation(): Promise<void> {
    // 既に処理中の場合はスキップ（再帰防止）
    if (this.isHandlingSPANavigation) {
      window.logger?.debug(
        "[MlinkVideoController] handleSPANavigation already in progress, skipping",
      );
      return;
    }

    try {
      this.isHandlingSPANavigation = true;

      const newIsWatchPage = this.detectWatchPage();
      const pageTypeChanged = newIsWatchPage !== this.isWatchPage;

      window.logger?.info("[MlinkVideoController] Handling SPA navigation:", {
        previousPageType: this.isWatchPage ? "watch" : "other",
        currentPageType: newIsWatchPage ? "watch" : "other",
        pageTypeChanged,
      });

      if (!pageTypeChanged) {
        // ページタイプが変わっていない場合でも、watchページ内での動画切り替えは処理
        if (this.isWatchPage) {
          window.logger?.debug(
            "[MlinkVideoController] Same page type (watch), reinitializing video services",
          );
          this.reinitializeVideoServices();
        }
        return;
      }

      // ページタイプが変わった場合は同じUIモデルのまま利用可能状態を更新
      this.isWatchPage = newIsWatchPage;
      window.logger?.info(
        "[MlinkVideoController] Page type changed, updating watch-only availability",
      );

      // 既存のイベントリスナーやサービスをクリーンアップ
      this.cleanup();

      // 新しいページタイプに応じてサービスを初期化
      if (this.isWatchPage) {
        this.initializeVideoServices();
      } else {
        this.releaseVideoServices();
      }

      // UIは常にWatchページベースで再描画し、非Watchでは動画専用機能を無効化
      await this.render();

      // watchページの場合のみ動画関連の初期化
      if (this.isWatchPage) {
        this.setupVideoEndedListener();
      }
    } finally {
      // 処理完了後、少し遅延してからフラグをリセット
      setTimeout(() => {
        this.isHandlingSPANavigation = false;
      }, 100);
    }
  }

  /**
   * watchページ内での動画切り替え時にサービスを再初期化
   */
  private reinitializeVideoServices(): void {
    if (!this.isWatchPage) return;

    window.logger?.debug(
      "[MlinkVideoController] Reinitializing video services for video change",
    );

    // プレイヤーを再初期化
    if (this.player) {
      this.player.reinitialize();
    }

    // コメントマネージャーを再初期化
    if (this.commentManager) {
      // コメントマネージャーの再初期化処理があれば呼び出し
      // 現状はプレイヤー再初期化で自動的に更新される
    }

    // ヒートマップを再初期化
    if (this.heatmapModule) {
      // ヒートマップの再描画は自動的に行われる
    }
  }

  private initializeVideoServices(): void {
    this.player = NicoVideoPlayer.getInstance();
    this.commentManager = CommentManager.getInstance();
    this.heatmapModule = null;
    this.playbackHandler = new PlaybackHandler();
    this.volumeHandler = new VolumeHandler();
    this.speedHandler = new SpeedHandler();
  }

  private releaseVideoServices(): void {
    this.player = null;
    this.commentManager = null;
    this.heatmapModule?.detachFromPanel();
    this.heatmapModule = null;
    this.playbackHandler = null;
    this.volumeHandler = null;
    this.speedHandler = null;
  }

  /**
   * クリーンアップ処理（SPA遷移時やページタイプ変更時）
   */
  private cleanup(): void {
    // タイムアップデート監視を停止
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
    if (this.playStateInterval) {
      clearInterval(this.playStateInterval);
      this.playStateInterval = null;
    }
    if (this.speedUpdateInterval) {
      clearInterval(this.speedUpdateInterval);
      this.speedUpdateInterval = null;
    }
    if (this.volumeUpdateInterval) {
      clearInterval(this.volumeUpdateInterval);
      this.volumeUpdateInterval = null;
    }
    if (this.videoEndedInterval) {
      clearInterval(this.videoEndedInterval);
      this.videoEndedInterval = null;
    }

    // コメントデータ変更の購読を解除
    if (this.commentDataChangedUnsubscribe) {
      this.commentDataChangedUnsubscribe();
      this.commentDataChangedUnsubscribe = null;
    }
    this.commentManager?.stopUrlWatching();

    window.logger?.debug("[MlinkVideoController] Cleanup completed");
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

  private loadTemplates(): { [key: string]: string } {
    return {
      panel: this.generatePanelTemplate(),
      links: linksTemplate,
      comments: commentsTemplate,
      playback: playbackTemplate,
      speed: speedTemplate,
      volume: volumeTemplate,
      settings: settingsTemplate,
    };
  }

  /**
   * ページタイプに応じたパネルテンプレートを生成
   */
  private generatePanelTemplate(): string {
    return panelTemplate();
  }

  private async render() {
    try {
      // Shadow DOMの存在確認
      if (!this.shadow) {
        throw new Error("Shadow DOM が初期化されていません");
      }

      // Shadow DOMを完全にクリア（再レンダリング時）
      this.shadow.innerHTML = "";

      const style = document.createElement("style");
      style.textContent = await this.loadStyles();

      const templates = this.loadTemplates();
      if (!templates.panel) {
        throw new Error("パネルテンプレートが見つかりません");
      }

      const template = document.createElement("template");

      // パネルテンプレートにタブコンテンツを挿入
      let panelHtml = templates.panel;

      // リンクテンプレートにリンクを挿入
      let linksHtml = templates.links;
      linksHtml = linksHtml
        .replace(
          "<!-- カスタムリンクがここに挿入されます -->",
          await this.renderLinkGroup("custom"),
        )
        .replace(
          "<!-- 関連サービスのリンクがここに挿入されます -->",
          await this.renderLinkGroup("services"),
        )
        .replace(
          "<!-- データ管理のリンクがここに挿入されます -->",
          await this.renderLinkGroup("dataManagement"),
        );

      panelHtml = panelHtml
        .replace("<!-- links.htmlの内容がここに挿入されます -->", linksHtml)
        .replace(
          "<!-- comments.htmlの内容がここに挿入されます -->",
          templates.comments,
        )
        .replace(
          "<!-- playback.htmlの内容がここに挿入されます -->",
          templates.playback,
        )
        .replace(
          "<!-- speed.htmlの内容がここに挿入されます -->",
          templates.speed,
        )
        .replace(
          "<!-- volume.htmlの内容がここに挿入されます -->",
          templates.volume,
        )
        .replace(
          "<!-- settings.htmlの内容がここに挿入されます -->",
          templates.settings,
        );

      template.innerHTML = panelHtml;

      this.shadow.appendChild(style);
      this.shadow.appendChild(template.content.cloneNode(true));

      window.logger?.debug(
        "[MlinkVideoController] Shadow DOM content appended successfully",
      );

      this.initializeComponents();
      this.setupEventListeners();

      // FABの設定（ページタイプに応じて変更）
      if (this.isWatchPage) {
        this.setupFab(
          createMaterialIcon("sports_esports", {
            style: "outlined",
            classes: "fab-icon",
            color: "white",
          }),
          "mlink-video-controller",
        );
      } else {
        this.setupFab(
          createMaterialIcon("link", {
            style: "outlined",
            classes: "fab-icon",
            color: "white",
          }),
          "mlink-video-controller",
        );
      }

      // 設定タブの初期化
      this.initializeSettingsTab();

      // 非Watchページでは動画専用機能を無効化してグレーアウト
      this.updateWatchOnlyAvailability();

      // モジュール管理下で読み込まれている場合のみヒートマップをパネルへ接続
      this.initializeHeatmap();

      // キー伝搬停止処理を設定
      this.setupKeyPropagationPrevention();

      window.logger?.debug(
        "[MlinkVideoController] Render completed successfully",
      );
    } catch (error) {
      window.logger.error("パネルのレンダリングエラー:", error);
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
    new PanelNavigationController(this.shadow).bind();

    // 視聴ページでのみ動画関連イベントを設定
    if (this.isWatchPage) {
      new PlaybackTabController(this.shadow, this.playbackHandler, {
        startTimeUpdateInterval: () => this.startTimeUpdateInterval(),
        setupPlayStateListener: () => this.setupPlayStateListener(),
        updatePlayPauseButton: () => this.updatePlayPauseButton(),
        toggleLoop: () => this.toggleLoop(),
        updateLoopButtonAppearance: (button) =>
          this.updateLoopButtonAppearance(button),
      }).bind();

      new SpeedTabController(
        this.shadow,
        this.speedHandler,
        () => this.updateSpeedDisplay(),
        (interval) => {
          this.speedUpdateInterval = interval;
        },
      ).bind();

      new VolumeTabController(
        this.shadow,
        this.volumeHandler,
        () => this.updateVolumeDisplay(),
        (interval) => {
          this.volumeUpdateInterval = interval;
        },
      ).bind();

      this.commentDataChangedUnsubscribe = new CommentsTabController(
        this.shadow,
        this.commentManager,
        this.player,
        {
          updateHeatmap: () => this.heatmapModule?.updateComments(),
          onFetchError: (error) => {
            window.logger.error(
              "コメント取得処理で予期しないエラーが発生しました (初期化時):",
              error,
            );
          },
        },
      ).bind();
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

    new LinksTabController(this.shadow, this.linkManager).bind();
  }

  private activateTab(tabId: string): void {
    const tabs = this.shadow.querySelectorAll("[data-tab]");
    tabs.forEach((tab) => {
      if ((tab as HTMLElement).dataset.tab === tabId) {
        tab.setAttribute("data-active", "");
      } else {
        tab.removeAttribute("data-active");
      }
    });

    const contents = this.shadow.querySelectorAll(".tab");
    contents.forEach((content) => {
      content.classList.toggle("active", content.id === tabId);
    });
  }

  private updateWatchOnlyAvailability(): void {
    const watchOnlyTabs = ["playback", "volume", "speed", "comments"];

    watchOnlyTabs.forEach((tabId) => {
      const tab = this.shadow.getElementById(tabId);
      const navButton = this.shadow.querySelector<HTMLButtonElement>(
        `[data-tab="${tabId}"]`,
      );

      tab?.classList.toggle("watch-only-disabled", !this.isWatchPage);
      if (navButton) {
        navButton.disabled = !this.isWatchPage;
        navButton.classList.toggle("watch-only-disabled", !this.isWatchPage);
        navButton.title = this.isWatchPage
          ? ""
          : "視聴ページでのみ利用できます";
      }

      tab
        ?.querySelectorAll("button, input, select, textarea")
        .forEach((element) => {
          (element as HTMLButtonElement | HTMLInputElement).disabled =
            !this.isWatchPage;
        });
    });

    if (!this.isWatchPage) {
      this.activateTab("links");
    }
  }

  private async renderLinkGroup(group: LinkGroup): Promise<string> {
    return new LinksTabController(
      this.shadow,
      this.linkManager,
    ).renderLinkGroup(group);
  }

  // パネルが閉じられたときにインターバルをクリアする
  protected closePanel() {
    super.closePanel();
    if (this.isWatchPage) {
      this.stopTimeUpdateInterval();
      // ヒートマップの定期更新も停止
      if (this.heatmapModule) {
        this.heatmapModule.stopPeriodicUpdate();
      }
    }
  }

  // パネルが開かれたときにインターバルを再開する
  protected openPanel() {
    super.openPanel();
    if (this.isWatchPage) {
      this.startTimeUpdateInterval();
      // ヒートマップの定期更新も再開（表示モードがoffでなければ）
      if (this.heatmapModule && this.heatmapModule.getDisplayMode() !== "off") {
        this.heatmapModule.startPeriodicUpdate();
      }
    }
  }

  private initializeHeatmap(): void {
    if (!this.isWatchPage) {
      this.heatmapModule?.detachFromPanel();
      this.heatmapModule = null;
      return;
    }

    const heatmapModule =
      this.moduleManager.getLoadedModule<HeatmapModule>("heatmap");

    if (!heatmapModule || !this.commentManager || !this.player) {
      this.heatmapModule?.detachFromPanel();
      this.heatmapModule = null;
      window.logger?.debug(
        "[MlinkVideoController] ヒートマップモジュールは未読み込み、または動画サービス未初期化です",
      );
      return;
    }

    this.heatmapModule = heatmapModule;
    heatmapModule.attachToPanel({
      shadowRoot: this.shadow,
      player: this.player,
      commentManager: this.commentManager,
    });
  }

  // 音量表示を更新するヘルパーメソッド
  private updateVolumeDisplay(): void {
    const currentVolume = this.volumeHandler?.getVolume();
    const volumeLabel = this.shadow.querySelector(
      "#volume .volume-label",
    ) as HTMLElement;
    const volumeRange = this.shadow.querySelector(
      "#volume .volume-range",
    ) as HTMLInputElement;

    if (volumeLabel && currentVolume)
      volumeLabel.textContent = currentVolume.toFixed(2);
    if (volumeRange && currentVolume && this.volumeHandler)
      volumeRange.value = this.volumeHandler
        .linearToLogSliderValue(currentVolume)
        .toString();
  }

  // 速度表示を更新するヘルパーメソッド
  private updateSpeedDisplay(): void {
    const currentRate = this.speedHandler?.getPlaybackRate();
    const speedLabel = this.shadow.querySelector(
      "#speed .speed-label",
    ) as HTMLElement;
    const speedRange = this.shadow.querySelector(
      "#speed .speed-range",
    ) as HTMLInputElement;

    if (speedLabel && currentRate)
      speedLabel.textContent = currentRate.toFixed(2);
    if (speedRange && currentRate) speedRange.value = currentRate.toString();
  }

  private startTimeUpdateInterval(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
    this.timeUpdateInterval = setInterval(() => {
      this.updateTimeDisplay();
      // ヒートマップ更新はモジュールに委譲
      this.heatmapModule?.render();
    }, 1000);
  }

  private stopTimeUpdateInterval(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  private updateTimeDisplay(): void {
    const timeLabel = this.shadow.querySelector(
      "#playback .time-label",
    ) as HTMLElement;
    const trackerRange = this.shadow.querySelector(
      "#playback .tracker-range",
    ) as HTMLInputElement;

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
    button.classList.toggle("active", this.isLoopEnabled);
  }

  /**
   * 再生・一時停止ボタンのアイコンを更新
   */
  private updatePlayPauseButton(): void {
    const playPauseBtn = this.shadow.querySelector(
      ".play-pause-btn",
    ) as HTMLElement;
    if (!playPauseBtn || !this.player) return;

    const isPlaying = this.player.isPlaying();
    const nextPlayingValue = isPlaying.toString();

    if (playPauseBtn.getAttribute("data-playing") === nextPlayingValue) {
      return;
    }

    const iconName = isPlaying ? "pause" : "play_arrow";

    playPauseBtn.innerHTML = createMaterialIcon(iconName, {
      style: "outlined",
      color: "white",
    });
    playPauseBtn.setAttribute("data-playing", nextPlayingValue);
  }

  /**
   * 動画の再生状態変更を監視してアイコンを更新
   */
  private setupPlayStateListener(): void {
    if (!this.player) return;

    // 初回更新
    this.updatePlayPauseButton();

    // 定期的に再生状態をチェックしてアイコンを更新（ポーリング方式）
    this.playStateInterval = setInterval(() => {
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
      this.initializeHeatmap();

      // 🔧 修正: ModuleManager の初期化完了後に SettingsUI のモジュールリストを更新
      if (this.settingsUI && this.settingsUI.getInitializationStatus()) {
        this.settingsUI.renderModuleList();
      }
    } catch (error) {
      window.logger.error(
        "[MlinkVideoController] モジュールシステムの初期化に失敗しました:",
        error,
      );
    }
  }

  private bindModuleEvents(): void {
    if (this.moduleEventListener) {
      return;
    }

    this.moduleEventListener = (event) => {
      if (event.moduleId !== "heatmap") {
        return;
      }

      if (event.type === "loaded" || event.type === "enabled") {
        this.initializeHeatmap();
        return;
      }

      if (event.type === "unloaded" || event.type === "disabled") {
        this.heatmapModule?.detachFromPanel();
        this.heatmapModule = null;
      }
    };

    this.moduleManager.addEventListener(this.moduleEventListener);
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
      window.logger.error(
        "[MlinkVideoController] 設定タブの初期化に失敗しました:",
        error,
      );
    }
  }

  /**
   * 🆕 新規追加: 排他グループのUI更新
   */
  private updateExclusiveGroupUI(
    exclusiveGroup: string,
    enabledModuleId: string,
  ): void {
    const allModules = this.moduleRegistry.getAllConfigs();
    const sameGroupModules = allModules.filter(
      (config) =>
        config.exclusiveGroup === exclusiveGroup &&
        config.id !== enabledModuleId,
    );

    // 同じ排他グループの他のモジュールのトグルを無効化
    sameGroupModules.forEach((moduleConfig) => {
      const moduleItem = this.shadow.querySelector(
        `[data-module-id="${moduleConfig.id}"]`,
      );
      if (moduleItem) {
        const toggle = moduleItem.querySelector(
          ".module-toggle",
        ) as HTMLInputElement;
        const status = moduleItem.querySelector(
          ".module-status",
        ) as HTMLElement;

        if (toggle) {
          toggle.checked = false;
        }

        if (status) {
          status.textContent = "inactive";
          status.className = "module-status inactive";
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
      const targetModules =
        this.moduleRegistry.getModulesByPage(currentPageType);

      let appliedCount = 0;
      let errorCount = 0;

      // 各モジュールの設定状態をチェックして適用
      for (const moduleConfig of targetModules) {
        const isEnabled = this.settingsManager.isModuleEnabled(moduleConfig.id);
        const isLoaded = this.moduleManager
          .getLoadedModulesMap()
          .has(moduleConfig.id);

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
          window.logger.error(
            `[MlinkVideoController] モジュール ${moduleConfig.id} の即時適用に失敗:`,
            error,
          );
          errorCount++;
        }
      }

      // UI更新（SettingsUIクラスに委譲）
      // this.settingsUI.renderModuleList(); // SettingsUIクラス内で自動更新される

      // 結果を通知
      const message = `即時適用完了: ${appliedCount}個のモジュールを適用${errorCount > 0 ? `, ${errorCount}個でエラー` : ""}`;

      // 簡易通知（可能であれば）
      if (typeof window !== "undefined" && "toastr" in window) {
        (
          window as { toastr?: { success: (message: string) => void } }
        ).toastr?.success(message);
      } else {
        alert(message);
      }
    } catch (error) {
      window.logger.error(
        "[MlinkVideoController] 即時適用処理でエラー:",
        error,
      );
      alert(
        "即時適用中にエラーが発生しました。詳細はコンソールを確認してください。",
      );
    }
  }

  private setupVideoEndedListener(): void {
    if (this.videoEndedInterval) {
      clearInterval(this.videoEndedInterval);
    }
    // 動画終了を定期的にチェック
    this.videoEndedInterval = setInterval(() => {
      if (this.isLoopEnabled && this.player) {
        const currentTime = this.player.getCurrentTime();
        const duration = this.player.getDuration();

        // 動画が終了に近づいた場合（残り0.5秒以下）
        if (duration > 0 && currentTime > 0 && duration - currentTime <= 0.5) {
          this.player.seek(0);
          // 少し遅延させて再生を開始
          setTimeout(() => {
            void this.player?.play();
          }, 100);
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
      " ": "スペースキー（再生/一時停止）",
      ArrowLeft: "左矢印（10秒戻る）",
      ArrowRight: "右矢印（10秒進める）",
      ArrowUp: "上矢印（音量5%アップ）",
      ArrowDown: "下矢印（音量5%ダウン）",
      Home: "動画の先頭に移動",
      End: "動画の最後に移動",

      // 文字キー（入力フィールド以外で無効化）
      f: "フルスクリーンモード切替",
      F: "フルスクリーンモード切替",
      p: "プレーヤー位置に移動",
      P: "プレーヤー位置に移動",
      c: "コメント入力欄にフォーカス",
      C: "コメント入力欄にフォーカス",
      s: "画面サイズの変更",
      S: "画面サイズの変更",
      k: "動画の再生/停止",
      K: "動画の再生/停止",
      j: "動画を10秒戻す",
      J: "動画を10秒戻す",
      r: "リピート再生の有効/無効",
      R: "リピート再生の有効/無効",
      n: "次の動画へ移動",
      N: "次の動画へ移動",
      m: "ミュート/ミュート解除",
      M: "ミュート/ミュート解除",
      o: "コメント透過度の変更",
      O: "コメント透過度の変更",
      ",": "再生速度を下げる",
      ".": "再生速度を上げる",
      "<": "再生速度を下げる",
      ">": "再生速度を上げる",
    };

    // 特殊キー（常に無効化すべきキー）
    const specialKeys = [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
      "Escape",
    ];

    // 入力フィールドかどうかを判定
    const isInputElement = (element: Element | null): boolean => {
      if (!element) return false;
      const tagName = element.tagName.toLowerCase();
      const inputType = (element as HTMLInputElement).type?.toLowerCase();

      return (
        (tagName === "input" &&
          (inputType === "text" ||
            inputType === "search" ||
            inputType === "password" ||
            inputType === "email" ||
            inputType === "url")) ||
        tagName === "textarea" ||
        (element as HTMLElement).contentEditable === "true"
      );
    };

    // 入力フィールドに直接イベントリスナーを設定
    const setupInputFieldProtection = (input: HTMLElement) => {
      ["keydown", "keypress", "keyup"].forEach((eventType) => {
        input.addEventListener(
          eventType,
          (e) => {
            const keyEvent = e as KeyboardEvent;

            // デバッグログ
            window.logger?.debug(
              `[MlinkVideoController] Input field key event: ${keyEvent.key} in ${input.tagName}`,
            );

            // 入力欄自身のハンドラを動かした後、外側への伝搬だけを止める
            keyEvent.stopPropagation();

            // 特殊キーのみ無効化、文字キーは完全に自由
            if (specialKeys.includes(keyEvent.key)) {
              keyEvent.preventDefault();
              window.logger?.debug(
                `[MlinkVideoController] Special key prevented in input: ${keyEvent.key}`,
              );
            }
            // 文字キー（f, j, k, l, m など）は完全にそのまま通す
          },
          false,
        );
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
          window.logger?.debug(
            `[MlinkVideoController] Nico shortcut prevented: ${keyEvent.key} (${nicoShortcutKeys[keyEvent.key]})`,
          );
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
      "textarea",
      ".comment-search-input",
      ".seek-value",
    ];

    inputSelectors.forEach((selector) => {
      const elements = this.shadow?.querySelectorAll(selector) || [];
      elements.forEach((element) => {
        if (element instanceof HTMLElement) {
          setupInputFieldProtection(element);
          window.logger?.debug(
            `[MlinkVideoController] Protected input field: ${selector}`,
          );
        }
      });
    });

    // Shadow DOM内でのグローバルキーイベントを監視（入力フィールド以外用）
    if (this.shadow) {
      this.shadow.addEventListener("keydown", globalKeyHandler, true);
      this.shadow.addEventListener("keypress", globalKeyHandler, true);
      window.logger?.debug(
        "[MlinkVideoController] Global key prevention set up in Shadow DOM",
      );
    }

    window.logger?.debug(
      "[MlinkVideoController] Universal key propagation prevention setup completed",
    );
  }

  /**
   * Web Component がDOMから削除された時に呼ばれる
   */
  public disconnectedCallback(): void {
    window.logger?.debug("[MlinkVideoController] disconnectedCallback called");

    // SPA遷移処理中フラグをリセット
    this.isHandlingSPANavigation = false;

    // クリーンアップ処理
    this.cleanup();

    if (this.moduleEventListener) {
      this.moduleManager.removeEventListener(this.moduleEventListener);
      this.moduleEventListener = null;
    }

    // 動画関連サービスのクリーンアップ
    if (this.player) {
      // プレイヤーのクリーンアップ（必要に応じて）
      this.player = null;
    }
    if (this.commentManager) {
      // コメントマネージャーのクリーンアップ（必要に応じて）
      this.commentManager = null;
    }
    if (this.heatmapModule) {
      // ヒートマップモジュールのクリーンアップ
      this.heatmapModule.stopPeriodicUpdate();
      this.heatmapModule.detachFromPanel();
      this.heatmapModule = null;
    }

    // ハンドラーのクリーンアップ
    this.playbackHandler = null;
    this.volumeHandler = null;
    this.speedHandler = null;

    // リンクマネージャーのクリーンアップ
    this.linkManager = null;

    window.logger?.debug(
      "[MlinkVideoController] Cleanup completed in disconnectedCallback",
    );

    // 親クラスのクリーンアップを実行
    super.disconnectedCallback();
  }
}

customElements.define("mlink-video-controller", MlinkVideoController);
