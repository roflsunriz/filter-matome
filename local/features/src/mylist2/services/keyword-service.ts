import "@/types/global.d.ts";

import { Mylist2DB } from "@/mylist2/components/database";
import { KeywordInfo } from "@/types/mylist-types";

export class KeywordService {
  private db: Mylist2DB;
  private toMessage(value: unknown): string {
    return value instanceof Error ? value.message : String(value);
  }

  constructor(db: Mylist2DB) {
    this.db = db;
  }

  // キーワードを追加
  async addKeyword(mylistId: number, keyword: string): Promise<number> {
    // 重複チェック
    const isDuplicate = await this.checkDuplicateKeyword(mylistId, keyword);
    if (isDuplicate) {
      throw new Error('このキーワードは既に登録されています');
    }

    const database = await this.db.initDB();
    const transaction = database.transaction(['keywords'], 'readwrite');
    const store = transaction.objectStore('keywords');

    return new Promise<number>((resolve, reject) => {
      const request = store.add({
        mylistId,
        keyword,
        addedAt: Date.now()
      });
      request.onsuccess = () => resolve(request.result as number);
    	request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  // キーワードを取得
  async getKeywords(mylistId: number): Promise<KeywordInfo[]> {
    const database = await this.db.initDB();
    const transaction = database.transaction(["keywords"], "readonly");
    const store = transaction.objectStore("keywords");
    const index = store.index("mylistId");

    return new Promise<KeywordInfo[]>((resolve, reject) => {
      const request = index.getAll(mylistId);
      request.onsuccess = () => resolve(request.result as KeywordInfo[]);
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  // キーワードを削除
  async deleteKeyword(keywordId: number): Promise<void> {
    const database = await this.db.initDB();
    const transaction = database.transaction(["keywords"], "readwrite");
    const store = transaction.objectStore("keywords");

    return new Promise<void>((resolve, reject) => {
      const request = store.delete(keywordId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  // キーワードを移動
  async moveKeyword(keywordId: number, newMylistId: number): Promise<void> {
    const database = await this.db.initDB();
    const transaction = database.transaction(["keywords"], "readwrite");
    const store = transaction.objectStore("keywords");

    return new Promise<void>((resolve, reject) => {
      const request = store.get(keywordId);
      request.onsuccess = () => {
        const keyword = request.result as KeywordInfo;
        if (!keyword) {
          reject(new Error("キーワードが見つかりません"));
          return;
        }

        keyword.mylistId = newMylistId;
        const updateRequest = store.put(keyword);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(new Error(this.toMessage(request.error)));
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  // キーワードを編集
  async updateKeyword(keywordId: number, newKeyword: string): Promise<void> {
    const database = await this.db.initDB();
    const transaction = database.transaction(["keywords"], "readwrite");
    const store = transaction.objectStore("keywords");

    return new Promise<void>((resolve, reject) => {
      const request = store.get(keywordId);
      request.onsuccess = () => {
        const keyword = request.result as KeywordInfo;
        if (!keyword) {
          reject(new Error("キーワードが見つかりません"));
          return;
        }

        keyword.keyword = newKeyword;
        const updateRequest = store.put(keyword);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(new Error(this.toMessage(request.error)));
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  // キーワードの重複チェック
  async checkDuplicateKeyword(mylistId: number, keyword: string): Promise<boolean> {
    const database = await this.db.initDB();
    const transaction = database.transaction(['keywords'], 'readonly');
    const store = transaction.objectStore('keywords');
    const index = store.index('mylistId');

    return new Promise<boolean>((resolve, reject) => {
      const request = index.getAll(mylistId);
      request.onsuccess = () => {
        const keywords = request.result as KeywordInfo[];
        const isDuplicate = keywords.some(k => k.keyword === keyword);
        resolve(isDuplicate);
      };
      request.onerror = () => reject(new Error(this.toMessage(request.error)));
    });
  }

  // キーワードのソート
  sortKeywords(keywords: KeywordInfo[], sortType: string): KeywordInfo[] {
    const [type, order] = sortType.split("_");
    const isAsc = order === "asc";

    return keywords.sort((a, b) => {
      let comparison = 0;

      switch (type) {
        case "title":
          comparison = a.keyword.localeCompare(b.keyword, "ja");
          break;

        case "addedAt":
          comparison = a.addedAt - b.addedAt;
          break;

        default:
          comparison = a.addedAt - b.addedAt;
      }

      return isAsc ? comparison : -comparison;
    });
  }
} 