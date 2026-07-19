import "@/types/global.d.ts";

import { hydrateMaterialIconImages } from "@/common/material-icons";
import { setThumbnailSource } from "@/common/thumbnail-fallback";
import type { KeywordInfo } from "@/types/mylist-types";
import { DBVideo as VideoInfo } from "@/types/video-types";

import { getActionMenuManager } from "@/mylist2/ui/action-menu";
import { createAvailabilityBadge } from "@/mylist2/ui/availability-badge";
import { type VirtualScrollItem } from "@/mylist2/ui/virtual-scroll";
import { buildVideoUrl, needsAvailabilityCheck } from "@/mylist2/utils/linkify";
import { Mylist2UICore } from "./mylist-ui-core";

/** 動画・キーワード項目の描画と操作メニュー。 */
export abstract class Mylist2UIRendering extends Mylist2UICore {
  // 動画詳細モーダルの表示（メモ編集対応）
  protected abstract showVideoDetailsModal(
    video: VideoInfo,
    compositeId?: string,
    memoText?: string,
  ): Promise<void>;
  protected abstract initializeHeaderControls(): void;
  protected abstract initializeSearchEventListeners(): void;
  protected abstract initializeSettings(): Promise<void>;

  /**
   * アクショントリガークリック時の処理
   */
  protected handleActionTriggerClick(trigger: HTMLElement): void {
    const itemElement = trigger.closest(
      ".video-item, .keyword-item",
    ) as HTMLElement;
    if (!itemElement) return;

    const actionMenu = getActionMenuManager();
    const isKeyword = itemElement.classList.contains("keyword-item");

    if (isKeyword) {
      const keywordIdStr = itemElement.dataset.id;
      if (!keywordIdStr) return;

      const keywordId = parseInt(keywordIdStr, 10);
      const keywordData = this.currentKeywords.find((k) => k.id === keywordId);
      if (!keywordData) return;

      actionMenu.show(trigger, {
        type: "keyword",
        data: keywordData,
        element: itemElement,
      });
    } else {
      const compositeId = itemElement.dataset.compositeId;
      if (!compositeId) return;

      const videoData = this.currentVideos.find((v) => v.id === compositeId);
      if (!videoData) return;

      actionMenu.show(trigger, {
        type: "video",
        data: videoData,
        element: itemElement,
      });
    }
  }

  protected async handleVideoDetailsClick(trigger: HTMLElement): Promise<void> {
    const itemElement = trigger.closest<HTMLElement>(".video-item");
    const compositeId = itemElement?.dataset.compositeId;
    if (!itemElement || !compositeId) return;

    const videoData = this.currentVideos.find(
      (video) => video.id === compositeId,
    );
    if (!videoData) return;

    await this.showVideoDetailsModal(
      videoData,
      compositeId,
      itemElement.dataset.memo ?? "",
    );
  }

  protected initializeAdditionalControls(): void {
    this.initializeHeaderControls();
    this.initializeSearchEventListeners();
    void this.initializeSettings();
  }

  renderVideoList(videos: VideoInfo[], keywords: KeywordInfo[]): void {
    // 現在のデータを保持（アクションメニューで参照するため）
    this.currentVideos = videos;
    this.currentKeywords = keywords;

    // 仮想スクロール用のデータを構築
    const items: VirtualScrollItem[] = [
      ...keywords.map((k): VirtualScrollItem => ({ type: "keyword", data: k })),
      ...videos.map((v): VirtualScrollItem => ({ type: "video", data: v })),
    ];

    // 仮想スクロールマネージャーにデータを設定
    this.virtualScrollManager.setData(items);
  }

