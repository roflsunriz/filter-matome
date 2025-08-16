import "../../types/global.d.ts";

import { Mylist2DB } from "./database.js";
import { MylistInfo, KeywordInfo, ManagerSettings, ExportData } from "../../types/mylist-types.js";
import { DBVideo as VideoInfo, VideoInfo as BaseVideoInfo } from "../../types/video-types.js";

import { ApiService } from "../services/api-service.js";
import { MylistService } from "../services/mylist-service.js";
import { VideoService } from "../services/video-service.js";
import { KeywordService } from "../services/keyword-service.js";
import { ImportExportService } from "../services/import-export-service.js";
import { SettingsService } from "../services/settings-service.js";
import { DatabaseManagementService } from "../services/database-management-service.js";
import { GoogleDriveService } from "../services/cloud/google-drive-service.js";

export class Mylist2Manager {
  private db: Mylist2DB;
  private apiService: ApiService;
  private mylistService: MylistService;
  private videoService: VideoService;
  private keywordService: KeywordService;
  private importExportService: ImportExportService;
  private settingsService: SettingsService;
  private databaseManagementService: DatabaseManagementService;
  private googleDriveService: GoogleDriveService;

  constructor() {
    this.db = new Mylist2DB();
    this.apiService = new ApiService();
    this.mylistService = new MylistService(this.db);
    this.videoService = new VideoService(this.db);
    this.keywordService = new KeywordService(this.db);
    this.importExportService = new ImportExportService(this.db, this.apiService);
    this.settingsService = new SettingsService(this.db);
    this.databaseManagementService = new DatabaseManagementService(this.db);
    this.googleDriveService = new GoogleDriveService();
  }

  // データベースへのアクセスを提供するpublicメソッド
  async getDB(): Promise<IDBDatabase> {
    return this.db.initDB();
  }

  // マイリスト関連のメソッド
  async createMylist(name: string): Promise<number> {
    return this.mylistService.createMylist(name);
  }

  async getAllMylists(): Promise<MylistInfo[]> {
    return this.mylistService.getAllMylists();
  }

  async sortMylists(sortType: string): Promise<MylistInfo[]> {
    return this.mylistService.sortMylists(sortType, (mylistId) => this.getVideos(mylistId));
  }

  async updateMylistName(mylistId: number, newName: string): Promise<void> {
    return this.mylistService.updateMylistName(mylistId, newName);
  }

  async deleteMylist(mylistId: number): Promise<void> {
    return this.mylistService.deleteMylist(mylistId);
  }

  // 動画関連のメソッド
  async addVideo(mylistId: number, videoInfo: BaseVideoInfo): Promise<string> {
    return this.videoService.addVideo(mylistId, videoInfo);
  }

  async getVideos(mylistId: number): Promise<VideoInfo[]> {
    return this.videoService.getVideos(mylistId);
  }

  sortVideos(videos: VideoInfo[], sortType: string): VideoInfo[] {
    return this.videoService.sortVideos(videos, sortType);
  }

  async deleteVideo(compositeId: string): Promise<string> {
    return this.videoService.deleteVideo(compositeId);
  }

  async updateVideoInfo(compositeId: string, newInfo: Partial<BaseVideoInfo>): Promise<void> {
    return this.videoService.updateVideoInfo(compositeId, newInfo);
  }

  // キーワード関連のメソッド
  async addKeyword(mylistId: number, keyword: string): Promise<number> {
    return this.keywordService.addKeyword(mylistId, keyword);
  }

  async getKeywords(mylistId: number): Promise<KeywordInfo[]> {
    return this.keywordService.getKeywords(mylistId);
  }

  async deleteKeyword(keywordId: number): Promise<void> {
    return this.keywordService.deleteKeyword(keywordId);
  }

  async moveKeyword(keywordId: number, newMylistId: number): Promise<void> {
    return this.keywordService.moveKeyword(keywordId, newMylistId);
  }

  async updateKeyword(keywordId: number, newKeyword: string): Promise<void> {
    return this.keywordService.updateKeyword(keywordId, newKeyword);
  }

  // API関連のメソッド
  async fetchVideoInfo(videoId: string): Promise<BaseVideoInfo> {
    return this.apiService.fetchVideoInfo(videoId);
  }

  extractVideoId(input: string): string {
    return this.apiService.extractVideoId(input);
  }

