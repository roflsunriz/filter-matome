// UIマネジメント部 - UIの制御とイベント処理
import { Settings, CommandSettings, NgRuleJson, NicoruCond } from '@/types/filter-types';
import { FilterStorage } from '../storage/indexed-db';
import { CommentFilter } from '../filter/comment-filter';
import { JsonCommentFilter } from '../filter/json-comment-filter';
import { sanitizeCommentCommands } from '../utils/sanitizer';
import { parseJsonl, stringifyJsonl } from '../utils/jsonl-parser';
import { mainUITemplate, UI_ELEMENTS, CSS_CLASSES } from '../templates/main-ui';
import { CommentFilter2MainStyles } from '../styles/main';
import { FilterLogger } from '../utils/filter-logger';
// CSSスタイルを直接インポート

// グローバル型定義は既に globalTypes.ts で定義済み

export class UIManager {
  private storage: FilterStorage;
  private filter: CommentFilter;
  private jsonFilter: JsonCommentFilter;
  private container: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private backgroundOverlay: HTMLElement | null = null;
  private isVisible: boolean = false;
  private isUICreated: boolean = false;
  private currentFormat: 'form' | 'json' = 'form';
  private currentSettings: Settings = { 
    debugMode: false, 
    isEnabled: true,
    commandSettings: {
      owner: [],
      main: [],
      easy: [],
      normal: []
    }
  };

  constructor() {
    this.storage = new FilterStorage();
    this.filter = new CommentFilter();
    this.jsonFilter = new JsonCommentFilter();
    void this.initialize();
  }

  /**
   * UIマネジメントの初期化
   */
  private async initialize(): Promise<void> {
    try {
      await this.storage.initialize();
      await this.loadSettings();
      // UI作成は最初は行わない（リンクから呼び出された時に作成）
      
      window.logger?.info('[CommentFilter2] UI Manager initialized (UI not created yet)');
    } catch (error) {
      window.logger?.error('[CommentFilter2] UI Manager initialization failed:', error);
    }
  }

  /**
   * UIを作成してシャドウDOMに挿入
   */
  private async createUI(): Promise<void> {
    await Promise.resolve();
    if (this.isUICreated) return;

    // 既存のUIを削除
    this.removeUI();

    // 背景オーバーレイ用のスタイルをページに注入
    this.injectStyles();

    // 背景オーバーレイを作成
    this.backgroundOverlay = document.createElement('div');
    this.backgroundOverlay.id = 'cf2-background-overlay';
    this.backgroundOverlay.className = 'cf2-background-overlay';
    this.backgroundOverlay.style.display = 'none'; // 初期は非表示
    document.body.appendChild(this.backgroundOverlay);

    // オーバーレイクリックで閉じる機能
    this.backgroundOverlay.addEventListener('click', () => {
      this.hide();
    });

    // シャドウDOMホストを作成
    const shadowHost = document.createElement('div');
    shadowHost.id = 'cf2-shadow-host';
    document.body.appendChild(shadowHost);

    // シャドウルートを作成（closed mode でより安全に）
    this.shadowRoot = shadowHost.attachShadow({ mode: 'closed' });

    // スタイルをシャドウDOM内に注入
    this.injectShadowStyles();

    // UIコンテナを作成
    const tempDiv = document.createElement('div');
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
    window.logger?.info('[CommentFilter2] UI created in Shadow DOM and ready');
  }

  /**
   * スタイルシートをページに挿入（背景オーバーレイ用）
   */
  private injectStyles(): void {
    const styleId = 'cf2-styles';
    
    // 既存のスタイルを削除
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // インライン化されたCSSを使用（背景オーバーレイ用）
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = CommentFilter2MainStyles;
    document.head.appendChild(style);
  }

  /**
   * スタイルをシャドウDOMに注入
   */
  private injectShadowStyles(): void {
    if (!this.shadowRoot) return;

    // インライン化されたCSSを使用
    const style = document.createElement('style');
    style.textContent = CommentFilter2MainStyles;

    // シャドウDOMに挿入
    this.shadowRoot.appendChild(style);

    window.logger?.debug('[CommentFilter2] Styles injected into Shadow DOM');
  }

