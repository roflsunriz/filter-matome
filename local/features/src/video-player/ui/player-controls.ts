import { ExtendedDocument, ExtendedHTMLElement } from "@/types/index";
import { PLAYER_SETTINGS } from "@/video-player/config/constants";
import { PLAYER_ICONS } from "@/video-player/config/icons";
import { saveControlsMode } from "@/video-player/ui/player-control-storage";
import * as IndexedDBUtils from "@/video-player/utils/indexed-db-utils";
import { PlayerControlsEvents } from "./player-controls-events";

export class PlayerControlsShadow extends PlayerControlsEvents {
  /**
   * 設定メニューの表示/非表示切り替え
   */
  protected toggleSettingsMenu(): void {
    this.isSettingsOpen = !this.isSettingsOpen;
    const settingsMenu = this.shadow.querySelector(
      "#player-settings-menu",
    ) as HTMLElement;

    if (settingsMenu) {
      if (this.isSettingsOpen) {
        this.resetTempSettingsFromCurrent();
        this.updateSettingsUI();
      }

      settingsMenu.classList.toggle("visible", this.isSettingsOpen);

      if (this.isSettingsOpen) {
        this.showControls();
        // 現在の全画面状態を確認して表示モードを設定
        const doc = document as ExtendedDocument;
        const isFullScreen =
          !!doc.fullscreenElement ||
          !!doc.mozFullScreenElement ||
          !!doc.webkitFullscreenElement ||
          !!doc.msFullscreenElement;
        this.updateSettingsMenuMode(isFullScreen);

        // 位置調整を次のフレームで実行（表示後にサイズが確定してから）
        requestAnimationFrame(() => {
          this.adjustSettingsMenuPosition(settingsMenu);
        });
      }
    }
  }

  protected resetTempSettingsFromCurrent(): void {
    this.tempOpacity = this.commentOpacity;
    this.tempColor = this.commentColor;
    this.tempNgWords = [...this.ngWords];
    this.tempNgRegex = [...this.ngRegex];
  }

  /**
   * 設定メニューの位置を調整（画面からはみ出ないように）
   */
  protected adjustSettingsMenuPosition(settingsMenu: HTMLElement): void {
    // 設定ボタンの位置を取得
    const settingsBtn = this.shadow.querySelector("#settings") as HTMLElement;
    if (!settingsBtn) return;

    const btnRect = settingsBtn.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    // プレイヤーコントロール内での相対位置を計算
    const controlsRect = this.shadow
      .querySelector(".player-controls")
      ?.getBoundingClientRect();
    if (!controlsRect) return;

    // 設定ボタンの右端を基準に配置
    const rightOffset = controlsRect.right - btnRect.right;

    // 初期位置をリセット
    settingsMenu.classList.remove("adjust-position");
    settingsMenu.style.left = "";
    settingsMenu.style.right = `${rightOffset}px`;

    // 再度位置を取得して調整
    const updatedRect = settingsMenu.getBoundingClientRect();

    // 右端からはみ出る場合
    if (updatedRect.right > viewportWidth - 10) {
      const overflowAmount = updatedRect.right - (viewportWidth - 10);
      settingsMenu.style.right = `${rightOffset + overflowAmount}px`;
    }

    // 左端からはみ出る場合
    const finalRect = settingsMenu.getBoundingClientRect();
    if (finalRect.left < 10) {
      settingsMenu.style.left = "10px";
      settingsMenu.style.right = "auto";
    }

    // 上端からはみ出る場合（設定メニューが画面上部を超える場合）
    if (updatedRect.top < 10) {
      settingsMenu.style.bottom = "auto";
      settingsMenu.style.top = "100%";
      settingsMenu.style.marginTop = "10px";
      settingsMenu.style.marginBottom = "0";
    }
  }

  /**
   * 設定メニューを閉じる
   */
  protected closeSettingsMenu(): void {
    if (this.isSettingsOpen) {
      this.isSettingsOpen = false;
      const settingsMenu = this.shadow.querySelector(
        "#player-settings-menu",
      ) as HTMLElement;

      if (settingsMenu) {
        settingsMenu.classList.remove("visible");
        // 位置調整をリセット
        settingsMenu.classList.remove("adjust-position");
        settingsMenu.style.left = "";
        settingsMenu.style.right = "";
        settingsMenu.style.top = "";
        settingsMenu.style.bottom = "";
        settingsMenu.style.marginTop = "";
        settingsMenu.style.marginBottom = "";
      }
    }
  }

