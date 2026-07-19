import {
  ModuleInstance,
  ModuleConfig,
  PageType,
  ModuleCategory,
  ModuleStatus,
} from "@/types/module-types";
import { createMaterialIcon } from "@/common/material-icons";

type CancelableCallback = (() => void) & { cancel(): void };

export const watchPageModuleConfig: ModuleConfig = {
  id: "watch_page",
  name: "タグカウンター",
  description: "動画視聴ページにタグカウンターを表示します",
  enabled: false,
  targetPages: [PageType.WATCH],
  dependencies: [],
  category: ModuleCategory.FUNCTIONALITY,
  icon: createMaterialIcon("movie", { style: "outlined", color: "white" }),
};

/**
 * タグカウンターモジュール
 * タグカウンターを管理するモジュール
 */
export class WatchPageModule implements ModuleInstance {
  public readonly config: ModuleConfig = watchPageModuleConfig;

  private isInitialized: boolean = false;
  private readonly LEGACY_SETTINGS_KEY = "watch_page_module_settings";

  // タグカウンター用のMutationObserver
  private tagObserver: MutationObserver | null = null;
  private updateTagCounterDebounced: CancelableCallback | null = null;
  private tagRetryTimer: number | null = null;
  private resolveTagRetry: (() => void) | null = null;
  private readonly tagLinkSelector =
    'a[data-anchor-area="tags"][data-anchor-href^="/tag/"], a[data-anchor-area="tags"][href*="/tag/"], a[href^="/tag/"], a[href^="https://www.nicovideo.jp/tag/"]';

  constructor() {
    localStorage.removeItem(this.LEGACY_SETTINGS_KEY);

    // グローバルからアクセス可能にする（デバッグ用）
    (
      window as Window & {
        watchPageModule?: WatchPageModule;
      }
    ).watchPageModule = this;
  }

  /**
   * モジュール初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // ページ判定
      if (!this.isWatchPage()) {
        return;
      }

      this.isInitialized = true;
      await this.initializeTagCounter();
    } catch (error) {
      this.destroy();
      window.logger.error("[WatchPageModule] 初期化エラー:", error);
      throw error;
    }
  }

  /**
   * モジュール破棄
   */
  destroy(): void {
    this.destroyTagCounter();

    this.isInitialized = false;
  }

  /** 共通SPA遷移イベントから、遷移先のタグDOMへ付け直す。 */
  async onSPANavigate(): Promise<void> {
    if (!this.isInitialized || !this.isWatchPage()) return;
    this.destroyTagCounter();
    await this.initializeTagCounter();
  }

  /**
   * モジュール状態確認
   */
  isActive(): boolean {
    return this.isInitialized && this.isWatchPage();
  }

  /**
   * モジュール状態取得
   */
  getStatus(): ModuleStatus {
    if (!this.isInitialized) {
      return ModuleStatus.INACTIVE;
    }

    if (!this.isWatchPage()) {
      return ModuleStatus.INACTIVE;
    }

    return document.getElementById("TagItemsCounter")
      ? ModuleStatus.ACTIVE
      : ModuleStatus.INACTIVE;
  }

  /**
   * Watch Pageかどうかの判定
   */
  private isWatchPage(): boolean {
    return /\/watch\//.test(window.location.pathname);
  }

  /**
   * タグカウンター初期化
   */
  private async initializeTagCounter(): Promise<void> {
    // 既存のタグカウンターを削除
    const existing = document.getElementById("TagItemsCounter");
    if (existing) existing.remove();

    // 動画IDを取得
    const videoIDMatch = /s[mo]\d+/.exec(window.location.pathname);
    if (!videoIDMatch) {
      throw new Error("動画IDが取得できません");
    }

    const videoID = videoIDMatch[0];

    // FirefoxではタグDOM構築が初期リトライ範囲を外れる場合があるため、
    // 先に監視を開始して後続のDOM変化でも挿入できるようにする。
    this.setupTagObserver();

    try {
      await this.retryTagCounter({ videoID });
    } catch (error) {
      window.logger.warn(
        "[WatchPageModule] タグカウンター初期挿入は遅延復帰待ちに切り替えます:",
        error,
      );
    }
  }