  /**
   * イベントハンドラーをバインド（シャドウDOM対応）
   */
  private bindEvents(): void {
    if (!this.container) {
      window.logger?.error('[CommentFilter2] Container not found for event binding');
      return;
    }

    // エラーハンドリングとログ付きでイベントリスナーを設定
    this.safeAddEventListener(UI_ELEMENTS.CLOSE_BTN, 'click', () => this.hide());
    this.safeAddEventListener(UI_ELEMENTS.MAIN_TOGGLE, 'click', () => this.toggleMainFilter());
    this.safeAddEventListener(UI_ELEMENTS.DEBUG_TOGGLE, 'click', () => this.toggleDebugMode());
    this.safeAddEventListener(UI_ELEMENTS.LOG_TOGGLE, 'click', () => this.toggleLogSending());
    
    // 形式切替
    this.safeAddEventListener(UI_ELEMENTS.FORMAT_FORM, 'click', () => this.switchFormat('form'));
    this.safeAddEventListener(UI_ELEMENTS.FORMAT_JSON, 'click', () => this.switchFormat('json'));
    
    // フォーム機能
    this.safeAddEventListener(UI_ELEMENTS.ADD_RULE, 'click', () => this.addRuleFromForm());
    this.safeAddEventListener(UI_ELEMENTS.CLEAR_FORM, 'click', () => this.clearForm());
    this.safeAddEventListener(UI_ELEMENTS.NICORU_TOGGLE, 'click', () => this.toggleNicoruSettings());
    
    // JSON機能
    this.safeAddEventListener(UI_ELEMENTS.SAVE_JSON_RULES, 'click', () => this.saveJsonRules());
    this.safeAddEventListener(UI_ELEMENTS.VALIDATE_JSON, 'click', () => this.validateJsonRules());
    
    // ルール一覧
    this.safeAddEventListener(UI_ELEMENTS.REFRESH_RULES, 'click', () => this.refreshRulesList());
    this.safeAddEventListener(UI_ELEMENTS.CLEAR_ALL_RULES, 'click', () => this.clearAllRules());
    
    // データ管理
    this.safeAddEventListener(UI_ELEMENTS.EXPORT_JSON_BTN, 'click', () => this.exportJsonData());
    this.safeAddEventListener(UI_ELEMENTS.IMPORT_BTN, 'click', () => this.triggerImport());
    this.safeAddEventListener(UI_ELEMENTS.LEGACY_IMPORT_BTN, 'click', () => this.triggerLegacyImport());
    
    // その他
    this.safeAddEventListener(UI_ELEMENTS.SAVE_COMMANDS_BTN, 'click', () => this.saveCommandSettings());
    this.safeAddEventListener(UI_ELEMENTS.RESET_COMMANDS_BTN, 'click', () => this.resetCommandSettings());
    this.safeAddEventListener(UI_ELEMENTS.RELOAD_BTN, 'click', () => this.reloadPage());

    // ファイル入力の特別処理
    const fileInput = this.container.querySelector(`#${UI_ELEMENTS.FILE_INPUT}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.addEventListener('change', (e) => { void this.handleFileImport(e); });
      window.logger?.debug('[CommentFilter2] File input event listener bound');
    } else {
      window.logger?.error('[CommentFilter2] File input element not found in shadow DOM');
    }

    // レガシーファイル入力の特別処理
    const legacyFileInput = this.container.querySelector(`#${UI_ELEMENTS.LEGACY_FILE_INPUT}`) as HTMLInputElement;
    if (legacyFileInput) {
      legacyFileInput.addEventListener('change', (e) => { void this.handleLegacyFileImport(e); });
      window.logger?.debug('[CommentFilter2] Legacy file input event listener bound');
    } else {
      window.logger?.error('[CommentFilter2] Legacy file input element not found in shadow DOM');
    }

    // 動的要素のイベントハンドラー
    this.setupDynamicEventHandlers();

    // キー伝搬停止処理を設定
    this.setupKeyPropagationPrevention();

    window.logger?.debug('[CommentFilter2] All event listeners bound successfully in shadow DOM');
  }

  /**
   * 安全なイベントリスナー追加（エラーハンドリング付き）
   */
  private safeAddEventListener(elementId: string, eventType: string, handler: () => void | Promise<void>): void {
    if (!this.container) return;

    const element = this.container.querySelector(`#${elementId}`);
    if (element) {
      element.addEventListener(eventType, () => {
        try {
          const maybe = handler();
          if (maybe instanceof Promise) {
            void maybe.catch((error) => {
              window.logger?.error(`[CommentFilter2] Event handler error for ${elementId}:`, error);
            });
          }
        } catch (error) {
          window.logger?.error(`[CommentFilter2] Event handler error for ${elementId}:`, error);
        }
      });
      window.logger?.debug(`[CommentFilter2] Event listener bound for ${elementId}`);
    } else {
      window.logger?.error(`[CommentFilter2] Element not found: ${elementId}`);
    }
  }

  /**
   * キー伝搬停止処理を設定（ビデオプレイヤーのショートカットを防ぐ）
   */
  private setupKeyPropagationPrevention(): void {
    if (!this.container) return;

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
      'l': '動画を10秒進める',
      'L': '動画を10秒進める',
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
          window.logger?.debug(`[CommentFilter2] Input field key event: ${keyEvent.key} in ${input.tagName}`);
          
          // イベント伝搬を停止（これが重要！）
          keyEvent.stopPropagation();
          
          // 特殊キーのみ無効化、文字キーは完全に自由
          if (specialKeys.includes(keyEvent.key)) {
            keyEvent.preventDefault();
            window.logger?.debug(`[CommentFilter2] Special key prevented in input: ${keyEvent.key}`);
          }
          // 文字キー（f, j, k, l, m, c など）は完全にそのまま通す
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
      const isInOurShadowDOM = this.shadowRoot?.contains(target) || this.container?.contains(target);
      if (!isInOurShadowDOM) return;

      // 入力フィールド以外 - ニコニコショートカットを無効化
      if (nicoShortcutKeys[keyEvent.key]) {
        // Ctrl+キーは除外（ブラウザのショートカットを保護）
        if (!keyEvent.ctrlKey) {
          keyEvent.preventDefault();
          keyEvent.stopPropagation();
          window.logger?.debug(`[CommentFilter2] Nico shortcut prevented: ${keyEvent.key} (${nicoShortcutKeys[keyEvent.key]})`);
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
      'textarea'
    ];

    inputSelectors.forEach(selector => {
      const elements = this.container?.querySelectorAll(selector) || [];
      elements.forEach((element) => {
        if (element instanceof HTMLElement) {
          setupInputFieldProtection(element);
          window.logger?.debug(`[CommentFilter2] Protected input field: ${selector}`);
        }
      });
    });

    // 特定の入力フィールドも個別で保護
    const specificInputs = [
      this.container?.querySelector(`#${UI_ELEMENTS.JSON_TEXTAREA}`),
      this.container?.querySelector(`#${UI_ELEMENTS.OWNER_COMMANDS}`),
      this.container?.querySelector(`#${UI_ELEMENTS.MAIN_COMMANDS}`),
      this.container?.querySelector(`#${UI_ELEMENTS.EASY_COMMANDS}`)
    ];

    specificInputs.forEach((input, index) => {
      if (input instanceof HTMLElement) {
        setupInputFieldProtection(input);
        window.logger?.debug(`[CommentFilter2] Protected specific input field ${index}`);
      }
    });

    // Shadow DOM内でのグローバルキーイベントを監視（入力フィールド以外用）
    if (this.shadowRoot) {
      this.shadowRoot.addEventListener('keydown', globalKeyHandler, true);
      this.shadowRoot.addEventListener('keypress', globalKeyHandler, true);
      window.logger?.debug('[CommentFilter2] Global key prevention set up in Shadow DOM');
    }

    // コンテナ内でのキーイベントも監視（フォールバック）
    if (this.container) {
      this.container.addEventListener('keydown', globalKeyHandler, true);
      this.container.addEventListener('keypress', globalKeyHandler, true);
      window.logger?.debug('[CommentFilter2] Global key prevention set up in container');
    }

    window.logger?.debug('[CommentFilter2] Universal key propagation prevention setup completed');
  }

  /**
   * 設定をロード
   */
  private async loadSettings(): Promise<void> {
    try {
      this.currentSettings = await this.storage.getSettings();
      this.filter.setDebugMode(this.currentSettings.debugMode);
      // FilterLoggerの設定も初期化
      FilterLogger.setLogSendingEnabled(this.currentSettings.logToCommentFilterLogger ?? false);
    } catch (error) {
      window.logger?.error('[CommentFilter2] Failed to load settings:', error);
    }
  }

  /**
   * UIを現在の設定で更新
   */
  private updateUI(): void {
    if (!this.container) return;

    // メイントグルの更新
    const mainToggle = this.container.querySelector(`#${UI_ELEMENTS.MAIN_TOGGLE}`);
    if (mainToggle) {
      if (this.currentSettings.isEnabled) {
        mainToggle.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      } else {
        mainToggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      }
    }

    // デバッグトグルの更新
    const debugToggle = this.container.querySelector(`#${UI_ELEMENTS.DEBUG_TOGGLE}`);
    if (debugToggle) {
      if (this.currentSettings.debugMode) {
        debugToggle.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      } else {
        debugToggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      }
    }

    // ログ送信トグルの更新
    const logToggle = this.container.querySelector(`#${UI_ELEMENTS.LOG_TOGGLE}`);
    if (logToggle) {
      if (this.currentSettings.logToCommentFilterLogger) {
        logToggle.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      } else {
        logToggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      }
    }

    // デバッグセクションの表示/非表示
    const debugSection = this.container.querySelector(`#${UI_ELEMENTS.DEBUG_SECTION}`);
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
  private updateCommandFields(): void {
    const forkTypes = ['owner', 'main', 'easy', 'normal'] as const;
    
    forkTypes.forEach(forkType => {
      const input = this.container?.querySelector(`#${UI_ELEMENTS[`${forkType.toUpperCase()}_COMMANDS` as keyof typeof UI_ELEMENTS]}`) as HTMLInputElement;
      if (input) {
        // 設定されているコマンドがある場合のみ表示、なければ空のまま
        const commands = this.currentSettings.commandSettings[forkType];
        input.value = commands.length > 0 ? commands.join(',') : '';
      }
    });
  }

  /**
   * デバッグ情報を更新
   */
  private updateDebugInfo(): void {
    if (!this.container) return;

    const debugInfo = this.container.querySelector(`#${UI_ELEMENTS.DEBUG_INFO}`);
    if (!debugInfo) return;

    if (this.currentSettings.debugMode) {
      // デバッグモードが有効な場合の情報表示
      const debugContent = `
        <div class="cf2-debug-item">
          <strong>フィルター状態:</strong> ${this.currentSettings.isEnabled ? '有効' : '無効'}
        </div>
        <div class="cf2-debug-item">
          <strong>デバッグモード:</strong> 有効
        </div>
        <div class="cf2-debug-item">
          <strong>ログ送信:</strong> ${this.currentSettings.logToCommentFilterLogger ? '有効' : '無効'}
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
      debugInfo.innerHTML = 'デバッグモードが無効です';
    }
  }

  /**
   * コマンド設定を保存
   */
  private async saveCommandSettings(): Promise<void> {
    if (!this.container) return;

    try {
      const forkTypes = ['owner', 'main', 'easy', 'normal'] as const;
      const newCommandSettings: CommandSettings = {
        owner: [],
        main: [],
        easy: [],
        normal: []
      };

      forkTypes.forEach(forkType => {
        const input = this.container?.querySelector(`#${UI_ELEMENTS[`${forkType.toUpperCase()}_COMMANDS` as keyof typeof UI_ELEMENTS]}`) as HTMLInputElement;
        if (input) {
          newCommandSettings[forkType] = this.parseCommandString(input.value);
        }
      });

      this.currentSettings.commandSettings = newCommandSettings;
      await this.storage.saveSettings(this.currentSettings);
      // Toastr使用：ユーザー通知をToastrに変更
      window.toastr?.success('コマンド設定を保存しました');

    } catch (error) {
      window.logger?.error('[CommentFilter2] Failed to save command settings:', error);
      // Toastr使用：エラー通知をToastrに変更
      window.toastr?.error('コマンド設定の保存に失敗しました');
    }
  }

  /**
   * カンマ区切りの文字列をコマンド配列にパース
   * 注意：コマンドはカンマを含まないため、単純分割で問題なし
   */
  private parseCommandString(commandString: string): string[] {
    if (!commandString.trim()) {
      return [];
    }

    // カンマで分割して空白を除去、空の要素を除外
    const commands = commandString
      .split(',')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);

    // サニタイズを適用
    return sanitizeCommentCommands(commands);
  }