  renderVideoItem(video: VideoInfo): HTMLElement {
    // 保持しているテンプレートを使用
    if (!this.videoItemTemplate) {
      window.logger.error("動画テンプレートが初期化されていません！");
      // フォールバック用の要素を作成（シンプル化済み）
      const fallbackElement = document.createElement("div");
      fallbackElement.className = "video-item";
      fallbackElement.tabIndex = 0;
      fallbackElement.setAttribute("role", "button");
      fallbackElement.setAttribute("aria-label", `動画の詳細: ${video.title}`);
      const linkCtx = { authorName: video.authorName, title: video.title };
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "video-select";
      const thumbnail = document.createElement("img");
      thumbnail.className = "video-thumbnail";
      setThumbnailSource(thumbnail, video.thumbnailUrl);
      thumbnail.alt = "サムネイル";
      const info = document.createElement("div");
      info.className = "video-info";
      const title = document.createElement("div");
      title.className = "video-title";
      const titleLink = document.createElement("a");
      titleLink.href = buildVideoUrl(video.originalId, linkCtx);
      titleLink.target = "_blank";
      titleLink.textContent = video.title;
      if (needsAvailabilityCheck(video.originalId, linkCtx)) {
        titleLink.dataset.needsApiCheck = "true";
        titleLink.dataset.videoId = video.originalId;
      }
      title.appendChild(titleLink);
      const badge = createAvailabilityBadge(video);
      if (badge) title.appendChild(badge);
      const stats = document.createElement("div");
      stats.className = "video-stats";
      const meta = document.createElement("div");
      meta.className = "video-meta";
      [
        [
          "view-count",
          "visibility",
          video.viewCount.toLocaleString(),
          "再生数",
        ],
        [
          "comment-count",
          "comment",
          video.commentCount.toLocaleString(),
          "コメント数",
        ],
        [
          "mylist-count",
          "bookmark",
          video.mylistCount.toLocaleString(),
          "マイリスト数",
        ],
        [
          "video-length",
          "schedule",
          `${Math.floor(video.length / 60)}:${String(video.length % 60).padStart(2, "0")}`,
          "再生時間",
        ],
      ].forEach(([className, iconName, text, label]) => {
        const span = document.createElement("span");
        span.className = className;
        span.title = label;
        this.setIconValue(span, iconName, text);
        stats.appendChild(span);
      });
      [
        ["video-author", "person", video.authorName, "投稿者"],
        [
          "video-upload-date",
          "upload",
          new Date(video.uploadedAt).toLocaleDateString(),
          "投稿日",
        ],
      ].forEach(([className, iconName, text, label]) => {
        const span = document.createElement("span");
        span.className = className;
        span.title = label;
        this.setIconValue(span, iconName, text);
        meta.appendChild(span);
      });
      info.append(title, stats, meta);
      fallbackElement.append(checkbox, thumbnail, info);
      fallbackElement.dataset.id = video.originalId;
      fallbackElement.dataset.compositeId = video.id;
      return fallbackElement;
    }

    const clone = this.videoItemTemplate.content.cloneNode(
      true,
    ) as DocumentFragment;
    const item = clone.querySelector(".video-item") as HTMLElement;
    if (!item) {
      window.logger.error("動画アイテム要素が見つかりません");
      return document.createElement("div");
    }

    // データの設定
    item.dataset.id = video.originalId;
    item.dataset.compositeId = video.id;
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `動画の詳細: ${video.title}`);
    if (video.description) {
      item.dataset.description = video.description;
    }
    if (video.tags && video.tags.length > 0) {
      try {
        item.dataset.tags = JSON.stringify(video.tags);
      } catch (err) {
        void err;
      }
    }
    // メモ（存在すれば）
    const memoValue = (video as unknown as { memo?: string }).memo;
    if (memoValue !== undefined) {
      item.dataset.memo = String(memoValue);
    }

    // サムネイルと基本情報
    const thumbnailElement = item.querySelector(
      ".video-thumbnail",
    ) as HTMLImageElement;
    if (thumbnailElement) {
      setThumbnailSource(thumbnailElement, video.thumbnailUrl);
    }

