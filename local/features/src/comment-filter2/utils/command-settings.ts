import type { CommandSettings } from "@/types/filter-types";

export const DEFAULT_CLEAR_EXISTING_COMMANDS = false;

/** 保存値を共有参照しないデフォルトのコマンド設定を生成する。 */
export function createDefaultCommandSettings(): CommandSettings {
  return {
    owner: ["medium", "defont", "naka"],
    main: ["medium", "defont", "naka"],
    easy: ["medium", "defont", "naka"],
    normal: ["medium", "defont", "naka"],
  };
}
