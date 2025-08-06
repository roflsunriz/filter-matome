import { Mylist2DB, DatabaseHealth, MigrationProgress } from '../components/database';

export class DatabaseManagementService {
    private db: Mylist2DB;
    private healthCheckIntervalId?: number;
    private healthCheckInterval: number = 24 * 60 * 60 * 1000; // 24時間

    constructor(db: Mylist2DB) {
        this.db = db;
    }

    // データベース初期化と永続化昇格
    async initializeDatabase(): Promise<{
        success: boolean;
        health: DatabaseHealth;
        persistence: boolean;
        error?: string;
    }> {
        try {
            const result = await this.db.initializeWithHealthCheck();
            
            window.logger?.info('Database initialized successfully', {
                health: result.health,
                persistence: result.persistence
            });

            return {
                success: true,
                health: result.health,
                persistence: result.persistence
            };
        } catch (error) {
            window.logger?.error('Database initialization failed:', error);
            return {
                success: false,
                health: {
                    isHealthy: false,
                    issues: [`Initialization failed: ${error}`],
                    storageEstimate: null,
                    persistence: false
                },
                persistence: false,
                error: error?.toString()
            };
        }
    }

    // 手動ヘルスチェック
    async performHealthCheck(): Promise<DatabaseHealth> {
        try {
            const health = await this.db.performHealthCheck();
            
            if (!health.isHealthy) {
                window.logger?.warn('Database health check failed:', health.issues);
            } else {
                window.logger?.info('Database health check passed');
            }

            return health;
        } catch (error) {
            window.logger?.error('Health check failed:', error);
            return {
                isHealthy: false,
                issues: [`Health check failed: ${error}`],
                storageEstimate: null,
                persistence: false
            };
        }
    }

    // 自動ヘルスチェック開始
    startAutoHealthCheck(): void {
        if (this.healthCheckIntervalId) {
            clearInterval(this.healthCheckIntervalId);
        }

        this.healthCheckIntervalId = window.setInterval(async () => {
            try {
                const health = await this.performHealthCheck();
                
                if (!health.isHealthy) {
                    // 健全性に問題がある場合は通知
                    this.notifyHealthIssues(health);
                }
            } catch (error) {
                window.logger?.error('Auto health check failed:', error);
            }
        }, this.healthCheckInterval);

        window.logger?.info('Auto health check started');
    }

    // 自動ヘルスチェック停止
    stopAutoHealthCheck(): void {
        if (this.healthCheckIntervalId) {
            clearInterval(this.healthCheckIntervalId);
            this.healthCheckIntervalId = undefined;
            window.logger?.info('Auto health check stopped');
        }
    }

    // バックアップ作成
    async createBackup(): Promise<{
        success: boolean;
        backupData?: string;
        error?: string;
    }> {
        try {
            const backupData = await this.db.createBackup();
            
            window.logger?.info('Database backup created successfully');
            
            return {
                success: true,
                backupData
            };
        } catch (error) {
            window.logger?.error('Database backup failed:', error);
            return {
                success: false,
                error: error?.toString()
            };
        }
    }

    // バックアップからの復元
    async restoreFromBackup(backupData: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        try {
            await this.db.restoreFromBackup(backupData);
            
            window.logger?.info('Database restored from backup successfully');
            
            return {
                success: true
            };
        } catch (error) {
            window.logger?.error('Database restore failed:', error);
            return {
                success: false,
                error: error?.toString()
            };
        }
    }

    // 永続化状態の確認
    async getPersistenceStatus(): Promise<{
        isPersistent: boolean;
        canRequestPersistence: boolean;
        storageEstimate?: StorageEstimate | null;
    }> {
        try {
            const storageEstimate = await this.db.getStorageEstimate();
            
            let isPersistent = false;
            let canRequestPersistence = false;
            
            if ('storage' in navigator) {
                if ('persisted' in navigator.storage) {
                    isPersistent = await navigator.storage.persisted();
                }
                if ('persist' in navigator.storage) {
                    canRequestPersistence = true;
                }
            }

            return {
                isPersistent,
                canRequestPersistence,
                storageEstimate
            };
        } catch (error) {
            window.logger?.error('Failed to get persistence status:', error);
            return {
                isPersistent: false,
                canRequestPersistence: false,
                storageEstimate: null
            };
        }
    }

