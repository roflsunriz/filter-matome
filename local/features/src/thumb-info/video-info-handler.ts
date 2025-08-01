"use strict";

import "../types/global-types";
import { domUtils } from './shared-utils.js';

/**
 * ビデオ情報取得・表示ハンドラー
 */

export class VideoInfoHandler {
  private currentVideoId: string | null = null;

  // videoIdを設定
  setVideoId(videoId: string): void {
    this.currentVideoId = videoId;
  }

  // ビデオ情報を表示
  async displayVideoInfo(videoId: string): Promise<void> {
    if (!videoId) {
      const apiStatus = document.getElementById('api-status');
      if (apiStatus) apiStatus.textContent = 'Error: No video ID provided';
      return;
    }

    this.currentVideoId = videoId;

    try {
      const apiStatus = document.getElementById('api-status');
      if (apiStatus) apiStatus.textContent = 'Loading...';
      
      // URLパラメータにvideoIdを設定
      domUtils.updateUrlWithVideoId(videoId);
      window.logger.debug(`[DEBUG] URL updated with videoId: ${videoId}`);
      
      // サムネイル情報を取得
      const response = await window.apiUtils.getApiData.thumb(`https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`);
      if (!response) return;
      
      // ビデオ情報を更新
      this.updateVideoInfoDisplay(response, videoId);
      
      if (apiStatus) apiStatus.textContent = 'Success';
      window.logger.debug(`[DEBUG] Video info display completed for: ${videoId}`);
      
    } catch (error: unknown) {
      window.logger.error('Error fetching video info:', error);
      const apiStatus = document.getElementById('api-status');
      if (apiStatus && error instanceof Error) {
        apiStatus.textContent = `Error: ${error.message || 'Unknown error'}`;
      }
    }
  }

  // ビデオ情報の表示を更新
  private updateVideoInfo(doc: Document, videoId: string): void {
    // 基本情報の更新
    domUtils.setElementContent('api-status', doc.getElementsByTagName("nicovideo_thumb_response")[0]?.getAttribute("status") ?? "");
    
    // タイトルの更新
    const docTitle = doc.getElementsByTagName("title")[0]?.innerHTML || 'Unknown Title';
    domUtils.setElementContent('video-title', docTitle);
    
    // メインタイトルも更新
    const titleElem = document.getElementById("video-info-title");
    if (titleElem) {
      titleElem.textContent = `概要情報とコメント:${docTitle}(${videoId})`;
      window.logger.debug(`[DEBUG] Title updated to: ${docTitle}`);
    }
    
    // 各要素にデータを設定
    domUtils.setElementContent('video-id', videoId);
    domUtils.setElementContent('video-description', doc.getElementsByTagName("description")[0]?.innerHTML ?? "");
    
    // サムネイル関連
    const thumbnailUrl = doc.getElementsByTagName("thumbnail_url")[0]?.innerHTML ?? "";
    domUtils.setElementContent('thumbnail-url', thumbnailUrl);
    domUtils.setElementSrc('thumbnail-img', thumbnailUrl);
    domUtils.setElementHref('thumbnail-link', thumbnailUrl);
    
    // メタデータ
    domUtils.setElementContent('first-retrieve', doc.getElementsByTagName("first_retrieve")[0]?.innerHTML ?? "");
    domUtils.setElementContent('video-length', doc.getElementsByTagName("length")[0]?.innerHTML ?? "");
    domUtils.setElementContent('movie-type', doc.getElementsByTagName("movie_type")[0]?.innerHTML ?? "");
    domUtils.setElementContent('size-high', doc.getElementsByTagName("size_high")[0]?.innerHTML ?? "");
    domUtils.setElementContent('size-low', doc.getElementsByTagName("size_low")[0]?.innerHTML ?? "");
    domUtils.setElementContent('view-counter', doc.getElementsByTagName("view_counter")[0]?.innerHTML ?? "");
    domUtils.setElementContent('comment-num', doc.getElementsByTagName("comment_num")[0]?.innerHTML ?? "");
    domUtils.setElementContent('mylist-counter', doc.getElementsByTagName("mylist_counter")[0]?.innerHTML ?? "");
    domUtils.setElementContent('last-res-body', doc.getElementsByTagName("last_res_body")[0]?.innerHTML ?? "");
    
    // 動画URL関連
    const watchUrl = doc.getElementsByTagName("watch_url")[0]?.innerHTML ?? "";
    domUtils.setElementContent('watch-url', watchUrl);
    domUtils.setElementHref('watch-link', watchUrl);
    
    const shortUrl = `https://nico.ms/${videoId}`;
    domUtils.setElementHref('watch-link-short', shortUrl);
    
    // その他の情報
    domUtils.setElementContent('thumb-type', doc.getElementsByTagName("thumb_type")[0]?.innerHTML ?? "");
    domUtils.setElementContent('embeddable', doc.getElementsByTagName("embeddable")[0]?.innerHTML ?? "");
    domUtils.setElementContent('no-live-play', doc.getElementsByTagName("no_live_play")[0]?.innerHTML ?? "");
    
    // サムネイルiframe
    const thumbElem = document.getElementById('video-thumb') as HTMLIFrameElement | null;
    if (thumbElem) thumbElem.src = `https://ext.nicovideo.jp/thumb/${videoId}`;
    
    // タグ関連
    domUtils.setElementContent('tags-domain', doc.getElementsByTagName("tags")[0]?.getAttribute("domain") ?? "");
    this.updateTags(doc);
    
    // ジャンル
    domUtils.setElementContent('genre', doc.getElementsByTagName("genre")[0]?.innerHTML ?? "");
    
    // チャンネル/ユーザー情報の更新
    this.updateCreatorInfo(doc);
    
    // コピーボタンのデータ属性を更新
    this.updateCopyButtons(doc, videoId);
  }

