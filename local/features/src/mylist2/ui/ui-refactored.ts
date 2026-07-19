import "@/types/global.d.ts";

import type { ManagerSettings, VideoLinkTarget } from "@/types/mylist-types";
import { DBVideo as VideoInfo } from "@/types/video-types";

import {
  getOrCreateVideoDetailsModal,
  openVideoDetailsModal,
  renderVideoTags,
} from "@/mylist2/ui/video-details-modal";
import {
  sanitizeDescriptionHtml,
  setVideoLinkTarget,
} from "@/mylist2/utils/linkify";
import { Mylist2UIEvents } from "./mylist-ui-events";

/** 詳細・検索・設定モーダルを含む公開UI。 */
export class Mylist2ManagerUI extends Mylist2UIEvents {
  // 動画詳細モーダルの表示（メモ編集対応）
  protected async showVideoDetailsModal(
    video: VideoInfo,
    compositeId?: string,
    memoText: string = "",
  ): Promise<void> {
    await Promise.resolve();
    const modalElements = getOrCreateVideoDetailsModal();
    if (!modalElements) return;
    const { description, tags, memo } = modalElements;
    const text = video.description || "(説明なし)";
    description.innerHTML = sanitizeDescriptionHtml(text);

    // 視聴ページからのリッチ説明文をまだ取得していない場合、遅延エンリッチメント
    if (video.descriptionSource !== "watch" && compositeId) {
      const loadingEl = document.createElement("div");
      loadingEl.style.cssText =
        "color:#888;font-size:12px;margin-top:6px;font-style:italic";
      loadingEl.textContent = "完全な説明文を取得中…";
      description.after(loadingEl);

      void this.enrichDescription(
        video.originalId,
        compositeId,
        description,
        loadingEl,
      );
    }
    memo.value = memoText || "";
    renderVideoTags(
      tags,
      video.tags && video.tags.length > 0 ? video.tags : [],
    );
    openVideoDetailsModal(modalElements, async (text) => {
      if (!compositeId) {
        await this.showCustomAlert("メモの保存対象が特定できませんでした");
        return;
      }

      try {
        await this.manager.updateVideoMemo(compositeId, text);
        const item = document.querySelector(
          `.video-item[data-composite-id="${compositeId}"]`,
        );
        if (item) {
          (item as HTMLElement).setAttribute("data-memo", text);
        }
        await this.showCustomAlert("メモを保存しました");
      } catch {
        await this.showCustomAlert("メモの保存に失敗しました");
      }
    });
  }

  /**
   * 視聴ページからリッチHTML説明文を取得し、UI・DBを更新する。
   * showVideoDetailsModal から呼ばれる。
   */
  protected async enrichDescription(
    videoId: string,
    compositeId: string,
    descEl: HTMLElement,
    loadingEl: HTMLElement,
  ): Promise<void> {
    try {
      const richDesc = await this.manager.fetchRichDescription(videoId);
      if (richDesc !== null) {
        descEl.innerHTML = sanitizeDescriptionHtml(richDesc);
        await this.manager.updateVideoDescription(
          compositeId,
          richDesc,
          "watch",
        );
        // DOMのdata属性も更新
        const item = document.querySelector(
          `.video-item[data-composite-id="${compositeId}"]`,
        );
        if (item instanceof HTMLElement) {
          item.dataset.description = richDesc;
        }
      }
    } catch (error) {
      window.logger.error("リッチ説明文の取得に失敗:", error);
    } finally {
      loadingEl.remove();
    }
  }

