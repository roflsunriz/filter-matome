// UIマネジメント部 - UIの制御とイベント処理
import { CSS_CLASSES, UI_ELEMENTS } from "@/comment-filter2/templates/main-ui";
import {
  type ContextMenuRuleAddStatus,
  createContextMenuNgUserRule,
  createContextMenuNgWordRule,
  upsertContextMenuRule,
} from "@/comment-filter2/integrations/context-menu-rules";
import {
  parseJsonl,
  stringifyJsonl,
} from "@/comment-filter2/utils/jsonl-parser";
import {
  analyzeRegexPattern,
  getComplexityCssClass,
  getComplexityLabel,
  getSeverityCssClass,
} from "@/comment-filter2/utils/regex-analyzer";
import { getIconSVG, ICONS } from "@/common/material-icons";
import { NgRuleJson, NicoruCond } from "@/types/filter-types";
import type { RegexAnalysisResult } from "@/types/regex-analyzer-types";
import { UIManagerInteractions } from "./ui-manager-interactions";

/** 正規表現分析・JSONルール編集を含む公開UI。 */
export class UIManager extends UIManagerInteractions {
  private contextMenuRuleWriteQueue: Promise<void> = Promise.resolve();

  public addContextMenuNgWord(
    commentBody: string,
  ): Promise<ContextMenuRuleAddStatus> {
    const rule = createContextMenuNgWordRule(commentBody);
    if (!rule) {
      return Promise.reject(new Error("コメント本文が空です"));
    }
    return this.enqueueContextMenuRule(rule);
  }

  public addContextMenuNgUser(
    commentUserId: string,
  ): Promise<ContextMenuRuleAddStatus> {
    const rule = createContextMenuNgUserRule(commentUserId);
    if (!rule) {
      return Promise.reject(new Error("コメントのユーザーIDが空です"));
    }
    return this.enqueueContextMenuRule(rule);
  }

