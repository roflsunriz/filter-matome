import { ModuleSettings } from "@/types/module-types";

const LEGACY_MODULE_ID_MAP: Record<string, string> = {
  nico_info_highlight: "daily_lottery_highlight",
};

function isModuleSettingValue(value: unknown): value is ModuleSettings[string] {
  return (
    !!value &&
    typeof value === "object" &&
    "enabled" in value &&
    typeof (value as { enabled: unknown }).enabled === "boolean"
  );
}

export function normalizeModuleSettingsForRegistry(
  settings: unknown,
  validModuleIds: Iterable<string>,
): ModuleSettings {
  if (!settings || typeof settings !== "object") {
    return {};
  }

  const validIds = new Set(validModuleIds);
  const normalized: ModuleSettings = {};
  const entries = Object.entries(settings as Record<string, unknown>);

  entries.forEach(([moduleId, rawSetting]) => {
    const currentId = LEGACY_MODULE_ID_MAP[moduleId] ?? moduleId;
    if (!validIds.has(currentId) || !isModuleSettingValue(rawSetting)) {
      return;
    }

    if (!normalized[currentId]) {
      normalized[currentId] = {
        enabled: rawSetting.enabled,
        config: rawSetting.config,
      };
    }
  });

  return normalized;
}
