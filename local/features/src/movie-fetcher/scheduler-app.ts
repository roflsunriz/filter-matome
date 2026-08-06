import { CommonHeader } from "@/common/header";
import {
  cancelSchedule,
  clearStoredCredentials,
  formatBytes,
  getSmartFetcherState,
  inspectScheduleVideo,
  refreshStoredCredentials,
  removeSchedule,
  runScheduleNow,
  saveSchedule,
  saveSmartFetcherSettings,
  type ScheduleInput,
  type SmartFetcherHistory,
  type SmartFetcherSchedule,
  type SmartFetcherSettings,
  type SmartFetcherState,
} from "./scheduler-client";
import { applyTranslations, t } from "./scheduler-i18n";

let state: SmartFetcherState | null = null;
let toastTimer = 0;

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) throw new Error(`#${id} not found`);
  return element as T;
};

const formControl = <T extends HTMLInputElement | HTMLSelectElement>(
  form: HTMLFormElement,
  name: string,
): T => {
  const control = form.elements.namedItem(name);
  if (!(
    control instanceof HTMLInputElement || control instanceof HTMLSelectElement
  )) {
    throw new Error(`${name} not found`);
  }
  return control as T;
};

function showToast(message: string, error = false): void {
  const toast = byId<HTMLDivElement>("toast");
  toast.textContent = message;
  toast.classList.toggle("error", error);
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 4_000);
}

function localInputValue(timestamp: number): string {
  const date = new Date(timestamp);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function defaultStart(): number {
  const value = new Date();
  value.setHours(value.getHours() + 1, 0, 0, 0);
  return value.getTime();
}

function formatDate(timestamp: number): string {
  return timestamp > 0
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(timestamp)
    : "—";
}

function effectiveRate(settings: SmartFetcherSettings): number {
  if (settings.bandwidthMode === "fixed") return settings.fixedBytesPerSecond;
  const base =
    settings.bandwidthMode === "auto" && settings.measuredBytesPerSecond > 0
      ? settings.measuredBytesPerSecond
      : settings.lineBytesPerSecond;
  return Math.max(1_024, (base * settings.percentage) / 100);
}

function initializeWeekdays(): void {
  const container = byId<HTMLDivElement>("weekday-options");
  const monday = new Date(Date.UTC(2024, 0, 1));
  for (let index = 0; index < 7; index++) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "weekday";
    input.value = String(1 << index);
    input.checked = true;
    const name = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
    }).format(new Date(monday.getTime() + index * 86_400_000));
    label.append(input, document.createTextNode(name));
    container.append(label);
  }
}

function fillSettings(settings: SmartFetcherSettings): void {
  const form = byId<HTMLFormElement>("settings-form");
  formControl(form, "timeZone").value = settings.timeZone;
  formControl(form, "bandwidthMode").value = settings.bandwidthMode;
  formControl(form, "fixedKiB").value = String(
    settings.fixedBytesPerSecond / 1024,
  );
  formControl(form, "lineMiB").value = String(
    settings.lineBytesPerSecond / 1024 ** 2,
  );
  formControl(form, "percentage").value = String(settings.percentage);
  formControl(form, "defaultWindowMinutes").value = String(
    settings.defaultWindowMinutes,
  );
  formControl(form, "safetyPercent").value = String(settings.safetyPercent);
  formControl(form, "holidayCalendar").value = settings.holidayCalendar;
}

function resetScheduleForm(videoId = ""): void {
  const form = byId<HTMLFormElement>("schedule-form");
  form.reset();
  formControl(form, "id").value = "";
  formControl(form, "videoId").value = videoId;
  const startAt = defaultStart();
  const windowMinutes = state?.settings.defaultWindowMinutes ?? 360;
  formControl(form, "startAt").value = localInputValue(startAt);
  formControl(form, "stopAt").value = localInputValue(
    startAt + windowMinutes * 60_000,
  );
  formControl(form, "windowMinutes").value = String(windowMinutes);
  formControl(form, "estimatedBytes").value = "";
  formControl(form, "estimatedDisplay").value = "";
  formControl(form, "priority").value = "5";
  formControl(form, "maxRetries").value = "2";
  formControl<HTMLInputElement>(form, "enabled").checked = true;
  form
    .querySelectorAll<HTMLInputElement>('input[name="weekday"]')
    .forEach((input) => {
      input.checked = true;
    });
}

