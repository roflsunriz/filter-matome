export const formatNumber = (value: number | undefined | null): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }
  return value.toLocaleString('ja-JP');
};

export const formatDateTime = (isoString: string | undefined | null): string => {
  if (!isoString) {
    return '-';
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  const datePart = date.toLocaleDateString('ja-JP');
  const timePart = date.toLocaleTimeString('ja-JP', { hour12: false });
  return datePart + ' ' + timePart;
};

export const formatDuration = (seconds: number | undefined | null): string => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    return '-';
  }
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const parts = [minutes.toString().padStart(2, '0'), sec.toString().padStart(2, '0')];
  if (hours > 0) {
    parts.unshift(hours.toString());
  }
  return parts.join(':');
};

export const createStatItem = (label: string, value: string): HTMLElement => {
  const item = document.createElement('div');
  item.className = 'nc-stat-item';

  const labelEl = document.createElement('span');
  labelEl.className = 'nc-stat-item__label';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'nc-stat-item__value';
  valueEl.textContent = value;

  item.append(labelEl, valueEl);
  return item;
};
