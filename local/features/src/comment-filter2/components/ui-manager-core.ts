// UIマネジメント部 - UIの制御とイベント処理
import { CommentFilter } from "@/comment-filter2/filter/comment-filter";
import { JsonCommentFilter } from "@/comment-filter2/filter/json-comment-filter";
import { FilterStorage } from "@/comment-filter2/storage/indexed-db";
import { CommentFilter2MainStyles } from "@/comment-filter2/styles/main";
import {
  CSS_CLASSES,
  mainUITemplate,
  UI_ELEMENTS,
} from "@/comment-filter2/templates/main-ui";
import { DEFAULT_CLEAR_EXISTING_COMMANDS } from "@/comment-filter2/utils/command-settings";
import {
  CONSTANTS,
  DEFAULT_FORK_COMMANDS,
} from "@/comment-filter2/utils/constants";
import { FilterLogger } from "@/comment-filter2/utils/filter-logger";
import { sanitizeCommentCommands } from "@/comment-filter2/utils/sanitizer";
import { CommandSettings, Settings } from "@/types/filter-types";
/** フィルターUIの生成・基本状態・共通操作。 */
export abstract class UIManagerCore {
  /**
   * UIを削除
   */
  protected abstract removeUI(): void;
  /**
   * UIを非表示
   */
  protected abstract hide(): void;
  /**
   * 形式表示を更新
   */
  protected abstract updateFormatDisplay(): void;
  /**
   * ルール一覧を更新
   */
  protected abstract refreshRulesList(): Promise<void>;
  /**
   * デバッグモードの切り替え
   */
  protected abstract toggleDebugMode(): Promise<void>;
  /**
   * ログ送信の切り替え
   */
  protected abstract toggleLogSending(): Promise<void>;
  /**
   * 形式切替
   */
  protected abstract switchFormat(format: "form" | "json" | "library"): void;
  /**
   * フォームからルールを追加
   */
  protected abstract addRuleFromForm(): Promise<void>;
  /**
   * フォームをクリア
   */
  protected abstract clearForm(): void;
  /**
   * ニコる数設定の表示切替
   */
  protected abstract toggleNicoruSettings(): void;
  /**
   * JSONルールを保存
   */
  protected abstract saveJsonRules(): Promise<void>;
  /**
   * JSONルールを検証
   */
  protected abstract validateJsonRules(): void;
  /**
   * 全ルールを削除
   */
  protected abstract clearAllRules(): Promise<void>;
  /**
   * データをエクスポート
   */
  protected abstract exportJsonData(): Promise<void>;
  /**
   * インポートをトリガー
   */
  protected abstract triggerImport(): void;
  /**
   * レガシーインポートをトリガー
   */
  protected abstract triggerLegacyImport(): void;
  /** プレイヤー種別に応じて、コメントの即時同期または再取得を行う。 */
  protected abstract applyFromCockpit(): Promise<void>;
  /**
   * ファイルインポートを処理
   */
  protected abstract handleFileImport(event: Event): Promise<void>;
  /**
   * レガシーファイルインポートを処理
   */
  protected abstract handleLegacyFileImport(event: Event): Promise<void>;
  /**
   * 動的要素のイベントハンドラーを設定
   */
  protected abstract setupDynamicEventHandlers(): void;
  /**
   * 正規表現パターン入力のリアルタイム分析をセットアップ
   */
  protected abstract setupRegexAnalysis(): void;
  /** サイドナビゲーションでワークスペースの表示を切り替える */
  protected abstract setupCockpitNavigation(): void;
  protected readonly onFilterApplied: () => void;
  protected readonly isLocalVideoPlayerAvailable: () => boolean;
  protected readonly reloadOfficialComments: () => Promise<boolean>;
  protected storage: FilterStorage;
  protected filter: CommentFilter;
  protected jsonFilter: JsonCommentFilter;
  protected container: HTMLElement | null = null;
  protected shadowRoot: ShadowRoot | null = null;
  protected backgroundOverlay: HTMLElement | null = null;
  protected isVisible = false;
  protected isUICreated = false;
  protected currentFormat: "form" | "json" | "library" = "form";
  protected regexAnalysisDebounceTimer: ReturnType<typeof setTimeout> | null =
    null;
  protected currentSettings: Settings = {
    debugMode: false,
    isEnabled: true,
    commandSettings: {
      owner: [],
      main: [],
      easy: [],
      normal: [],
    },
    clearExistingCommands: DEFAULT_CLEAR_EXISTING_COMMANDS,
  };

