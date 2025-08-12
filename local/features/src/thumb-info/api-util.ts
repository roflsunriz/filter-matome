"use strict";

import "../types/global-types";
import type { CommentApiResponse } from "../types/comment-types";

/**
 * 純粋なAPI関数集 - ネットワーク通信とデータ変換のみを担当
 */

// 共通のフェッチ関数
const fetchData = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error: unknown) {
    window.logger.error(error);
    let message = "";
    if (error instanceof Error) {
      message = error.message;
    } else {
      message = String(error);
    }
    window.toastr.error(
      `APIからの応答が失敗 (${message})`,
      "データの取得に失敗しました",
      { timeOut: 5000 }
    );
    throw error;
  }
};

// 共通のコピー関数
const copyToClipboard = async (
  content: string,
  label: string
): Promise<void> => {
  try {
    if (!navigator.clipboard) {
      const tempInput = document.createElement("input");
      tempInput.value = content;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      document.body.removeChild(tempInput);
    } else {
      await navigator.clipboard.writeText(content);
    }

    window.toastr.success(
      `${label}をクリップボードにコピーしました！`,
      `コピーした内容: ${content}`,
      { timeOut: 3000 }
    );
  } catch (error: unknown) {
    let message = "";
    if (error instanceof Error) {
      message = error.message;
    } else {
      message = String(error);
    }
    window.toastr.error("コピーに失敗しました", message, { timeOut: 3000 });
  }
};

// APIリクエスト関数
const getApiData = {
  // サムネイル情報取得
  async thumb(url: string): Promise<Document> {
    const response = await fetchData(url);
    const text = await response.text();
    return new DOMParser().parseFromString(text, "text/html");
  },

  // コメント情報取得
  async comment(
    url: string,
    params: object,
    threadKey: string
  ): Promise<CommentApiResponse> {
    const options: RequestInit = {
      method: "POST",
      headers: {
        "x-client-os-type": "others",
        "X-Frontend-Id": "6",
        "X-Frontend-Version": "0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ params, threadKey, additionals: {} }),
    };
    const response = await fetchData(url, options);
    const jsonUnknown = (await response.json()) as unknown;
    return jsonUnknown as CommentApiResponse;
  },
};

// グローバルエクスポート（既存システムとの互換性維持）
window.apiUtils = {
  fetchData,
  copyToClipboard,
  getApiData,
};