  private enqueueContextMenuRule(
    rule: NgRuleJson,
  ): Promise<ContextMenuRuleAddStatus> {
    const operation = this.contextMenuRuleWriteQueue.then(async () => {
      await this.initializationPromise;
      const currentRules = await this.storage.getJsonRules();
      const result = upsertContextMenuRule(currentRules, rule);
      if (result.status !== "already-exists") {
        await this.storage.saveJsonRules(result.rules);
        if (this.isUICreated) {
          await this.refreshRulesList();
        }
      }
      return result.status;
    });
    this.contextMenuRuleWriteQueue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  /** 入力中の正規表現を任意のテスト文字列へ適用して一致箇所を表示する */
  protected updateRegexPreview(): void {
    if (!this.container) return;

    const pattern =
      this.container.querySelector<HTMLInputElement>(
        `#${UI_ELEMENTS.PATTERN_INPUT}`,
      )?.value ?? "";
    const flags =
      this.container.querySelector<HTMLInputElement>(
        `#${UI_ELEMENTS.FLAGS_INPUT}`,
      )?.value ?? "";
    const testText =
      this.container.querySelector<HTMLTextAreaElement>(
        `#${UI_ELEMENTS.REGEX_TEST_INPUT}`,
      )?.value ?? "";
    const result = this.container.querySelector(
      `#${UI_ELEMENTS.REGEX_PREVIEW_RESULT}`,
    );
    const count = this.container.querySelector(
      `#${UI_ELEMENTS.REGEX_PREVIEW_COUNT}`,
    );
    if (!result || !count) return;

    if (!pattern || !testText) {
      count.textContent = "未テスト";
      result.textContent =
        "パターンとテスト文字列を入力すると、一致箇所を確認できます。";
      result.classList.remove("cf2-preview-success", "cf2-preview-error");
      return;
    }

    try {
      const previewFlags = flags.includes("g") ? flags : `${flags}g`;
      const regex = new RegExp(pattern, previewFlags);
      const fragments: string[] = [];
      let cursor = 0;
      let matchCount = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(testText)) !== null && matchCount < 100) {
        fragments.push(this.escapeHtml(testText.slice(cursor, match.index)));
        fragments.push(`<mark>${this.escapeHtml(match[0] || "∅")}</mark>`);
        cursor = match.index + match[0].length;
        matchCount += 1;
        if (match[0].length === 0) regex.lastIndex += 1;
      }
      fragments.push(this.escapeHtml(testText.slice(cursor)));
      result.innerHTML = fragments.join("");
      count.textContent =
        matchCount === 0
          ? "一致なし"
          : `${String(matchCount)}件一致${matchCount === 100 ? "以上" : ""}`;
      result.classList.toggle("cf2-preview-success", matchCount > 0);
      result.classList.remove("cf2-preview-error");
    } catch (error) {
      count.textContent = "入力エラー";
      result.textContent =
        error instanceof Error ? error.message : String(error);
      result.classList.add("cf2-preview-error");
      result.classList.remove("cf2-preview-success");
    }
  }

  /**
   * 正規表現パターンを分析して結果をUIに表示
   */
  protected analyzeAndDisplayRegexComplexity(): void {
    if (!this.container) return;

    const patternInput = this.container.querySelector(
      `#${UI_ELEMENTS.PATTERN_INPUT}`,
    ) as HTMLInputElement;
    const flagsInput = this.container.querySelector(
      `#${UI_ELEMENTS.FLAGS_INPUT}`,
    ) as HTMLInputElement;
    const analysisContainer = this.container.querySelector(
      `#${UI_ELEMENTS.REGEX_ANALYSIS}`,
    );

    if (!patternInput || !flagsInput || !analysisContainer) return;

    const pattern = patternInput.value.trim();
    const flags = flagsInput.value.trim();

    // パターンが空の場合は分析結果を非表示
    if (!pattern) {
      analysisContainer.classList.add(CSS_CLASSES.HIDDEN);
      return;
    }

    // パターンを分析
    const result = analyzeRegexPattern(pattern, flags);

    // 分析結果をUIに反映
    this.renderRegexAnalysisResult(result);
  }

  /**
   * 正規表現分析結果をUIにレンダリング
   */
  protected renderRegexAnalysisResult(result: RegexAnalysisResult): void {
    if (!this.container) return;

    const analysisContainer = this.container.querySelector(
      `#${UI_ELEMENTS.REGEX_ANALYSIS}`,
    );
    const complexityBadge = this.container.querySelector(
      `#${UI_ELEMENTS.REGEX_COMPLEXITY_BADGE}`,
    );
    const warningsContainer = this.container.querySelector(
      `#${UI_ELEMENTS.REGEX_WARNINGS}`,
    );
    const suggestionsContainer = this.container.querySelector(
      `#${UI_ELEMENTS.REGEX_SUGGESTIONS}`,
    );

    if (
      !analysisContainer ||
      !complexityBadge ||
      !warningsContainer ||
      !suggestionsContainer
    ) {
      return;
    }

    // コンテナを表示
    analysisContainer.classList.remove(CSS_CLASSES.HIDDEN);

    // リテラルパターンの場合は特別表示
    if (result.isLiteral) {
      analysisContainer.classList.add("cf2-literal-pattern");
      complexityBadge.textContent = "最適化済み";
      complexityBadge.className = "cf2-complexity-badge cf2-complexity-low";
      warningsContainer.innerHTML = `
        <div class="cf2-regex-literal-notice">
          ${getIconSVG(ICONS.check)}
          <span>リテラル文字列のため、Aho-Corasickによる高速マッチングが適用されます</span>
        </div>
      `;
      suggestionsContainer.innerHTML = "";
      return;
    }

    analysisContainer.classList.remove("cf2-literal-pattern");

    // 複雑度バッジを更新
    const complexityLabel = getComplexityLabel(result.complexity);
    const complexityCssClass = getComplexityCssClass(result.complexity);
    complexityBadge.textContent = `複雑度: ${complexityLabel}`;
    complexityBadge.className = `cf2-complexity-badge ${complexityCssClass}`;

    // 警告を表示
    if (result.warnings.length > 0) {
      const warningsHtml = result.warnings
        .map((warning) => {
          const severityCss = getSeverityCssClass(warning.severity);
          const iconName =
            warning.severity === "error"
              ? ICONS.warning
              : warning.severity === "warning"
                ? ICONS.info
                : ICONS.check;
          const problematicPartHtml = warning.problematicPart
            ? `<code class="cf2-regex-problematic-part">${this.escapeHtml(warning.problematicPart)}</code>`
            : "";

          return `
          <div class="cf2-regex-warning-item ${severityCss}">
            <span class="cf2-regex-warning-icon">${getIconSVG(iconName)}</span>
            <div>
              <span>${this.escapeHtml(warning.message)}</span>
              ${problematicPartHtml}
            </div>
          </div>
        `;
        })
        .join("");
      warningsContainer.innerHTML = warningsHtml;
    } else if (result.isValid) {
      warningsContainer.innerHTML = `
        <div class="cf2-regex-no-warnings">
          ${getIconSVG(ICONS.check)}
          <span>パターンに問題は検出されませんでした</span>
        </div>
      `;
    } else {
      warningsContainer.innerHTML = "";
    }

    // 提案を表示
    if (result.suggestions.length > 0) {
      const suggestionsHtml = result.suggestions
        .map((suggestion) => {
          const suggestedPatternHtml = suggestion.suggestedPattern
            ? `<code class="cf2-regex-suggested-pattern">${this.escapeHtml(suggestion.suggestedPattern)}</code>`
            : "";

          return `
          <div class="cf2-regex-suggestion-item">
            <span class="cf2-regex-suggestion-icon">${getIconSVG(ICONS.push_pin)}</span>
            <div>
              <span>${this.escapeHtml(suggestion.message)}</span>
              ${suggestedPatternHtml}
            </div>
          </div>
        `;
        })
        .join("");
      suggestionsContainer.innerHTML = suggestionsHtml;
    } else {
      suggestionsContainer.innerHTML = "";
    }

    window.logger?.debug(
      `[CommentFilter2] Regex analysis: complexity=${result.complexity}, score=${String(result.score)}, warnings=${String(result.warnings.length)}`,
    );
  }

  /**
   * 形式切替
   */
  protected switchFormat(format: "form" | "json" | "library"): void {
    this.currentFormat = format;
    this.updateFormatDisplay();
  }

  /**
   * 形式表示を更新
   */
  protected updateFormatDisplay(): void {
    if (!this.container) return;

    // タブの状態更新
    const tabs = this.container.querySelectorAll(".cf2-format-tab");
    tabs.forEach((tab) => {
      tab.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
    });

    // セクションの表示/非表示
    const formSection = this.container.querySelector(
      `#${UI_ELEMENTS.FORM_SECTION}`,
    );
    const jsonSection = this.container.querySelector(
      `#${UI_ELEMENTS.JSON_SECTION}`,
    );
    const librarySection = this.container.querySelector(
      `#${UI_ELEMENTS.LIBRARY_SECTION}`,
    );

    formSection?.classList.add(CSS_CLASSES.HIDDEN);
    jsonSection?.classList.add(CSS_CLASSES.HIDDEN);
    librarySection?.classList.add(CSS_CLASSES.HIDDEN);

    switch (this.currentFormat) {
      case "form":
        this.container
          .querySelector(`#${UI_ELEMENTS.FORMAT_FORM}`)
          ?.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
        formSection?.classList.remove(CSS_CLASSES.HIDDEN);
        break;
      case "json":
        this.container
          .querySelector(`#${UI_ELEMENTS.FORMAT_JSON}`)
          ?.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
        jsonSection?.classList.remove(CSS_CLASSES.HIDDEN);
        void this.loadJsonRules();
        break;
      case "library":
        this.container
          .querySelector(`#${UI_ELEMENTS.FORMAT_LIBRARY}`)
          ?.classList.add(CSS_CLASSES.TOGGLE_ACTIVE);
        librarySection?.classList.remove(CSS_CLASSES.HIDDEN);
        void this.refreshRulesList();
        break;
    }
  }

  /**
   * フォームからルールを追加
   */
  protected async addRuleFromForm(): Promise<void> {
    if (!this.container) return;

    try {
      const rule = this.collectRuleFromForm();
      if (!rule) {
        window.toastr?.error("ルールの入力内容に不備があります");
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

      window.toastr?.success("ルールを追加しました");
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Failed to add rule from form:",
        error,
      );
      window.toastr?.error("ルールの追加に失敗しました");
    }
  }

  /**
   * フォームからルール情報を収集
   */
  protected collectRuleFromForm(): NgRuleJson | null {
    if (!this.container) return null;

    const ruleType = (
      this.container.querySelector(
        'input[name="cf2-rule-type"]:checked',
      ) as HTMLInputElement
    )?.value;
    const actionType = (
      this.container.querySelector(
        'input[name="cf2-action-type"]:checked',
      ) as HTMLInputElement
    )?.value;

    if (!ruleType || !actionType) return null;

    const rule: Partial<NgRuleJson> = {
      enabled: true,
    };

    // ルールタイプに応じた処理
    if (ruleType === "regex") {
      const pattern = (
        this.container.querySelector(
          `#${UI_ELEMENTS.PATTERN_INPUT}`,
        ) as HTMLInputElement
      )?.value?.trim();
      const flags =
        (
          this.container.querySelector(
            `#${UI_ELEMENTS.FLAGS_INPUT}`,
          ) as HTMLInputElement
        )?.value?.trim() || "gi";

      if (!pattern) return null;

      rule.pattern = pattern;
      rule.flags = flags;
    } else {
      const userId = (
        this.container.querySelector(
          `#${UI_ELEMENTS.USERID_INPUT}`,
        ) as HTMLInputElement
      )?.value?.trim();

      if (!userId) return null;

      rule.userId = userId;
    }

    // アクション設定
    if (actionType === "hide") {
      rule.action = { type: "hide" };
    } else if (actionType === "replace") {
      const replacement = (
        this.container.querySelector(
          `#${UI_ELEMENTS.REPLACE_INPUT}`,
        ) as HTMLInputElement
      )?.value?.trim();
      rule.action = { type: "replace", replacement: replacement || "" };
    } else {
      // unspecified: 本文変更なし・後続フィルタから免除
      rule.action = { type: "unspecified" };
    }

    // SMID設定
    const smidInput =
      (
        this.container.querySelector(
          `#${UI_ELEMENTS.SMID_INPUT}`,
        ) as HTMLInputElement
      )?.value?.trim() || "ALL";
    rule.smid = smidInput === "ALL" ? ["ALL"] : [smidInput];

    // ニコる数条件
    const nicoruToggle = this.container.querySelector(
      `#${UI_ELEMENTS.NICORU_TOGGLE}`,
    );
    if (nicoruToggle?.classList.contains(CSS_CLASSES.TOGGLE_ACTIVE)) {
      const op = (
        this.container.querySelector(
          `#${UI_ELEMENTS.NICORU_OP}`,
        ) as HTMLSelectElement
      )?.value;
      const value = parseInt(
        (
          this.container.querySelector(
            `#${UI_ELEMENTS.NICORU_VALUE}`,
          ) as HTMLInputElement
        )?.value || "0",
        10,
      );
      let mode = (
        this.container.querySelector(
          `#${UI_ELEMENTS.NICORU_MODE}`,
        ) as HTMLSelectElement
      )?.value as "include" | "exclude";
      if (actionType === "unspecified") {
        mode = "exclude";
      }

      if (op) {
        rule.nicoru_cond = {
          op: op as NicoruCond["op"],
          value,
          mode,
        };
      }
    }

    return rule as NgRuleJson;
  }

  /**
   * フォームをクリア
   */
  protected clearForm(): void {
    if (!this.container) return;

    // テキスト入力をクリア
    (
      this.container.querySelector(
        `#${UI_ELEMENTS.PATTERN_INPUT}`,
      ) as HTMLInputElement
    ).value = "";
    (
      this.container.querySelector(
        `#${UI_ELEMENTS.FLAGS_INPUT}`,
      ) as HTMLInputElement
    ).value = "gi";
    (
      this.container.querySelector(
        `#${UI_ELEMENTS.USERID_INPUT}`,
      ) as HTMLInputElement
    ).value = "";
    (
      this.container.querySelector(
        `#${UI_ELEMENTS.REPLACE_INPUT}`,
      ) as HTMLInputElement
    ).value = "";
    (
      this.container.querySelector(
        `#${UI_ELEMENTS.SMID_INPUT}`,
      ) as HTMLInputElement
    ).value = "ALL";
    (
      this.container.querySelector(
        `#${UI_ELEMENTS.NICORU_VALUE}`,
      ) as HTMLInputElement
    ).value = "10";
    const testInput = this.container.querySelector<HTMLTextAreaElement>(
      `#${UI_ELEMENTS.REGEX_TEST_INPUT}`,
    );
    if (testInput) testInput.value = "";
    this.updateRegexPreview();

    // ラジオボタンをリセット
    (
      this.container.querySelector(
        'input[name="cf2-rule-type"][value="regex"]',
      ) as HTMLInputElement
    ).checked = true;
    (
      this.container.querySelector(
        'input[name="cf2-action-type"][value="hide"]',
      ) as HTMLInputElement
    ).checked = true;

    // ニコる数トグルをオフ
    const nicoruToggle = this.container.querySelector(
      `#${UI_ELEMENTS.NICORU_TOGGLE}`,
    );
    nicoruToggle?.classList.remove(CSS_CLASSES.TOGGLE_ACTIVE);
    this.container
      .querySelector("#cf2-nicoru-details")
      ?.classList.add(CSS_CLASSES.HIDDEN);

    // 表示状態を更新
    this.handleRuleTypeChange();
    this.handleActionTypeChange();
  }

  /**
   * ニコる数設定の表示切替
   */
  protected toggleNicoruSettings(): void {
    if (!this.container) return;

    const toggle = this.container.querySelector(
      `#${UI_ELEMENTS.NICORU_TOGGLE}`,
    );
    const details = this.container.querySelector("#cf2-nicoru-details");

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
  protected async saveJsonRules(): Promise<void> {
    if (!this.container) return;

    try {
      const textarea = this.container.querySelector(
        `#${UI_ELEMENTS.JSON_TEXTAREA}`,
      );
      const jsonText =
        textarea instanceof HTMLTextAreaElement ? textarea.value.trim() : "";

      if (!jsonText) {
        await this.storage.saveJsonRules([]);
        window.toastr?.success("ルールをクリアしました");
        await this.refreshRulesList();
        return;
      }

      const rules = parseJsonl(jsonText);
      await this.storage.saveJsonRules(rules);

      window.toastr?.success(
        `${String(rules.length)}個のJSONルールを保存しました`,
      );
      await this.refreshRulesList();
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Failed to save JSON rules:",
        error,
      );
      window.toastr?.error("JSONルールの保存に失敗しました");
    }
  }

  /**
   * JSONルールを検証
   */
  protected validateJsonRules(): void {
    if (!this.container) return;

    try {
      const textarea2 = this.container.querySelector(
        `#${UI_ELEMENTS.JSON_TEXTAREA}`,
      );
      const jsonText =
        textarea2 instanceof HTMLTextAreaElement ? textarea2.value.trim() : "";

      if (!jsonText) {
        window.toastr?.info("検証するJSONがありません");
        return;
      }

      const rules = parseJsonl(jsonText);
      window.toastr?.success(
        `✅ JSON形式が正しく、${rules.length}個のルールが有効です`,
      );
    } catch (error) {
      window.toastr?.error(`❌ JSON形式エラー: ${String(error)}`);
    }
  }

  /**
   * JSONルールをロード
   */
  protected async loadJsonRules(): Promise<void> {
    if (!this.container) return;

    try {
      const rules = await this.storage.getJsonRules();
      const jsonText = stringifyJsonl(rules);

      const textarea = this.container.querySelector(
        `#${UI_ELEMENTS.JSON_TEXTAREA}`,
      ) as HTMLTextAreaElement;
      textarea.value = jsonText;
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Failed to load JSON rules:",
        error,
      );
    }
  }

  /**
   * ルール一覧を更新
   */
  protected async refreshRulesList(): Promise<void> {
    if (!this.container) return;

    try {
      const rules = await this.storage.getJsonRules();
      const rulesList = this.container.querySelector(
        `#${UI_ELEMENTS.RULES_LIST}`,
      );
      const countText = this.container.querySelector(
        `#${UI_ELEMENTS.RULE_COUNT_TEXT}`,
      );

      if (countText) {
        countText.textContent = `${String(rules.length)}件`;
      }
      const viewRuleCount = this.container.querySelector(
        `#${UI_ELEMENTS.VIEW_RULE_COUNT}`,
      );
      if (viewRuleCount) viewRuleCount.textContent = String(rules.length);
      const cockpitCount = this.container.querySelector(
        `#${UI_ELEMENTS.COCKPIT_RULE_COUNT}`,
      );
      if (cockpitCount) {
        cockpitCount.textContent = String(
          rules.filter((rule) => rule.enabled !== false).length,
        );
      }
      const hideCount = this.container.querySelector(
        `#${UI_ELEMENTS.COCKPIT_HIDE_COUNT}`,
      );
      const replaceCount = this.container.querySelector(
        `#${UI_ELEMENTS.COCKPIT_REPLACE_COUNT}`,
      );
      if (hideCount) {
        hideCount.textContent = String(
          rules.filter(
            (rule) => rule.enabled !== false && rule.action.type === "hide",
          ).length,
        );
      }
      if (replaceCount) {
        replaceCount.textContent = String(
          rules.filter(
            (rule) => rule.enabled !== false && rule.action.type === "replace",
          ).length,
        );
      }
      const recentRules = this.container.querySelector(
        `#${UI_ELEMENTS.DASHBOARD_RECENT_RULES}`,
      );
      if (recentRules) {
        recentRules.innerHTML = rules.length
          ? rules
              .slice(-3)
              .reverse()
              .map((rule) => {
                const content = rule.pattern || rule.userId || "";
                const action =
                  rule.action.type === "hide"
                    ? "非表示"
                    : rule.action.type === "replace"
                      ? "置換"
                      : "免除";
                return `<div class="cf2-dashboard-rule"><span class="cf2-dashboard-rule-dot"></span><code>${this.escapeHtml(content)}</code><span class="cf2-rule-type">${action}</span></div>`;
              })
              .join("")
          : '<div class="cf2-dashboard-empty">ルールはまだありません。左の「ルール」から追加できます。</div>';
      }

      if (!rulesList) return;

      if (rules.length === 0) {
        rulesList.innerHTML =
          '<div class="cf2-help-text">ルールがありません</div>';
        return;
      }

      const rulesHtml = rules
        .map((rule, index) => this.generateRuleItemHtml(rule, index))
        .join("");
      rulesList.innerHTML = rulesHtml;

      // 削除ボタンのイベントリスナーを設定
      rulesList.querySelectorAll(".cf2-rule-delete").forEach((btn, index) => {
        btn.addEventListener("click", () => {
          void this.deleteRule(index);
        });
      });
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Failed to refresh rules list:",
        error,
      );
    }
  }

  /**
   * HTMLエスケープ関数
   */
  protected escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * ルールアイテムのHTMLを生成
   */
  protected generateRuleItemHtml(rule: NgRuleJson, index: number): string {
    const ruleType = rule.pattern ? "regex" : "userId";
    const content = rule.pattern || rule.userId || "";
    let actionText: string;
    if (rule.action.type === "hide") {
      actionText = "非表示";
    } else if (rule.action.type === "replace") {
      const repl = rule.action.replacement;
      actionText = `置換: ${this.escapeHtml(repl)}`;
    } else {
      actionText = "フィルタ免除";
    }
    const smidText = rule.smid.join(", ");
    const nicoruText = rule.nicoru_cond
      ? `${rule.nicoru_cond.op} ${String(rule.nicoru_cond.value)} (${rule.nicoru_cond.mode})`
      : "条件なし";

    return `
      <div class="cf2-rule-item">
        <div class="cf2-rule-header">
          <span class="cf2-rule-type">${ruleType === "regex" ? "正規表現" : "ユーザーID"}</span>
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
  protected async deleteRule(index: number): Promise<void> {
    try {
      const rules = await this.storage.getJsonRules();
      rules.splice(index, 1);
      await this.storage.saveJsonRules(rules);

      await this.refreshRulesList();
      window.toastr?.success("ルールを削除しました");
    } catch (error) {
      window.logger?.error("[CommentFilter2] Failed to delete rule:", error);
      window.toastr?.error("ルールの削除に失敗しました");
    }
  }

  /**
   * 全ルールを削除
   */
  protected async clearAllRules(): Promise<void> {
    if (!confirm("すべてのルールを削除しますか？")) {
      return;
    }

    try {
      await this.storage.saveJsonRules([]);
      await this.refreshRulesList();
      window.toastr?.success("すべてのルールを削除しました");
    } catch (error) {
      window.logger?.error(
        "[CommentFilter2] Failed to clear all rules:",
        error,
      );
      window.toastr?.error("ルールの削除に失敗しました");
    }
  }

  /**
   * データをエクスポート
   */
  protected async exportJsonData(): Promise<void> {
    try {
      const jsonData = await this.storage.exportJsonData();

      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = this.generateExportFilename("comment-filter2-rules");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
      window.toastr?.success("データをエクスポートしました");
    } catch (error) {
      window.logger?.error("[CommentFilter2] Export failed:", error);
      window.toastr?.error("エクスポートに失敗しました");
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
