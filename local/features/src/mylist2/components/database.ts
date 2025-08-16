// データベース永続化昇格機能・自動マイグレーション機能付きMylist2DB
import { MylistInfo, KeywordInfo } from "../../types/mylist-types.js";
import { DBVideo } from "../../types/video-types.js";

export interface MigrationStep {
    version: number;
    description: string;
    execute: (db: IDBDatabase, transaction: IDBTransaction) => Promise<void>;
}

export interface DatabaseHealth {
    isHealthy: boolean;
    issues: string[];
    storageEstimate?: StorageEstimate | null;
    persistence?: boolean;
}

export interface MigrationProgress {
    currentStep: number;
    totalSteps: number;
    currentVersion: number;
    targetVersion: number;
    description: string;
    error?: string;
}

export class Mylist2DB {
    private dbName: string;
    private version: number;
    private migrationSteps: MigrationStep[];
    private onProgressCallback?: (progress: MigrationProgress) => void;
    private toMessage(value: unknown): string {
        if (value && typeof (value as { message?: unknown }).message === 'string') {
            return (value as { message: string }).message;
        }
        try {
            return String(value);
        } catch {
            return 'Unknown error';
        }
    }

    constructor() {
        this.dbName = 'Mylist2DB';
        this.version = 7; // バージョンアップ: 動画にdescription/tags対応
        this.migrationSteps = this.initializeMigrationSteps();
    }

    // マイグレーションステップを初期化
    private initializeMigrationSteps(): MigrationStep[] {
        return [
            {
                version: 1,
                description: '初期データベース構造の作成',
                execute: async (db: IDBDatabase) => {
                    await Promise.resolve();
                    this.createInitialStores(db);
                }
            },
            {
                version: 4,
                description: 'マネージャーストアの追加',
                execute: async (db: IDBDatabase) => {
                    await Promise.resolve();
                    if (!db.objectStoreNames.contains('manager')) {
                        db.createObjectStore('manager', { keyPath: 'id' });
                    }
                }
            },
            {
                version: 5,
                description: 'キーワードストアの追加',
                execute: async (db: IDBDatabase) => {
                    await Promise.resolve();
                    if (!db.objectStoreNames.contains('keywords')) {
                        const keywordStore = db.createObjectStore('keywords', { 
                            keyPath: 'id',
                            autoIncrement: true 
                        });
                        keywordStore.createIndex('mylistId', 'mylistId', { unique: false });
                        keywordStore.createIndex('keyword', 'keyword', { unique: false });
                        keywordStore.createIndex('addedAt', 'addedAt', { unique: false });
                    }
                }
            },
            {
                version: 6,
                description: 'データベースメタデータストアの追加',
                execute: async (db: IDBDatabase, transaction: IDBTransaction) => {
                    if (!db.objectStoreNames.contains('metadata')) {
                        db.createObjectStore('metadata', { keyPath: 'key' });
                    }
                    // バージョン変更トランザクションを使用して初期データを投入
                    const store = transaction.objectStore('metadata');
                    await new Promise<void>((resolve, reject) => {
                        const initData = [
                            { key: 'created_at', value: new Date().toISOString() },
                            { key: 'last_backup', value: null },
                            { key: 'health_check_last', value: null },
                            { key: 'migration_history', value: [] }
                        ];
                        let completed = 0;
                        initData.forEach(data => {
                            const request = store.put(data);
                            request.onsuccess = () => {
                                completed++;
                                if (completed === initData.length) {
                                    resolve();
                                }
                            };
                            request.onerror = () => reject(new Error(this.toMessage(request.error)));
                        });
                    });
                }
            },
            {
                version: 7,
                description: 'videosストアにtagsインデックスを追加',
                execute: async (db: IDBDatabase, transaction: IDBTransaction) => {
                    await Promise.resolve();
                    // 既存のvideosストアにtagsインデックスが無ければ追加
                    if (db.objectStoreNames.contains('videos')) {
                        const store = transaction.objectStore('videos');
                        const hasTagsIndex = Array.from(store.indexNames).includes('tags');
                        if (!hasTagsIndex) {
                            store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
                        }
                    }
                }
            }
        ];
    }

    // プログレス報告コールバックを設定
    setProgressCallback(callback: (progress: MigrationProgress) => void): void {
        this.onProgressCallback = callback;
    }

