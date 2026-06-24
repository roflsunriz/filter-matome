import {
  ModuleInstance,
  ModuleConfig,
  ModuleStatus,
} from "@/types/module-types";

/**
 * ヘッダープライバシーモジュール
 * ユーザーアイコンとユーザー名を非表示にする機能
 */
export class HeaderModule implements ModuleInstance {
  public config: ModuleConfig;
  private observer: MutationObserver | null = null;
  private pendingFrameId: number | null = null;
  private active: boolean = false;

  private static readonly hiddenAttribute = "data-header-module-hidden";
  private static readonly commonHeaderClassPrefix = "common-header-";
  private static readonly headerSelector =
    "#CommonHeader, header, .SiteHeaderContainer";
  private static readonly userElementSelector =
    'img[src^="https://secure-dcdn.cdn.nimg.jp/nicoaccount/usericon/"], ' +
    'img[src*="/nicoaccount/usericon/"], ' +
    'img[alt*="ユーザーアイコン"], ' +
    ".common-header-w2sn95, " +
    ".common-header-n0qa7l, " +
    ".UserIcon, .user-icon, [class*=\"userIcon\"], [class*=\"UserIcon\"], " +
    ".UserName, .user-name, [class*=\"userName\"], [class*=\"UserName\"], " +
    ".UserDetailsContainer_name";

  constructor(config: ModuleConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      await Promise.resolve();
      this.active = true;
      this.hideUserElements(document);
      this.startObserver();
    } catch (error) {
      window.logger.error("[HeaderModule] 初期化に失敗しました:", error);
      throw error;
    }
  }

  destroy(): void {
    try {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }

      if (this.pendingFrameId !== null) {
        window.cancelAnimationFrame(this.pendingFrameId);
        this.pendingFrameId = null;
      }

      // 非表示にした要素を復元
      this.restoreUserElements();

      this.active = false;
    } catch (error) {
      window.logger.error("[HeaderModule] 停止処理に失敗しました:", error);
    }
  }

  isActive(): boolean {
    return this.active;
  }

  getStatus(): ModuleStatus {
    if (!this.active) {
      return ModuleStatus.INACTIVE;
    }
    return ModuleStatus.ACTIVE;
  }

  /**
   * ヘッダーの変化を監視する
   */
  private startObserver(): void {
    try {
      const root = document.body || document.documentElement;
      if (!root) {
        return;
      }

      this.observer = new MutationObserver((mutations) => {
        this.handleMutations(mutations);
      });

      this.observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src", "alt", "class", "style"],
      });
    } catch (error) {
      window.logger.error("[HeaderModule] 監視開始に失敗しました:", error);
    }
  }

  /**
   * DOM変更からユーザー関連要素の再評価が必要か判定する
   */
  private handleMutations(mutations: MutationRecord[]): void {
    const shouldUpdate = mutations.some((mutation) => {
      if (
        mutation.target instanceof Element &&
        (this.isInHeader(mutation.target) ||
          this.matchesUserElement(mutation.target))
      ) {
        return true;
      }

      return Array.from(mutation.addedNodes).some(
        (node) => node instanceof Element && this.mayContainUserElement(node),
      );
    });

    if (!shouldUpdate) {
      return;
    }

    this.scheduleHideUserElements();
  }

  /**
   * ユーザー関連要素の非表示を1フレームにまとめる
   */
  private scheduleHideUserElements(): void {
    if (this.pendingFrameId !== null) {
      return;
    }

    this.pendingFrameId = window.requestAnimationFrame(() => {
      this.pendingFrameId = null;
      this.hideUserElements(document);
    });
  }

  /**
   * ユーザー関連要素を非表示にする
   */
  private hideUserElements(root: ParentNode): void {
    try {
      this.findUserElements(root).forEach((element) => {
        this.hideElement(element);
      });
    } catch (error) {
      window.logger.error(
        "[HeaderModule] ユーザー要素の非表示処理でエラー:",
        error,
      );
    }
  }

  /**
   * 非表示にした要素を復元する
   */
  private restoreUserElements(): void {
    try {
      const hiddenElements = document.querySelectorAll(
        `[${HeaderModule.hiddenAttribute}="true"]`,
      );
      hiddenElements.forEach((element) => {
        if (element instanceof HTMLElement) {
          element.style.display = "";
          element.removeAttribute("data-header-module-hidden");
        }
      });
    } catch (error) {
      window.logger.error("[HeaderModule] 要素の復元処理でエラー:", error);
    }
  }

  /**
   * 監視対象にユーザー関連要素が含まれる可能性があるか判定
   */
  private mayContainUserElement(element: Element): boolean {
    return (
      this.isInHeader(element) ||
      this.matchesUserElement(element) ||
      element.querySelector(HeaderModule.headerSelector) !== null ||
      element.querySelector(HeaderModule.userElementSelector) !== null
    );
  }

  /**
   * 要素がヘッダー配下かどうかを判定
   */
  private isInHeader(element: Element): boolean {
    return element.closest(HeaderModule.headerSelector) !== null;
  }

  /**
   * 指定範囲内のユーザー関連要素を取得
   */
  private findUserElements(root: ParentNode): HTMLElement[] {
    const elements = new Set<HTMLElement>();

    if (root instanceof HTMLElement && this.matchesUserElement(root)) {
      elements.add(root);
    }

    root
      .querySelectorAll(HeaderModule.userElementSelector)
      .forEach((element) => {
        if (element instanceof HTMLElement && this.matchesUserElement(element)) {
          elements.add(element);
        }
      });

    return Array.from(elements);
  }

  /**
   * 非表示対象のユーザーアイコン・ユーザー名要素か判定
   */
  private matchesUserElement(element: Element): boolean {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const isCommonHeaderElement =
      this.isInHeader(element) || this.hasCommonHeaderClass(element);

    if (element instanceof HTMLImageElement) {
      return isCommonHeaderElement && this.isUserIconImage(element);
    }

    if (!isCommonHeaderElement) {
      return false;
    }

    return (
      element.classList.contains("common-header-w2sn95") ||
      element.classList.contains("common-header-n0qa7l") ||
      this.hasClassNamePart(element, "userIcon") ||
      this.hasClassNamePart(element, "UserIcon") ||
      this.hasClassNamePart(element, "userName") ||
      this.hasClassNamePart(element, "UserName") ||
      element.classList.contains("UserDetailsContainer_name")
    );
  }

  /**
   * class名に指定文字列が含まれるか判定
   */
  private hasClassNamePart(element: HTMLElement, part: string): boolean {
    return Array.from(element.classList).some((className) =>
      className.includes(part),
    );
  }

  /**
   * CommonHeader由来の要素か判定
   */
  private hasCommonHeaderClass(element: HTMLElement): boolean {
    return Array.from(element.classList).some((className) =>
      className.startsWith(HeaderModule.commonHeaderClassPrefix),
    );
  }

  /**
   * ユーザーアイコン画像か判定
   */
  private isUserIconImage(element: HTMLImageElement): boolean {
    return (
      element.src.includes("/nicoaccount/usericon/") ||
      element.alt.includes("ユーザーアイコン")
    );
  }

  /**
   * 要素を非表示にする
   */
  private hideElement(element: HTMLElement): void {
    if (element.style.display === "none") {
      return;
    }

    element.style.display = "none";
    if (!element.hasAttribute(HeaderModule.hiddenAttribute)) {
      element.setAttribute(HeaderModule.hiddenAttribute, "true");
    }
  }
}