  /**
   * タグカウンター破棄
   */
  private destroyTagCounter(): void {
    this.cancelTagCounterRetry();
    // タグカウンター本体を削除
    const tagCounter = document.getElementById("TagItemsCounter");
    if (tagCounter) {
      tagCounter.remove();
    }

    // 共有ボタンも削除
    const shareButton = document.getElementById("TagItemsShareButton");
    if (shareButton) {
      shareButton.remove();
    }

    // タグObserverを停止・破棄
    if (this.tagObserver) {
      this.tagObserver.disconnect();
      this.tagObserver = null;
    }

    // デバウンスタイマーをクリア
    this.updateTagCounterDebounced?.cancel();
    this.updateTagCounterDebounced = null;
  }

  /**
   * タグカウンター再試行機能
   */
  private retryTagCounter(option: { videoID: string }): Promise<void> {
    this.cancelTagCounterRetry();
    return new Promise((resolve, reject) => {
      this.resolveTagRetry = resolve;
      let retryCount = 0;
      const maxRetryCount = 40;
      const retryInterval = 700;

      const attempt = (): void => {
        const element = this.findTagContainer();

        const tagLength = this.getTagCount();

        if (
          this.insertTagCounter({ element, videoID: option.videoID, tagLength })
        ) {
          this.resolveTagRetry = null;
          resolve();
          return;
        }

        retryCount++;
        if (retryCount < maxRetryCount) {
          this.tagRetryTimer = window.setTimeout(() => {
            this.tagRetryTimer = null;
            attempt();
          }, retryInterval);
        } else {
          this.resolveTagRetry = null;
          reject(new Error("タグカウンター設置の最大再試行回数に達しました"));
        }
      };

      attempt();
    });
  }

  /** 未完了のタグDOM探索を停止し、待機中の初期化を解放する。 */
  private cancelTagCounterRetry(): void {
    if (this.tagRetryTimer !== null) {
      clearTimeout(this.tagRetryTimer);
      this.tagRetryTimer = null;
    }
    const resolve = this.resolveTagRetry;
    this.resolveTagRetry = null;
    resolve?.();
  }

  /**
   * タグ数を取得する
   */
  private getTagCount(): number {
    const tagContainer = this.findTagContainer();
    if (tagContainer) {
      const tagElements = this.getTagLinks(tagContainer);
      if (tagElements.length > 0) {
        return tagElements.length;
      }
    }

    // DOM構築前はAPIデータをフォールバックにする
    const tagItems = window.NicoCache_nl?.watch?.apiData?.tag?.items;
    if (Array.isArray(tagItems)) {
      return tagItems.length;
    }

    return 0;
  }

  /**
   * タグ一覧コンテナを取得する
   */
  private findTagContainer(): Element | null {
    const existingCounter = document.getElementById("TagItemsCounter");
    if (existingCounter?.parentElement) {
      return existingCounter.parentElement;
    }

    const tagLinks = Array.from(
      document.querySelectorAll(this.tagLinkSelector),
    );
    const candidates = new Map<Element, number>();

    tagLinks.forEach((tagLink) => {
      let current = tagLink.parentElement;
      for (let depth = 0; current && depth < 5; depth++) {
        const count = this.getTagLinks(current).length;
        if (count > 0 && count <= 11) {
          candidates.set(
            current,
            Math.max(candidates.get(current) ?? 0, count),
          );
        }
        current = current.parentElement;
      }
    });

    let bestCandidate: Element | null = null;
    let bestCount = 0;
    candidates.forEach((count, candidate) => {
      if (count > bestCount) {
        bestCandidate = candidate;
        bestCount = count;
      }
    });

    return bestCandidate;
  }

  /**
   * タグリンクだけを取得する
   */
  private getTagLinks(container: ParentNode): HTMLAnchorElement[] {
    return Array.from(container.querySelectorAll(this.tagLinkSelector)).filter(
      (element): element is HTMLAnchorElement =>
        element instanceof HTMLAnchorElement &&
        element.id !== "TagItemsCounter" &&
        element.id !== "TagItemsShareButton" &&
        this.isWatchTagLink(element),
    );
  }

  /**
   * 視聴ページのタグリンクかどうか判定する
   */
  private isWatchTagLink(element: HTMLAnchorElement): boolean {
    const dataHref = element.getAttribute("data-anchor-href") ?? "";
    const href = element.getAttribute("href") ?? "";
    const absoluteTagPrefix = "https://www.nicovideo.jp/tag/";
    return (
      dataHref.startsWith("/tag/") ||
      href.startsWith("/tag/") ||
      href.startsWith(absoluteTagPrefix)
    );
  }

