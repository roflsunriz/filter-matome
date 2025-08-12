"use strict";

import "../types/global-types";
import { IntegratedNicoData, CommentData } from '../types/common-types';
import { CommentField } from '../types/comment-types';
import { createMaterialIcon } from '../common/material-icons.js';
import { estimationUtils } from './shared-utils.js';

/**
 * コメント処理ハンドラー
 */

export class CommentHandler {
  private currentVideoId: string | null = null;

  // videoIdを設定
  setVideoId(videoId: string): void {
    this.currentVideoId = videoId;
  }

  // コメント処理を開始
  async startCommentProcessing(videoId: string): Promise<void> {
    const commentNum = document.getElementById("comment-num")?.textContent ?? "0";
    const videoLength = document.getElementById("video-length")?.textContent ?? "0:00";
    
    window.toastr.info(
      "コメント処理開始。",
      `推定処理時間: ${estimationUtils.calculateProcessingTime(commentNum, videoLength)}`,
      { timeOut: 5000 }
    );
    
    const startTime = performance.now();

    try {
      // common.tsの統合関数を使用してデータを取得
      const nicoData = await window.commonHelper.fetchNicoDataWithComments(videoId);
      if (!nicoData) {
        window.toastr.error(
          "コメント取得に失敗しました。",
          "APIからのレスポンスが取得できませんでした。",
          { timeOut: 5000 }
        );
        return;
      }
      
      window.toastr.info(
        "コメント処理中です。",
        "通信完了。少々お待ちください。",
        { timeOut: 5000 }
      );
      
      this.processComments(nicoData);
      
      const performanceTime = performance.now() - startTime;
      window.toastr.success(
        "処理完了&レンダリング完了しました!",
        `処理時間: ${performanceTime}ミリ秒`,
        { timeOut: 8000 }
      );
      
      // 結果表示エリアへスクロール
      const decodedResults = document.querySelector("#nicovideoDecodedResults");
      if (decodedResults) decodedResults.scrollIntoView({ behavior: "smooth" });
      
    } catch (error) {
      window.logger.error(error);
      window.toastr.error(
        "コメント処理中にエラーが発生しました。",
        error instanceof Error ? error.message : String(error),
        { timeOut: 5000 }
      );
    }
  }

  // コメントを処理
  private processComments(nicoData: IntegratedNicoData): void {
    try {
      const comments = nicoData.comments;

      if (!comments || comments.length === 0) {
        throw new Error("コメントデータが見つかりません");
      }

      // テンプレートの表示
      const template = document.getElementById('commentTemplate');
      if (template) template.style.display = 'block';

      // 基本情報の設定
      const threadUrlElem = document.getElementById('comment-thread-url');
      if (threadUrlElem) {
        threadUrlElem.textContent = nicoData.apiData?.comment?.nvComment?.server + "/v1/threads" || "Unknown URL";
      }
      
      const threadIdElem = document.getElementById('thread-id');
      if (threadIdElem) {
        threadIdElem.textContent = nicoData.mainThread?.id || "Unknown Thread ID";
      }

      // コメントの表示
      this.renderComments(comments);

      // 統計情報の更新
      this.updateStatistics(comments);

    } catch (error: unknown) {
      window.logger.error(error);
      let message = "";
      if (error instanceof Error) {
        message = error.message;
      } else {
        message = String(error);
      }
      window.toastr.error(
        "コメント処理中にエラーが発生しました。",
        message,
        { timeOut: 5000 }
      );
    }
  }