  /**
   * コントロールモード変更処理
   */
  protected handleControlsModeChange = (e: Event): void => {
    const select = e.target as HTMLSelectElement;
    const mode = select.value;
    saveControlsMode(mode);
    this.applyControlsMode(mode);
  };

  /**
   * コントロールモードを適用
   */
  protected applyControlsMode(mode: string): void {
    if (mode === PLAYER_SETTINGS.CONTROLS_MODE.ALWAYS) {
      this.classList.add("always-visible");
      this.classList.add("controls-visible"); // 常に表示の場合は即座に表示
    } else {
      this.classList.remove("always-visible");
      // ホバーモードの場合は初期状態では非表示
      this.classList.remove("controls-visible");
    }
  }

  /**
   * コメント設定の読み込み
   */
  protected async loadCommentSettings(): Promise<void> {
    try {
      // 設定を並行して読み込み
      const [opacity, color, words, regexList] = await Promise.all([
        IndexedDBUtils.getSettings(
          "commentOpacity",
          PLAYER_SETTINGS.COMMENT.OPACITY.DEFAULT,
        ),
        IndexedDBUtils.getSettings(
          "commentColor",
          PLAYER_SETTINGS.COMMENT.COLORS.WHITE,
        ),
        IndexedDBUtils.getSettings("ngWords", []),
        IndexedDBUtils.getSettings("ngRegex", []),
      ]);

      // 設定を適用
      this.commentOpacity = opacity;
      this.tempOpacity = opacity;
      this.commentColor = color;
      this.tempColor = color;
      this.ngWords = words;
      this.tempNgWords = [...words];
      this.ngRegex = regexList;
      this.tempNgRegex = [...regexList];

      // UI要素に反映
      this.updateSettingsUI();

      // コメントシステムに適用
      if (this.commentSystem) {
        this.commentSystem.setOpacity(this.commentOpacity);
        this.commentSystem.setDefaultColor(this.commentColor);
        this.commentSystem.setNGWords(this.ngWords);
        this.commentSystem.setNGRegex(this.ngRegex);
      }
    } catch (error) {
      window.logger.error("コメント設定の読み込みに失敗しました:", error);
    }
  }

  /**
   * 設定UIの更新
   */
  protected updateSettingsUI(): void {
    // 透明度スライダー
    const opacitySlider = this.shadow.querySelector(
      "#comment-opacity",
    ) as HTMLInputElement;
    const opacityValue = this.shadow.querySelector(
      "#opacity-value",
    ) as HTMLElement;

    if (opacitySlider && opacityValue) {
      opacitySlider.value = String(this.tempOpacity);
      opacityValue.textContent = String(this.tempOpacity);
    }

    // 色選択
    const colorSelect = this.shadow.querySelector(
      "#comment-color",
    ) as HTMLSelectElement;
    if (colorSelect) {
      colorSelect.value = this.tempColor;
    }

    // NGリストの更新
    this.updateNGWordList(true);
    this.updateNGRegexList(true);
  }

  /**
   * NGワードリストの更新
   */
  protected updateNGWordList(isTemp: boolean = false): void {
    const ngList = this.shadow.querySelector(
      "#ng-word-list",
    ) as HTMLUListElement;
    if (!ngList) return;

    ngList.innerHTML = "";
    const words = isTemp ? this.tempNgWords : this.ngWords;

    words.forEach((word, index) => {
      const li = document.createElement("li");
      li.textContent = word;

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "削除";
      removeBtn.addEventListener("click", () => {
        if (isTemp) {
          this.tempNgWords.splice(index, 1);
          this.updateNGWordList(true);
        } else {
          void this.removeNGWord(index);
        }
      });

      li.appendChild(removeBtn);
      ngList.appendChild(li);
    });
  }

