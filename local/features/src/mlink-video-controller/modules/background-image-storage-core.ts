/**
 * 背景画像設定管理クラス
 * IndexedDBを使用して背景画像の設定を保存・管理する
 */

import { BackgroundImageItem } from "@/types/background-image-types";
import { validateImage } from "image-validator";

// データベース設定
const DB_NAME = "BackgroundImageSettingsDB";
const STORE_NAME = "backgroundImages";
const DB_VERSION = 2; // バージョンアップ：マイグレーション機能対応
const METADATA_STORE_NAME = "metadata";
/** 背景画像のIndexedDB接続・CRUD・入力検証。 */
export abstract class BackgroundImageStorageCore {
  /**
   * 設定をエクスポート
   */
  protected abstract exportSettings(): Promise<string>;
  /**
   * ユニークIDを生成
   */
  protected abstract generateId(): string;
  protected db: IDBDatabase | null = null;
  protected eventTarget = new EventTarget();
  protected persistenceEnabled = false;
  protected migrationStatus: "none" | "inProgress" | "completed" | "failed" =
    "none";

  // デフォルト背景画像（初期状態では空）
  protected readonly DEFAULT_IMAGES: Omit<
    BackgroundImageItem,
    "id" | "createdAt" | "updatedAt"
  >[] = [];

  /**
   * イベントリスナーを追加
   */
  public addEventListener(type: string, listener: EventListener): void {
    this.eventTarget.addEventListener(type, listener);
  }

  /**
   * イベントリスナーを削除
   */
  public removeEventListener(type: string, listener: EventListener): void {
    this.eventTarget.removeEventListener(type, listener);
  }

  /**
   * イベントを発火
   */
  protected dispatchEvent(event: Event): void {
    this.eventTarget.dispatchEvent(event);
  }