  /**
   * コマンド設定をデフォルトに戻す
   */
  private async resetCommandSettings(): Promise<void> {
    if (!confirm('コマンド設定をデフォルトに戻しますか？')) {
      return;
    }

    try {
      // 明示的にデフォルト設定をロード
      this.currentSettings.commandSettings = {
        owner: ['big', 'medium', 'small', 'defont', 'gothic', 'mincho', 'ue', 'naka', 'shita', 'white', 'red', 'pink', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'black', 'white2', 'red2', 'pink2', 'orange2', 'yellow2', 'green2', 'cyan2', 'blue2', 'purple2', 'black2', '_live', 'invisible', 'full', 'ender', 'patissier', 'ca'],
        main: ['big', 'medium', 'small', 'defont', 'gothic', 'mincho', 'ue', 'naka', 'shita', 'white', 'red', 'pink', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'black', 'white2', 'red2', 'pink2', 'orange2', 'yellow2', 'green2', 'cyan2', 'blue2', 'purple2', 'black2', '_live', 'invisible', 'full', 'ender', 'patissier', 'ca'],
        easy: ['big', 'medium', 'small', 'defont', 'gothic', 'mincho', 'ue', 'naka', 'shita', 'white', 'red', 'pink', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'black', 'white2', 'red2', 'pink2', 'orange2', 'yellow2', 'green2', 'cyan2', 'blue2', 'purple2', 'black2', '_live', 'invisible', 'full', 'ender', 'patissier', 'ca'],
        normal: ['big', 'medium', 'small', 'defont', 'gothic', 'mincho', 'ue', 'naka', 'shita', 'white', 'red', 'pink', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'black', 'white2', 'red2', 'pink2', 'orange2', 'yellow2', 'green2', 'cyan2', 'blue2', 'purple2', 'black2', '_live', 'invisible', 'full', 'ender', 'patissier', 'ca']
      };
      
      // 設定を保存してUIを更新
      await this.storage.saveSettings(this.currentSettings);
      this.updateCommandFields();
      // Toastr使用：リセット成功通知をToastrに変更
      window.toastr?.success('コマンド設定をデフォルトに戻しました');

    } catch (error) {
      window.logger?.error('[CommentFilter2] Failed to reset command settings:', error);
      // Toastr使用：エラー通知をToastrに変更
      window.toastr?.error('コマンド設定のリセットに失敗しました');
    }
  }

