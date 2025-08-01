// CommentFilter2 定数定義
export const CONSTANTS = {
  // APIエンドポイント
  API_ENDPOINT: 'https://public.nvcomment.nicovideo.jp/v1/threads',
  
  // グローバルオブジェクト名
  GLOBAL_DATA_KEY: 'CommentFilter2Data',
  
  // フォーク種別
  FORK_TYPES: {
    MAIN: 'main',
    EASY: 'easy',
    OWNER: 'owner'
  } as const,
  
  // NGワードルール形式
  RULE_DEFAULTS: {
    EMPTY_REPLACE: 'EMPTY',
    ALL_SMID: 'ALL',
    DEFAULT_NICORU: 'EMPTY'
  } as const,
  
  // IndexedDB設定
  DB_CONFIG: {
    NAME: 'CommentFilter2DB',
    VERSION: 1,
    STORES: {
      RULES: 'rules',
      SETTINGS: 'settings'
    }
  } as const,
  
  // カスタムイベント
  EVENTS: {
    DATA_UPDATED: 'cf2:data-updated',
    SMID_CHANGED: 'cf2:smid-changed'
  } as const
} as const;

// 型定義
export type ForkType = typeof CONSTANTS.FORK_TYPES[keyof typeof CONSTANTS.FORK_TYPES]; 