  // コメントをレンダリング
  private renderComments(comments: CommentData[]): void {
    const container = document.getElementById('comments-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    comments.forEach((comment: CommentData) => {
      const commentElement = this.createCommentElement(comment);
      container.appendChild(commentElement);
    });
  }

  // コメント要素を作成
  private createCommentElement(comment: CommentData): HTMLDivElement {
    const div = document.createElement('div');
    div.className = 'comment-item';

    // 重要な情報を上部に表示
    const summaryDiv = this.createCommentSummary(comment);
    
    // 詳細情報を格納するコンテナ
    const detailsDiv = this.createCommentDetails(comment);
    detailsDiv.style.display = 'none';

    // 展開/折りたたみボタン
    const toggleButton = this.createToggleButton(detailsDiv);

    // 構造を組み立て
    div.appendChild(summaryDiv);
    div.appendChild(toggleButton);
    div.appendChild(detailsDiv);

    return div;
  }

  // コメントサマリーを作成
  private createCommentSummary(comment: CommentData): HTMLDivElement {
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'comment-summary';
    summaryDiv.innerHTML = `
      <div class="comment-body-preview">${String(comment.body || '').substring(0, 100)}${String(comment.body || '').length > 100 ? '...' : ''}</div>
      <div class="comment-basic-info">
        <span class="comment-time">${this.formatDate(comment.postedAt || '', 'postedAt')}</span>
        <span class="comment-user">User: ${comment.userId || 'Anonymous'}</span>
        <span class="comment-no">No: ${comment.no || 'N/A'}</span>
      </div>
    `;
    return summaryDiv;
  }

  // コメント詳細を作成
  private createCommentDetails(comment: CommentData): HTMLDivElement {
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'comment-details';

    // 詳細フィールド定義
    const commentFields: CommentField[] = [
      { key: 'id', label: 'ID', className: 'comment_id' },
      { key: 'no', label: 'No', className: 'comment_no' },
      { key: 'vposMs', label: 'vposMs', className: 'vposMs' },
      { key: 'vposMs', label: 'vposMs(整形済み)', className: 'formatted-vposMs', format: (val) => this.formatDate(val, 'vpos') },
      { key: 'body', label: 'コメント内容', className: 'comment_body' },
      { key: 'commands', label: 'コマンド', className: 'comment_commands' },
      { key: 'userId', label: 'ユーザーID', className: 'userId' },
      { key: 'isPremium', label: 'プレミアム', className: 'isPremium' },
      { key: 'score', label: 'スコア', className: 'score' },
      { key: 'postedAt', label: '投稿日時', className: 'postedAt' },
      { key: 'postedAt', label: '投稿日時(整形済み)', className: 'formatted-postedAt', format: (val) => this.formatDate(val, 'postedAt') },
      { key: 'nicoruCount', label: 'ニコる数', className: 'nicoruCount' },
      { key: 'nicoruId', label: 'ニコるID', className: 'nicoruId' },
      { key: 'source', label: 'ソース', className: 'source' },
      { key: 'isMyPost', label: '自分の投稿', className: 'isMyPost' }
    ];

    // 詳細フィールドを作成
    commentFields.forEach(field => {
      const fieldDiv = this.createCommentField(comment, field);
      detailsDiv.appendChild(fieldDiv);
    });

    return detailsDiv;
  }

  // コメントフィールドを作成
  private createCommentField(comment: CommentData, field: CommentField): HTMLDivElement {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'comment-field';
    
    const rawValue = comment[field.key as keyof CommentData];
    const value = field.format ? field.format(rawValue as never) : String(rawValue ?? '');
    
    // デバッグ用ログ（最初の数個のフィールドのみ）
    if (['id', 'body', 'userId', 'no'].includes(field.key)) {
      window.logger.debug(`[DEBUG] Comment field "${field.key}": rawValue="${String(rawValue)}", value="${String(value)}"`);
    }
    
    // コピーボタンを作成
    const copyButton = document.createElement('button');
    copyButton.className = 'copy';
    copyButton.title = value;
    copyButton.onclick = this.handleCommentCopy.bind(this);
    copyButton.dataset.mydata = value;
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'copy-icon';
    iconSpan.innerHTML = createMaterialIcon('content_copy', {
      style: 'outlined',
      color: 'white',
      size: 'small'
    });
    
    const textSpan = document.createElement('span');
    textSpan.textContent = 'コピー';
    
    copyButton.appendChild(iconSpan);
    copyButton.appendChild(textSpan);

    // コンテンツを作成
    const contentDiv = document.createElement('div');
    contentDiv.className = field.className;
    contentDiv.dataset.mydata = value;
    contentDiv.textContent = `${field.label}: ${String(value)}`;

    fieldDiv.appendChild(copyButton);
    fieldDiv.appendChild(contentDiv);
    
    return fieldDiv;
  }

  // 展開/折りたたみボタンを作成
  private createToggleButton(detailsDiv: HTMLDivElement): HTMLButtonElement {
    const toggleButton = document.createElement('button');
    toggleButton.className = 'comment-toggle';
    toggleButton.innerHTML = `
      <span class="toggle-icon">${createMaterialIcon('expand_more', { style: 'outlined', color: 'dark', size: 'small' })}</span>
      <span class="toggle-text">詳細を表示</span>
    `;
    
    toggleButton.onclick = () => {
      const isExpanded = detailsDiv.style.display !== 'none';
      detailsDiv.style.display = isExpanded ? 'none' : 'block';
      
      const icon = toggleButton.querySelector('.toggle-icon');
      const text = toggleButton.querySelector('.toggle-text');
      
      if (icon && text) {
        if (isExpanded) {
          icon.innerHTML = createMaterialIcon('expand_more', { style: 'outlined', color: 'dark', size: 'small' });
          text.textContent = '詳細を表示';
        } else {
          icon.innerHTML = createMaterialIcon('expand_less', { style: 'outlined', color: 'dark', size: 'small' });
          text.textContent = '詳細を非表示';
        }
      }
    };

    return toggleButton;
  }

  // コメントコピー処理
  private handleCommentCopy(event: Event): void {
    const target = event.target as HTMLElement;
    const copyButton = target.closest('.copy') as HTMLElement & { dataset: DOMStringMap };
    
    if (!copyButton) {
      window.logger.error('[DEBUG] Copy button not found');
      return;
    }
    
    const content = copyButton.dataset.mydata ?? "";
    
    // ラベルを取得（次の兄弟要素のコンテンツから）
    const contentDiv = copyButton.nextElementSibling as HTMLElement;
    let label = "";
    if (contentDiv && contentDiv.textContent) {
      const labelMatch = contentDiv.textContent.split(":")[0];
      label = labelMatch ? labelMatch.trim() : "";
    }
    
    window.logger.debug(`[DEBUG] Comment copy - content: "${content}", label: "${label}"`);
    
    if (content && content.trim() !== '') {
      void window.apiUtils.copyToClipboard(content, label);
    } else {
      window.toastr.error(
        `${label}をコピーできませんでした`,
        `データが空です。`,
        { timeOut: 5000 }
      );
      window.logger.error('[DEBUG] Comment copy failed - empty content');
    }
  }

  // 統計情報を更新
  private updateStatistics(comments: CommentData[]): void {
    const jsonLengthElem = document.getElementById('json-length');
    if (jsonLengthElem) jsonLengthElem.textContent = String(comments.length);
    
    const userIdLengthElem = document.getElementById('userid-length');
    if (userIdLengthElem) {
      userIdLengthElem.textContent = String(document.getElementsByClassName('userId').length);
    }
  }

  // 日付フォーマット関数
  private formatDate(data: string | number | boolean | string[], format: string): string {
    // 数値または文字列以外の場合は文字列に変換
    if (typeof data === "boolean") {
      return String(data);
    }
    
    if (Array.isArray(data)) {
      return data.join(", ");
    }

    // dataが数値の場合、ミリ秒から日付に変換
    if (typeof data === "number") {
      const date = new Date(data);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hour = String(date.getHours()).padStart(2, "0");
      const minute = String(date.getMinutes()).padStart(2, "0");
      const second = String(date.getSeconds()).padStart(2, "0");

      return format === "postedAt"
        ? `${year}年${month}月${day}日${hour}時${minute}分${second}秒`
        : `${Math.floor((data / 3600000) % 24)
            .toString()
            .padStart(2, "0")}時間${Math.floor((data / 60000) % 60)}分${(Number(((data % 60000) / 1000).toFixed(0)) < 10 ? "0" : "")}${
            ((data % 60000) / 1000).toFixed(0)
          }秒`;
    }

    // dataが文字列の場合、通常の処理を行う
    const [date, time] = data.split("T");
    const [year, month, day] = date.split("-");
    const [hour, minute, second] = time.split(":");
    return format === "postedAt"
      ? `${year}年${month}月${day}日${hour}時${minute}分${second.split("+")[0]}秒`
      : `${
          Math.floor((Number(data) / 3600000) % 24) < 10
            ? "0" + Math.floor((Number(data) / 3600000) % 24)
            : Math.floor((Number(data) / 3600000) % 24)
        }時間${Math.floor((Number(data) / 60000) % 60)}分${(Number(((Number(data) % 60000) / 1000).toFixed(0)) < 10 ? "0" : "")}${
          ((Number(data) % 60000) / 1000).toFixed(0)
        }秒`;
  }
} 