    // データベース永続化昇格機能
    async requestPersistence(): Promise<boolean> {
        try {
            if ('storage' in navigator && 'persist' in navigator.storage) {
                const persistence = await navigator.storage.persist();
                window.logger?.info('Database persistence requested:', persistence);
                return persistence;
            }
            return false;
        } catch (error) {
            window.logger?.error('Error requesting persistence:', error);
            return false;
        }
    }

    // ストレージ容量監視
    async getStorageEstimate(): Promise<StorageEstimate | null> {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                window.logger?.info('Storage estimate:', estimate);
                return estimate;
            }
            return null;
        } catch (error) {
            window.logger?.error('Error getting storage estimate:', error);
            return null;
        }
    }

    // データベース健全性チェック
    async performHealthCheck(): Promise<DatabaseHealth> {
        const health: DatabaseHealth = {
            isHealthy: true,
            issues: [],
            storageEstimate: await this.getStorageEstimate(),
            persistence: await this.checkPersistence()
        };

        try {
            const db = await this.initDB();
            
            // ストア存在チェック
            const expectedStores = ['mylists', 'videos', 'manager', 'keywords', 'metadata'];
            for (const storeName of expectedStores) {
                if (!db.objectStoreNames.contains(storeName)) {
                    health.issues.push(`Missing store: ${storeName}`);
                    health.isHealthy = false;
                }
            }

            // データ整合性チェック
            const transaction = db.transaction(['mylists', 'videos', 'keywords'], 'readonly');
            
            // マイリストと動画の整合性チェック
            const mylistStore = transaction.objectStore('mylists');
            const videoStore = transaction.objectStore('videos');
            const keywordStore = transaction.objectStore('keywords');
            
            const mylistsRequest = mylistStore.getAll();
            const videosRequest = videoStore.getAll();
            const keywordsRequest = keywordStore.getAll();
            
            const [mylists, videos, keywords] = await Promise.all([
                new Promise<MylistInfo[]>((resolve, reject) => {
                    mylistsRequest.onsuccess = () => resolve(mylistsRequest.result);
                    mylistsRequest.onerror = () => reject(new Error(this.toMessage(mylistsRequest.error)));
                }),
                new Promise<DBVideo[]>((resolve, reject) => {
                    videosRequest.onsuccess = () => resolve(videosRequest.result);
                    videosRequest.onerror = () => reject(new Error(this.toMessage(videosRequest.error)));
                }),
                new Promise<KeywordInfo[]>((resolve, reject) => {
                    keywordsRequest.onsuccess = () => resolve(keywordsRequest.result);
                    keywordsRequest.onerror = () => reject(new Error(this.toMessage(keywordsRequest.error)));
                })
            ]);

            // 孤立した動画チェック
            const mylistIds = new Set(mylists.map(m => m.id));
            const orphanedVideos = videos.filter(v => !mylistIds.has(v.mylistId));
            if (orphanedVideos.length > 0) {
                health.issues.push(`Found ${orphanedVideos.length} orphaned videos`);
                health.isHealthy = false;
            }

            // 孤立したキーワードチェック
            const orphanedKeywords = keywords.filter(k => !mylistIds.has(k.mylistId));
            if (orphanedKeywords.length > 0) {
                health.issues.push(`Found ${orphanedKeywords.length} orphaned keywords`);
                health.isHealthy = false;
            }

            // メタデータ更新
            const metadataTransaction = db.transaction(['metadata'], 'readwrite');
            const metadataStore = metadataTransaction.objectStore('metadata');
            await new Promise<void>((resolve, reject) => {
                const request = metadataStore.put({ 
                    key: 'health_check_last', 
                    value: new Date().toISOString() 
                });
                request.onsuccess = () => resolve();
                request.onerror = () => reject(new Error(this.toMessage(request.error)));
            });

            db.close();
            
        } catch (error) {
            health.issues.push(`Health check failed: ${this.toMessage(error)}`);
            health.isHealthy = false;
        }

        return health;
    }

    // 永続化状態確認
    private async checkPersistence(): Promise<boolean> {
        try {
            if ('storage' in navigator && 'persisted' in navigator.storage) {
                return await navigator.storage.persisted();
            }
            return false;
        } catch (error) {
            window.logger?.error('Error checking persistence:', error);
            return false;
        }
    }

    // データベースバックアップ
    async createBackup(): Promise<string> {
        const db = await this.initDB();
        const backup: {
            version: number;
            timestamp: string;
            data: Record<string, unknown[]>;
        } = {
            version: this.version,
            timestamp: new Date().toISOString(),
            data: {}
        };

        try {
            const storeNames = ['mylists', 'videos', 'keywords', 'manager', 'metadata'];
            const transaction = db.transaction(storeNames, 'readonly');
            
            for (const storeName of storeNames) {
                const store = transaction.objectStore(storeName);
                const request = store.getAll();
                
                backup.data[storeName] = await new Promise<unknown[]>((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(new Error(this.toMessage(request.error)));
                });
            }

            // バックアップ日時を記録
            const metadataTransaction = db.transaction(['metadata'], 'readwrite');
            const metadataStore = metadataTransaction.objectStore('metadata');
            await new Promise<void>((resolve, reject) => {
                const request = metadataStore.put({ 
                    key: 'last_backup', 
                    value: backup.timestamp 
                });
                request.onsuccess = () => resolve();
                request.onerror = () => reject(new Error(this.toMessage(request.error)));
            });

            db.close();
            return JSON.stringify(backup);
            
        } catch (error) {
            db.close();
            throw error;
        }
    }

    // バックアップからの復元
    async restoreFromBackup(backupData: string): Promise<void> {
        const backupUnknown: unknown = JSON.parse(backupData);
        const backup = backupUnknown as { data: Record<string, unknown[]> };
        const db = await this.initDB();

        try {
            const storeNames = Object.keys(backup.data);
            const transaction = db.transaction(storeNames, 'readwrite');
            
            for (const storeName of storeNames) {
                const store = transaction.objectStore(storeName);
                
                // 既存データをクリア
                await new Promise<void>((resolve, reject) => {
                    const clearRequest = store.clear();
                    clearRequest.onsuccess = () => resolve();
                    clearRequest.onerror = () => reject(new Error(this.toMessage(clearRequest.error)));
                });

                // バックアップデータを復元
                const data = backup.data[storeName];
                for (const item of data) {
                    await new Promise<void>((resolve, reject) => {
                        const putRequest = store.put(item);
                        putRequest.onsuccess = () => resolve();
                        putRequest.onerror = () => reject(new Error(this.toMessage(putRequest.error)));
                    });
                }
            }

            db.close();
            window.logger?.info('Database restored from backup successfully');
            
        } catch (error) {
            db.close();
            throw error;
        }
    }

    async initDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request: IDBOpenDBRequest = indexedDB.open(this.dbName, this.version);
            
            request.onupgradeneeded = async (event: IDBVersionChangeEvent) => {
                const db: IDBDatabase = (event.target as IDBOpenDBRequest).result;
                const oldVersion: number = event.oldVersion;
                
                try {
                    // 対象のマイグレーションステップを取得
                    const stepsToExecute = this.migrationSteps.filter(step => 
                        step.version > oldVersion && step.version <= this.version
                    );

                    if (this.onProgressCallback) {
                        this.onProgressCallback({
                            currentStep: 0,
                            totalSteps: stepsToExecute.length,
                            currentVersion: oldVersion,
                            targetVersion: this.version,
                            description: 'マイグレーション開始'
                        });
                    }

                    // マイグレーションを順次実行
                    for (let i = 0; i < stepsToExecute.length; i++) {
                        const step = stepsToExecute[i];
                        
                        if (this.onProgressCallback) {
                            this.onProgressCallback({
                                currentStep: i + 1,
                                totalSteps: stepsToExecute.length,
                                currentVersion: oldVersion,
                                targetVersion: this.version,
                                description: step.description
                            });
                        }

                        try {
                            await step.execute(db, (event.target as IDBOpenDBRequest).transaction!);
                            window.logger?.info(`Migration step ${step.version} completed: ${step.description}`);
                        } catch (error) {
                            window.logger?.error(`Migration step ${step.version} failed:`, error);
                            throw error;
                        }
                    }

                    // マイグレーション履歴を記録
                    if (db.objectStoreNames.contains('metadata')) {
                        const transaction = db.transaction(['metadata'], 'readwrite');
                        const metadataStore = transaction.objectStore('metadata');
                        
                        await new Promise<void>((resolve, reject) => {
                            const getRequest = metadataStore.get('migration_history');
                            getRequest.onsuccess = () => {
                                const historyRaw = getRequest.result as { value?: unknown } | undefined;
                                const current = historyRaw && 'value' in historyRaw ? historyRaw.value : [];
                                const history: unknown[] = Array.isArray(current) ? current : [];
                                history.push({
                                    from: oldVersion,
                                    to: this.version,
                                    timestamp: new Date().toISOString(),
                                    steps: stepsToExecute.map(s => s.version)
                                });
                                
                                const putRequest = metadataStore.put({
                                    key: 'migration_history',
                                    value: history
                                });
                                putRequest.onsuccess = () => resolve();
                                putRequest.onerror = () => reject(new Error(this.toMessage(putRequest.error)));
                            };
                            getRequest.onerror = () => reject(new Error(this.toMessage(getRequest.error)));
                        });
                    }

                    if (this.onProgressCallback) {
                        this.onProgressCallback({
                            currentStep: stepsToExecute.length,
                            totalSteps: stepsToExecute.length,
                            currentVersion: this.version,
                            targetVersion: this.version,
                            description: 'マイグレーション完了'
                        });
                    }
                    
                } catch (error) {
                    if (this.onProgressCallback) {
                        this.onProgressCallback({
                            currentStep: 0,
                            totalSteps: 0,
                            currentVersion: oldVersion,
                            targetVersion: this.version,
                            description: 'マイグレーション失敗',
                            error: error?.toString()
                        });
                    }
                    throw error;
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(this.toMessage(request.error)));
        });
    }

    createInitialStores(db: IDBDatabase): void {
        // マイリストストア
        if (!db.objectStoreNames.contains('mylists')) {
            const mylistStore = db.createObjectStore('mylists', { 
                keyPath: 'id', 
                autoIncrement: true 
            });
            mylistStore.createIndex('name', 'name', { unique: false });
            mylistStore.createIndex('sortOrder', 'sortOrder', { unique: false });
            mylistStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 動画ストア
        if (!db.objectStoreNames.contains('videos')) {
            const videoStore = db.createObjectStore('videos', { 
                keyPath: 'id' 
            });
            videoStore.createIndex('mylistId', 'mylistId', { unique: false });
            videoStore.createIndex('originalId', 'originalId', { unique: false });
            videoStore.createIndex('title', 'title', { unique: false });
            videoStore.createIndex('viewCount', 'viewCount', { unique: false });
            videoStore.createIndex('commentCount', 'commentCount', { unique: false });
            videoStore.createIndex('mylistCount', 'mylistCount', { unique: false });
            videoStore.createIndex('addedAt', 'addedAt', { unique: false });
            videoStore.createIndex('thumbnailUrl', 'thumbnailUrl', { unique: false });
            videoStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
            videoStore.createIndex('authorName', 'authorName', { unique: false });
            videoStore.createIndex('length', 'length', { unique: false });
            // v7以降での新インデックス
            try {
                videoStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
            } catch (e) {
                // 既に存在している等の理由で失敗しても致命的ではない
                window.logger?.warn?.('createIndex(tags) skipped:', e);
            }
        }

        // マネージャーストア
        if (!db.objectStoreNames.contains('manager')) {
            db.createObjectStore('manager', { 
                keyPath: 'id' 
            });
        }
    }

    // 自動初期化とヘルスチェック
    async initializeWithHealthCheck(): Promise<{
        db: IDBDatabase;
        health: DatabaseHealth;
        persistence: boolean;
    }> {
        // 永続化要求
        const persistence = await this.requestPersistence();
        
        // データベース初期化
        const db = await this.initDB();
        
        // ヘルスチェック
        const health = await this.performHealthCheck();
        
        return { db, health, persistence };
    }

    // すべてのアプリデータをクリア（メタデータは保持）
    async clearAllData(clearManager: boolean = false): Promise<void> {
        const db = await this.initDB();
        try {
            const storeNames = clearManager
                ? ['mylists', 'videos', 'keywords', 'manager']
                : ['mylists', 'videos', 'keywords'];
            const tx = db.transaction(storeNames, 'readwrite');
            await Promise.all(storeNames.map(storeName => new Promise<void>((resolve, reject) => {
                const store = tx.objectStore(storeName);
                const req = store.clear();
                req.onsuccess = () => resolve();
                req.onerror = () => reject(new Error(this.toMessage(req.error)));
            })));
        } finally {
            db.close();
        }
    }
} 