  /**
   * ステータス表示を更新
   */
  private updateStatus(): void {
    if (!this.container) return;

    const statusIndicator = this.container.querySelector(`#${UI_ELEMENTS.STATUS_INDICATOR}`);
    const statusText = this.container.querySelector(`#${UI_ELEMENTS.STATUS_TEXT}`);

    if (statusIndicator && statusText) {
      if (this.currentSettings.isEnabled) {
        statusIndicator.className = CSS_CLASSES.STATUS_ACTIVE;
        statusText.textContent = 'フィルター有効';
      } else {
        statusIndicator.className = CSS_CLASSES.STATUS_ERROR;
        statusText.textContent = 'フィルター無効';
      }
    }
  }

  /**
   * メインフィルターのON/OFF切り替え
   */
  private async toggleMainFilter(): Promise<void> {
    this.currentSettings.isEnabled = !this.currentSettings.isEnabled;
    await this.storage.saveSettings(this.currentSettings);
    
    // UI の即座更新
    const mainToggle = this.container?.querySelector(`#${UI_ELEMENTS.MAIN_TOGGLE}`);
    if (mainToggle) {
      if (this.currentSettings.isEnabled) {
        mainToggle.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      } else {
        mainToggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      }
    }
    
    this.updateStatus();
    this.updateDebugInfo();
  }

  /**
   * デバッグモードの切り替え
   */
  private async toggleDebugMode(): Promise<void> {
    this.currentSettings.debugMode = !this.currentSettings.debugMode;
    this.filter.setDebugMode(this.currentSettings.debugMode);
    await this.storage.saveSettings(this.currentSettings);
    
    // UI の即座更新
    const debugToggle = this.container?.querySelector(`#${UI_ELEMENTS.DEBUG_TOGGLE}`);
    if (debugToggle) {
      if (this.currentSettings.debugMode) {
        debugToggle.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      } else {
        debugToggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      }
    }
    
    const debugSection = this.container?.querySelector(`#${UI_ELEMENTS.DEBUG_SECTION}`);
    if (debugSection) {
      if (this.currentSettings.debugMode) {
        debugSection.classList.remove(CSS_CLASSES.COLLAPSED);
      } else {
        debugSection.classList.add(CSS_CLASSES.COLLAPSED);
      }
    }
    
    this.updateDebugInfo();
  }

  /**
   * ログ送信の切り替え
   */
  private async toggleLogSending(): Promise<void> {
    this.currentSettings.logToCommentFilterLogger = !this.currentSettings.logToCommentFilterLogger;
    await this.storage.saveSettings(this.currentSettings);
    
    // UI の即座更新
    const logToggle = this.container?.querySelector(`#${UI_ELEMENTS.LOG_TOGGLE}`);
    if (logToggle) {
      if (this.currentSettings.logToCommentFilterLogger) {
        logToggle.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      } else {
        logToggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      }
    }

    // Toastr通知
    if (this.currentSettings.logToCommentFilterLogger) {
      window.toastr?.success('フィルターログ送信を有効にしました');
    } else {
      window.toastr?.info('フィルターログ送信を無効にしました');
    }
  }

