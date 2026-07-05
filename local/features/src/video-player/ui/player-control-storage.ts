const PLAYER_VOLUME_STORAGE_KEY = "playerVolume";
const COMMENT_VISIBLE_STORAGE_KEY = "commentVisible";
const CONTROLS_MODE_STORAGE_KEY = "controlsMode";

export interface SavedVolume {
  hasSavedValue: boolean;
  volume: number;
}

export function getSavedVolume(defaultVolume: number): SavedVolume {
  const savedVolumeRaw = localStorage.getItem(PLAYER_VOLUME_STORAGE_KEY);
  if (savedVolumeRaw === null) {
    return { hasSavedValue: false, volume: defaultVolume };
  }

  const parsed = Number(savedVolumeRaw);
  return {
    hasSavedValue: true,
    volume: Number.isNaN(parsed) ? defaultVolume : parsed,
  };
}

export function saveVolume(volume: number): void {
  localStorage.setItem(PLAYER_VOLUME_STORAGE_KEY, volume.toString());
}

export function saveCommentVisibility(isVisible: boolean): void {
  localStorage.setItem(COMMENT_VISIBLE_STORAGE_KEY, isVisible.toString());
}

export function getSavedControlsMode(defaultMode: string): string {
  return localStorage.getItem(CONTROLS_MODE_STORAGE_KEY) || defaultMode;
}

export function saveControlsMode(mode: string): void {
  localStorage.setItem(CONTROLS_MODE_STORAGE_KEY, mode);
}