  // タグの更新
  private updateTags(doc: Document): void {
    const tagsContainer = document.getElementById('tags-container');
    if (!tagsContainer) return;
    
    tagsContainer.innerHTML = '';
    const tags = Array.from(doc.getElementsByTagName("tag") || []);
    
    if (tags.length > 0) {
      tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.textContent = tag.innerHTML;
        tagsContainer.appendChild(tagElement);
      });
    } else {
      const noTagsElement = document.createElement('span');
      noTagsElement.textContent = "タグはありません";
      tagsContainer.appendChild(noTagsElement);
    }
  }

  // チャンネル/ユーザー情報の更新
  private updateCreatorInfo(doc: Document): void {
    const channelInfo = document.getElementById('channel-info');
    const userInfo = document.getElementById('user-info');
    
    if (!channelInfo || !userInfo) return;

    try {
      // チャンネル情報を試行
      const chIconUrl = doc.getElementsByTagName("ch_icon_url")[0]?.innerHTML;
      if (!chIconUrl) throw new Error('No channel info');
      
      channelInfo.style.display = 'block';
      userInfo.style.display = 'none';
      
      domUtils.setElementContent('ch-id', doc.getElementsByTagName("ch_id")[0]?.innerHTML ?? "");
      domUtils.setElementContent('ch-name', doc.getElementsByTagName("ch_name")[0]?.innerHTML ?? "");
      domUtils.setElementContent('ch-icon-url', chIconUrl);
      domUtils.setElementHref('ch-icon-link', chIconUrl);
      domUtils.setElementSrc('ch-icon-img', chIconUrl);
      
    } catch {
      // ユーザー情報の場合
      const userIdElement = doc.getElementsByTagName("user_id")[0];
      if (userIdElement) {
        const userId = userIdElement.innerHTML;
        channelInfo.style.display = 'none';
        userInfo.style.display = 'block';
        
        domUtils.setElementContent('user-id', userId);
        
        const userNicknameElement = doc.getElementsByTagName("user_nickname")[0];
        const userIconUrlElement = doc.getElementsByTagName("user_icon_url")[0];
        
        if (userNicknameElement && userIconUrlElement) {
          // 通常のユーザー情報
          const userNickname = userNicknameElement.innerHTML;
          const userIconUrl = userIconUrlElement.innerHTML;
          domUtils.setElementContent('user-nickname', userNickname);
          domUtils.setElementContent('user-icon-url', userIconUrl);
          domUtils.setElementHref('user-icon-link', userIconUrl);
          domUtils.setElementSrc('user-icon-img', userIconUrl);
        } else {
          // 退会済みユーザー
          domUtils.setElementContent('user-nickname', "(退会済みユーザー)");
          domUtils.setElementContent('user-icon-url', "");
          domUtils.setElementHref('user-icon-link', "#");
          domUtils.setElementSrc('user-icon-img', "");
          const userIconImg = document.getElementById('user-icon-img') as HTMLImageElement | null;
          if (userIconImg) userIconImg.alt = "退会済みユーザー";
        }
      } else {
        // user_id自体がない場合
        window.logger.error("user_id element not found");
        channelInfo.style.display = 'none';
        userInfo.style.display = 'none';
      }
    }
  }

  // コピーボタンのデータ属性を更新
  private updateCopyButtons(doc: Document, videoId: string): void {
    const copyData: Record<string, string> = {
      'title': doc.getElementsByTagName("title")[0]?.innerHTML ?? "",
      'videoId': videoId,
      'thumbnailUrl': doc.getElementsByTagName("thumbnail_url")[0]?.innerHTML ?? "",
      'watchUrl': doc.getElementsByTagName("watch_url")[0]?.innerHTML ?? "",
      'watchUrlShort': `https://nico.ms/${videoId}`,
      'channelIcon': doc.getElementsByTagName("ch_icon_url")?.[0]?.innerHTML ?? "",
      'userIcon': doc.getElementsByTagName("user_icon_url")?.[0]?.innerHTML ?? ""
    };

    document.querySelectorAll('.copy').forEach(button => {
      const el = button as HTMLElement & { dataset: DOMStringMap };
      const type = el.dataset.type;
      if (type && copyData[type]) {
        el.dataset.mydata = copyData[type];
      }
    });
  }

  // 外部から利用するためのスタティックメソッドに修正
  private updateVideoInfoDisplay = this.updateVideoInfo;

  // コピー機能
  handleCopy(event: MouseEvent): void {
    const button = event.target as HTMLElement;
    const type = button.getAttribute('data-type');
    
    window.logger.debug(`[DEBUG] handleCopy called with type: ${type}`);
    
    let textToCopy = '';
    let label = '';
    
    switch (type) {
      case 'title':
        textToCopy = document.getElementById('video-title')?.textContent || '';
        label = 'タイトル';
        break;
      case 'videoId':
        textToCopy = document.getElementById('video-id')?.textContent || '';
        label = '動画ID';
        break;
      case 'thumbnailUrl':
        textToCopy = document.getElementById('thumbnail-url')?.textContent || '';
        label = 'サムネイルURL';
        break;
      case 'watchUrl':
        textToCopy = document.getElementById('watch-url')?.textContent || '';
        label = '視聴URL';
        break;
      case 'watchUrlShort':
        textToCopy = `https://nico.ms/${document.getElementById('video-id')?.textContent || ''}`;
        label = '短縮視聴URL';
        break;
      case 'channelIcon':
        textToCopy = document.getElementById('ch-icon-url')?.textContent || '';
        label = 'チャンネルアイコンURL';
        break;
      case 'userIcon':
        textToCopy = document.getElementById('user-icon-url')?.textContent || '';
        label = 'ユーザーアイコンURL';
        break;
      default:
        window.logger.warn(`[DEBUG] Unknown copy type: ${type}`);
        break;
    }
    
    window.logger.debug(`[DEBUG] textToCopy: "${textToCopy}", label: "${label}"`);
    
    if (textToCopy && textToCopy.trim() !== '') {
      window.apiUtils.copyToClipboard(textToCopy, label);
    } else {
      window.toastr.error(
        `${label}をコピーできませんでした`,
        `対象の要素が見つからないか、内容が空です。type: ${type}`,
        { timeOut: 5000 }
      );
      window.logger.error(`[DEBUG] Copy failed - empty text for type: ${type}`);
    }
  }
} 