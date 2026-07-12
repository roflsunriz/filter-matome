export const formatNumber = (value: number | undefined | null): string => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return value.toLocaleString("ja-JP");
};

export const formatDateTime = (
  isoString: string | undefined | null,
): string => {
  if (!isoString) {
    return "-";
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  const datePart = date.toLocaleDateString("ja-JP");
  const timePart = date.toLocaleTimeString("ja-JP", { hour12: false });
  return datePart + " " + timePart;
};

export const formatDuration = (seconds: number | undefined | null): string => {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    return "-";
  }
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const parts = [
    minutes.toString().padStart(2, "0"),
    sec.toString().padStart(2, "0"),
  ];
  if (hours > 0) {
    parts.unshift(hours.toString());
  }
  return parts.join(":");
};

export const createStatItem = (label: string, value: string): HTMLElement => {
  const item = document.createElement("div");
  item.className = "nc-stat-item";

  const labelEl = document.createElement("span");
  labelEl.className = "nc-stat-item__label";
  labelEl.textContent = label;

  const valueEl = document.createElement("span");
  valueEl.className = "nc-stat-item__value";
  valueEl.textContent = value;

  item.append(labelEl, valueEl);
  return item;
};

/**
 * 連続再生チェックボックス付き統計アイテムを生成する
 * @param checked 初期チェック状態
 * @param disabled シリーズの次の動画がない場合 true
 * @param onChange チェック状態変更時のコールバック
 * @param sourceHint ソースのヒント表示（例: "説明文"）。省略時はシリーズ由来とみなす
 */
export const createAutoNextStatItem = (
  checked: boolean,
  disabled: boolean,
  onChange: (checked: boolean) => void,
  sourceHint?: string,
): HTMLElement => {
  const item = document.createElement("div");
  item.className = "nc-stat-item nc-stat-item--auto-next";
  if (disabled) {
    item.classList.add("nc-stat-item--disabled");
  }

  const labelEl = document.createElement("label");
  labelEl.className = "nc-stat-item__auto-next-label";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "nc-stat-item__auto-next-checkbox";
  checkbox.checked = checked && !disabled;
  checkbox.disabled = disabled;
  checkbox.addEventListener("change", () => {
    onChange(checkbox.checked);
  });

  const textEl = document.createElement("span");
  textEl.className = "nc-stat-item__label";
  textEl.textContent = "連続再生";

  labelEl.append(checkbox, textEl);

  const statusEl = document.createElement("span");
  statusEl.className = "nc-stat-item__value";
  if (disabled) {
    statusEl.textContent = "リンクなし";
  } else {
    const suffix = sourceHint ? ` (${sourceHint})` : "";
    const formatStatus = (on: boolean): string => (on ? "ON" : "OFF") + suffix;
    statusEl.textContent = formatStatus(checked);
    checkbox.addEventListener("change", () => {
      statusEl.textContent = formatStatus(checkbox.checked);
    });
  }

  item.append(labelEl, statusEl);
  return item;
};

export const createRepeatPlaybackStatItem = (
  checked: boolean,
  onChange: (checked: boolean) => void,
): HTMLElement => {
  const item = document.createElement("div");
  item.className = "nc-stat-item nc-stat-item--repeat";

  const label = document.createElement("label");
  label.className = "nc-stat-item__auto-next-label";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "nc-stat-item__auto-next-checkbox";
  checkbox.checked = checked;

  const labelText = document.createElement("span");
  labelText.className = "nc-stat-item__label";
  labelText.textContent = "繰り返し再生";

  const status = document.createElement("span");
  status.className = "nc-stat-item__value";
  const updateStatus = (): void => {
    status.textContent = checkbox.checked ? "ON" : "OFF";
  };

  checkbox.addEventListener("change", () => {
    updateStatus();
    onChange(checkbox.checked);
  });

  updateStatus();
  label.append(checkbox, labelText);
  item.append(label, status);
  return item;
};