    // 永続化要求
    async requestPersistence(): Promise<{
        success: boolean;
        isPersistent: boolean;
        error?: string;
    }> {
        try {
            const isPersistent = await this.db.requestPersistence();
            
            return {
                success: true,
                isPersistent
            };
        } catch (error) {
            window.logger?.error('Failed to request persistence:', error);
            return {
                success: false,
                isPersistent: false,
                error: error?.toString()
            };
        }
    }

    // マイグレーション進捗監視
    setMigrationProgressCallback(callback: (progress: MigrationProgress) => void): void {
        this.db.setProgressCallback(callback);
    }

    // ストレージ使用量の監視
    async monitorStorageUsage(): Promise<{
        usage: number;
        quota: number;
        percentage: number;
        isNearLimit: boolean;
    }> {
        try {
            const estimate = await this.db.getStorageEstimate();
            
            if (estimate?.usage !== undefined && estimate?.quota !== undefined) {
                const usage = estimate.usage;
                const quota = estimate.quota;
                const percentage = (usage / quota) * 100;
                const isNearLimit = percentage > 80; // 80%以上で警告

                return {
                    usage,
                    quota,
                    percentage,
                    isNearLimit
                };
            }
            
            return {
                usage: 0,
                quota: 0,
                percentage: 0,
                isNearLimit: false
            };
        } catch (error) {
            window.logger?.error('Failed to monitor storage usage:', error);
            return {
                usage: 0,
                quota: 0,
                percentage: 0,
                isNearLimit: false
            };
        }
    }

    // 健全性問題の通知
    private notifyHealthIssues(health: DatabaseHealth): void {
        const issues = health.issues.join(', ');
        
        // UI通知（存在する場合）
        if (typeof window !== 'undefined' && 
            (window as typeof window & { Mylist2ManagerUI?: { showNotification?: (message: string, type: string) => void } }).Mylist2ManagerUI?.showNotification) {
            const windowWithUI = window as typeof window & { Mylist2ManagerUI: { showNotification: (message: string, type: string) => void } };
            windowWithUI.Mylist2ManagerUI.showNotification(
                `データベース健全性の問題が検出されました: ${issues}`,
                'warning'
            );
        }
        
        // コンソール警告
        window.logger?.warn('Database health issues detected:', health.issues);
    }

    // 自動バックアップ機能
    async scheduleAutoBackup(intervalHours: number = 24): Promise<void> {
        const intervalMs = intervalHours * 60 * 60 * 1000;
        
        setInterval(async () => {
            try {
                const result = await this.createBackup();
                
                if (result.success && result.backupData) {
                    // 自動バックアップをローカルストレージに保存
                    localStorage.setItem('mylist2_auto_backup', result.backupData);
                    localStorage.setItem('mylist2_auto_backup_timestamp', new Date().toISOString());
                    
                    window.logger?.info('Auto backup completed');
                } else {
                    window.logger?.error('Auto backup failed:', result.error);
                }
            } catch (error) {
                window.logger?.error('Auto backup error:', error);
            }
        }, intervalMs);
        
        window.logger?.info(`Auto backup scheduled every ${intervalHours} hours`);
    }

    // 自動バックアップの復元
    async restoreAutoBackup(): Promise<{
        success: boolean;
        backupDate?: Date;
        error?: string;
    }> {
        try {
            const backupData = localStorage.getItem('mylist2_auto_backup');
            const backupTimestamp = localStorage.getItem('mylist2_auto_backup_timestamp');
            
            if (!backupData) {
                return {
                    success: false,
                    error: 'No auto backup found'
                };
            }
            
            const result = await this.restoreFromBackup(backupData);
            
            if (result.success) {
                return {
                    success: true,
                    backupDate: backupTimestamp ? new Date(backupTimestamp) : undefined
                };
            } else {
                return {
                    success: false,
                    error: result.error
                };
            }
        } catch (error) {
            window.logger?.error('Failed to restore auto backup:', error);
            return {
                success: false,
                error: error?.toString()
            };
        }
    }

    // サービス終了時のクリーンアップ
    destroy(): void {
        this.stopAutoHealthCheck();
    }
} 