  // インポート・エクスポート関連のメソッド  
  async exportData() {
    return this.importExportService.exportData();
  }

  async importData(data: ExportData): Promise<void> {
    return this.importExportService.importData(data);
  }

  async importLegacyData(jsonText: string, progressCallback?: (processed: number, total: number) => void): Promise<number> {
    return this.importExportService.importLegacyData(
      jsonText, 
      progressCallback, 
      (name: string) => this.createMylist(name),
      (mylistId: number, videoInfo: BaseVideoInfo) => this.addVideo(mylistId, videoInfo)
    );
  }

  // 設定関連のメソッド
  async saveManagerSettings(settings: ManagerSettings): Promise<void> {
    return this.settingsService.saveManagerSettings(settings);
  }

  async loadManagerSettings(): Promise<ManagerSettings> {
    return this.settingsService.loadManagerSettings();
  }

  // データベース管理関連のメソッド
  async initializeDatabaseWithHealthCheck(): Promise<{
    success: boolean;
    health: import('../components/database').DatabaseHealth;
    persistence: boolean;
    error?: string;
  }> {
    return this.databaseManagementService.initializeDatabase();
  }

  async performDatabaseHealthCheck(): Promise<import('../components/database').DatabaseHealth> {
    return this.databaseManagementService.performHealthCheck();
  }

  async createDatabaseBackup(): Promise<{
    success: boolean;
    backupData?: string;
    error?: string;
  }> {
    return this.databaseManagementService.createBackup();
  }

  async restoreDatabaseFromBackup(backupData: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    return this.databaseManagementService.restoreFromBackup(backupData);
  }

  async getDatabasePersistenceStatus(): Promise<{
    isPersistent: boolean;
    canRequestPersistence: boolean;
    storageEstimate?: StorageEstimate | null;
  }> {
    return this.databaseManagementService.getPersistenceStatus();
  }

  async requestDatabasePersistence(): Promise<{
    success: boolean;
    isPersistent: boolean;
    error?: string;
  }> {
    return this.databaseManagementService.requestPersistence();
  }

  async monitorDatabaseStorageUsage(): Promise<{
    usage: number;
    quota: number;
    percentage: number;
    isNearLimit: boolean;
  }> {
    return this.databaseManagementService.monitorStorageUsage();
  }

  setDatabaseMigrationProgressCallback(callback: (progress: import('../components/database').MigrationProgress) => void): void {
    this.databaseManagementService.setMigrationProgressCallback(callback);
  }

  startAutoDatabaseHealthCheck(): void {
    this.databaseManagementService.startAutoHealthCheck();
  }

  stopAutoDatabaseHealthCheck(): void {
    this.databaseManagementService.stopAutoHealthCheck();
  }

  async scheduleAutoDatabaseBackup(intervalHours: number = 24): Promise<void> {
    return this.databaseManagementService.scheduleAutoBackup(intervalHours);
  }

  async restoreAutoDatabaseBackup(): Promise<{
    success: boolean;
    backupDate?: Date;
    error?: string;
  }> {
    return this.databaseManagementService.restoreAutoBackup();
  }

  // サービス終了時のクリーンアップ
  destroy(): void {
    this.databaseManagementService.destroy();
  }

  // データの全消去（設定含むかを選択可能）
  async clearAllData(includeSettings = false): Promise<{ success: boolean; error?: string }> {
    return this.databaseManagementService.clearAllData({ includeSettings });
  }

  // Google Drive アップロード (zip圧縮)
  async uploadBackupToGoogleDrive(baseFileName: string): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      const backup = await this.createDatabaseBackup();
      if (!backup.success || !backup.backupData) return { success: false, error: backup.error || 'バックアップ作成に失敗しました' };
      return await this.googleDriveService.uploadBackupZip(baseFileName, backup.backupData);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  setGoogleClientId(clientId: string): void {
    this.googleDriveService.setClientId(clientId);
  }

  // Google Drive 上のバックアップ一覧
  async listGoogleDriveBackups(): Promise<Array<{ id: string; name: string; modifiedTime?: string; size?: string }>> {
    return this.googleDriveService.listBackups();
  }

  // Google Drive からバックアップをダウンロードして復元
  async restoreFromGoogleDriveBackup(fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const jsonText = await this.googleDriveService.downloadBackupJson(fileId);
      const res = await this.restoreDatabaseFromBackup(jsonText);
      return res;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
} 