  constructor(
    onFilterApplied: () => void = () => undefined,
    isLocalVideoPlayerAvailable: () => boolean = () => true,
    reloadOfficialComments: () => Promise<boolean> = () =>
      Promise.resolve(false),
  ) {
    this.onFilterApplied = onFilterApplied;
    this.isLocalVideoPlayerAvailable = isLocalVideoPlayerAvailable;
    this.reloadOfficialComments = reloadOfficialComments;
    this.storage = new FilterStorage();
    this.filter = new CommentFilter();
    this.jsonFilter = new JsonCommentFilter();
    void this.initialize();
  }

  /**
   * UIマネジメントの初期化
   */
  protected async initialize(): Promise<void> {
    try {
      await this.storage.initialize();
      await this.loadSettings();
      // UI作成は最初は行わない（リンクから呼び出された時に作成）

      window.logger?.info(
        "[CommentFilter2] UI Manager initialized (UI not created yet)",
      );
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] UI Manager initialization failed:",
        error,
      );
    }
  }

  /**
   * UIを作成してシャドウDOMに挿入
   */
  protected async createUI(): Promise<void> {
    await Promise.resolve();
    if (this.isUICreated) return;

    // 既存のUIを削除
    this.removeUI();

    // 背景オーバーレイ用のスタイルをページに注入
    this.injectStyles();

    // 背景オーバーレイを作成
    this.backgroundOverlay = document.createElement("div");
    this.backgroundOverlay.id = "cf2-background-overlay";
    this.backgroundOverlay.className = "cf2-background-overlay";
    this.backgroundOverlay.style.display = "none"; // 初期は非表示
    document.body.appendChild(this.backgroundOverlay);

    // オーバーレイクリックで閉じる機能
    this.backgroundOverlay.addEventListener("click", () => {
      this.hide();
    });

    // シャドウDOMホストを作成
    const shadowHost = document.createElement("div");
    shadowHost.id = "cf2-shadow-host";
    document.body.appendChild(shadowHost);

    // シャドウルートを作成（デバッグしやすいよう open mode にする）
    this.shadowRoot = shadowHost.attachShadow({ mode: "open" });

    // スタイルをシャドウDOM内に注入
    this.injectShadowStyles();

    // UIコンテナを作成
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = mainUITemplate;
    this.container = tempDiv.firstElementChild as HTMLElement;

    // シャドウDOMに挿入
    this.shadowRoot.appendChild(this.container);

    // イベントをバインド
    this.bindEvents();

    // 初期状態を設定
    this.updateUI();

    // 初期形式を設定
    this.updateFormatDisplay();

    // ルール一覧を初期化（非同期だがイベントコールバック外なのでawait不要）
    void this.refreshRulesList();

    this.isUICreated = true;
    window.logger?.info("[CommentFilter2] UI created in Shadow DOM and ready");
  }

  /**
   * スタイルシートをページに挿入（背景オーバーレイ用）
   */
  protected injectStyles(): void {
    const styleId = "cf2-styles";

    // 既存のスタイルを削除
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // インライン化されたCSSを使用（背景オーバーレイ用）
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = CommentFilter2MainStyles;
    document.head.appendChild(style);
  }

  /**
   * スタイルをシャドウDOMに注入
   */
  protected injectShadowStyles(): void {
    if (!this.shadowRoot) return;

    // インライン化されたCSSを使用
    const style = document.createElement("style");
    style.textContent = CommentFilter2MainStyles;

    // シャドウDOMに挿入
    this.shadowRoot.appendChild(style);

    window.logger?.debug("[CommentFilter2] Styles injected into Shadow DOM");
  }

  /**
   * イベントハンドラーをバインド（シャドウDOM対応）
   */
  protected bindEvents(): void {
    if (!this.container) {
      window.logger?.error(
        "[CommentFilter2] Container not found for event binding",
      );
      return;
    }

    // エラーハンドリングとログ付きでイベントリスナーを設定
    this.safeAddEventListener(UI_ELEMENTS.CLOSE_BTN, "click", () =>
      this.hide(),
    );
    this.safeAddEventListener(UI_ELEMENTS.MAIN_TOGGLE, "click", () =>
      this.toggleMainFilter(),
    );
    this.safeAddEventListener(UI_ELEMENTS.DEBUG_TOGGLE, "click", () =>
      this.toggleDebugMode(),
    );
    this.safeAddEventListener(UI_ELEMENTS.LOG_TOGGLE, "click", () =>
      this.toggleLogSending(),
    );

    // 形式切替
    this.safeAddEventListener(UI_ELEMENTS.FORMAT_FORM, "click", () =>
      this.switchFormat("form"),
    );
    this.safeAddEventListener(UI_ELEMENTS.FORMAT_JSON, "click", () =>
      this.switchFormat("json"),
    );
    this.safeAddEventListener(UI_ELEMENTS.FORMAT_LIBRARY, "click", () =>
      this.switchFormat("library"),
    );

    // フォーム機能
    this.safeAddEventListener(UI_ELEMENTS.ADD_RULE, "click", () =>
      this.addRuleFromForm(),
    );
    this.safeAddEventListener(UI_ELEMENTS.CLEAR_FORM, "click", () =>
      this.clearForm(),
    );
    this.safeAddEventListener(UI_ELEMENTS.NICORU_TOGGLE, "click", () =>
      this.toggleNicoruSettings(),
    );

    // JSON機能
    this.safeAddEventListener(UI_ELEMENTS.SAVE_JSON_RULES, "click", () =>
      this.saveJsonRules(),
    );
    this.safeAddEventListener(UI_ELEMENTS.VALIDATE_JSON, "click", () =>
      this.validateJsonRules(),
    );

    // ルール一覧
    this.safeAddEventListener(UI_ELEMENTS.REFRESH_RULES, "click", () =>
      this.refreshRulesList(),
    );
    this.safeAddEventListener(UI_ELEMENTS.CLEAR_ALL_RULES, "click", () =>
      this.clearAllRules(),
    );

    // データ管理
    this.safeAddEventListener(UI_ELEMENTS.EXPORT_JSON_BTN, "click", () =>
      this.exportJsonData(),
    );
    this.safeAddEventListener(UI_ELEMENTS.IMPORT_BTN, "click", () =>
      this.triggerImport(),
    );
    this.safeAddEventListener(UI_ELEMENTS.LEGACY_IMPORT_BTN, "click", () =>
      this.triggerLegacyImport(),
    );

    // その他
    this.safeAddEventListener(UI_ELEMENTS.SAVE_COMMANDS_BTN, "click", () =>
      this.saveCommandSettings(),
    );
    this.safeAddEventListener(UI_ELEMENTS.RESET_COMMANDS_BTN, "click", () =>
      this.resetCommandSettings(),
    );
    this.safeAddEventListener(UI_ELEMENTS.CLEAR_COMMANDS_TOGGLE, "click", () =>
      this.toggleClearExistingCommands(),
    );
    this.safeAddEventListener(UI_ELEMENTS.COCKPIT_APPLY, "click", () =>
      this.applyFromCockpit(),
    );

    // ファイル入力の特別処理
    const fileInput = this.container.querySelector(
      `#${UI_ELEMENTS.FILE_INPUT}`,
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        void this.handleFileImport(e);
      });
      window.logger?.debug("[CommentFilter2] File input event listener bound");
    } else {
      window.logger?.error(
        "[CommentFilter2] File input element not found in shadow DOM",
      );
    }

    // レガシーファイル入力の特別処理
    const legacyFileInput = this.container.querySelector(
      `#${UI_ELEMENTS.LEGACY_FILE_INPUT}`,
    ) as HTMLInputElement;
    if (legacyFileInput) {
      legacyFileInput.addEventListener("change", (e) => {
        void this.handleLegacyFileImport(e);
      });
      window.logger?.debug(
        "[CommentFilter2] Legacy file input event listener bound",
      );
    } else {
      window.logger?.error(
        "[CommentFilter2] Legacy file input element not found in shadow DOM",
      );
    }

    // 動的要素のイベントハンドラー
    this.setupDynamicEventHandlers();

    // 正規表現パターン入力のリアルタイム分析
    this.setupRegexAnalysis();
    this.setupCockpitNavigation();

    // キー伝搬停止処理を設定
    this.setupKeyPropagationPrevention();

    window.logger?.debug(
      "[CommentFilter2] All event listeners bound successfully in shadow DOM",
    );
  }

  /**
   * 安全なイベントリスナー追加（エラーハンドリング付き）
   */
  protected safeAddEventListener(
    elementId: string,
    eventType: string,
    handler: () => void | Promise<void>,
  ): void {
    if (!this.container) return;

    const element = this.container.querySelector(`#${elementId}`);
    if (element) {
      element.addEventListener(eventType, () => {
        try {
          const maybe = handler();
          if (maybe instanceof Promise) {
            void maybe.catch((error) => {
              window.logger?.error(
                `[CommentFilter2] Event handler error for ${elementId}:`,
                error,
              );
            });
          }
        } catch (error) {
          window.logger?.error(
            `[CommentFilter2] Event handler error for ${elementId}:`,
            error,
          );
        }
      });
      window.logger?.debug(
        `[CommentFilter2] Event listener bound for ${elementId}`,
      );
    } else {
      window.logger?.error(`[CommentFilter2] Element not found: ${elementId}`);
    }
  }

  /**
   * キー伝搬停止処理を設定（ビデオプレイヤーのショートカットを防ぐ）
   */
  protected setupKeyPropagationPrevention(): void {
    if (!this.container) return;

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
      l: "動画を10秒進める",
      L: "動画を10秒進める",
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
      " ",
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
              `[CommentFilter2] Input field key event: ${keyEvent.key} in ${input.tagName}`,
            );

            // イベント伝搬を停止（これが重要！）
            keyEvent.stopPropagation();

            // 特殊キーのみ無効化、文字キーは完全に自由
            if (specialKeys.includes(keyEvent.key)) {
              keyEvent.preventDefault();
              window.logger?.debug(
                `[CommentFilter2] Special key prevented in input: ${keyEvent.key}`,
              );
            }
            // 文字キー（f, j, k, l, m, c など）は完全にそのまま通す
          },
          true,
        ); // useCapture = true で早期にキャッチ
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
      const isInOurShadowDOM =
        this.shadowRoot?.contains(target) || this.container?.contains(target);
      if (!isInOurShadowDOM) return;

      // 入力フィールド以外 - ニコニコショートカットを無効化
      if (nicoShortcutKeys[keyEvent.key]) {
        // Ctrl+キーは除外（ブラウザのショートカットを保護）
        if (!keyEvent.ctrlKey) {
          keyEvent.preventDefault();
          keyEvent.stopPropagation();
          window.logger?.debug(
            `[CommentFilter2] Nico shortcut prevented: ${keyEvent.key} (${nicoShortcutKeys[keyEvent.key]})`,
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
      "textarea",
    ];

    inputSelectors.forEach((selector) => {
      const elements = this.container?.querySelectorAll(selector) || [];
      elements.forEach((element) => {
        if (element instanceof HTMLElement) {
          setupInputFieldProtection(element);
          window.logger?.debug(
            `[CommentFilter2] Protected input field: ${selector}`,
          );
        }
      });
    });

    // 特定の入力フィールドも個別で保護
    const specificInputs = [
      this.container?.querySelector(`#${UI_ELEMENTS.JSON_TEXTAREA}`),
      this.container?.querySelector(`#${UI_ELEMENTS.OWNER_COMMANDS}`),
      this.container?.querySelector(`#${UI_ELEMENTS.MAIN_COMMANDS}`),
      this.container?.querySelector(`#${UI_ELEMENTS.EASY_COMMANDS}`),
    ];

    specificInputs.forEach((input, index) => {
      if (input instanceof HTMLElement) {
        setupInputFieldProtection(input);
        window.logger?.debug(
          `[CommentFilter2] Protected specific input field ${index}`,
        );
      }
    });

    // Shadow DOM内でのグローバルキーイベントを監視（入力フィールド以外用）
    if (this.shadowRoot) {
      this.shadowRoot.addEventListener("keydown", globalKeyHandler, true);
      this.shadowRoot.addEventListener("keypress", globalKeyHandler, true);
      window.logger?.debug(
        "[CommentFilter2] Global key prevention set up in Shadow DOM",
      );
    }

    // コンテナ内でのキーイベントも監視（フォールバック）
    if (this.container) {
      this.container.addEventListener("keydown", globalKeyHandler, true);
      this.container.addEventListener("keypress", globalKeyHandler, true);
      window.logger?.debug(
        "[CommentFilter2] Global key prevention set up in container",
      );
    }

    window.logger?.debug(
      "[CommentFilter2] Universal key propagation prevention setup completed",
    );
  }

  /**
   * 設定をロード
   */
  protected async loadSettings(): Promise<void> {
    try {
      this.currentSettings = await this.storage.getSettings();
      this.filter.setDebugMode(this.currentSettings.debugMode);
      // FilterLoggerの設定も初期化
      FilterLogger.setLogSendingEnabled(
        this.currentSettings.logToCommentFilterLogger ?? false,
      );
    } catch (error) {
      window.logger?.error("[CommentFilter2] Failed to load settings:", error);
    }
  }

  /**
   * UIを現在の設定で更新
   */
  protected updateUI(): void {
    if (!this.container) return;

    // メイントグルの更新
    const mainToggle = this.container.querySelector(
      `#${UI_ELEMENTS.MAIN_TOGGLE}`,
    );
    if (mainToggle) {
      if (this.currentSettings.isEnabled) {
        mainToggle.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      } else {
        mainToggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      }
      mainToggle.setAttribute(
        "aria-checked",
        String(this.currentSettings.isEnabled),
      );
    }
    this.updateCockpitState();

    // デバッグトグルの更新
    const debugToggle = this.container.querySelector(
      `#${UI_ELEMENTS.DEBUG_TOGGLE}`,
    );
    if (debugToggle) {
      if (this.currentSettings.debugMode) {
        debugToggle.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      } else {
        debugToggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      }
    }

    // ログ送信トグルの更新
    const logToggle = this.container.querySelector(
      `#${UI_ELEMENTS.LOG_TOGGLE}`,
    );
    if (logToggle) {
      if (this.currentSettings.logToCommentFilterLogger) {
        logToggle.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      } else {
        logToggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      }
    }

    // デバッグセクションの表示/非表示
    const debugSection = this.container.querySelector(
      `#${UI_ELEMENTS.DEBUG_SECTION}`,
    );
    if (debugSection) {
      if (this.currentSettings.debugMode) {
        debugSection.classList.remove(CSS_CLASSES.COLLAPSED);
      } else {
        debugSection.classList.add(CSS_CLASSES.COLLAPSED);
      }
    }

    // デバッグ情報の更新
    this.updateDebugInfo();

    // 旧形式ルールは内部でのみ使用（UI表示なし）

    // コマンド設定をテキストフィールドに表示
    this.updateCommandFields();

    this.updateStatus();
  }

  /**
   * コマンド設定のテキストフィールドを更新
   */
  protected updateCommandFields(): void {
    const forkTypes = ["owner", "main", "easy", "normal"] as const;

    forkTypes.forEach((forkType) => {
      const input = this.container?.querySelector(
        `#${UI_ELEMENTS[`${forkType.toUpperCase()}_COMMANDS` as keyof typeof UI_ELEMENTS]}`,
      ) as HTMLInputElement;
      if (input) {
        // 設定されているコマンドがある場合のみ表示、なければ空のまま
        const commands = this.currentSettings.commandSettings[forkType];
        input.value = commands.length > 0 ? commands.join(",") : "";
      }
    });

    const clearCommandsToggle = this.container?.querySelector(
      `#${UI_ELEMENTS.CLEAR_COMMANDS_TOGGLE}`,
    );
    if (clearCommandsToggle) {
      clearCommandsToggle.classList.toggle(
        CSS_CLASSES.TOGGLE_ACTIVE,
        this.currentSettings.clearExistingCommands,
      );
      clearCommandsToggle.setAttribute(
        "aria-checked",
        String(this.currentSettings.clearExistingCommands),
      );
    }
  }

  /**
   * デバッグ情報を更新
   */
  protected updateDebugInfo(): void {
    if (!this.container) return;

    const debugInfo = this.container.querySelector(
      `#${UI_ELEMENTS.DEBUG_INFO}`,
    );
    if (!debugInfo) return;

    if (this.currentSettings.debugMode) {
      // デバッグモードが有効な場合の情報表示
      const debugContent = `
        <div class="cf2-debug-item">
          <strong>フィルター状態:</strong> ${this.currentSettings.isEnabled ? "有効" : "無効"}
        </div>
        <div class="cf2-debug-item">
          <strong>デバッグモード:</strong> 有効
        </div>
        <div class="cf2-debug-item">
          <strong>ログ送信:</strong> ${this.currentSettings.logToCommentFilterLogger ? "有効" : "無効"}
        </div>
        <div class="cf2-debug-item">
          <strong>コマンド設定:</strong>
          <ul>
            <li>投稿者: ${this.currentSettings.commandSettings.owner.length}個のコマンド</li>
            <li>メイン: ${this.currentSettings.commandSettings.main.length}個のコマンド</li>
            <li>簡単: ${this.currentSettings.commandSettings.easy.length}個のコマンド</li>
          </ul>
        </div>
        <div class="cf2-debug-item">
          <strong>フィルター実行:</strong> コンソールログを確認してください
        </div>
      `;
      debugInfo.innerHTML = debugContent;
    } else {
      debugInfo.innerHTML = "デバッグモードが無効です";
    }
  }

  /**
   * コマンド設定を保存
   */
  protected async saveCommandSettings(): Promise<void> {
    if (!this.container) return;

    try {
      const forkTypes = ["owner", "main", "easy", "normal"] as const;
      const newCommandSettings: CommandSettings = {
        owner: [],
        main: [],
        easy: [],
        normal: [],
      };

      forkTypes.forEach((forkType) => {
        const input = this.container?.querySelector(
          `#${UI_ELEMENTS[`${forkType.toUpperCase()}_COMMANDS` as keyof typeof UI_ELEMENTS]}`,
        ) as HTMLInputElement;
        if (input) {
          newCommandSettings[forkType] = this.parseCommandString(input.value);
        }
      });

      this.currentSettings.commandSettings = newCommandSettings;
      await this.storage.saveSettings(this.currentSettings);
      // Toastr使用：ユーザー通知をToastrに変更
      window.toastr?.success("コマンド設定を保存しました");
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Failed to save command settings:",
        error,
      );
      // Toastr使用：エラー通知をToastrに変更
      window.toastr?.error("コマンド設定の保存に失敗しました");
    }
  }

  /**
   * カンマ区切りの文字列をコマンド配列にパース
   * 注意：コマンドはカンマを含まないため、単純分割で問題なし
   */
  protected parseCommandString(commandString: string): string[] {
    if (!commandString.trim()) {
      return [];
    }

    // カンマで分割して空白を除去、空の要素を除外
    const commands = commandString
      .split(",")
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd.length > 0);

    // サニタイズを適用
    return sanitizeCommentCommands(commands);
  }

  /** コマンド適用前に既存コマンドを全除去するモードを切り替える。 */
  protected toggleClearExistingCommands(): void {
    this.currentSettings.clearExistingCommands =
      !this.currentSettings.clearExistingCommands;
    this.updateCommandFields();
  }

  /**
   * コマンド設定をデフォルトに戻す
   */
  protected async resetCommandSettings(): Promise<void> {
    if (!confirm("コマンド設定をデフォルトに戻しますか？")) {
      return;
    }

    try {
      // 明示的にデフォルト設定をロード
      const defaultCommands = DEFAULT_FORK_COMMANDS[CONSTANTS.FORK_TYPES.MAIN];
      this.currentSettings.commandSettings = {
        owner: [...defaultCommands],
        main: [...defaultCommands],
        easy: [...defaultCommands],
        normal: [...defaultCommands],
      };
      this.currentSettings.clearExistingCommands =
        DEFAULT_CLEAR_EXISTING_COMMANDS;

      // 設定を保存してUIを更新
      await this.storage.saveSettings(this.currentSettings);
      this.updateCommandFields();
      // Toastr使用：リセット成功通知をToastrに変更
      window.toastr?.success("コマンド設定をデフォルトに戻しました");
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Failed to reset command settings:",
        error,
      );
      // Toastr使用：エラー通知をToastrに変更
      window.toastr?.error("コマンド設定のリセットに失敗しました");
    }
  }

  /**
   * ステータス表示を更新
   */
  protected updateStatus(): void {
    if (!this.container) return;

    const statusIndicator = this.container.querySelector(
      `#${UI_ELEMENTS.STATUS_INDICATOR}`,
    );
    const statusText = this.container.querySelector(
      `#${UI_ELEMENTS.STATUS_TEXT}`,
    );

    if (statusIndicator && statusText) {
      if (this.currentSettings.isEnabled) {
        statusIndicator.className = CSS_CLASSES.STATUS_ACTIVE;
        statusText.textContent = "フィルター有効";
      } else {
        statusIndicator.className = CSS_CLASSES.STATUS_ERROR;
        statusText.textContent = "フィルター無効";
      }
    }
  }

  /**
   * メインフィルターのON/OFF切り替え
   */
  protected async toggleMainFilter(): Promise<void> {
    this.currentSettings.isEnabled = !this.currentSettings.isEnabled;
    await this.storage.saveSettings(this.currentSettings);

    // UI の即座更新
    const mainToggle = this.container?.querySelector(
      `#${UI_ELEMENTS.MAIN_TOGGLE}`,
    );
    if (mainToggle) {
      if (this.currentSettings.isEnabled) {
        mainToggle.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      } else {
        mainToggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      }
    }

    this.updateStatus();
    this.updateCockpitState();
    this.updateDebugInfo();
  }

  /** 現在の有効状態をコックピットの要約へ同期する */
  protected updateCockpitState(): void {
    if (!this.container) return;
    const enabled = this.currentSettings.isEnabled;
    const title = this.container.querySelector(`#${UI_ELEMENTS.COCKPIT_TITLE}`);
    const label = this.container.querySelector(
      `#${UI_ELEMENTS.COCKPIT_TOGGLE_LABEL}`,
    );
    const toggle = this.container.querySelector(`#${UI_ELEMENTS.MAIN_TOGGLE}`);
    if (title)
      title.textContent = enabled
        ? "フィルターは正常です"
        : "フィルターは停止中です";
    if (label) label.textContent = enabled ? "ON" : "OFF";
    toggle?.setAttribute("aria-checked", String(enabled));
  }
}