  /**
   * 永続化ストレージの要求
   */
  public async requestPersistentStorage(): Promise<boolean> {
    try {
      if (navigator.storage && navigator.storage.persist) {
        const isPersistent = await navigator.storage.persist();
        this.persistenceEnabled = isPersistent;

        if (isPersistent) {
          window.logger.info(
            "[BackgroundImageSettings] 永続化ストレージが有効になりました",
          );
          this.dispatchEvent(
            new CustomEvent("persistenceEnabled", {
              detail: { enabled: true },
            }),
          );
        } else {
          window.logger.warn(
            "[BackgroundImageSettings] 永続化ストレージの要求が拒否されました",
          );
        }

        return isPersistent;
      } else {
        window.logger.warn(
          "[BackgroundImageSettings] 永続化ストレージAPIがサポートされていません",
        );
        return false;
      }
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] 永続化ストレージ要求でエラー:",
        error,
      );
      return false;
    }
  }

  /**
   * ストレージ使用状況を取得
   */
  public async getStorageUsage(): Promise<{
    usage: number;
    quota: number;
    persistent: boolean;
  }> {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const persistent = await navigator.storage.persisted();

        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          persistent: persistent || false,
        };
      }

      return { usage: 0, quota: 0, persistent: false };
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] ストレージ使用状況取得エラー:",
        error,
      );
      return { usage: 0, quota: 0, persistent: false };
    }
  }

  /**
   * データベースマイグレーション実行
   */
  protected async performMigration(
    db: IDBDatabase,
    oldVersion: number,
    newVersion: number,
  ): Promise<void> {
    try {
      this.migrationStatus = "inProgress";
      window.logger.info(
        `[BackgroundImageSettings] データベースマイグレーション開始: ${oldVersion} -> ${newVersion}`,
      );

      // バージョン1からバージョン2への移行
      if (oldVersion < 2) {
        // メタデータストアを作成
        if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
          const _metadataStore = db.createObjectStore(METADATA_STORE_NAME, {
            keyPath: "key",
          });
          window.logger.info(
            "[BackgroundImageSettings] メタデータストアを作成しました",
          );
        }

        // 既存データのバックアップ情報を保存
        await this.saveMigrationMetadata(db, oldVersion, newVersion);
      }

      this.migrationStatus = "completed";
      window.logger.info(
        "[BackgroundImageSettings] データベースマイグレーション完了",
      );

      this.dispatchEvent(
        new CustomEvent("migrationCompleted", {
          detail: { oldVersion, newVersion },
        }),
      );
    } catch (error) {
      this.migrationStatus = "failed";
      window.logger.error(
        "[BackgroundImageSettings] マイグレーション失敗:",
        error,
      );

      this.dispatchEvent(
        new CustomEvent("migrationFailed", {
          detail: {
            oldVersion,
            newVersion,
            error: error instanceof Error ? error.message : String(error),
          },
        }),
      );

      throw error;
    }
  }

  /**
   * マイグレーション メタデータを保存
   */
  protected async saveMigrationMetadata(
    db: IDBDatabase,
    oldVersion: number,
    newVersion: number,
  ): Promise<void> {
    try {
      const transaction = db.transaction([METADATA_STORE_NAME], "readwrite");
      const store = transaction.objectStore(METADATA_STORE_NAME);

      const metadata = {
        key: "migrationHistory",
        migrations: [
          {
            fromVersion: oldVersion,
            toVersion: newVersion,
            migratedAt: new Date().toISOString(),
            success: true,
          },
        ],
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(metadata);
        request.onsuccess = () => resolve();
        request.onerror = () => {
          const err = request.error;
          reject(new Error(err instanceof Error ? err.message : String(err)));
        };
      });

      window.logger.info(
        "[BackgroundImageSettings] マイグレーションメタデータを保存しました",
      );
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] マイグレーションメタデータ保存エラー:",
        error,
      );
    }
  }

  /**
   * データベースの整合性チェック
   */
  protected async validateDatabaseIntegrity(): Promise<boolean> {
    try {
      // 基本的な整合性チェック
      const images = await this.getAllImages();

      for (const image of images) {
        if (!image.id || !image.name || !image.type || !image.data) {
          window.logger.warn(
            `[BackgroundImageSettings] 不正なデータを検出: ${image.id}`,
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] データベース整合性チェック失敗:",
        error,
      );
      return false;
    }
  }

  /**
   * 自動バックアップ作成
   */
  public async createAutoBackup(): Promise<void> {
    try {
      const backupData = await this.exportSettings();
      const timestamp = new Date().toISOString();
      const backupKey = `autoBackup_${timestamp}`;

      // ローカルストレージにバックアップ保存（容量制限に注意）
      try {
        localStorage.setItem(backupKey, backupData);

        // 古いバックアップを削除（最新5個まで保持）
        await this.cleanupOldBackups();

        window.logger.info(
          "[BackgroundImageSettings] 自動バックアップを作成しました",
        );
      } catch (storageError) {
        window.logger.warn(
          "[BackgroundImageSettings] ローカルストレージへのバックアップ保存に失敗:",
          storageError,
        );
      }
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] 自動バックアップ作成エラー:",
        error,
      );
    }
  }

  /**
   * 古いバックアップをクリーンアップ
   */
  protected async cleanupOldBackups(): Promise<void> {
    try {
      await Promise.resolve();
      const backupKeys: string[] = [];

      // バックアップキーを収集
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("autoBackup_")) {
          backupKeys.push(key);
        }
      }

      // 日付でソート（新しい順）
      backupKeys.sort((a, b) => {
        const dateA = a.replace("autoBackup_", "");
        const dateB = b.replace("autoBackup_", "");
        return dateB.localeCompare(dateA);
      });

      // 5個を超える分を削除
      if (backupKeys.length > 5) {
        for (let i = 5; i < backupKeys.length; i++) {
          localStorage.removeItem(backupKeys[i]);
        }
        window.logger.info(
          `[BackgroundImageSettings] ${backupKeys.length - 5}個の古いバックアップを削除しました`,
        );
      }
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] バックアップクリーンアップエラー:",
        error,
      );
    }
  }

  /**
   * IndexedDBを初期化
   */
  protected async initializeDB(
    repairAttempted: boolean = false,
  ): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    // 永続化ストレージを要求
    await this.requestPersistentStorage();

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        window.logger.error(
          "[BackgroundImageSettings] IndexedDBを開けませんでした",
        );
        reject(new Error("IndexedDBを開けませんでした"));
      };

      request.onsuccess = async () => {
        this.db = request.result;

        try {
          this.validateSchema(this.db);
        } catch (error) {
          this.db.close();
          this.db = null;

          if (repairAttempted) {
            reject(error instanceof Error ? error : new Error(String(error)));
            return;
          }

          window.logger.warn(
            "[BackgroundImageSettings] IndexedDBの破損を検出したため再作成します:",
            error,
          );
          try {
            await this.deleteDatabase();
            resolve(await this.initializeDB(true));
          } catch (repairError) {
            reject(
              repairError instanceof Error
                ? repairError
                : new Error(String(repairError)),
            );
          }
          return;
        }

        try {
          // データベースの整合性をチェック
          const isValid = await this.validateDatabaseIntegrity();
          if (!isValid) {
            window.logger.warn(
              "[BackgroundImageSettings] データベース整合性に問題があります",
            );
          }

          // 自動バックアップ作成
          await this.createAutoBackup();
        } catch (error) {
          window.logger.warn(
            "[BackgroundImageSettings] データベース整合性チェックまたはバックアップに失敗:",
            error,
          );
        }

        resolve(this.db);
      };

      request.onupgradeneeded = async (event) => {
        const db = request.result;
        const oldVersion = event.oldVersion;

        // 基本的なストア作成
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("name", "name", { unique: false });
          store.createIndex("type", "type", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
          window.logger.info(
            "[BackgroundImageSettings] メインストアを作成しました",
          );
        }

        // メタデータストア作成
        if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
          const _metadataStore = db.createObjectStore(METADATA_STORE_NAME, {
            keyPath: "key",
          });
          window.logger.info(
            "[BackgroundImageSettings] メタデータストアを作成しました",
          );
        }

        // マイグレーション実行
        if (oldVersion > 0) {
          await this.performMigration(db, oldVersion, DB_VERSION);
        }
      };
    });
  }

  protected validateSchema(db: IDBDatabase): void {
    const expectedSchema: Record<string, string[]> = {
      [STORE_NAME]: ["name", "type", "createdAt", "updatedAt"],
      [METADATA_STORE_NAME]: [],
    };

    Object.entries(expectedSchema).forEach(([storeName, indexNames]) => {
      if (!db.objectStoreNames.contains(storeName)) {
        throw new Error(`Missing object store: ${storeName}`);
      }

      if (indexNames.length === 0) {
        return;
      }

      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      indexNames.forEach((indexName) => {
        if (!store.indexNames.contains(indexName)) {
          throw new Error(`Missing index: ${storeName}.${indexName}`);
        }
      });
    });
  }

  protected deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        const error = request.error;
        reject(error instanceof Error ? error : new Error(String(error)));
      };
      request.onblocked = () =>
        reject(new Error("IndexedDB deletion was blocked"));
    });
  }

  /**
   * 設定を初期化（デフォルト画像を追加）
   */
  public async initializeSettings(): Promise<void> {
    try {
      await this.initializeDB();

      // 既存の設定があるかチェック
      const existingImages = await this.getAllImages();

      if (existingImages.length === 0) {
        // デフォルト画像を追加
        for (const defaultImage of this.DEFAULT_IMAGES) {
          await this.addImage(
            defaultImage.name,
            defaultImage.type,
            defaultImage.data,
          );
        }

        // 最初の画像を選択状態にする
        const images = await this.getAllImages();
        if (images.length > 0) {
          await this.setSelectedImage(images[0].id);
        }
      }
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] 設定の初期化に失敗しました:",
        error,
      );
      throw error;
    }
  }

  /**
   * 背景画像を追加
   */
  public async addImage(
    name: string,
    type: "url" | "file",
    data: string,
  ): Promise<string> {
    try {
      const db = await this.initializeDB();
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      const id = this.generateId();
      const now = new Date().toISOString();

      const imageItem: BackgroundImageItem = {
        id,
        name,
        type,
        data,
        createdAt: now,
        updatedAt: now,
      };

      return new Promise((resolve, reject) => {
        const request = store.add(imageItem);

        request.onsuccess = () => {
          // イベントを発火
          this.dispatchEvent(
            new CustomEvent("imageAdded", {
              detail: { id, imageItem },
            }),
          );
          resolve(id);
        };

        request.onerror = () => {
          window.logger.error(
            `[BackgroundImageSettings] 画像の追加に失敗しました: ${name}`,
          );
          reject(new Error(`画像の追加に失敗しました: ${name}`));
        };
      });
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] addImage エラー:", error);
      throw error;
    }
  }

  /**
   * 背景画像を更新
   */
  public async updateImage(
    id: string,
    name: string,
    type: "url" | "file",
    data: string,
  ): Promise<void> {
    try {
      const db = await this.initializeDB();
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      // 既存の画像を取得
      const getRequest = store.get(id);

      return new Promise((resolve, reject) => {
        getRequest.onsuccess = () => {
          const existingImage =
            getRequest.result as unknown as BackgroundImageItem | null;
          if (!existingImage) {
            reject(new Error(`画像が見つかりません: ${id}`));
            return;
          }

          const updatedImage: BackgroundImageItem = {
            ...existingImage,
            name,
            type,
            data,
            updatedAt: new Date().toISOString(),
          };

          const putRequest = store.put(updatedImage);

          putRequest.onsuccess = () => {
            resolve();
          };

          putRequest.onerror = () => {
            window.logger.error(
              `[BackgroundImageSettings] 画像の更新に失敗しました: ${name}`,
            );
            reject(new Error(`画像の更新に失敗しました: ${name}`));
          };
        };

        getRequest.onerror = () => {
          reject(new Error(`画像の取得に失敗しました: ${id}`));
        };
      });
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] updateImage エラー:",
        error,
      );
      throw error;
    }
  }

  /**
   * 背景画像を削除
   */
  public async deleteImage(id: string): Promise<void> {
    try {
      const db = await this.initializeDB();
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.delete(id);

        request.onsuccess = () => {
          // イベントを発火
          this.dispatchEvent(
            new CustomEvent("imageDeleted", {
              detail: { id },
            }),
          );
          resolve();
        };

        request.onerror = () => {
          window.logger.error(
            `[BackgroundImageSettings] 画像の削除に失敗しました: ${id}`,
          );
          reject(new Error(`画像の削除に失敗しました: ${id}`));
        };
      });
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] deleteImage エラー:",
        error,
      );
      throw error;
    }
  }

  /**
   * 全ての背景画像を取得
   */
  public async getAllImages(): Promise<BackgroundImageItem[]> {
    try {
      const db = await this.initializeDB();
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          window.logger.error(
            "[BackgroundImageSettings] 画像の取得に失敗しました",
          );
          reject(new Error("画像の取得に失敗しました"));
        };
      });
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] getAllImages エラー:",
        error,
      );
      throw error;
    }
  }

  /**
   * 特定の背景画像を取得
   */
  public async getImage(id: string): Promise<BackgroundImageItem | null> {
    try {
      const db = await this.initializeDB();
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);

      return new Promise<BackgroundImageItem | null>((resolve, reject) => {
        const request = store.get(id);

        request.onsuccess = () => {
          const result = request.result as unknown;
          resolve((result as BackgroundImageItem) || null);
        };

        request.onerror = () => {
          window.logger.error(
            `[BackgroundImageSettings] 画像の取得に失敗しました: ${id}`,
          );
          reject(new Error(`画像の取得に失敗しました: ${id}`));
        };
      });
    } catch (error) {
      window.logger.error("[BackgroundImageSettings] getImage エラー:", error);
      throw error;
    }
  }

  /**
   * 選択中の背景画像IDを設定
   */
  public async setSelectedImage(
    id: string,
    fireEvent: boolean = true,
  ): Promise<void> {
    try {
      await Promise.resolve();
      localStorage.setItem("selectedBackgroundImageId", id);

      // イベントを発火（オプション）
      if (fireEvent) {
        this.dispatchEvent(
          new CustomEvent("imageSelected", {
            detail: { id },
          }),
        );
      }
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] 選択画像の設定に失敗しました:",
        error,
      );
      throw error;
    }
  }

  /**
   * 選択中の背景画像IDを取得
   */
  public getSelectedImageId(): string | null {
    try {
      return localStorage.getItem("selectedBackgroundImageId");
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] 選択画像の取得に失敗しました:",
        error,
      );
      return null;
    }
  }

  /**
   * 選択中の背景画像を取得
   */
  public async getSelectedImage(): Promise<BackgroundImageItem | null> {
    try {
      const selectedId = this.getSelectedImageId();
      if (!selectedId) {
        return null;
      }

      return await this.getImage(selectedId);
    } catch (error) {
      window.logger.error(
        "[BackgroundImageSettings] 選択画像の取得に失敗しました:",
        error,
      );
      return null;
    }
  }

  /**
   * ファイルをbase64に変換
   */
  public async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };

      reader.onerror = () => {
        reject(new Error("ファイルの読み込みに失敗しました"));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * URLの有効性をチェック
   */
  public async validateImageUrl(url: string): Promise<boolean> {
    try {
      const result = await validateImage(url);
      return result ?? false;
    } catch (error) {
      window.logger.warn(
        "[BackgroundImageSettings] image-validatorでURL検証中にエラー",
        error,
      );
      return false;
    }
  }

  /**
   * ファイルの有効性をチェック
   */
  public async validateImageFile(file: File): Promise<boolean> {
    try {
      const result = await validateImage(file);
      return result ?? false;
    } catch (error) {
      window.logger.warn(
        "[BackgroundImageSettings] image-validatorでファイル検証中にエラー",
        error,
      );
      return false;
    }
  }
}