  /**
   * NG正規表現リストの更新
   */
  protected updateNGRegexList(isTemp: boolean = false): void {
    const ngList = this.shadow.querySelector(
      "#ng-regex-list",
    ) as HTMLUListElement;
    if (!ngList) return;

    ngList.innerHTML = "";
    const regexList = isTemp ? this.tempNgRegex : this.ngRegex;

    regexList.forEach((regex, index) => {
      const li = document.createElement("li");
      li.textContent = regex;

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "削除";
      removeBtn.addEventListener("click", () => {
        if (isTemp) {
          this.tempNgRegex.splice(index, 1);
          this.updateNGRegexList(true);
        } else {
          void this.removeNGRegex(index);
        }
      });

      li.appendChild(removeBtn);
      ngList.appendChild(li);
    });
  }

  /**
   * NGワードを削除
   */
  protected async removeNGWord(index: number): Promise<void> {
    this.ngWords.splice(index, 1);

    await IndexedDBUtils.saveSettings("ngWords", this.ngWords);
    this.updateNGWordList();

    if (this.commentSystem) {
      this.commentSystem.setNGWords(this.ngWords);
    }
  }

  /**
   * NG正規表現を削除
   */
  protected async removeNGRegex(index: number): Promise<void> {
    this.ngRegex.splice(index, 1);

    await IndexedDBUtils.saveSettings("ngRegex", this.ngRegex);
    this.updateNGRegexList();

    if (this.commentSystem) {
      this.commentSystem.setNGRegex(this.ngRegex);
    }
  }

  /**
   * コメント設定を適用
   */
  protected async applyCommentSettings(): Promise<void> {
    try {
      // 設定を正式に適用
      this.commentOpacity = this.tempOpacity;
      this.commentColor = this.tempColor;
      this.ngWords = [...this.tempNgWords];
      this.ngRegex = [...this.tempNgRegex];

      // IndexedDBに保存
      await Promise.all([
        IndexedDBUtils.saveSettings("commentOpacity", this.commentOpacity),
        IndexedDBUtils.saveSettings("commentColor", this.commentColor),
        IndexedDBUtils.saveSettings("ngWords", this.ngWords),
        IndexedDBUtils.saveSettings("ngRegex", this.ngRegex),
      ]);

      // コメントシステムに適用
      if (this.commentSystem) {
        this.commentSystem.setOpacity(this.commentOpacity);
        this.commentSystem.setDefaultColor(this.commentColor);
        this.commentSystem.setNGWords(this.ngWords);
        this.commentSystem.setNGRegex(this.ngRegex);
      }

      // 適用成功のフィードバック
      this.showApplyFeedback();

      window.logger.info(
        `コメント設定を適用しました！ 透明度: ${this.commentOpacity}, 色: ${this.commentColor}, NGワード: ${this.ngWords.length}件, NG正規表現: ${this.ngRegex.length}件`,
      );
    } catch (error) {
      window.logger.error("コメント設定の適用に失敗しました:", error);
    }
  }

  /**
   * 設定適用のフィードバック表示
   */
  protected showApplyFeedback(): void {
    const applyBtn = this.shadow.querySelector(
      "#apply-comment-settings",
    ) as HTMLButtonElement;
    if (!applyBtn) return;

    const originalText = applyBtn.textContent;
    applyBtn.textContent = "✓ 適用しました";
    applyBtn.classList.add("applied");

    setTimeout(() => {
      applyBtn.textContent = originalText;
      applyBtn.classList.remove("applied");
    }, 2000);
  }

