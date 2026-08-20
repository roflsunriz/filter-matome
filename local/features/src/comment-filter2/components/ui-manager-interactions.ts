// UIマネジメント部 - UIの制御とイベント処理
import { CSS_CLASSES, UI_ELEMENTS } from "@/comment-filter2/templates/main-ui";
import { UIManagerCore } from "./ui-manager-core";

/** インポート・動的フォーム・コックピット操作。 */
export abstract class UIManagerInteractions extends UIManagerCore {
  /**
   * ルール一覧を更新
   */
  protected abstract refreshRulesList(): Promise<void>;
  /**
   * JSONルールをロード
   */
  protected abstract loadJsonRules(): Promise<void>;
  /**
   * 正規表現パターンを分析して結果をUIに表示
   */
  protected abstract analyzeAndDisplayRegexComplexity(): void;
  /** 入力中の正規表現を任意のテスト文字列へ適用して一致箇所を表示する */
  protected abstract updateRegexPreview(): void;

  /**
   * デバッグモードの切り替え
   */
  protected async toggleDebugMode(): Promise<void> {
    this.currentSettings.debugMode = !this.currentSettings.debugMode;
    this.filter.setDebugMode(this.currentSettings.debugMode);
    await this.storage.saveSettings(this.currentSettings);

    // UI の即座更新
    const debugToggle = this.container?.querySelector(
      `#${UI_ELEMENTS.DEBUG_TOGGLE}`,
    );
    if (debugToggle) {
      if (this.currentSettings.debugMode) {
        debugToggle.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      } else {
        debugToggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      }
    }

    const debugSection = this.container?.querySelector(
      `#${UI_ELEMENTS.DEBUG_SECTION}`,
    );
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
  protected async toggleLogSending(): Promise<void> {
    this.currentSettings.logToCommentFilterLogger =
      !this.currentSettings.logToCommentFilterLogger;
    await this.storage.saveSettings(this.currentSettings);

    // UI の即座更新
    const logToggle = this.container?.querySelector(
      `#${UI_ELEMENTS.LOG_TOGGLE}`,
    );
    if (logToggle) {
      if (this.currentSettings.logToCommentFilterLogger) {
        logToggle.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
      } else {
        logToggle.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
      }
    }

    // Toastr通知
    if (this.currentSettings.logToCommentFilterLogger) {
      window.toastr?.success("フィルターログ送信を有効にしました");
    } else {
      window.toastr?.info("フィルターログ送信を無効にしました");
    }
  }

  /**
   * インポートをトリガー
   */
  protected triggerImport(): void {
    if (!this.container) return;

    const fileInput = this.container.querySelector(
      `#${UI_ELEMENTS.FILE_INPUT}`,
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    } else {
      window.logger?.error(
        "[CommentFilter2] File input element not found in shadow DOM",
      );
    }
  }

  /**
   * レガシーインポートをトリガー
   */
  protected triggerLegacyImport(): void {
    if (!this.container) return;

    const legacyFileInput = this.container.querySelector(
      `#${UI_ELEMENTS.LEGACY_FILE_INPUT}`,
    ) as HTMLInputElement;
    if (legacyFileInput) {
      legacyFileInput.click();
    } else {
      window.logger?.error(
        "[CommentFilter2] Legacy file input element not found in shadow DOM",
      );
    }
  }

  /**
   * ファイルインポートを処理
   */
  protected async handleFileImport(event: Event): Promise<void> {
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
      if (this.currentFormat === "json") {
        await this.loadJsonRules();
      }

      // インポート後のルール数を取得
      const rules = await this.storage.getJsonRules();
      window.toastr?.success(
        `データをインポートしました（${String(rules.length)}個のルール）`,
      );
    } catch (error) {
      window.logger?.error("[CommentFilter2] Import failed:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("JSON")) {
        window.toastr?.error(
          "ファイル形式が正しくありません。\nJSON形式のエクスポートファイルを選択してください。",
        );
      } else {
        window.toastr?.error(`インポートに失敗しました：${errorMessage}`);
      }
    }

    // ファイル入力をリセット
    input.value = "";
  }