  /**
   * インポートをトリガー
   */
  private triggerImport(): void {
    if (!this.container) return;
    
    const fileInput = this.container.querySelector(`#${UI_ELEMENTS.FILE_INPUT}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    } else {
      window.logger?.error('[CommentFilter2] File input element not found in shadow DOM');
    }
  }

  /**
   * レガシーインポートをトリガー
   */
  private triggerLegacyImport(): void {
    if (!this.container) return;
    
    const legacyFileInput = this.container.querySelector(`#${UI_ELEMENTS.LEGACY_FILE_INPUT}`) as HTMLInputElement;
    if (legacyFileInput) {
      legacyFileInput.click();
    } else {
      window.logger?.error('[CommentFilter2] Legacy file input element not found in shadow DOM');
    }
  }

  /**
   * ファイルインポートを処理
   */
  private async handleFileImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    try {
      const text = await this.readFileAsText(file);
      await this.storage.importData(text);
      
      // 設定を再読み込み（コメントコマンド設定を含む）
      await this.loadSettings();
      
      // UI全体を更新
      this.updateUI();
      
      // コマンド設定フィールドを更新
      this.updateCommandFields();
      
      // ルール一覧を更新
      void this.refreshRulesList();
      
      // JSON形式の場合、JSONテキストエリアも更新
      if (this.currentFormat === 'json') {
        await this.loadJsonRules();
      }
      
      // インポート後のルール数を取得
      const rules = await this.storage.getJsonRules();
      window.toastr?.success(`データをインポートしました（${String(rules.length)}個のルール）`);
      
    } catch (error) {
      window.logger?.error('[CommentFilter2] Import failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('JSON')) {
        window.toastr?.error('ファイル形式が正しくありません。\nJSON形式のエクスポートファイルを選択してください。');
      } else {
        window.toastr?.error(`インポートに失敗しました：${errorMessage}`);
      }
    }

    // ファイル入力をリセット
    input.value = '';
  }

  /**
   * レガシーファイルインポートを処理
   */
  private async handleLegacyFileImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    try {
      const text = await this.readFileAsText(file);
      
      // 確認ダイアログを表示
      const confirmed = confirm(
        'CommentFilter（旧バージョン）の設定ファイルをインポートします。\n' +
        '現在の設定は上書きされますが、よろしいですか？\n\n' +
        '※変換処理により一部の設定が変更される場合があります。'
      );
      
      if (!confirmed) {
        input.value = '';
        return;
      }

      // レガシーデータとしてインポート（FilterStorageが自動判定して変換）
      await this.storage.importData(text);
      
      // 設定を再読み込み（コメントコマンド設定を含む）
      await this.loadSettings();
      
      // UI全体を更新
      this.updateUI();
      
      // コマンド設定フィールドを更新
      this.updateCommandFields();
      
      // ルール一覧を更新
      void this.refreshRulesList();
      
      // JSON形式の場合、JSONテキストエリアも更新
      if (this.currentFormat === 'json') {
        await this.loadJsonRules();
      }
      
      // Toastr使用：レガシーインポート成功通知をToastrに変更
      window.toastr?.success('レガシー設定を変換してインポートしました');
      
    } catch (error) {
      window.logger?.error('[CommentFilter2] Legacy import failed:', error);
      // Toastr使用：エラー通知をToastrに変更
      window.toastr?.error('レガシーインポートに失敗しました');
    }