function fillScheduleForm(schedule: SmartFetcherSchedule): void {
  const form = byId<HTMLFormElement>("schedule-form");
  formControl(form, "id").value = schedule.id;
  formControl(form, "videoId").value = schedule.videoId;
  formControl(form, "title").value = schedule.title;
  formControl(form, "startAt").value = localInputValue(schedule.startAt);
  formControl(form, "stopAt").value = localInputValue(
    schedule.startAt + schedule.windowMinutes * 60_000,
  );
  formControl(form, "recurrence").value = schedule.recurrence;
  formControl(form, "windowMinutes").value = String(schedule.windowMinutes);
  formControl(form, "holidayPolicy").value = schedule.holidayPolicy;
  formControl(form, "estimatedBytes").value = String(schedule.estimatedBytes);
  formControl(form, "estimatedDisplay").value = formatBytes(
    schedule.estimatedBytes,
  );
  formControl(form, "priority").value = String(schedule.priority);
  formControl(form, "maxRetries").value = String(schedule.maxRetries);
  formControl<HTMLInputElement>(form, "enabled").checked = schedule.enabled;
  form
    .querySelectorAll<HTMLInputElement>('input[name="weekday"]')
    .forEach((input) => {
      input.checked = (schedule.daysOfWeek & Number(input.value)) !== 0;
    });
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function textLine(label: string, value: string): HTMLParagraphElement {
  const paragraph = document.createElement("p");
  paragraph.textContent = `${label}: ${value}`;
  return paragraph;
}

function actionButton(
  label: string,
  action: string,
  id: string,
  className = "secondary",
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset["action"] = action;
  button.dataset["id"] = id;
  button.className = className;
  return button;
}

function renderSchedule(schedule: SmartFetcherSchedule): HTMLElement {
  const article = document.createElement("article");
  article.className = "job";
  article.dataset["scheduleId"] = schedule.id;
  const content = document.createElement("div");
  const heading = document.createElement("h3");
  heading.textContent = schedule.title || schedule.videoId;
  const badge = document.createElement("span");
  badge.className = `badge ${schedule.state}`;
  badge.textContent = schedule.state;
  const repeat = document.createElement("span");
  repeat.className = "badge";
  repeat.textContent = t(schedule.recurrence);
  content.append(
    heading,
    badge,
    repeat,
    textLine(t("videoId"), schedule.videoId),
    textLine(t("next"), formatDate(schedule.nextRunAt)),
    textLine(t("size"), formatBytes(schedule.estimatedBytes)),
  );
  if (schedule.lastError) content.append(textLine("Error", schedule.lastError));
  const actions = document.createElement("div");
  actions.className = "row-actions";
  actions.append(
    actionButton(t("edit"), "edit", schedule.id),
    actionButton(t("runNow"), "run", schedule.id),
    actionButton(t("cancel"), "cancel", schedule.id, "danger"),
    actionButton(t("remove"), "remove", schedule.id, "danger"),
  );
  article.append(content, actions);
  return article;
}

function renderHistory(entry: SmartFetcherHistory): HTMLElement {
  const article = document.createElement("article");
  article.className = "job";
  const content = document.createElement("div");
  const heading = document.createElement("h3");
  heading.textContent = entry.title || entry.videoId;
  const badge = document.createElement("span");
  badge.className = `badge ${entry.state}`;
  badge.textContent = entry.state;
  content.append(
    heading,
    badge,
    textLine(t("completedAt"), formatDate(entry.finishedAt)),
    textLine(
      t("size"),
      `${formatBytes(entry.actualBytes)} / ${formatBytes(entry.estimatedBytes)}`,
    ),
  );
  if (entry.error) content.append(textLine("Error", entry.error));
  article.append(content);
  return article;
}

function render(nextState: SmartFetcherState, fillSettingForm = false): void {
  state = nextState;
  if (fillSettingForm) fillSettings(nextState.settings);
  byId("credential-status").textContent = nextState.credentials.stored
    ? `${t("stored")} ${formatDate(nextState.credentials.savedAt)}`
    : t("missing");
  byId("credential-status").classList.toggle(
    "credential-ok",
    nextState.credentials.stored,
  );
  byId("schedule-count").textContent = String(nextState.schedules.length);
  const active = nextState.schedules.find(
    (schedule) => schedule.id === nextState.activeScheduleId,
  );
  byId("active-status").textContent = active?.videoId ?? t("idle");
  byId("bandwidth-status").textContent =
    `${formatBytes(effectiveRate(nextState.settings))}/s`;
  const notice = byId<HTMLParagraphElement>("credential-notice");
  notice.textContent = nextState.credentials.stored
    ? t("credentialsHelp")
    : t("credentialsMissing");
  notice.classList.toggle("ok", nextState.credentials.stored);

  const scheduleList = byId<HTMLDivElement>("schedule-list");
  scheduleList.replaceChildren();
  if (nextState.schedules.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = t("noSchedules");
    scheduleList.append(empty);
  } else {
    nextState.schedules.forEach((schedule) =>
      scheduleList.append(renderSchedule(schedule)),
    );
  }

  const historyList = byId<HTMLDivElement>("history-list");
  historyList.replaceChildren();
  if (nextState.history.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = t("noHistory");
    historyList.append(empty);
  } else {
    nextState.history.forEach((entry) =>
      historyList.append(renderHistory(entry)),
    );
  }
}

async function loadState(initial = false): Promise<void> {
  render(await getSmartFetcherState(), initial);
}

function readSettings(): SmartFetcherSettings {
  if (!state) throw new Error("state unavailable");
  const form = byId<HTMLFormElement>("settings-form");
  return {
    ...state.settings,
    timeZone: formControl(form, "timeZone").value,
    bandwidthMode: formControl(form, "bandwidthMode")
      .value as SmartFetcherSettings["bandwidthMode"],
    fixedBytesPerSecond: Number(formControl(form, "fixedKiB").value) * 1024,
    lineBytesPerSecond: Number(formControl(form, "lineMiB").value) * 1024 ** 2,
    percentage: Number(formControl(form, "percentage").value),
    defaultWindowMinutes: Number(
      formControl(form, "defaultWindowMinutes").value,
    ),
    safetyPercent: Number(formControl(form, "safetyPercent").value),
    holidayCalendar: formControl(form, "holidayCalendar").value as
      "none" | "japan",
  };
}

function readSchedule(): ScheduleInput {
  const form = byId<HTMLFormElement>("schedule-form");
  const estimatedBytes = Number(formControl(form, "estimatedBytes").value);
  if (!Number.isFinite(estimatedBytes) || estimatedBytes <= 0) {
    throw new Error(t("inspectFirst"));
  }
  const weekdays = [
    ...form.querySelectorAll<HTMLInputElement>('input[name="weekday"]'),
  ]
    .filter((input) => input.checked)
    .reduce((mask, input) => mask | Number(input.value), 0);
  const id = formControl(form, "id").value;
  const startAt = new Date(formControl(form, "startAt").value).getTime();
  const stopAt = new Date(formControl(form, "stopAt").value).getTime();
  const windowMinutes = Math.ceil((stopAt - startAt) / 60_000);
  if (!Number.isFinite(windowMinutes) || windowMinutes < 1) {
    throw new Error(t("stopAfterStart"));
  }
  formControl(form, "windowMinutes").value = String(windowMinutes);
  return {
    ...(id ? { id } : {}),
    videoId: formControl(form, "videoId").value.trim().toLowerCase(),
    title: formControl(form, "title").value.trim(),
    recurrence: formControl(form, "recurrence")
      .value as ScheduleInput["recurrence"],
    startAt,
    windowMinutes,
    daysOfWeek: weekdays,
    holidayPolicy: formControl(form, "holidayPolicy")
      .value as ScheduleInput["holidayPolicy"],
    enabled: formControl<HTMLInputElement>(form, "enabled").checked,
    priority: Number(formControl(form, "priority").value),
    estimatedBytes,
    maxRetries: Number(formControl(form, "maxRetries").value),
  };
}

async function inspectCurrentVideo(): Promise<void> {
  const form = byId<HTMLFormElement>("schedule-form");
  const button = byId<HTMLButtonElement>("inspect-button");
  button.disabled = true;
  try {
    const inspection = await inspectScheduleVideo(
      formControl(form, "videoId").value.trim(),
    );
    formControl(form, "title").value = inspection.title;
    formControl(form, "estimatedBytes").value = String(
      inspection.estimatedBytes,
    );
    formControl(form, "estimatedDisplay").value = formatBytes(
      inspection.estimatedBytes,
    );
  } finally {
    button.disabled = false;
  }
}

function applyPreset(name: string): void {
  const form = byId<HTMLFormElement>("schedule-form");
  const start = new Date();
  start.setSeconds(0, 0);
  if (name === "tonight" || name === "weekday") {
    start.setHours(1, 0, 0, 0);
    if (start.getTime() <= Date.now()) start.setDate(start.getDate() + 1);
    formControl(form, "windowMinutes").value = "360";
  } else {
    start.setHours(0, 0, 0, 0);
    while (start.getDay() !== 6) start.setDate(start.getDate() + 1);
    formControl(form, "windowMinutes").value = "2880";
  }
  formControl(form, "startAt").value = localInputValue(start.getTime());
  formControl(form, "stopAt").value = localInputValue(
    start.getTime() + Number(formControl(form, "windowMinutes").value) * 60_000,
  );
  formControl(form, "recurrence").value =
    name === "tonight" ? "once" : "weekly";
  const mask = name === "weekday" ? 31 : name === "weekend" ? 96 : 127;
  form
    .querySelectorAll<HTMLInputElement>('input[name="weekday"]')
    .forEach((input) => {
      input.checked = (mask & Number(input.value)) !== 0;
    });
}

function installListeners(): void {
  const scheduleForm = byId<HTMLFormElement>("schedule-form");
  const syncStopFromDuration = (): void => {
    const startAt = new Date(
      formControl(scheduleForm, "startAt").value,
    ).getTime();
    const minutes = Number(formControl(scheduleForm, "windowMinutes").value);
    if (Number.isFinite(startAt) && Number.isFinite(minutes) && minutes > 0) {
      formControl(scheduleForm, "stopAt").value = localInputValue(
        startAt + minutes * 60_000,
      );
    }
  };
  formControl(scheduleForm, "startAt").addEventListener(
    "change",
    syncStopFromDuration,
  );
  formControl(scheduleForm, "windowMinutes").addEventListener(
    "change",
    syncStopFromDuration,
  );
  formControl(scheduleForm, "stopAt").addEventListener("change", () => {
    const startAt = new Date(
      formControl(scheduleForm, "startAt").value,
    ).getTime();
    const stopAt = new Date(
      formControl(scheduleForm, "stopAt").value,
    ).getTime();
    if (
      Number.isFinite(startAt) &&
      Number.isFinite(stopAt) &&
      stopAt > startAt
    ) {
      formControl(scheduleForm, "windowMinutes").value = String(
        Math.ceil((stopAt - startAt) / 60_000),
      );
    }
  });
  byId("refresh-button").addEventListener("click", () => {
    void refreshStoredCredentials()
      .then((next) => render(next))
      .catch((error: unknown) => showToast(String(error), true));
  });
  byId("clear-credentials-button").addEventListener("click", () => {
    void clearStoredCredentials()
      .then((next) => render(next))
      .catch((error: unknown) => showToast(String(error), true));
  });
  byId<HTMLFormElement>("settings-form").addEventListener("submit", (event) => {
    event.preventDefault();
    void saveSmartFetcherSettings(readSettings())
      .then((next) => {
        render(next, true);
        showToast(t("saved"));
      })
      .catch((error: unknown) => showToast(String(error), true));
  });
  byId("inspect-button").addEventListener("click", () => {
    void inspectCurrentVideo().catch((error: unknown) =>
      showToast(String(error), true),
    );
  });
  byId("reset-button").addEventListener("click", () => resetScheduleForm());
  byId<HTMLFormElement>("schedule-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      void saveSchedule(readSchedule())
        .then((next) => {
          render(next);
          resetScheduleForm();
          showToast(t("saved"));
        })
        .catch((error: unknown) => showToast(String(error), true));
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), true);
    }
  });
  document
    .querySelectorAll<HTMLButtonElement>("[data-preset]")
    .forEach((button) => {
      button.addEventListener("click", () =>
        applyPreset(button.dataset["preset"] ?? ""),
      );
    });
  byId("schedule-list").addEventListener("click", (event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>("button[data-action]")
        : null;
    const id = button?.dataset["id"];
    const action = button?.dataset["action"];
    if (!id || !action || !state) return;
    if (action === "edit") {
      const schedule = state.schedules.find((item) => item.id === id);
      if (schedule) fillScheduleForm(schedule);
      return;
    }
    const operation =
      action === "run"
        ? runScheduleNow
        : action === "cancel"
          ? cancelSchedule
          : removeSchedule;
    button.disabled = true;
    void operation(id)
      .then((next) => render(next))
      .catch((error: unknown) => {
        button.disabled = false;
        showToast(String(error), true);
      });
  });
}

export async function startSmartFetcherApp(): Promise<void> {
  applyTranslations();
  new CommonHeader("common-header-container", {
    title: "smartFetcher",
    showSearch: false,
    customLinks: [
      {
        text: "movie-info",
        url: "/local/features/dist/pages/movie-info/index.html",
      },
      {
        text: "watch-history",
        url: "/local/features/dist/pages/watch-history/index.html",
      },
    ],
  });
  initializeWeekdays();
  installListeners();
  await refreshStoredCredentials().catch(() => null);
  await loadState(true);
  const videoId = new URL(location.href).searchParams.get("videoId") ?? "";
  resetScheduleForm(videoId);
  if (videoId)
    void inspectCurrentVideo().catch((error: unknown) =>
      showToast(String(error), true),
    );
  window.setInterval(() => void loadState().catch(() => undefined), 10_000);
}