  initializeHeaderControls(): void {
    // 検索機能
    const searchExecElement = document.getElementById("searchExec");
    if (searchExecElement) {
      searchExecElement.addEventListener(
        "click",
        this.guardEvent(async () => {
          await this.executeSearch();
        }),
      );
    }

    const searchClearElement = document.getElementById("searchClear");
    if (searchClearElement) {
      searchClearElement.addEventListener("click", () => {
        const searchWordsElement = document.getElementById(
          "searchWords",
        ) as HTMLInputElement;
        if (searchWordsElement) {
          searchWordsElement.value = "";
        }
      });
    }

    // Enterキーでの検索
    const searchWordsElement = document.getElementById("searchWords");
    if (searchWordsElement) {
      searchWordsElement.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          void this.executeSearch();
        }
      });
    }
  }

  async executeSearch(): Promise<void> {
    const optionElement = document.getElementById(
      "searchOption",
    ) as HTMLSelectElement;
    const wordsElement = document.getElementById(
      "searchWords",
    ) as HTMLInputElement;

    if (!optionElement || !wordsElement) {
      await this.showCustomAlert("検索要素が見つかりません");
      return;
    }

    const option = optionElement.value;
    const word = wordsElement.value.trim();

    if (!word) {
      await this.showCustomAlert("検索キーワードが空です。");
      return;
    }

    const [host, type] = option.split("+");
    window.open(
      `https://${host}.nicovideo.jp/${type}/${encodeURIComponent(word)}`,
      "_blank",
    );
  }

  initializeSearchEventListeners(): void {
    // マイリスト検索
    const mylistSearchInput = document.getElementById(
      "mylistSearchInput",
    ) as HTMLInputElement;
    const mylistSearchClear = document.getElementById("mylistSearchClear");

    if (mylistSearchInput) {
      mylistSearchInput.addEventListener("input", () => {
        this.filterMylists(mylistSearchInput.value.toLowerCase());
      });
    }

    if (mylistSearchClear && mylistSearchInput) {
      mylistSearchClear.addEventListener("click", () => {
        mylistSearchInput.value = "";
        this.filterMylists("");
      });
    }

    // 動画検索
    const videoSearchInput = document.getElementById(
      "videoSearchInput",
    ) as HTMLInputElement;
    const videoSearchClear = document.getElementById("videoSearchClear");
    const videoSearchScope = document.getElementById(
      "videoSearchScope",
    ) as HTMLSelectElement | null;

    if (videoSearchInput) {
      videoSearchInput.addEventListener("input", () => {
        this.filterVideos(videoSearchInput.value.toLowerCase());
      });
    }

    if (videoSearchClear && videoSearchInput) {
      videoSearchClear.addEventListener("click", () => {
        videoSearchInput.value = "";
        this.filterVideos("");
      });
    }

    videoSearchScope?.addEventListener("change", () => {
      this.virtualScrollManager.deselectAll();
      void this.loadVideos();
    });
  }

  // マイリストの検索フィルター
  filterMylists(searchText: string): void {
    const mylistItems = document.querySelectorAll(".mylist-item");
    mylistItems.forEach((item) => {
      const nameElement = item.querySelector("span");
      if (!nameElement) return;

      const mylistName = nameElement.textContent?.toLowerCase() || "";

      if (mylistName.includes(searchText)) {
        item.classList.remove("hidden");
      } else {
        item.classList.add("hidden");
      }
    });
  }

  // 動画の検索フィルター（仮想スクロール対応）
  filterVideos(searchText: string): void {
    // 仮想スクロールマネージャーのフィルター機能を使用
    this.virtualScrollManager.setFilter(searchText);
  }

  /** 動画リンク先設定を適用する（インスタンス＋linkifyモジュール） */
  protected applyVideoLinkTarget(target: VideoLinkTarget): void {
    this.videoLinkTarget = target;
    setVideoLinkTarget(target);
  }

  async initializeSettings(): Promise<void> {
    const settings = await this.manager.loadManagerSettings();

    // プルダウンメニューの初期値を設定
    const mylistSort = document.getElementById(
      "mylistSortType",
    ) as HTMLSelectElement;
    const videoSort = document.getElementById(
      "videoSortType",
    ) as HTMLSelectElement;
    const themeSelect = document.getElementById(
      "themeSelect",
    ) as HTMLSelectElement | null;
    const videoLinkTargetSelect = document.getElementById(
      "videoLinkTargetSelect",
    ) as HTMLSelectElement | null;

    if (!mylistSort || !videoSort) {
      window.logger.error("ソート選択要素が見つかりません");
      return;
    }

    mylistSort.value = settings.mylistSortType;
    videoSort.value = settings.videoSortType;
    // テーマ初期値
    const themeValue = (settings as { theme?: string }).theme || "dark-blue";
    if (themeSelect) themeSelect.value = themeValue;
    this.applyTheme(themeValue);

    // 動画リンク先初期値
    const videoLinkTargetValue: VideoLinkTarget =
      settings.videoLinkTarget === "local" ? "local" : "official";
    if (videoLinkTargetSelect)
      videoLinkTargetSelect.value = videoLinkTargetValue;
    this.applyVideoLinkTarget(videoLinkTargetValue);

    const normalizeVideoLinkTarget = (value: string): VideoLinkTarget =>
      value === "local" ? "local" : "official";
    type CurrentManagerSettings = ManagerSettings & {
      theme: string;
      videoLinkTarget: VideoLinkTarget;
    };

    /** 現在のUI上の全設定値を収集する */
    const collectCurrentSettings = (): CurrentManagerSettings => ({
      mylistSortType: mylistSort.value,
      videoSortType: videoSort.value,
      theme: themeSelect ? themeSelect.value : themeValue,
      videoLinkTarget: normalizeVideoLinkTarget(
        videoLinkTargetSelect?.value ?? "official",
      ),
    });

    // 初期表示時に並び替えを実行
    await this.loadMylists(); // マイリスト一覧の並び替え
    if (this.currentMylistId) {
      await this.loadVideos(); // 動画一覧の並び替え
    }

    // 変更イベントの設定
    mylistSort.addEventListener(
      "change",
      this.guardEvent(async () => {
        await this.manager.saveManagerSettings(collectCurrentSettings());
        await this.loadMylists();
      }),
    );

    videoSort.addEventListener(
      "change",
      this.guardEvent(async () => {
        await this.manager.saveManagerSettings(collectCurrentSettings());
        await this.loadVideos();
      }),
    );

    if (themeSelect) {
      themeSelect.addEventListener(
        "change",
        this.guardEvent(async () => {
          const current = collectCurrentSettings();
          await this.manager.saveManagerSettings(current);
          this.applyTheme(current.theme);
        }),
      );
    }

    if (videoLinkTargetSelect) {
      videoLinkTargetSelect.addEventListener(
        "change",
        this.guardEvent(async () => {
          const current = collectCurrentSettings();
          await this.manager.saveManagerSettings(current);
          this.applyVideoLinkTarget(current.videoLinkTarget);
          // 動画リンクを即時更新するために再描画
          if (this.currentMylistId) {
            await this.loadVideos();
          }
        }),
      );
    }
  }

  // キーワード編集モーダルを表示する関数
  async showKeywordEditModal(
    keywordId: number,
    currentKeyword: string,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = document.getElementById("keywordEditModal");
      if (!modal) {
        window.logger.error("キーワード編集モーダルが見つかりません");
        resolve(null);
        return;
      }

      const input = modal.querySelector(
        "#editKeywordInput",
      ) as HTMLInputElement;
      const closeButton = modal.querySelector(".close-button");
      const saveButton = modal.querySelector("#saveKeywordEdit");

      if (!input || !closeButton || !saveButton) {
        window.logger.error("キーワード編集モーダルの要素が見つかりません");
        resolve(null);
        return;
      }

      // 現在のキーワードを入力欄にセット
      input.value = currentKeyword;

      // モーダルを表示
      modal.style.display = "flex";

      // クローズボタンのイベントリスナー
      const closeHandler = () => {
        modal.style.display = "none";
        closeButton.removeEventListener("click", closeHandler);
        saveButton.removeEventListener("click", saveHandler);
        resolve(null);
      };

      // 保存ボタンのイベントリスナー
      const saveHandler = () => {
        const newKeyword = input.value;
        modal.style.display = "none";
        closeButton.removeEventListener("click", closeHandler);
        saveButton.removeEventListener("click", saveHandler);
        resolve(newKeyword);
      };

      closeButton.addEventListener("click", closeHandler);
      saveButton.addEventListener("click", saveHandler);
    });
  }

  // 設定モーダルとFABの初期化
  initializeSettingsModal(): void {
    const fab = document.getElementById("settingsFab") as HTMLButtonElement;
    const modal = document.getElementById("settingsModal") as HTMLElement;
    const closeButton = document.getElementById(
      "settingsModalClose",
    ) as HTMLButtonElement;

    if (!fab || !modal || !closeButton) {
      window.logger.warn("設定モーダルまたはFAB要素が見つかりません");
      return;
    }

    // モーダルを開く
    const openModal = () => {
      modal.classList.add("visible");
      // モーダル内の最初の入力要素にフォーカス
      const firstInput = modal.querySelector("input") as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    };

    // モーダルを閉じる
    const closeModal = () => {
      modal.classList.remove("visible");
      // FABにフォーカスを戻す
      fab.focus();
    };

    // FABクリックでモーダルを開く
    fab.addEventListener("click", openModal);

    // 閉じるボタン
    closeButton.addEventListener("click", closeModal);

    // 背景クリックで閉じる
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Escapeキーで閉じる
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("visible")) {
        closeModal();
      }
    });

    // キーボードショートカット（Ctrl + Shift + S で設定モーダルを開く）
    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.shiftKey && event.code === "KeyS") {
        event.preventDefault();
        if (modal.classList.contains("visible")) {
          closeModal();
        } else {
          openModal();
        }
      }
    });

    window.logger.info("設定モーダルとFABが初期化されました");
  }
}
