import type { SeriesAlert } from "@/types/watch-history-types";

const API_ROOT = "/cache/watch-history-series-alerts";
const API_HEADER = "X-Filter-Matome-Series-Alerts";
const SCHEMA_VERSION = 1;

export interface SeriesAlertExtensionStatus {
  schemaVersion: number;
  notificationAvailable: boolean;
  checking: boolean;
  lastRunAt: number;
  lastError: string;
  alerts: SeriesAlert[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isSeriesAlert = (value: unknown): value is SeriesAlert => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    isFiniteNumber(value.seriesId) &&
    typeof value.seriesTitle === "string" &&
    typeof value.lastVideoId === "string" &&
    typeof value.lastVideoTitle === "string" &&
    isFiniteNumber(value.lastCheckedAt) &&
    isFiniteNumber(value.nextCheckAt) &&
    isFiniteNumber(value.checkInterval) &&
    typeof value.enabled === "boolean" &&
    isFiniteNumber(value.createdAt) &&
    isFiniteNumber(value.updatedAt)
  );
};

const parseStatus = (value: unknown): SeriesAlertExtensionStatus => {
  if (
    !isRecord(value) ||
    value.schemaVersion !== SCHEMA_VERSION ||
    typeof value.notificationAvailable !== "boolean" ||
    typeof value.checking !== "boolean" ||
    !isFiniteNumber(value.lastRunAt) ||
    typeof value.lastError !== "string" ||
    !Array.isArray(value.alerts) ||
    !value.alerts.every(isSeriesAlert)
  ) {
    throw new Error("シリーズアラートextensionの応答形式が不正です");
  }
  return {
    schemaVersion: value.schemaVersion,
    notificationAvailable: value.notificationAvailable,
    checking: value.checking,
    lastRunAt: value.lastRunAt,
    lastError: value.lastError,
    alerts: value.alerts,
  };
};

const requestJson = async (
  path: string,
  init?: RequestInit,
): Promise<unknown> => {
  const response = await fetch(`${API_ROOT}/${path}`, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      [API_HEADER]: "1",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(
      `シリーズアラートextensionがHTTP ${response.status}を返しました`,
    );
  }
  return (await response.json()) as unknown;
};

export const getSeriesAlertExtensionStatus =
  async (): Promise<SeriesAlertExtensionStatus> =>
    parseStatus(await requestJson("status"));

export const syncSeriesAlertsToExtension = async (
  alerts: SeriesAlert[],
): Promise<SeriesAlertExtensionStatus> =>
  parseStatus(
    await requestJson("config", {
      method: "POST",
      body: JSON.stringify({ schemaVersion: SCHEMA_VERSION, alerts }),
    }),
  );

export const requestSeriesAlertCheck = async (): Promise<boolean> => {
  const value = await requestJson("check-now", { method: "POST" });
  if (!isRecord(value) || typeof value.accepted !== "boolean") {
    throw new Error("シリーズアラートextensionの確認応答が不正です");
  }
  return value.accepted;
};

export const sendSeriesAlertTestNotification = async (): Promise<boolean> => {
  const value = await requestJson("test-notification", { method: "POST" });
  if (!isRecord(value) || typeof value.displayed !== "boolean") {
    throw new Error("シリーズアラートextensionの通知応答が不正です");
  }
  return value.displayed;
};

/**
 * extension側の定期確認結果とIndexedDB側の編集結果を更新日時で統合する。
 * extensionだけに残るアラートも復元し、通知だけが密かに残る状態を避ける。
 */
export const mergeSeriesAlertStates = (
  localAlerts: SeriesAlert[],
  extensionAlerts: SeriesAlert[],
): SeriesAlert[] => {
  const merged = new Map<string, SeriesAlert>();
  for (const alert of localAlerts) merged.set(alert.id, alert);
  for (const alert of extensionAlerts) {
    const local = merged.get(alert.id);
    if (!local || alert.updatedAt >= local.updatedAt) {
      merged.set(alert.id, alert);
    }
  }
  return [...merged.values()].sort((left, right) =>
    left.createdAt === right.createdAt
      ? left.id.localeCompare(right.id)
      : left.createdAt - right.createdAt,
  );
};