  /**
   * タグカウンター挿入
   */
  private insertTagCounter(option: {
    element: Element | null;
    videoID: string;
    tagLength: number;
  }): boolean {
    // 既存の要素を確実に削除（重複防止）
    const existingTagCounter = document.getElementById("TagItemsCounter");
    if (existingTagCounter) {
      existingTagCounter.remove();
    }

    const existingShareButton = document.getElementById("TagItemsShareButton");
    if (existingShareButton) {
      existingShareButton.remove();
    }

    // 挿入先の要素が存在しない場合は失敗
    if (!option.element) {
      return false;
    }

    try {
      // 最新の動画情報を取得
      const currentVideoInfo = this.getCurrentVideoInfo();
      const href = `href="https://commons.nicovideo.jp/works/${currentVideoInfo.videoId}" target="_blank"`;

      const tagCounterHTML = `
        <a title="タグ個数" id="TagItemsCounter" data-anchor-page="watch" data-anchor-area="tags" class="d_inline-flex h_x4 px_x2 ai_center bdr_full bg-c_action.base flex-wrap_nowrap fw_bold ov_hidden [&amp;:has(>_a:nth-child(1):hover)]:bg-c_action.baseHover [&amp;_>_span]:lc_1" ${href}>
          <span>タグ個数${option.tagLength}個/最大11個</span>
        </a>
        <a title="${currentVideoInfo.title}を共有" id="TagItemsShareButton" data-anchor-page="watch" data-anchor-area="tags" class="d_inline-flex h_x4 px_x2 ai_center bdr_full bg-c_action.base flex-wrap_nowrap fw_bold ov_hidden [&amp;:has(>_a:nth-child(1):hover)]:bg-c_action.baseHover [&amp;_>_span]:lc_1" href="#">
          <span>共有</span>
        </a>
      `;

      option.element.insertAdjacentHTML("beforeend", tagCounterHTML);

      // 共有ボタンのイベントハンドラーを設定
      this.setupShareButton();

      // 挿入後に実際に要素が存在するかチェック
      return (
        !!document.getElementById("TagItemsCounter") &&
        !!document.getElementById("TagItemsShareButton")
      );
    } catch (error) {
      window.logger.error("[WatchPageModule] タグカウンター挿入エラー:", error);
      return false;
    }
  }

  /**
   * 共有ボタンのイベントハンドラー設定
   */
  private setupShareButton(): void {
    const shareButton = document.getElementById("TagItemsShareButton");
    if (shareButton) {
      shareButton.addEventListener("click", (event) => {
        event.preventDefault();

        // クリック時に動的に最新の動画情報を取得
        const currentVideoInfo = this.getCurrentVideoInfo();
        const textToCopy = `${currentVideoInfo.title}\nhttps://nico.ms/${currentVideoInfo.videoId}`;

        navigator.clipboard
          .writeText(textToCopy)
          .then(() => {
            window.toastr?.success(
              textToCopy + "\nクリップボードにコピーしました！",
              "成功",
              { timeOut: 5000 },
            );
          })
          .catch((error: Error) => {
            window.logger.error("コピーに失敗しました:", error);
            window.toastr?.warning("コピーに失敗しました", "エラー", {
              timeOut: 5000,
            });
          });
      });
    }
  }

  /**
   * 現在の動画情報を取得
   */
  private getCurrentVideoInfo(): { title: string; videoId: string } {
    // 最新の動画IDを取得
    const videoId = this.getCurrentVideoId() || "unknown";

    // 最新のタイトルを取得（複数のソースから試行）
    let title = "無題";

    // 1. NicoCache_nlのAPIデータから取得
    if (window.NicoCache_nl?.watch?.apiData?.video?.title) {
      title = window.NicoCache_nl.watch.apiData.video.title;
    }
    // 2. ページタイトルから取得（フォールバック）
    else if (document.title && document.title !== "ニコニコ動画") {
      // ページタイトルから動画タイトル部分を抽出
      title = document.title.replace(/\s*-\s*ニコニコ動画$/, "").trim();
    }
    // 3. h1要素から取得（さらなるフォールバック）
    else {
      const h1Element = document.querySelector("h1");
      if (h1Element?.textContent?.trim()) {
        title = h1Element.textContent.trim();
      }
    }

    return { title, videoId };
  }