    // ファイル入力をリセット
    input.value = '';
  }

  /**
   * ファイルをテキストとして読み込み
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => {
        const err = reader.error;
        if (err instanceof Error) {
          reject(err);
        } else if (err && typeof (err as { message?: unknown }).message === 'string') {
          reject(new Error((err as { message: string }).message));
        } else {
          reject(new Error('File read error'));
        }
      };
      reader.readAsText(file);
    });
  }



  /**
   * メッセージを表示（レガシー関数 - 現在はToastrに置き換え済み）
   */
  private showMessage(message: string, type: 'success' | 'error'): void {
    // レガシー関数：現在はToastrに置き換え済みなので使用非推奨
    window.logger?.debug(`[CommentFilter2] ${type.toUpperCase()}: ${message}`);
  }

  /**
   * ページを再読み込みして設定を適用
   */
  private async reloadPage(): Promise<void> {
    try {
      // 確認ダイアログを表示
      if (!confirm('ページを再読み込みして設定を適用しますか？\n\n※未保存の入力内容は失われます')) {
        return;
      }

      // デバッグログ
      window.logger?.info('[CommentFilter2] Reloading page to apply settings...');
      
      // 設定を保存してから再読み込み（念のため）
      await this.storage.saveSettings(this.currentSettings);
      
      // 短い遅延の後にリロード（UIの更新を確実にするため）
      setTimeout(() => {
        try {
          window.location.reload();
        } catch (e) {
          throw new Error(String(e));
        }
      }, 100);
      
    } catch (error) {
      window.logger?.error('[CommentFilter2] Failed to reload page:', error);
      // Toastr使用：リロードエラー通知をToastrに変更
      window.toastr?.error('再読み込みに失敗しました');
    }
  }

  /**
   * UIを表示
   */
  public async show(): Promise<void> {
    // UIがまだ作成されていない場合は作成
    if (!this.isUICreated) {
      await this.createUI();
    }
    
    if (this.container && this.backgroundOverlay) {
      // 背景オーバーレイを表示
      this.backgroundOverlay.style.display = 'block';
      
      // メインUIを表示
      this.container.style.display = 'block';
      this.isVisible = true;
      window.logger?.debug('[CommentFilter2] UI shown with background blur');
    }
  }

  /**
   * UIを非表示
   */
  public hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
    
    if (this.backgroundOverlay) {
      this.backgroundOverlay.style.display = 'none';
    }
    
    this.isVisible = false;
    window.logger?.debug('[CommentFilter2] UI hidden');
  }

  /**
   * UIの表示状態を切り替え
   */
  public async toggle(): Promise<void> {
    if (this.isVisible) {
      this.hide();
    } else {
      await this.show();
    }
  }

  /**
   * UIを削除
   */
  private removeUI(): void {
    // 背景オーバーレイを削除
    if (this.backgroundOverlay) {
      this.backgroundOverlay.remove();
      this.backgroundOverlay = null;
    }

    // シャドウDOMホストを削除
    const shadowHost = document.getElementById('cf2-shadow-host');
    if (shadowHost) {
      shadowHost.remove();
    }

    // 参照をクリア
    this.container = null;
    this.shadowRoot = null;
    this.isUICreated = false;
    this.isVisible = false;
  }

  /**
   * フィルターを適用（JSON形式のみ）
   */
  public async applyFilter(currentSmid: string | null): Promise<void> {
    if (!this.currentSettings.isEnabled) {
      return;
    }

    try {
      // JSON形式フィルターに設定を渡す
      this.jsonFilter.updateSettings(this.currentSettings);
      
      const jsonRules = await this.storage.getJsonRules();
      await this.jsonFilter.applyFilters(jsonRules, currentSmid);
    } catch (error) {
      window.logger?.error('[CommentFilter2] Filter application failed:', error);
    }
  }

  /**
   * ユニークなファイル名を生成（エクスポート用）
   */
  private generateExportFilename(prefix: string): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const randomStr = Math.random().toString(36).substr(2, 4); // ランダム4文字
    
    return `${prefix}-${dateStr}_${timeStr}_${randomStr}.json`;
  }

  /**
   * 動的要素のイベントハンドラーを設定
   */
  private setupDynamicEventHandlers(): void {
    if (!this.container) return;

    // ルールタイプ切替
    const ruleTypeRadios = this.container.querySelectorAll('input[name="cf2-rule-type"]');
    ruleTypeRadios.forEach(radio => {
      radio.addEventListener('change', () => this.handleRuleTypeChange());
    });

    // アクションタイプ切替
    const actionTypeRadios = this.container.querySelectorAll('input[name="cf2-action-type"]');
    actionTypeRadios.forEach(radio => {
      radio.addEventListener('change', () => this.handleActionTypeChange());
    });
  }

  /**
   * ルールタイプ変更ハンドラー
   */
  private handleRuleTypeChange(): void {
    if (!this.container) return;

    const selectedType = this.container.querySelector('input[name="cf2-rule-type"]:checked') as HTMLInputElement;
    if (!selectedType) return;

    const regexInputs = this.container.querySelector('#cf2-regex-inputs');
    const userIdInputs = this.container.querySelector('#cf2-userid-inputs');
    const replaceActionLabel = this.container.querySelector('#cf2-replace-action-label');
    const userIdActionNote = this.container.querySelector('#cf2-userid-action-note');

    if (selectedType.value === 'regex') {
      regexInputs?.classList.remove(CSS_CLASSES.HIDDEN);
      userIdInputs?.classList.add(CSS_CLASSES.HIDDEN);
      
      // 正規表現ルールでは置換アクションを表示
      replaceActionLabel?.classList.remove(CSS_CLASSES.HIDDEN);
      userIdActionNote?.classList.add(CSS_CLASSES.HIDDEN);
    } else {
      regexInputs?.classList.add(CSS_CLASSES.HIDDEN);
      userIdInputs?.classList.remove(CSS_CLASSES.HIDDEN);
      
      // ユーザーIDルールでは置換アクションを隠す
      replaceActionLabel?.classList.add(CSS_CLASSES.HIDDEN);
      userIdActionNote?.classList.remove(CSS_CLASSES.HIDDEN);
      
      // 置換が選択されていた場合は非表示に変更
      const replaceRadio = this.container.querySelector('input[name="cf2-action-type"][value="replace"]') as HTMLInputElement;
      if (replaceRadio?.checked) {
        const hideRadio = this.container.querySelector('input[name="cf2-action-type"][value="hide"]') as HTMLInputElement;
        if (hideRadio) {
          hideRadio.checked = true;
          this.handleActionTypeChange(); // 置換入力フィールドを隠す
        }
      }
    }
  }

  /**
   * アクションタイプ変更ハンドラー
   */
  private handleActionTypeChange(): void {
    if (!this.container) return;

    const selectedAction = this.container.querySelector('input[name="cf2-action-type"]:checked') as HTMLInputElement;
    if (!selectedAction) return;

    const replaceInputGroup = this.container.querySelector('#cf2-replace-input-group');

    if (selectedAction.value === 'replace') {
      replaceInputGroup?.classList.remove(CSS_CLASSES.HIDDEN);
    } else {
      replaceInputGroup?.classList.add(CSS_CLASSES.HIDDEN);
    }
  }

  /**
   * 形式切替
   */
  private switchFormat(format: 'form' | 'json'): void {
    this.currentFormat = format;
    this.updateFormatDisplay();
  }

  /**
   * 形式表示を更新
   */
  private updateFormatDisplay(): void {
    if (!this.container) return;

    // タブの状態更新
    const tabs = this.container.querySelectorAll('.cf2-format-tab');
    tabs.forEach(tab => {
      tab.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
    });

    // セクションの表示/非表示
    const formSection = this.container.querySelector(`#${UI_ELEMENTS.FORM_SECTION}`);
    const jsonSection = this.container.querySelector(`#${UI_ELEMENTS.JSON_SECTION}`);

    formSection?.classList.add(CSS_CLASSES.HIDDEN);
    jsonSection?.classList.add(CSS_CLASSES.HIDDEN);

    switch (this.currentFormat) {
      case 'form':
        this.container.querySelector(`#${UI_ELEMENTS.FORMAT_FORM}`)?.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
        formSection?.classList.remove(CSS_CLASSES.HIDDEN);
        break;
      case 'json':
        this.container.querySelector(`#${UI_ELEMENTS.FORMAT_JSON}`)?.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
        jsonSection?.classList.remove(CSS_CLASSES.HIDDEN);
        void this.loadJsonRules();
        break;
    }
  }

  /**
   * フォームからルールを追加
   */
  private async addRuleFromForm(): Promise<void> {
    if (!this.container) return;

    try {
      const rule = this.collectRuleFromForm();
      if (!rule) {
        window.toastr?.error('ルールの入力内容に不備があります');
        return;
      }

      // 既存のルールを取得
      const existingRules = await this.storage.getJsonRules();
      existingRules.push(rule);

      // 保存
      await this.storage.saveJsonRules(existingRules);
      
      // フォームをクリア
      this.clearForm();
      
      // ルール一覧を更新
      await this.refreshRulesList();
      
      window.toastr?.success('ルールを追加しました');
    } catch (error) {
      window.logger?.error('[CommentFilter2] Failed to add rule from form:', error);
      window.toastr?.error('ルールの追加に失敗しました');
    }
  }

  /**
   * フォームからルール情報を収集
   */
  private collectRuleFromForm(): NgRuleJson | null {
    if (!this.container) return null;

    const ruleType = (this.container.querySelector('input[name="cf2-rule-type"]:checked') as HTMLInputElement)?.value;
    const actionType = (this.container.querySelector('input[name="cf2-action-type"]:checked') as HTMLInputElement)?.value;

    if (!ruleType || !actionType) return null;

    const rule: Partial<NgRuleJson> = {
      enabled: true
    };

    // ルールタイプに応じた処理
    if (ruleType === 'regex') {
      const pattern = (this.container.querySelector(`#${UI_ELEMENTS.PATTERN_INPUT}`) as HTMLInputElement)?.value?.trim();
      const flags = (this.container.querySelector(`#${UI_ELEMENTS.FLAGS_INPUT}`) as HTMLInputElement)?.value?.trim() || 'gi';
      
      if (!pattern) return null;
      
      rule.pattern = pattern;
      rule.flags = flags;
    } else {
      const userId = (this.container.querySelector(`#${UI_ELEMENTS.USERID_INPUT}`) as HTMLInputElement)?.value?.trim();
      
      if (!userId) return null;
      
      rule.userId = userId;
    }

    // アクション設定
    if (actionType === 'hide') {
      rule.action = { type: 'hide' };
    } else if (actionType === 'replace') {
      const replacement = (this.container.querySelector(`#${UI_ELEMENTS.REPLACE_INPUT}`) as HTMLInputElement)?.value?.trim();
      rule.action = { type: 'replace', replacement: replacement || '' };
    } else {
      // unspecified: 本文変更なし・除外のみ
      rule.action = { type: 'unspecified' };
    }

    // SMID設定
    const smidInput = (this.container.querySelector(`#${UI_ELEMENTS.SMID_INPUT}`) as HTMLInputElement)?.value?.trim() || 'ALL';
    rule.smid = smidInput === 'ALL' ? ['ALL'] : [smidInput];

    // ニコる数条件
    const nicoruToggle = this.container.querySelector(`#${UI_ELEMENTS.NICORU_TOGGLE}`);
    if (nicoruToggle?.classList.contains(CSS_CLASSES.TOGGLE_ACTIVE)) {
      const op = (this.container.querySelector(`#${UI_ELEMENTS.NICORU_OP}`) as HTMLSelectElement)?.value;
      const value = parseInt((this.container.querySelector(`#${UI_ELEMENTS.NICORU_VALUE}`) as HTMLInputElement)?.value || '0', 10);
      const mode = (this.container.querySelector(`#${UI_ELEMENTS.NICORU_MODE}`) as HTMLSelectElement)?.value as 'include' | 'exclude';

      if (op) {
        rule.nicoru_cond = {
          op: op as NicoruCond['op'],
          value,
          mode
        };
      }
    }

    return rule as NgRuleJson;
  }

  /**
   * フォームをクリア
   */
  private clearForm(): void {
    if (!this.container) return;

    // テキスト入力をクリア
    (this.container.querySelector(`#${UI_ELEMENTS.PATTERN_INPUT}`) as HTMLInputElement).value = '';
    (this.container.querySelector(`#${UI_ELEMENTS.FLAGS_INPUT}`) as HTMLInputElement).value = 'gi';
    (this.container.querySelector(`#${UI_ELEMENTS.USERID_INPUT}`) as HTMLInputElement).value = '';
    (this.container.querySelector(`#${UI_ELEMENTS.REPLACE_INPUT}`) as HTMLInputElement).value = '';
    (this.container.querySelector(`#${UI_ELEMENTS.SMID_INPUT}`) as HTMLInputElement).value = 'ALL';
    (this.container.querySelector(`#${UI_ELEMENTS.NICORU_VALUE}`) as HTMLInputElement).value = '10';

    // ラジオボタンをリセット
    (this.container.querySelector('input[name="cf2-rule-type"][value="regex"]') as HTMLInputElement).checked = true;
    (this.container.querySelector('input[name="cf2-action-type"][value="hide"]') as HTMLInputElement).checked = true;

    // ニコる数トグルをオフ
    const nicoruToggle = this.container.querySelector(`#${UI_ELEMENTS.NICORU_TOGGLE}`);
    nicoruToggle?.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
    this.container.querySelector('#cf2-nicoru-details')?.classList.add(CSS_CLASSES.HIDDEN);

    // 表示状態を更新
    this.handleRuleTypeChange();
    this.handleActionTypeChange();
  }

  /**
   * ニコる数設定の表示切替
   */
  private toggleNicoruSettings(): void {
    if (!this.container) return;

    const toggle = this.container.querySelector(`#${UI_ELEMENTS.NICORU_TOGGLE}`);
    const details = this.container.querySelector('#cf2-nicoru-details');

    if (toggle?.classList.contains(CSS_CLASSES.TOGGLE_ACTIVE)) {
      toggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      details?.classList.add(CSS_CLASSES.HIDDEN);
    } else {
      toggle?.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      details?.classList.remove(CSS_CLASSES.HIDDEN);
    }
  }

  /**
   * JSONルールを保存
   */
  private async saveJsonRules(): Promise<void> {
    if (!this.container) return;

    try {
      const textarea = this.container.querySelector(`#${UI_ELEMENTS.JSON_TEXTAREA}`);
      const jsonText = textarea instanceof HTMLTextAreaElement ? textarea.value.trim() : '';

      if (!jsonText) {
        await this.storage.saveJsonRules([]);
        window.toastr?.success('ルールをクリアしました');
        await this.refreshRulesList();
        return;
      }

      const rules = parseJsonl(jsonText);
      await this.storage.saveJsonRules(rules);
      
      window.toastr?.success(`${String(rules.length)}個のJSONルールを保存しました`);
      await this.refreshRulesList();
    } catch (error) {
      window.logger?.error('[CommentFilter2] Failed to save JSON rules:', error);
      window.toastr?.error('JSONルールの保存に失敗しました');
    }
  }

  /**
   * JSONルールを検証
   */
  private validateJsonRules(): void {
    if (!this.container) return;

    try {
      const textarea2 = this.container.querySelector(`#${UI_ELEMENTS.JSON_TEXTAREA}`);
      const jsonText = textarea2 instanceof HTMLTextAreaElement ? textarea2.value.trim() : '';

      if (!jsonText) {
        window.toastr?.info('検証するJSONがありません');
        return;
      }

      const rules = parseJsonl(jsonText);
      window.toastr?.success(`✅ JSON形式が正しく、${rules.length}個のルールが有効です`);
    } catch (error) {
      window.toastr?.error(`❌ JSON形式エラー: ${String(error)}`);
    }
  }

  /**
   * JSONルールをロード
   */
  private async loadJsonRules(): Promise<void> {
    if (!this.container) return;

    try {
      const rules = await this.storage.getJsonRules();
      const jsonText = stringifyJsonl(rules);
      
      const textarea = this.container.querySelector(`#${UI_ELEMENTS.JSON_TEXTAREA}`) as HTMLTextAreaElement;
      textarea.value = jsonText;
    } catch (error) {
      window.logger?.error('[CommentFilter2] Failed to load JSON rules:', error);
    }
  }

  /**
   * ルール一覧を更新
   */
  private async refreshRulesList(): Promise<void> {
    if (!this.container) return;

    try {
      const rules = await this.storage.getJsonRules();
      const rulesList = this.container.querySelector(`#${UI_ELEMENTS.RULES_LIST}`);
      const countText = this.container.querySelector(`#${UI_ELEMENTS.RULE_COUNT_TEXT}`);

      if (countText) {
        countText.textContent = `${String(rules.length)}件`;
      }

      if (!rulesList) return;

      if (rules.length === 0) {
        rulesList.innerHTML = '<div class="cf2-help-text">ルールがありません</div>';
        return;
      }

      const rulesHtml = rules.map((rule, index) => this.generateRuleItemHtml(rule, index)).join('');
      rulesList.innerHTML = rulesHtml;

      // 削除ボタンのイベントリスナーを設定
      rulesList.querySelectorAll('.cf2-rule-delete').forEach((btn, index) => {
        btn.addEventListener('click', () => { void this.deleteRule(index); });
      });
    } catch (error) {
      window.logger?.error('[CommentFilter2] Failed to refresh rules list:', error);
    }
  }

  /**
   * HTMLエスケープ関数
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * ルールアイテムのHTMLを生成
   */
  private generateRuleItemHtml(rule: NgRuleJson, index: number): string {
    const ruleType = rule.pattern ? 'regex' : 'userId';
    const content = rule.pattern || rule.userId || '';
    let actionText: string;
    if (rule.action.type === 'hide') {
      actionText = '非表示';
    } else if (rule.action.type === 'replace') {
      const repl = (rule.action as { type: 'replace'; replacement: string }).replacement;
      actionText = `置換: ${this.escapeHtml(repl)}`;
    } else {
      actionText = '除外のみ';
    }
    const smidText = rule.smid.join(', ');
    const nicoruText = rule.nicoru_cond 
      ? `${rule.nicoru_cond.op} ${String(rule.nicoru_cond.value)} (${rule.nicoru_cond.mode})`
      : '条件なし';

    return `
      <div class="cf2-rule-item">
        <div class="cf2-rule-header">
          <span class="cf2-rule-type">${ruleType === 'regex' ? '正規表現' : 'ユーザーID'}</span>
          <div class="cf2-rule-actions">
            <button class="cf2-button cf2-button-small cf2-button-danger cf2-rule-delete" data-index="${index}">
              削除
            </button>
          </div>
        </div>
        <div class="cf2-rule-content">${this.escapeHtml(content)}</div>
        <div class="cf2-rule-details">
          アクション: ${actionText} | SMID: ${smidText} | ニコる: ${nicoruText}
        </div>
      </div>
    `;
  }

  /**
   * ルールを削除
   */
  private async deleteRule(index: number): Promise<void> {
    try {
      const rules = await this.storage.getJsonRules();
      rules.splice(index, 1);
      await this.storage.saveJsonRules(rules);
      
      await this.refreshRulesList();
      window.toastr?.success('ルールを削除しました');
    } catch (error) {
      window.logger?.error('[CommentFilter2] Failed to delete rule:', error);
      window.toastr?.error('ルールの削除に失敗しました');
    }
  }

  /**
   * 全ルールを削除
   */
  private async clearAllRules(): Promise<void> {
    if (!confirm('すべてのルールを削除しますか？')) {
      return;
    }

    try {
      await this.storage.saveJsonRules([]);
      await this.refreshRulesList();
      window.toastr?.success('すべてのルールを削除しました');
    } catch (error) {
      window.logger?.error('[CommentFilter2] Failed to clear all rules:', error);
      window.toastr?.error('ルールの削除に失敗しました');
    }
  }

  /**
   * データをエクスポート
   */
  private async exportJsonData(): Promise<void> {
    try {
      const jsonData = await this.storage.exportJsonData();
      
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = this.generateExportFilename('comment-filter2-rules');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      window.toastr?.success('データをエクスポートしました');
      
    } catch (error) {
      window.logger?.error('[CommentFilter2] Export failed:', error);
      window.toastr?.error('エクスポートに失敗しました');
    }
  }

  /**
   * リソースを解放
   */
  public destroy(): void {
    this.removeUI();
    this.storage.close();
  }
}