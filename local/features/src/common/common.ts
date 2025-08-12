"use strict";

// グローバル型定義はglobal.d.tsで管理されているのじゃ
import "../types/global.d.ts";
import { 
  NicoApiData, 
  CommentData, 
  IntegratedNicoData, 
  ExtendedFetchWatchPageResult,
  FetchOptions,
  CommentApiResponse,
  NicoApiServerResponse,
  CommentThread,
} from "../types/common-types";

window.commonHelper = {
  // 共通のfetch関数
  fetchRequest: (url: string, options: FetchOptions = {}): Promise<Response> => {
    const defaultOptions: FetchOptions = {
      method: 'GET',
      headers: {},
      ...options
    };
    
    return fetch(url, defaultOptions);
  },

  checkCache404: (url: string): Promise<boolean | void> => {
    return window.commonHelper.fetchRequest(url)
      .then((response) => {
        if (response.ok === true) {
          return true;
        } else {
          return false;
        }
      })
      .catch((err) => {
        console.error(err);
      });
  },

  fetchWatchPage: async (SMID?: string): Promise<ExtendedFetchWatchPageResult | void> => {
    SMID = SMID ? SMID : /[ns][mo][0-9]+/.exec(location.pathname)?.[0];
    if (!SMID) {
      console.error('SMIDが取得できませんでした');
      return;
    }
    
    try {
      const response = await window.commonHelper.fetchRequest("https://www.nicovideo.jp/watch/" + SMID);
      
      if (!response.ok) {
        console.error("HTTP status code : " + response.status);
        console.error("HTTP status Text : " + response.statusText);
        throw new Error(String(response.status));
      }
      
      const text = await response.text();
      const doc = new DOMParser().parseFromString(text, "text/html");
      
      const serverContextRaw: unknown = JSON.parse(doc.querySelector('meta[name="server-context"]')?.getAttribute('content') || '{}');
      const serverContext = (serverContextRaw && typeof serverContextRaw === 'object') ? serverContextRaw as Record<string, unknown> : {};
      const serverResponseContent = doc.querySelector('meta[name="server-response"]')?.getAttribute('content') || '{}';
      const serverResponseUnknown: unknown = JSON.parse(decodeURIComponent(serverResponseContent));
      if (!serverResponseUnknown || typeof serverResponseUnknown !== 'object') {
        throw new Error('Invalid server response');
      }
      const serverResponse = serverResponseUnknown as NicoApiServerResponse;
      
      return {
        serverContext: serverContext,
        serverResponse: serverResponse,
        apiData: serverResponse.data.response,
      };
    } catch (error) {
      console.error(error);
    }
  },

  // ニコニコ動画のコメントデータを取得する関数
  fetchNicoComments: async (apiData: NicoApiData): Promise<{ comments: CommentData[], mainThread: CommentThread } | void> => {
    try {
      const commentServer = apiData.comment.nvComment.server + "/v1/threads";
      
      const requestBody = {
        params: apiData.comment.nvComment.params,
        threadKey: apiData.comment.nvComment.threadKey
      };
      
      const response = await window.commonHelper.fetchRequest(commentServer, {
        method: 'POST',
        headers: {
          "x-client-os-type": "others",
          "X-Frontend-Id": "6",
          "X-Frontend-Version": "0",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        console.error("コメントデータ取得エラー: " + response.status);
        throw new Error(`コメントAPI Error: ${response.status}`);
      }
      
      const commentData = await response.json() as CommentApiResponse;
      
      // メインスレッドを選択（fork === "main"かつcommentCountが最多）
      const mainThread = commentData.data.threads
        .filter(thread => thread.fork === "main")
        .reduce((prev, current) => {
          return (prev.commentCount > current.commentCount) ? prev : current;
        });
      
      if (!mainThread) {
        console.error("メインスレッドが見つかりません");
        return { comments: [], mainThread: { id: "", fork: "main", commentCount: 0, comments: [] } };
      }
      
      return {
        comments: mainThread.comments,
        mainThread: mainThread
      };
    } catch (error) {
      console.error("コメントデータ取得エラー:", error);
    }
  },

  // ニコニコ動画のAPIデータとコメントデータを一度に取得するヘルパー関数
  fetchNicoDataWithComments: async (SMID?: string): Promise<IntegratedNicoData | void> => {
    try {
      // 1. まずAPIデータを取得
      const watchPageResult = await window.commonHelper.fetchWatchPage(SMID);
      if (!watchPageResult) {
        console.error("ウォッチページデータが取得できませんでした");
        return;
      }
      
      // 2. コメントデータを取得（mainThreadも含む）
      const commentResult = await window.commonHelper.fetchNicoComments(watchPageResult.apiData);
      if (!commentResult) {
        console.error("コメントデータが取得できませんでした");
        return;
      }
      
      return {
        apiData: watchPageResult.apiData,
        comments: commentResult.comments,
        mainThread: commentResult.mainThread
      };
    } catch (error) {
      console.error("統合データ取得エラー:", error);
    }
  },
};

// NicoCommon名前空間はheader.tsで初期化される

export {};
