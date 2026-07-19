import { PLAYER_SETTINGS } from "@/video-player/config/constants";
import { PLAYER_ICONS } from "@/video-player/config/icons";
import {
  getSavedControlsMode,
  getSavedVolume,
  saveCommentVisibility,
  saveVolume,
} from "@/video-player/ui/player-control-storage";
import { PlayerControlsView } from "./player-controls-view";

export abstract class PlayerControlsEvents extends PlayerControlsView {
  protected abstract handleControlsModeChange: (event: Event) => void;
  protected abstract handleKeyboardShortcuts: (event: KeyboardEvent) => void;
  /**
   * マウスホバーイベントの設定
   */
  protected abstract setupHoverEvents(): void;
  /**
   * 設定メニューの表示/非表示切り替え
   */
  protected abstract toggleSettingsMenu(): void;
  /**
   * 設定メニューを閉じる
   */
  protected abstract closeSettingsMenu(): void;
  /**
   * ビデオ要素を取得（未設定ならDOMから自動検出）
   */
  protected abstract getVideo(): HTMLVideoElement | null;
  /**
   * 全画面表示の切り替え
   */
  protected abstract toggleFullscreen(): void;
  /**
   * 全画面状態変更時の処理
   */
  protected abstract handleFullscreenChange(): void;
  /**
   * NGワードリストの更新
   */
  protected abstract updateNGWordList(isTemp: boolean): void;
  /**
   * NG正規表現リストの更新
   */
  protected abstract updateNGRegexList(isTemp: boolean): void;
  /**
   * コメント設定を適用
   */
  protected abstract applyCommentSettings(): Promise<void>;
  /**
   * コメント設定の読み込み
   */
  protected abstract loadCommentSettings(): Promise<void>;
  /**
   * コントロールモードを適用
   */
  protected abstract applyControlsMode(mode: string): void;

  /**
   * イベントリスナーを設定
   */
  protected setupEventListeners(): void {
    if (this.initialized) return; // 二重登録防止
    // 設定関連
    this.setupSettingsEvents();

    // コントロール関連
    this.setupControlEvents();

    // コメント関連
    this.setupCommentEvents();

    // マウスホバー関連
    this.setupHoverEvents();

    // キーボードショートカット
    document.addEventListener("keydown", this.handleKeyboardShortcuts);
    this.initialized = true;
  }