  /**
   * 全画面表示の切り替え
   */
  protected toggleFullscreen(): void {
    try {
      const doc = document as ExtendedDocument;

      if (
        !doc.fullscreenElement &&
        !doc.mozFullScreenElement &&
        !doc.webkitFullscreenElement &&
        !doc.msFullscreenElement
      ) {
        // プレイヤーコンテナを全画面表示
        const playerContainer = this.closest(
          ".custom-player",
        ) as ExtendedHTMLElement;

        if (playerContainer) {
          // デバッグ情報
          window.logger.info("全画面化を試行します:", {
            hasRequestFullscreen: !!playerContainer.requestFullscreen,
            hasMozRequestFullScreen: !!playerContainer.mozRequestFullScreen,
            hasWebkitRequestFullscreen:
              !!playerContainer.webkitRequestFullscreen,
            hasMsRequestFullscreen: !!playerContainer.msRequestFullscreen,
          });

          if (playerContainer.requestFullscreen) {
            playerContainer
              .requestFullscreen()
              .then(() => {
                window.logger.info("標準全画面API成功しました");
                // 成功時にクラスも追加（念のため）
                document.documentElement.classList.add("fullscreen-active");
                document.body.classList.add("nc-fullscreen-active");
                playerContainer.classList.add("nc-fullscreen-player");
              })
              .catch((err: Error) => {
                window.logger.error("標準全画面APIが失敗しました:", err);
                // フォールバック処理
                this.fallbackFullscreen(playerContainer);
              });
          } else if (playerContainer.mozRequestFullScreen) {
            playerContainer.mozRequestFullScreen();
            window.logger.info("Firefox全画面API使用しました");
          } else if (playerContainer.webkitRequestFullscreen) {
            playerContainer.webkitRequestFullscreen();
            window.logger.info("WebKit全画面API使用しました");
          } else if (playerContainer.msRequestFullscreen) {
            playerContainer.msRequestFullscreen();
            window.logger.info("IE全画面API使用しました");
          } else {
            // 全APIが使用不可の場合のフォールバック
            window.logger.warn(
              "全画面APIが利用できないため、フォールバックを使用します",
            );
            this.fallbackFullscreen(playerContainer);
          }
        }
      } else {
        // 全画面解除
        if (doc.exitFullscreen) {
          doc
            .exitFullscreen()
            .then(() => {
              window.logger.info("全画面解除成功しました");
              // クラスも削除
              document.documentElement.classList.remove("fullscreen-active");
              document.body.classList.remove("nc-fullscreen-active");
              const playerContainer = this.closest(".custom-player");
              if (playerContainer) {
                playerContainer.classList.remove("nc-fullscreen-player");
              }
            })
            .catch((err: Error) => {
              window.logger.error("全画面解除が失敗しました:", err);
            });
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      }
    } catch (error) {
      window.logger.error("全画面切り替えでエラーが発生しました:", error);
      // エラー時もフォールバックを試行
      const playerContainer = this.closest(
        ".custom-player",
      ) as ExtendedHTMLElement;
      if (playerContainer) {
        this.fallbackFullscreen(playerContainer);
      }
    }
  }

  /**
   * フォールバック全画面処理
   */
  protected fallbackFullscreen(playerContainer: HTMLElement): void {
    window.logger.info("フォールバック全画面モードを使用します");

    // クラスベースの全画面モード
    document.documentElement.classList.add("fullscreen-active");
    document.body.classList.add("nc-fullscreen-active");
    playerContainer.classList.add("nc-fullscreen-player");

    // ESCキーでの終了をサポート
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        document.documentElement.classList.remove("fullscreen-active");
        document.body.classList.remove("nc-fullscreen-active");
        playerContainer.classList.remove("nc-fullscreen-player");
        document.removeEventListener("keydown", handleEscape);
        window.logger.info("フォールバック全画面モードを終了しました");
      }
    };