    // タイトルをリンクとして設定
    const titleElement = item.querySelector(".video-title");
    if (titleElement) {
      const titleLink = document.createElement("a");
      const trimmedTitle = video.title.replace(
        /^[\p{White_Space}\p{Cf}]+|[\p{White_Space}\p{Cf}]+$/gu,
        "",
      );
      const titleText = trimmedTitle ? trimmedTitle : "無題";
      const linkContext = { authorName: video.authorName, title: video.title };
      titleLink.href = buildVideoUrl(video.originalId, linkContext);
      titleLink.textContent = titleText;
      titleLink.className = "video-title-link";
      titleLink.target = "_blank";
      if (needsAvailabilityCheck(video.originalId, linkContext)) {
        titleLink.dataset.needsApiCheck = "true";
        titleLink.dataset.videoId = video.originalId;
      }
      titleElement.appendChild(titleLink);
      const badge = createAvailabilityBadge(video);
      if (badge) {
        titleElement.appendChild(badge);
      }
    }

    // 統計情報の設定
    this.setVideoStats(item, video);

    hydrateMaterialIconImages(item);

    return item;
  }

  protected setVideoStats(item: HTMLElement, video: VideoInfo): void {
    const viewCountElement = item.querySelector(".view-count");
    if (viewCountElement) {
      this.setIconValue(
        viewCountElement,
        "visibility",
        video.viewCount.toLocaleString(),
      );
    }

    const commentCountElement = item.querySelector(".comment-count");
    if (commentCountElement) {
      this.setIconValue(
        commentCountElement,
        "comment",
        video.commentCount.toLocaleString(),
      );
    }

    const mylistCountElement = item.querySelector(".mylist-count");
    if (mylistCountElement) {
      this.setIconValue(
        mylistCountElement,
        "bookmark",
        video.mylistCount.toLocaleString(),
      );
    }

    const lengthElement = item.querySelector(".video-length");
    if (lengthElement) {
      const minutes = Math.floor(video.length / 60);
      const seconds = video.length % 60;
      this.setIconValue(
        lengthElement,
        "schedule",
        `${minutes}:${String(seconds).padStart(2, "0")}`,
      );
    }

    const authorElement = item.querySelector(".video-author");
    if (authorElement) {
      this.setIconValue(authorElement, "person", video.authorName);
    }

    const uploadDateElement = item.querySelector(".video-upload-date");
    if (uploadDateElement) {
      this.setIconValue(
        uploadDateElement,
        "upload",
        new Date(video.uploadedAt).toLocaleDateString(),
      );
    }
  }

  protected setIconValue(
    element: Element,
    iconName: string,
    value: string,
  ): void {
    element.replaceChildren();
    const icon = document.createElement("img");
    icon.className = "material-icon icon-white material-icon-small";
    icon.dataset.style = "outlined";
    icon.dataset.icon = iconName;
    icon.alt = "";
    icon.loading = "lazy";
    element.append(icon, document.createTextNode(value));
    hydrateMaterialIconImages(element);
  }

  renderKeywordItem(keyword: KeywordInfo): HTMLElement {
    if (!this.keywordItemTemplate) {
      window.logger.error("キーワードテンプレートが初期化されていません！");
      const fallbackElement = document.createElement("div");
      fallbackElement.className = "video-item keyword-item";
      const encodedKeyword = encodeURIComponent(keyword.keyword);
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "video-select";
      const icon = document.createElement("div");
      icon.className = "keyword-icon";
      const iconImg = document.createElement("img");
      iconImg.className = "material-icon icon-dark";
      iconImg.dataset.style = "outlined";
      iconImg.dataset.icon = "search";
      iconImg.alt = "search";
      iconImg.loading = "lazy";
      icon.appendChild(iconImg);
      const info = document.createElement("div");
      info.className = "video-info";
      const title = document.createElement("div");
      title.className = "video-title";
      const keywordText = document.createElement("span");
      keywordText.className = "keyword-text";
      keywordText.textContent = keyword.keyword;
      title.appendChild(keywordText);
      const meta = document.createElement("div");
      meta.className = "keyword-meta";
      const addedDate = document.createElement("span");
      addedDate.className = "keyword-added-date";
      addedDate.textContent = `追加日時: ${new Date(keyword.addedAt).toLocaleString()}`;
      meta.appendChild(addedDate);
      const links = document.createElement("div");
      links.className = "keyword-links";
      [
        [
          "keyword-search",
          `https://www.nicovideo.jp/search/${encodedKeyword}`,
          "キーワード検索",
        ],
        [
          "tag-search",
          `https://www.nicovideo.jp/tag/${encodedKeyword}`,
          "タグ検索",
        ],
        [
          "mylist-search",
          `https://www.nicovideo.jp/mylist_search/${encodedKeyword}`,
          "マイリスト検索",
        ],
      ].forEach(([className, href, text]) => {
        const anchor = document.createElement("a");
        anchor.className = className;
        anchor.href = href;
        anchor.target = "_blank";
        anchor.textContent = text;
        links.appendChild(anchor);
      });
      const actionButton = document.createElement("button");
      actionButton.className = "action-trigger";
      actionButton.type = "button";
      actionButton.setAttribute("aria-label", "アクションメニュー");
      actionButton.title = "アクション";
      actionButton.textContent = "⋮";
      info.append(title, meta, links);
      fallbackElement.append(checkbox, icon, info, actionButton);
      if (keyword.id !== undefined) {
        fallbackElement.dataset.id = keyword.id.toString();
      }
      fallbackElement.dataset.type = "keyword";
      hydrateMaterialIconImages(fallbackElement);
      return fallbackElement;
    }

    const clone = this.keywordItemTemplate.content.cloneNode(
      true,
    ) as DocumentFragment;
    const item = clone.querySelector(".keyword-item") as HTMLElement;
    if (!item) {
      window.logger.error("キーワードアイテム要素が見つかりません");
      return document.createElement("div");
    }

    if (keyword.id !== undefined) {
      item.dataset.id = keyword.id.toString();
    }
    item.dataset.type = "keyword";

    const keywordText = item.querySelector(".keyword-text");
    if (keywordText) {
      keywordText.textContent = keyword.keyword;
    }

    // 検索リンクの設定
    this.setKeywordSearchLinks(item, keyword.keyword);

    // 追加日時
    const dateElement = item.querySelector(".keyword-added-date");
    if (dateElement) {
      dateElement.textContent = `追加日時: ${new Date(keyword.addedAt).toLocaleString()}`;
    }

    hydrateMaterialIconImages(item);

    return item;
  }

  protected setKeywordSearchLinks(item: HTMLElement, keyword: string): void {
    const encodedKeyword = encodeURIComponent(keyword);

    const keywordSearchLink = item.querySelector(
      ".keyword-search",
    ) as HTMLAnchorElement;
    if (keywordSearchLink) {
      keywordSearchLink.href = `https://www.nicovideo.jp/search/${encodedKeyword}`;
    }

    const tagSearchLink = item.querySelector(
      ".tag-search",
    ) as HTMLAnchorElement;
    if (tagSearchLink) {
      tagSearchLink.href = `https://www.nicovideo.jp/tag/${encodedKeyword}`;
    }

    const mylistSearchLink = item.querySelector(
      ".mylist-search",
    ) as HTMLAnchorElement;
    if (mylistSearchLink) {
      mylistSearchLink.href = `https://www.nicovideo.jp/mylist_search/${encodedKeyword}`;
    }
  }

  /**
   * 動画リストのイベント設定
   * 仮想スクロール対応: イベントは initializeVirtualScroll で委譲方式で設定済み
   */
  protected setupVideoListEvents(_videoList: HTMLElement): void {
    // 仮想スクロールとアクションメニューを使用するため、
    // 個別のボタンイベント設定は不要
    // イベントは initializeVirtualScroll() で委譲方式で処理
  }
}
