/**
 * モジュールシステム用の型定義
 */

export enum PageType {
  ALL = "all",
  WATCH = "watch",
  SEARCH = "search",
  RANKING = "ranking",
  NICO_INFO = "nico_info",
}

export enum ModuleCategory {
  PRIVACY = "privacy",
  UI_ENHANCEMENT = "ui_enhancement",
  FUNCTIONALITY = "functionality",
  VISUAL = "visual",
}

export enum ModuleStatus {
  INACTIVE = "inactive",
  LOADING = "loading",
  ACTIVE = "active",
  ERROR = "error",
  UNAVAILABLE = "unavailable",
}

// 設定値として使用可能な型を定義
export type ConfigValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | boolean[]
  | null
  | undefined;

// 設定オブジェクトの型を定義
export type ModuleConfigData = Record<string, ConfigValue>;

export interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  targetPages: PageType[];
  dependencies: string[];
  category: ModuleCategory;
  icon: string;
  exclusiveGroup?: string; // 排他グループ（同じグループ内では1つのモジュールのみ有効）
}

export interface ModuleInstance {
  config: ModuleConfig;
  initialize(): Promise<void>;
  destroy(): void;
  isActive(): boolean;
  getStatus(): ModuleStatus;
  /**
   * SPA遷移時に呼び出されるオプションのメソッド
   * モジュールがSPA遷移に対応する必要がある場合に実装します
   */
  onSPANavigate?(): Promise<void>;
}

export interface ModuleSettings {
  [moduleId: string]: {
    enabled: boolean;
    config?: ModuleConfigData;
  };
}

export interface PageDetector {
  getCurrentPageType(): PageType;
  isTargetPage(targetPages: PageType[]): boolean;
}

export interface DependencyChecker {
  checkDependencies(dependencies: string[]): Promise<boolean>;
  getDependencyStatus(dependency: string): boolean;
}

export interface ModuleFactory {
  createModule(config: ModuleConfig): Promise<ModuleInstance>;
}

// イベント関連の型定義
export interface ModuleEvent {
  type: "loaded" | "unloaded" | "enabled" | "disabled" | "error";
  moduleId: string;
  data?: ConfigValue | Record<string, unknown>;
}

export type ModuleEventListener = (event: ModuleEvent) => void;

// 設定UI関連の型定義
export interface ToggleSwitchProps {
  moduleId: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export interface ModuleListItemProps {
  config: ModuleConfig;
  enabled: boolean;
  status: ModuleStatus;
  onToggle: (enabled: boolean) => void;
}