    document.addEventListener("keydown", handleEscape);
  }

  /**
   * 全画面状態変更時の処理
   */
  protected handleFullscreenChange(): void {
    const doc = document as ExtendedDocument;
    const isFullScreen =
      !!doc.fullscreenElement ||
      !!doc.mozFullScreenElement ||
      !!doc.webkitFullscreenElement ||
      !!doc.msFullscreenElement;

    // ESCキーによるネイティブ全画面解除では exitFullscreen() の完了処理を
    // 通らないため、ブラウザーが通知する状態を独自の全画面クラスへ同期する。
    const playerContainer = this.closest(".custom-player");
    document.documentElement.classList.toggle(
      "fullscreen-active",
      isFullScreen,
    );
    document.body.classList.toggle("nc-fullscreen-active", isFullScreen);
    playerContainer?.classList.toggle("nc-fullscreen-player", isFullScreen);

    // フルスクリーンボタンのアイコンを更新
    const fullscreenBtn = this.shadow.querySelector("#fullscreen");
    if (fullscreenBtn) {
      fullscreenBtn.innerHTML = isFullScreen
        ? PLAYER_ICONS.exitFullscreen
        : PLAYER_ICONS.fullscreen;
    }

    // 全画面状態をホスト要素に反映
    this.classList.toggle("fullscreen-active", isFullScreen);

    // 設定メニューの表示モードを更新
    this.updateSettingsMenuMode(isFullScreen);

    // 全画面時のビデオ要素強制調整
    if (isFullScreen) {
      // 全画面時のスタイルはCSSで管理
    } else {
      // 全画面解除時はスタイルをリセット
      this.resetVideoStyles();
    }

    // 全画面切り替え時にコメントシステムのリサイズをトリガー
    if (this.commentSystem) {
      this.commentSystem.resize();
    }
  }

  /**
   * 設定メニューの表示モードを更新
   */
  protected updateSettingsMenuMode(isFullScreen: boolean): void {
    const settingsMenu = this.shadow.querySelector(
      "#player-settings-menu",
    ) as HTMLElement;
    if (settingsMenu) {
      settingsMenu.classList.toggle("fullscreen-mode", isFullScreen);
      settingsMenu.classList.toggle("windowed-mode", !isFullScreen);
    }
  }

  /**
   * キーボードショートカットの処理
   */
  protected handleKeyboardShortcuts = (e: KeyboardEvent): void => {
    // 入力欄での操作は無視
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    if (!this.video) return;

    switch (e.key.toLowerCase()) {
      case " ":
      case "k":
        e.preventDefault();
        if (this.video.paused) {
          this.video
            .play()
            .catch((err) =>
              window.logger.error("再生開始に失敗しました:", err),
            );
        } else {
          this.video.pause();
          this.userPaused = true;
        }
        break;
      case "f":
        e.preventDefault();
        this.toggleFullscreen();
        break;
      case "m":
        e.preventDefault();
        this.video.muted = !this.video.muted;
        this.updateVolumeIcon();
        break;
      case "arrowleft":
        e.preventDefault();
        this.video.currentTime = Math.max(this.video.currentTime - 5, 0);
        break;
      case "arrowright":
        e.preventDefault();
        this.video.currentTime = Math.min(
          this.video.currentTime + 5,
          this.video.duration || 0,
        );
        break;
      case "j":
        e.preventDefault();
        this.video.currentTime = Math.max(this.video.currentTime - 10, 0);
        break;
      case "l":
        e.preventDefault();
        this.video.currentTime = Math.min(
          this.video.currentTime + 10,
          this.video.duration || 0,
        );
        break;
    }
  };

  /**
   * 表示状態の制御
   */
  show(): void {
    this.classList.add("controls-visible");
  }

  hide(): void {
    this.classList.remove("controls-visible");
  }

  setCompanionPanelActive(active: boolean): void {
    this.companionPanelActive = active;
    if (active) {
      this.showControls();
      return;
    }
    this.hideControlsWithDelay();
  }

  /**
   * プレイヤー再生（外部から呼ばれる）
   */
  playVideo(): void {
    if (this.userPaused || !this.video) {
      return;
    }

    this.video
      .play()
      .catch((err) => window.logger.error("自動再生に失敗しました:", err));
  }

  /**
   * コンポーネントの破棄
   */
  disconnectedCallback(): void {
    // キーボードイベントの削除
    document.removeEventListener("keydown", this.handleKeyboardShortcuts);

    // タイマーのクリア
    this.clearHideTimer();
    this.clearCursorTimer();
    if (this.volumeSaveTimer !== null) {
      window.clearTimeout(this.volumeSaveTimer);
      this.volumeSaveTimer = null;
    }

    // カーソルを必ず元に戻す
    this.showCursor();

    // 参照のクリア
    this.video = null;
    this.commentSystem = null;
    this.companionPanelActive = false;
  }

  protected ensureInitialized(): void {
    if (this.initialized) return;

    // DOMの準備を確実に待つ
    if (!this.shadow || !this.shadow.firstElementChild) {
      window.logger.warn("シャドウDOMがまだ準備されていません");
      return;
    }

    this.setupEventListeners();
    this.setupInitialIcons();
    this.initialized = true;

    window.logger.info("PlayerControlsShadowの初期化が完了しました");
  }

  /**
   * ビデオ要素を取得（未設定ならDOMから自動検出）
   */
  protected getVideo(): HTMLVideoElement | null {
    if (this.video) return this.video;
    const v = document.getElementById(
      "video-element",
    ) as HTMLVideoElement | null;
    if (v) {
      this.video = v;
    }
    return this.video;
  }

  /**
   * マウスホバーイベントの設定
   */
  protected setupHoverEvents(): void {
    // プレイヤーコンテナ全体でのマウスイベント
    const playerContainer =
      this.closest(".custom-player") ?? this.parentElement;

    if (playerContainer) {
      // マウスが入った時
      playerContainer.addEventListener("mouseenter", () => {
        this.showControls();
        this.showCursor();
        this.hideCursorWithDelay();
      });

      // マウスが出た時（プレイヤー外へ）
      playerContainer.addEventListener("mouseleave", () => {
        this.hideControlsWithDelay();
        this.showCursor();
        this.clearCursorTimer();
      });

      // マウスが動いた時（コントロール上でも）
      playerContainer.addEventListener("mousemove", () => {
        this.showControls();
        this.hideControlsWithDelay();
        this.showCursor();
        this.hideCursorWithDelay();
      });
    }

    // コントロール自体でのマウスイベント
    this.addEventListener("mouseenter", () => {
      this.showControls();
      this.clearHideTimer();
      this.showCursor();
      this.clearCursorTimer();
    });

    this.addEventListener("mouseleave", () => {
      this.hideControlsWithDelay();
      this.hideCursorWithDelay();
    });
  }

  /**
   * コントロールを表示
   */
  protected showControls(): void {
    this.classList.add("controls-visible");
    this.clearHideTimer();
  }

  /**
   * コントロールを遅延して非表示
   */
  protected hideControlsWithDelay(): void {
    // 常に表示モードの場合は非表示にしない
    if (
      this.classList.contains("always-visible") ||
      this.companionPanelActive ||
      this.isSettingsOpen
    ) {
      return;
    }

    this.clearHideTimer();
    this.mouseTimer = window.setTimeout(() => {
      this.classList.remove("controls-visible");
    }, 3000); // 3秒後に非表示
  }

  /**
   * 非表示タイマーをクリア
   */
  protected clearHideTimer(): void {
    if (this.mouseTimer !== null) {
      clearTimeout(this.mouseTimer);
      this.mouseTimer = null;
    }
  }

  /**
   * マウスカーソルを表示する
   */
  protected showCursor(): void {
    const container = this.closest(".custom-player") ?? this.parentElement;
    if (container instanceof HTMLElement) {
      container.classList.remove("cursor-hidden");
    }
  }

  /**
   * マウスカーソルを遅延して非表示にする（3秒後）
   */
  protected hideCursorWithDelay(): void {
    this.clearCursorTimer();
    this.cursorTimer = window.setTimeout(() => {
      const container = this.closest(".custom-player") ?? this.parentElement;
      if (container instanceof HTMLElement) {
        container.classList.add("cursor-hidden");
      }
    }, 3000);
  }

  /**
   * カーソル非表示タイマーをクリア
   */
  protected clearCursorTimer(): void {
    if (this.cursorTimer !== null) {
      clearTimeout(this.cursorTimer);
      this.cursorTimer = null;
    }
  }

  /**
   * ビデオスタイルのリセット（全画面解除時）
   */
  protected resetVideoStyles(): void {
    const video = this.getVideo();
    if (!video) return;

    try {
      window.logger.info("ビデオ要素のスタイルをリセットします");

      // 強制スタイルをクリア
      video.style.position = "";
      video.style.top = "";
      video.style.left = "";
      video.style.transform = "";
      video.style.zIndex = "";
      video.style.backgroundColor = "";
      video.style.width = "";
      video.style.height = "";

      window.logger.info("ビデオスタイルリセット完了しました");
    } catch (error) {
      window.logger.error(
        "ビデオスタイルリセットでエラーが発生しました:",
        error,
      );
    }
  }
}

if (!customElements.get("player-controls-shadow")) {
  customElements.define("player-controls-shadow", PlayerControlsShadow);
  window.logger.info(
    "player-controls-shadowカスタムエレメントを登録しました！",
  );
} else {
  window.logger.info(
    "player-controls-shadowカスタムエレメントは既に登録済みです",
  );
}
