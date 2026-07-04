// フィルターヘルパー - 循環依存を避けるための独立したフィルター処理
import { CONSTANTS } from "@/comment-filter2/utils/constants";
import {
  CF2CommentApiResponse,
  NGWordRule,
  Settings,
  CommentFilter2GlobalData,
} from "@/types/filter-types";

/**
 * グローバルデータを取得
 */
export function getGlobalData(): CommentFilter2GlobalData | null {
  return (
    (window[CONSTANTS.GLOBAL_DATA_KEY] as CommentFilter2GlobalData) || null
  );
}

/**
 * 設定を取得（IndexedDBから）
 */
export async function getFilterSettings(): Promise<Settings> {
  try {
    const { FilterStorage } =
      await import("@/comment-filter2/storage/indexed-db");
    const storage = new FilterStorage();
    await storage.initialize();
    const settings = await storage.getSettings();
    return settings;
  } catch (error) {
    window.logger?.error("[CommentFilter2] Failed to load settings:", error);
    const defaultSettings = {
      debugMode: false,
      isEnabled: true,
      commandSettings: {
        owner: [],
        main: [],
        easy: [],
        normal: [],
      },
    };
    return defaultSettings;
  }
}

/**
 * ルールを取得（IndexedDBから）
 */
export async function getFilterRules(): Promise<NGWordRule[]> {
  try {
    const { FilterStorage } =
      await import("@/comment-filter2/storage/indexed-db");
    const storage = new FilterStorage();
    await storage.initialize();
    return await storage.getRules();
  } catch (error) {
    window.logger?.error("[CommentFilter2] Failed to load rules:", error);
    return [];
  }
}

/**
 * データにフィルターを適用（data-interceptor用）
 */
export async function applyFiltersToData(
  data: CF2CommentApiResponse,
  smid: string | null,
): Promise<CF2CommentApiResponse> {
  try {
    // 設定とJSON形式ルールを取得（旧形式は無視）
    const storage = new (
      await import("@/comment-filter2/storage/indexed-db")
    ).FilterStorage();
    await storage.initialize();

    const [settings, jsonRules] = await Promise.all([
      storage.getSettings(),
      storage.getJsonRules(),
    ]);

    // フィルターが有効でない場合は元データを返す
    if (!settings.isEnabled) {
      return data;
    }

    // JSON形式フィルター処理を実行
    const { JsonCommentFilter } =
      await import("@/comment-filter2/filter/json-comment-filter");
    const jsonFilter = new JsonCommentFilter(settings.debugMode);
    jsonFilter.updateSettings(settings);

    return (await jsonFilter.applyFilters(jsonRules, smid)) || data;
  } catch (error) {
    window.logger?.error("[CommentFilter2] Filter application failed:", error);
    return data; // エラー時は元データを返す
  }
}