  /**
   * レガシーファイルインポートを処理
   */
  protected async handleLegacyFileImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    try {
      const text = await this.readFileAsText(file);

      // 確認ダイアログを表示
      const confirmed = confirm(
        "CommentFilter（旧バージョン）の設定ファイルをインポートします。\n" +
          "現在の設定は上書きされますが、よろしいですか？\n\n" +
          "※変換処理により一部の設定が変更される場合があります。",
      );

      if (!confirmed) {
        input.value = "";
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
      if (this.currentFormat === "json") {
        await this.loadJsonRules();
      }

      // Toastr使用：レガシーインポート成功通知をToastrに変更
      window.toastr?.success("レガシー設定を変換してインポートしました");
    } catch (error) {
      window.logger?.error("[CommentFilter2] Legacy import failed:", error);
      // Toastr使用：エラー通知をToastrに変更
      window.toastr?.error("レガシーインポートに失敗しました");
    }

    // ファイル入力をリセット
    input.value = "";
  }

  /**
   * ファイルをテキストとして読み込み
   */
  protected readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => {
        const err = reader.error;
        if (err instanceof Error) {
          reject(err);
        } else if (
          err &&
          typeof (err as { message?: unknown }).message === "string"
        ) {
          reject(new Error((err as { message: string }).message));
        } else {
          reject(new Error("File read error"));
        }
      };
      reader.readAsText(file);
    });
  }

  /**
   * メッセージを表示（レガシー関数 - 現在はToastrに置き換え済み）
   */
  protected showMessage(message: string, type: "success" | "error"): void {
    // レガシー関数：現在はToastrに置き換え済みなので使用非推奨
    window.logger?.debug(`[CommentFilter2] ${type.toUpperCase()}: ${message}`);
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
      this.backgroundOverlay.style.display = "block";

      // メインUIを表示
      this.container.style.display = "block";
      this.isVisible = true;
      window.logger?.debug("[CommentFilter2] UI shown with background blur");
    }
  }

  /**
   * UIを非表示
   */
  public hide(): void {
    if (this.container) {
      this.container.style.display = "none";
    }

    if (this.backgroundOverlay) {
      this.backgroundOverlay.style.display = "none";
    }

    this.isVisible = false;
    window.logger?.debug("[CommentFilter2] UI hidden");
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
  protected removeUI(): void {
    // 背景オーバーレイを削除
    if (this.backgroundOverlay) {
      this.backgroundOverlay.remove();
      this.backgroundOverlay = null;
    }

    // シャドウDOMホストを削除
    const shadowHost = document.getElementById("cf2-shadow-host");
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
      const filteredData = await this.jsonFilter.applyFilters(
        jsonRules,
        currentSmid,
      );
      if (filteredData) {
        this.onFilterApplied();
      }
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Filter application failed:",
        error,
      );
    }
  }

  /** プレイヤー種別に応じて、ローカル同期または公式コメント再取得を行う。 */
  protected async applyFromCockpit(): Promise<void> {
    await this.storage.saveSettings(this.currentSettings);

    if (this.isLocalVideoPlayerAvailable()) {
      await this.applyFilter(window.CommentFilter2Data?.currentSmid ?? null);
      return;
    }

    try {
      if (await this.reloadOfficialComments()) {
        window.toastr?.success("コメントを再取得してフィルターを適用しました");
        return;
      }
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Official comment reload failed:",
        error,
      );
      window.toastr?.error(
        "コメントの再取得に失敗しました。通信状態を確認して、もう一度適用してください。",
      );
      return;
    }

    window.logger?.warn(
      "[CommentFilter2] Official comment reload API is unavailable on the current page",
    );
    window.toastr?.error(
      "コメント再取得機能が現在のページに読み込まれていません。更新後の機能を有効にするため、このページを一度だけ Ctrl+F5 でハード再読み込みしてください。",
    );
  }

  /**
   * ユニークなファイル名を生成（エクスポート用）
   */
  protected generateExportFilename(prefix: string): string {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS
    const randomStr = Math.random().toString(36).substr(2, 4); // ランダム4文字

    return `${prefix}-${dateStr}_${timeStr}_${randomStr}.json`;
  }

  /**
   * 動的要素のイベントハンドラーを設定
   */
  protected setupDynamicEventHandlers(): void {
    if (!this.container) return;

    // ルールタイプ切替
    const ruleTypeRadios = this.container.querySelectorAll(
      'input[name="cf2-rule-type"]',
    );
    ruleTypeRadios.forEach((radio) => {
      radio.addEventListener("change", () => this.handleRuleTypeChange());
    });

    // アクションタイプ切替
    const actionTypeRadios = this.container.querySelectorAll(
      'input[name="cf2-action-type"]',
    );
    actionTypeRadios.forEach((radio) => {
      radio.addEventListener("change", () => this.handleActionTypeChange());
    });
  }

  /**
   * ルールタイプ変更ハンドラー
   */
  protected handleRuleTypeChange(): void {
    if (!this.container) return;

    const selectedType = this.container.querySelector(
      'input[name="cf2-rule-type"]:checked',
    ) as HTMLInputElement;
    if (!selectedType) return;

    const regexInputs = this.container.querySelector("#cf2-regex-inputs");
    const userIdInputs = this.container.querySelector("#cf2-userid-inputs");
    const replaceActionLabel = this.container.querySelector(
      "#cf2-replace-action-label",
    );
    const userIdActionNote = this.container.querySelector(
      "#cf2-userid-action-note",
    );

    if (selectedType.value === "regex") {
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
      const replaceRadio = this.container.querySelector(
        'input[name="cf2-action-type"][value="replace"]',
      ) as HTMLInputElement;
      if (replaceRadio?.checked) {
        const hideRadio = this.container.querySelector(
          'input[name="cf2-action-type"][value="hide"]',
        ) as HTMLInputElement;
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
  protected handleActionTypeChange(): void {
    if (!this.container) return;

    const selectedAction = this.container.querySelector(
      'input[name="cf2-action-type"]:checked',
    ) as HTMLInputElement;
    if (!selectedAction) return;

    const replaceInputGroup = this.container.querySelector(
      "#cf2-replace-input-group",
    );
    const nicoruModeSelect = this.container.querySelector<HTMLSelectElement>(
      `#${UI_ELEMENTS.NICORU_MODE}`,
    );
    const nicoruModeNote = this.container.querySelector(
      "#cf2-nicoru-mode-note",
    );

    if (selectedAction.value === "replace") {
      replaceInputGroup?.classList.remove(CSS_CLASSES.HIDDEN);
    } else {
      replaceInputGroup?.classList.add(CSS_CLASSES.HIDDEN);
    }

    const isExemptionAction = selectedAction.value === "unspecified";
    if (nicoruModeSelect) {
      if (isExemptionAction) {
        nicoruModeSelect.value = "exclude";
      }
      nicoruModeSelect.disabled = isExemptionAction;
    }
    nicoruModeNote?.classList.toggle(CSS_CLASSES.HIDDEN, !isExemptionAction);
  }

  /**
   * 正規表現パターン入力のリアルタイム分析をセットアップ
   */
  protected setupRegexAnalysis(): void {
    if (!this.container) return;

    const patternInput = this.container.querySelector(
      `#${UI_ELEMENTS.PATTERN_INPUT}`,
    ) as HTMLInputElement;
    const flagsInput = this.container.querySelector(
      `#${UI_ELEMENTS.FLAGS_INPUT}`,
    ) as HTMLInputElement;
    const testInput = this.container.querySelector(
      `#${UI_ELEMENTS.REGEX_TEST_INPUT}`,
    ) as HTMLTextAreaElement;

    if (!patternInput || !flagsInput) {
      window.logger?.warn(
        "[CommentFilter2] Pattern or flags input not found for regex analysis",
      );
      return;
    }

    // パターン入力時のイベント（デバウンス付き）
    const handlePatternChange = () => {
      if (this.regexAnalysisDebounceTimer) {
        clearTimeout(this.regexAnalysisDebounceTimer);
      }
      this.regexAnalysisDebounceTimer = setTimeout(() => {
        this.analyzeAndDisplayRegexComplexity();
        this.updateRegexPreview();
      }, 300);
    };

    patternInput.addEventListener("input", handlePatternChange);
    flagsInput.addEventListener("input", handlePatternChange);
    testInput?.addEventListener("input", handlePatternChange);

    window.logger?.debug(
      "[CommentFilter2] Regex analysis event listeners set up",
    );
  }

  /** サイドナビゲーションでワークスペースの表示を切り替える */
  protected setupCockpitNavigation(): void {
    if (!this.container) return;

    this.container
      .querySelectorAll<HTMLButtonElement>("[data-cf2-view]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const view = button.dataset.cf2View;
          if (!view) return;
          this.container
            ?.querySelectorAll<HTMLElement>("[data-cf2-panel]")
            .forEach((panel) => {
              panel.classList.toggle(
                CSS_CLASSES.HIDDEN,
                panel.dataset.cf2Panel !== view,
              );
            });
          this.container
            ?.querySelectorAll(".cf2-sidebar-item")
            .forEach((item) => {
              item.classList.toggle(
                "active",
                item.getAttribute("data-cf2-view") === view,
              );
            });
          this.container?.scrollTo({ top: 0, behavior: "smooth" });
        });
      });

    const smid = window.CommentFilter2Data?.currentSmid;
    const smidElement = this.container.querySelector(
      `#${UI_ELEMENTS.COCKPIT_SMID}`,
    );
    if (smidElement && smid) smidElement.textContent = smid;
  }
}