  private getCurrentVideoId(): string | null {
    const videoIDMatch = /s[mo]\d+/.exec(window.location.pathname);
    return videoIDMatch ? videoIDMatch[0] : null;
  }

  // ラジアルセレクター機能は独立モジュール（WatchBackgroundSelectorModule）に移行済み

  /**
   * タグ監視Observer設定
   */
  private setupTagObserver(): void {
    // 既存のObserverがあれば停止
    if (this.tagObserver) {
      this.tagObserver.disconnect();
    }

    // デバウンス関数を作成（300ms間隔で更新）
    this.updateTagCounterDebounced = this.debounce(() => {
      this.updateTagCounterDisplay();
    }, 300);

    // タグ要素の変更を監視
    this.tagObserver = new MutationObserver((mutations) => {
      let shouldUpdate = false;

      mutations.forEach((mutation) => {
        // タグ要素の追加・削除をチェック
        if (mutation.type === "childList") {
          const addedNodes = Array.from(mutation.addedNodes);
          const removedNodes = Array.from(mutation.removedNodes);

          const hasTagChanges = [...addedNodes, ...removedNodes].some(
            (node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                return (
                  this.isTagCounterMutationTarget(element) ||
                  element.querySelector?.(this.tagLinkSelector) !== null ||
                  element.querySelector?.(
                    "#TagItemsCounter, #TagItemsShareButton",
                  ) !== null
                );
              }
              return false;
            },
          );

          if (hasTagChanges) {
            shouldUpdate = true;
          }
        }
      });

      if (shouldUpdate && this.updateTagCounterDebounced) {
        this.updateTagCounterDebounced();
      }
    });

    // タグコンテナを監視対象に設定
    const tagContainer = this.findTagContainer();
    if (tagContainer) {
      this.tagObserver.observe(tagContainer, {
        childList: true,
        subtree: true,
      });
    }

    // ページ全体も監視（タグコンテナ自体が再作成される場合に備えて）
    this.tagObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /** 呼び出し待ちを明示的に破棄できるデバウンス関数を作る。 */
  private debounce(func: () => void, wait: number): CancelableCallback {
    let timeout: number | null = null;
    const debounced = (() => {
      if (timeout !== null) clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        timeout = null;
        func();
      }, wait);
    }) as CancelableCallback;
    debounced.cancel = () => {
      if (timeout !== null) clearTimeout(timeout);
      timeout = null;
    };
    return debounced;
  }

  /**
   * タグカウンター表示を更新
   */
  private updateTagCounterDisplay(): void {
    if (!this.isWatchPage()) return;

    const tagCounter = document.getElementById("TagItemsCounter");
    const shareButton = document.getElementById("TagItemsShareButton");
    if (!tagCounter || !shareButton) {
      const videoId = this.getCurrentVideoId();
      if (!videoId) return;

      this.insertTagCounter({
        element: this.findTagContainer(),
        videoID: videoId,
        tagLength: this.getTagCount(),
      });
      return;
    }

    const currentTagCount = this.getTagCount();
    const tagCounterLabel = tagCounter.querySelector("span");

    if (tagCounterLabel) {
      tagCounterLabel.textContent = `タグ個数${currentTagCount}個/最大11個`;
    }

    // 共有ボタンの情報も更新（動画情報が変わった場合に備えて）
    this.updateShareButtonInfo();
  }

  /**
   * タグカウンター更新対象のDOM変更かどうか判定する
   */
  private isTagCounterMutationTarget(element: Element): boolean {
    return (
      element.matches(this.tagLinkSelector) ||
      element.id === "TagItemsCounter" ||
      element.id === "TagItemsShareButton"
    );
  }

  /**
   * 共有ボタンの情報を更新
   */
  private updateShareButtonInfo(): void {
    const shareButton = document.getElementById("TagItemsShareButton");
    if (!shareButton) return;

    const currentVideoInfo = this.getCurrentVideoInfo();

    // 共有ボタンのhref属性を更新
    const shareLinks = Array.from(shareButton.querySelectorAll("a"));
    shareLinks.forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }
      const href = `https://commons.nicovideo.jp/works/${currentVideoInfo.videoId}`;
      link.setAttribute("href", href);
    });

    // ボタンのtitle属性を更新（ホバー時の表示）
    shareButton.setAttribute("title", `${currentVideoInfo.title}を共有`);
  }
}