  /**
   * 設定関連のイベント設定
   */
  protected setupSettingsEvents(): void {
    const settingsBtn = this.shadow.querySelector("#settings");
    const settingsMenu = this.shadow.querySelector("#player-settings-menu");

    if (settingsBtn) {
      settingsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleSettingsMenu();
      });
    }

    if (settingsMenu) {
      settingsMenu.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }

    // 設定メニュー外クリックで閉じる
    document.addEventListener("click", (e) => {
      const path = e.composedPath();
      if (!path.includes(this)) {
        this.closeSettingsMenu();
      }
    });

    // コントロールモード変更
    const controlsModeSelect = this.shadow.querySelector(
      "#controls-mode",
    ) as HTMLSelectElement;
    if (controlsModeSelect) {
      controlsModeSelect.addEventListener(
        "change",
        this.handleControlsModeChange,
      );
    }
  }

  /**
   * コントロール関連のイベント設定
   */
  protected setupControlEvents(): void {
    // 再生/一時停止ボタン
    const playPauseBtn = this.shadow.querySelector("#play-pause");
    if (playPauseBtn) {
      playPauseBtn.addEventListener("click", () => {
        const video = this.getVideo();
        if (!video) return;

        if (video.paused) {
          video
            .play()
            .catch((e) => window.logger.error("再生開始に失敗しました:", e));
        } else {
          video.pause();
          this.userPaused = true;
        }
      });
    }

    // 10秒戻し/進むボタン
    const rewindBtn = this.shadow.querySelector("#rewind-10");
    const forwardBtn = this.shadow.querySelector("#forward-10");

    if (rewindBtn) {
      rewindBtn.addEventListener("click", () => {
        const video = this.getVideo();
        if (video) {
          video.currentTime = Math.max(video.currentTime - 10, 0);
        }
      });
    }

    if (forwardBtn) {
      forwardBtn.addEventListener("click", () => {
        const video = this.getVideo();
        if (video) {
          video.currentTime = Math.min(
            video.currentTime + 10,
            video.duration || 0,
          );
        }
      });
    }

    // シークバーとプログレスバー
    this.setupProgressControls();

    // 音量コントロール
    this.setupVolumeControls();

    // 全画面ボタン
    this.setupFullscreenControl();
  }

  /**
   * プログレス関連のコントロール設定
   */
  protected setupProgressControls(): void {
    const seekBar = this.shadow.querySelector("#seek-bar") as HTMLInputElement;
    const progressBar = this.shadow.querySelector(
      ".progress-bar-custom",
    ) as HTMLElement;
    const progressContainer = this.shadow.querySelector(
      ".progress-container-custom",
    ) as HTMLElement;

    if (!seekBar || !progressBar || !progressContainer) return;

    // シークバーの値変更時
    seekBar.addEventListener("change", () => {
      const video = this.getVideo();
      if (video) {
        const progress = Number(seekBar.value);
        video.currentTime = (progress / 100) * video.duration;
      }
    });

    // シークバーのドラッグ処理
    seekBar.addEventListener("input", () => {
      const progress = Number(seekBar.value);
      seekBar.style.setProperty("--progress", `${progress}%`);
    });

    // プログレスバーのクリック処理
    progressContainer.addEventListener("click", (e) => {
      const video = this.getVideo();
      if (!video) return;

      const rect = progressContainer.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      video.currentTime = pos * video.duration;
    });
  }

  /**
   * 音量コントロールの設定
   */
  protected setupVolumeControls(): void {
    const volumeBar = this.shadow.querySelector<HTMLInputElement>("#volume");
    const muteBtn = this.shadow.querySelector<HTMLButtonElement>("#mute");

    if (!volumeBar || !muteBtn) return;

    const initialPercent = Math.round(PLAYER_SETTINGS.VOLUME.DEFAULT * 100);
    volumeBar.style.setProperty("--volume", `${initialPercent}%`);

    volumeBar.addEventListener("pointerdown", (event) => {
      this.isVolumeDragging = true;
      volumeBar.setPointerCapture(event.pointerId);
    });

    const finishVolumeDrag = (): void => {
      if (!this.isVolumeDragging) return;
      this.isVolumeDragging = false;
      const video = this.getVideo();
      if (!video) return;
      const volumeValue = this.clampVolume(Number(volumeBar.value) / 100);
      saveVolume(volumeValue);
      this.updateVolumeSlider(video.volume);
      this.updateVolumeIcon();
    };

    volumeBar.addEventListener("pointerup", finishVolumeDrag);
    volumeBar.addEventListener("pointercancel", finishVolumeDrag);
    volumeBar.addEventListener("change", finishVolumeDrag);

    // 音量スライダーの更新
    volumeBar.addEventListener("input", () => {
      const video = this.getVideo();
      if (!video) return;

      const volumeValue = this.clampVolume(Number(volumeBar.value) / 100);
      video.volume = volumeValue;

      if (volumeValue > 0 && video.muted) {
        video.muted = false;
      }

      this.updateVolumeSlider(volumeValue, { syncValue: false });
      this.queueVolumeSave(volumeValue);
      this.updateVolumeIcon();
    });

    // ミュートボタンのクリック
    muteBtn.addEventListener("click", () => {
      const video = this.getVideo();
      if (!video) return;

      video.muted = !video.muted;
      this.updateVolumeIcon();
    });
  }

  /**
   * 音量値を許容範囲にクランプ
   */
  protected clampVolume(volume: number): number {
    const { MIN, MAX, DEFAULT } = PLAYER_SETTINGS.VOLUME;
    if (Number.isNaN(volume)) {
      return DEFAULT;
    }
    return Math.min(Math.max(volume, MIN), MAX);
  }

  /**
   * 音量スライダーのUI更新
   */
  protected queueVolumeSave(volume: number): void {
    if (this.volumeSaveTimer !== null) {
      window.clearTimeout(this.volumeSaveTimer);
    }
    this.volumeSaveTimer = window.setTimeout(() => {
      saveVolume(volume);
      this.volumeSaveTimer = null;
    }, 150);
  }

  protected updateVolumeSlider(
    volume: number,
    options: { syncValue?: boolean } = {},
  ): void {
    const volumeBar = this.shadow.querySelector<HTMLInputElement>("#volume");
    if (!volumeBar) return;

    const clamped = this.clampVolume(volume);
    const percent = Math.round(clamped * 100);
    if (options.syncValue !== false) {
      volumeBar.value = percent.toString();
    }
    volumeBar.style.setProperty("--volume", `${percent}%`);
  }

  /**
   * 動画要素の音量とUIを同期
   */
  protected syncVolumeFromVideo(): void {
    const video = this.getVideo();
    if (!video) return;
    if (this.isVolumeDragging) return;

    this.updateVolumeSlider(video.volume);
    this.updateVolumeIcon();
  }

  /**
   * 初期音量の適用
   */
  protected initializeVolumeState(): void {
    const video = this.getVideo();
    if (!video) return;

    const savedVolume = getSavedVolume(PLAYER_SETTINGS.VOLUME.DEFAULT);
    let volume = savedVolume.volume;
    if (!savedVolume.hasSavedValue) {
      const currentVolume = this.clampVolume(video.volume);
      if (currentVolume !== 1) {
        volume = currentVolume;
      }
    }

    volume = this.clampVolume(volume);
    video.volume = volume;

    if (volume > 0 && video.muted) {
      video.muted = false;
    }

    this.updateVolumeSlider(volume);
    this.updateVolumeIcon();
  }

  /**
   * 全画面コントロールの設定
   */
  protected setupFullscreenControl(): void {
    const fullscreenBtn = this.shadow.querySelector("#fullscreen");
    if (!fullscreenBtn) return;

    fullscreenBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleFullscreen();
    });

    // 全画面状態の変更を監視
    document.addEventListener("fullscreenchange", () => {
      this.handleFullscreenChange();
    });
  }

  /**
   * コメント関連のイベント設定
   */
  protected setupCommentEvents(): void {
    const commentToggle = this.shadow.querySelector("#comment-toggle");
    if (!commentToggle) return;

    commentToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!this.commentSystem) return;

      const isVisible = this.commentSystem.toggleVisibility();
      commentToggle.classList.toggle("active", !isVisible);

      // アイコンを切り替え
      commentToggle.innerHTML = isVisible
        ? PLAYER_ICONS.comment
        : PLAYER_ICONS.commentOff;

      // ローカルストレージに設定を保存
      saveCommentVisibility(isVisible);
    });

    // コメント設定の各種イベント
    this.setupCommentSettingsEvents();
  }

  /**
   * コメント設定のイベント設定
   */
  protected setupCommentSettingsEvents(): void {
    // 透明度スライダー
    const opacitySlider = this.shadow.querySelector(
      "#comment-opacity",
    ) as HTMLInputElement;
    const opacityValue = this.shadow.querySelector(
      "#opacity-value",
    ) as HTMLElement;

    if (opacitySlider && opacityValue) {
      opacitySlider.addEventListener("input", () => {
        const opacity = Number(opacitySlider.value);
        opacityValue.textContent = opacitySlider.value;
        this.tempOpacity = opacity;
      });
    }

    // コメント色選択
    const colorSelect = this.shadow.querySelector(
      "#comment-color",
    ) as HTMLSelectElement;
    if (colorSelect) {
      colorSelect.addEventListener("change", () => {
        this.tempColor = colorSelect.value;
      });
    }

    // NGワード追加
    const ngWordInput = this.shadow.querySelector(
      "#ng-word-input",
    ) as HTMLInputElement;
    const addNgWordBtn = this.shadow.querySelector(
      "#add-ng-word",
    ) as HTMLButtonElement;

    if (ngWordInput && addNgWordBtn) {
      addNgWordBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const word = ngWordInput.value.trim();
        if (
          word &&
          !this.tempNgWords.includes(word) &&
          this.tempNgWords.length < PLAYER_SETTINGS.COMMENT.NG.MAX_WORDS
        ) {
          this.tempNgWords.push(word);
          ngWordInput.value = "";
          this.updateNGWordList(true);
        }
      });
    }

    // NG正規表現追加
    const ngRegexInput = this.shadow.querySelector(
      "#ng-regex-input",
    ) as HTMLInputElement;
    const addNgRegexBtn = this.shadow.querySelector(
      "#add-ng-regex",
    ) as HTMLButtonElement;

    if (ngRegexInput && addNgRegexBtn) {
      addNgRegexBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const regex = ngRegexInput.value.trim();

        try {
          new RegExp(regex);

          if (
            regex &&
            !this.tempNgRegex.includes(regex) &&
            this.tempNgRegex.length < PLAYER_SETTINGS.COMMENT.NG.MAX_REGEX
          ) {
            this.tempNgRegex.push(regex);
            ngRegexInput.value = "";
            this.updateNGRegexList(true);
          }
        } catch (e) {
          window.logger.error("無効な正規表現です:", e);
          ngRegexInput.classList.add("error");
          setTimeout(() => {
            ngRegexInput.classList.remove("error");
          }, 2000);
        }
      });
    }

    // 適用ボタン
    const applyBtn = this.shadow.querySelector(
      "#apply-comment-settings",
    ) as HTMLButtonElement;
    if (applyBtn) {
      applyBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void this.applyCommentSettings();
      });
    }
  }

  /**
   * 初期アイコンの設定
   */
  protected setupInitialIcons(): void {
    // 各ボタンにアイコンを設定
    const buttons = [
      { id: "#rewind-10", icon: PLAYER_ICONS.rewind10 },
      { id: "#forward-10", icon: PLAYER_ICONS.forward10 },
      { id: "#fullscreen", icon: PLAYER_ICONS.fullscreen },
      { id: "#settings", icon: PLAYER_ICONS.settings },
    ];

    buttons.forEach(({ id, icon }) => {
      const button = this.shadow.querySelector(id);
      if (button) {
        button.innerHTML = icon;
      }
    });
  }

  /**
   * 初期設定の読み込み
   */
  protected async initializeSettings(): Promise<void> {
    if (!this.video) return;

    // ビデオイベントの設定
    this.setupVideoEvents();

    // 保存済み設定の読み込み
    await this.loadCommentSettings();

    // コントロールモード設定
    const controlsMode = getSavedControlsMode(
      PLAYER_SETTINGS.CONTROLS_MODE.HOVER,
    );
    this.applyControlsMode(controlsMode);

    const controlsModeSelect = this.shadow.querySelector(
      "#controls-mode",
    ) as HTMLSelectElement;
    if (controlsModeSelect) {
      controlsModeSelect.value = controlsMode;
    }
  }

  /**
   * ビデオイベントの設定
   */
  protected setupVideoEvents(): void {
    const video = this.getVideo();
    if (!video) return;

    // 再生状態変更時のボタン更新
    video.addEventListener("play", () => {
      this.userPaused = false;
      this.updatePlayPauseButton();
    });

    video.addEventListener("pause", () => {
      this.updatePlayPauseButton();
    });

    video.addEventListener("loadeddata", () => {
      this.updatePlayPauseButton();
    });

    // 時間更新
    video.addEventListener("timeupdate", () => {
      this.updateProgress();
      this.updateTimeDisplay();
    });

    // メタデータ読み込み完了
    video.addEventListener("loadedmetadata", () => {
      this.updateDurationDisplay();
    });

    // 動画長取得失敗への対処（duration変更時にも再試行）
    video.addEventListener("durationchange", () => {
      this.updateDurationDisplay();
    });

    video.addEventListener("seeked", () => {
      this.resetCommentOverlayAfterSeek();
    });

    // 外部から音量が変更された場合にもUIを同期
    video.addEventListener("volumechange", () => {
      this.syncVolumeFromVideo();
    });

    // 即座に長さを確認（すでに読み込み済みの場合）
    if (video.duration && !isNaN(video.duration)) {
      this.updateDurationDisplay();
    }
  }

  /**
   * プログレス表示の更新
   */
  protected updateProgress(): void {
    const video = this.getVideo();
    if (!video) return;

    const seekBar = this.shadow.querySelector("#seek-bar") as HTMLInputElement;
    const progressBar = this.shadow.querySelector(
      ".progress-bar-custom",
    ) as HTMLElement;

    if (!seekBar || !progressBar || isNaN(video.duration)) return;

    const progress = (video.currentTime / video.duration) * 100;
    progressBar.style.width = `${progress}%`;
    seekBar.value = String(progress);
    seekBar.style.setProperty("--progress", `${progress}%`);
  }

  /**
   * 現在時間表示の更新
   */
  protected updateTimeDisplay(): void {
    const video = this.getVideo();
    if (!video) return;

    const currentTimeSpan = this.shadow.querySelector("#current-time");
    if (currentTimeSpan) {
      currentTimeSpan.textContent = this.formatTime(video.currentTime);
    }
  }

  protected resetCommentOverlayAfterSeek(): void {
    if (!this.commentSystem) {
      return;
    }

    // comment-overlay 2.9.0+/3.0.0+ では自動リセット機能が組み込まれているため、
    // 手動でのhardReset呼び出しは不要
  }

  /**
   * 動画長表示の更新
   */
  protected updateDurationDisplay(): void {
    const video = this.getVideo();
    if (!video) return;

    const durationSpan = this.shadow.querySelector("#duration");
    if (durationSpan) {
      durationSpan.textContent = this.formatTime(video.duration);
    }

    // シークバーの最大値を設定
    const seekBar = this.shadow.querySelector("#seek-bar") as HTMLInputElement;
    if (seekBar) {
      seekBar.max = "100";
    }
  }

  /**
   * 再生/一時停止ボタンの更新
   */
  protected updatePlayPauseButton(): void {
    const button = this.shadow.querySelector("#play-pause");
    const video = this.getVideo();
    if (!button || !video) return;

    if (video.paused) {
      button.classList.remove("playing");
      button.classList.add("paused");
      button.innerHTML = PLAYER_ICONS.play;
    } else {
      button.classList.add("playing");
      button.classList.remove("paused");
      button.innerHTML = PLAYER_ICONS.pause;
    }
  }

  /**
   * 音量アイコンの更新
   */
  protected updateVolumeIcon(): void {
    const button = this.shadow.querySelector("#mute");
    const video = this.getVideo();
    if (!button || !video) return;

    const isMuted = video.muted || video.volume === 0;
    if (this.lastMutedIconState === isMuted) {
      return;
    }
    this.lastMutedIconState = isMuted;

    if (isMuted) {
      button.classList.add("muted");
      button.innerHTML = PLAYER_ICONS.muted;
    } else {
      button.classList.remove("muted");
      button.innerHTML = PLAYER_ICONS.volume;
    }
  }

  /**
   * 時間をMM:SS形式に変換
   */
  protected formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
}
