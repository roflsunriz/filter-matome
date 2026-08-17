import { inspectVideo, type MovieInspection } from "./core";

export const SMART_FETCHER_HEADER = "X-Filter-Matome-Smart-Fetcher";
export const SMART_FETCHER_API =
  "https://nicocachenl.test/api/v1/extensions/filter-matome/smart-fetcher";

export type Recurrence = "once" | "daily" | "weekly" | "monthly" | "yearly";
export type HolidayPolicy = "include" | "exclude" | "only";
export type BandwidthMode = "fixed" | "percentage" | "auto";

export interface SmartFetcherSettings {
  timeZone: string;
  bandwidthMode: BandwidthMode;
  fixedBytesPerSecond: number;
  lineBytesPerSecond: number;
  percentage: number;
  measuredBytesPerSecond: number;
  defaultWindowMinutes: number;
  safetyPercent: number;
  holidayCalendar: "none" | "japan";
  maxHistory: number;
}

export interface SmartFetcherSchedule {
  id: string;
  videoId: string;
  title: string;
  recurrence: Recurrence;
  startAt: number;
  windowMinutes: number;
  daysOfWeek: number;
  holidayPolicy: HolidayPolicy;
  enabled: boolean;
  priority: number;
  estimatedBytes: number;
  maxRetries: number;
  retryCount: number;
  nextRunAt: number;
  state: string;
  lastError: string;
  lastRunAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface SmartFetcherHistory {
  id: string;
  scheduleId: string;
  videoId: string;
  title: string;
  state: string;
  error: string;
  estimatedBytes: number;
  actualBytes: number;
  startedAt: number;
  finishedAt: number;
}

export interface SmartFetcherState {
  schemaVersion: number;
  settings: SmartFetcherSettings;
  schedules: SmartFetcherSchedule[];
  history: SmartFetcherHistory[];
  credentials: { stored: boolean; savedAt: number };
  activeScheduleId: string;
}

export type ScheduleInput = Pick<
  SmartFetcherSchedule,
  | "videoId"
  | "title"
  | "recurrence"
  | "startAt"
  | "windowMinutes"
  | "daysOfWeek"
  | "holidayPolicy"
  | "enabled"
  | "priority"
  | "estimatedBytes"
  | "maxRetries"
> & { id?: string };

async function readJson<T>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`smartFetcher: HTTP ${response.status}`);
  }
  return body as T;
}

async function callSmartFetcher<T>(
  action: string,
  body?: Record<string, unknown>,
): Promise<T> {
  return readJson<T>(
    await fetch(`${SMART_FETCHER_API}/${action}`, {
      method: body ? "POST" : "GET",
      cache: "no-store",
      credentials: "omit",
      headers: {
        [SMART_FETCHER_HEADER]: "1",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
}

export function getSmartFetcherState(): Promise<SmartFetcherState> {
  return callSmartFetcher<SmartFetcherState>("state");
}

export function refreshStoredCredentials(): Promise<SmartFetcherState> {
  return fetch(`${SMART_FETCHER_API}/credentials`, {
    method: "POST",
    cache: "no-store",
    credentials: "omit",
    headers: { [SMART_FETCHER_HEADER]: "1" },
  }).then((response) => readJson<SmartFetcherState>(response));
}

export function clearStoredCredentials(): Promise<SmartFetcherState> {
  return fetch(`${SMART_FETCHER_API}/clear-credentials`, {
    method: "POST",
    cache: "no-store",
    credentials: "omit",
    headers: { [SMART_FETCHER_HEADER]: "1" },
  }).then((response) => readJson<SmartFetcherState>(response));
}

export function saveSmartFetcherSettings(
  settings: SmartFetcherSettings,
): Promise<SmartFetcherState> {
  return callSmartFetcher<SmartFetcherState>(
    "settings",
    settings as unknown as Record<string, unknown>,
  );
}

export function saveSchedule(
  schedule: ScheduleInput,
): Promise<SmartFetcherState> {
  return callSmartFetcher<SmartFetcherState>("schedule", schedule);
}

function scheduleAction(
  action: "run-now" | "cancel" | "remove",
  id: string,
): Promise<SmartFetcherState> {
  return callSmartFetcher<SmartFetcherState>(action, { id });
}

export const runScheduleNow = (id: string): Promise<SmartFetcherState> =>
  scheduleAction("run-now", id);

export const cancelSchedule = (id: string): Promise<SmartFetcherState> =>
  scheduleAction("cancel", id);

export const removeSchedule = (id: string): Promise<SmartFetcherState> =>
  scheduleAction("remove", id);

export const removeSmartFetcherHistory = (
  id: string,
): Promise<SmartFetcherState> =>
  callSmartFetcher<SmartFetcherState>("remove-history", { id });

export const clearSmartFetcherHistory = (): Promise<SmartFetcherState> =>
  callSmartFetcher<SmartFetcherState>("clear-history", {});

export async function inspectScheduleVideo(
  videoId: string,
): Promise<MovieInspection> {
  return inspectVideo(videoId);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
