// マテリアルアイコン統合ヘルパー

import type { IconStyle, IconSize, IconColor, IconOptions, IconName } from '@/types/icon-types';
import { outlinedIconMap, filledIconMap } from './icon-assets';

// 型定義の再エクスポート（既存コードとの互換性のため）
export type { IconStyle, IconSize, IconColor, IconOptions, IconName };

/**
 * 共通アイコン定数
 */
export const ICONS = {
  close: 'close',
  settings: 'settings',
  filter: 'filter_list',
  save: 'save',
  clear: 'clear_all',
  export: 'file_download',
  import: 'file_upload',
  debug: 'bug_report',
  visibility: 'visibility',
  visibility_off: 'visibility_off',
  warning: 'warning_amber',
  check: 'check_circle',
  error: 'error',
  info: 'info',
  comment: 'comment',
  delete: 'delete',
  edit: 'edit',
  folder: 'folder_open',
  refresh: 'refresh',
  push_pin: 'push_pin',
  play: 'play_arrow',
  pause: 'pause',
  stop: 'stop',
  volume_up: 'volume_up',
  volume_down: 'volume_down',
  volume_off: 'volume_off',
  fullscreen: 'fullscreen',
  fullscreen_exit: 'fullscreen_exit',
  search: 'search',
  menu: 'menu',
  home: 'home',
  bookmark: 'bookmark',
  favorite: 'favorite',
  share: 'share',
  more_vert: 'more_vert',
  more_horiz: 'more_horiz',
  // 追加アイコン（絵文字置き換え用）
  assignment: 'assignment',
  star: 'star',
  menu_book: 'menu_book',
  flash_on: 'flash_on',
  keyboard: 'keyboard',
  build: 'build',
  science: 'science',
  help: 'help',
  videocam: 'videocam',
  analytics: 'analytics',
  public: 'public',
  movie: 'movie',
  text_fields: 'text_fields',
  gps_fixed: 'gps_fixed',
  lightbulb: 'lightbulb',
  rocket_launch: 'rocket_launch',
  live_tv: 'live_tv',
  image: 'image',
  tv: 'tv',
  trending_up: 'trending_up',
  video_library: 'video_library',
  whatshot: 'whatshot',
  download: 'download',
  schedule: 'schedule',
  cloud_upload: 'cloud_upload',
  cloud_download: 'cloud_download',
  upload: 'upload',
  } as const;

const iconSourceMap: Record<IconStyle, Record<string, string>> = {
  filled: filledIconMap,
  outlined: outlinedIconMap,
  round: {},
  sharp: {},
  'two-tone': {},
};

/**
 * アイコンのパスを生成
 */
export function getIconPath(iconName: string, style: IconStyle = 'outlined'): string {
  const normalizedStyle = iconSourceMap[style] ? style : 'outlined';
  const primaryMap = iconSourceMap[normalizedStyle] ?? iconSourceMap.outlined;
  const iconUrl = primaryMap[iconName] ?? iconSourceMap.outlined[iconName];

  if (!iconUrl) {
    if (typeof console !== 'undefined') {
      console.warn(`[material-icons] アイコンが見つかりません: ${style}/${iconName}`);
    }
    return '';
  }

  return iconUrl;
}

/**
 * アイコンのサイズをpx値に変換
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getIconSizeValue(size: IconSize): string {
  if (typeof size === 'number') {
    return `${size}px`;
  }
  
  const sizeMap: Record<string, string> = {
    small: 'var(--icon-size-small, 16px)',
    medium: 'var(--icon-size-medium, 20px)',
    large: 'var(--icon-size-large, 24px)',
  };
  
  return sizeMap[size] || sizeMap.medium;
}

/**
 * アイコンのカラークラスを取得
 */
function getColorClass(color: IconColor): string {
  const colorMap: Record<IconColor, string> = {
    white: 'icon-white',
    green: 'icon-green',
    red: 'icon-red',
    dark: 'icon-dark',
    default: 'icon-outlined',
  };
  
  return colorMap[color] || colorMap.default;
}

/**
 * アイコンのサイズクラスを取得
 */
function getSizeClass(size: IconSize): string {
  if (typeof size === 'number') {
    return '';
  }
  
  const sizeClassMap: Record<string, string> = {
    small: 'material-icon-small',
    medium: '',
    large: 'material-icon-large',
  };
  
  return sizeClassMap[size] || '';
}

/**
 * マテリアルアイコンのimgタグを生成
 */
export function createMaterialIcon(iconName: string, options: IconOptions = {}): string {
  const {
    style = 'outlined',
    size = 'medium',
    color = 'default',
    classes = '',
    alt = iconName,
    loading = 'lazy'
  } = options;

  const iconPath = getIconPath(iconName, style);
  const colorClass = getColorClass(color);
  const sizeClass = getSizeClass(size);
  
  const allClasses = ['material-icon', colorClass, sizeClass, classes]
    .filter(Boolean)
    .join(' ');

  const styleAttr = typeof size === 'number' 
    ? ` style="width: ${size}px; height: ${size}px;"` 
    : '';

  if (!iconPath) {
    return `<span class="${allClasses} material-icon-missing" role="presentation"${styleAttr}></span>`;
  }

  return `<img class="${allClasses}" src="${iconPath}" alt="${alt}" loading="${loading}"${styleAttr} />`;
}

/**
 * data-icon属性を持つimg要素にアイコンパスを適用
 */
export function hydrateMaterialIconImages(root?: ParentNode): void {
  if (typeof document === 'undefined') {
    return;
  }

  const scope = root ?? document;
  scope.querySelectorAll<HTMLImageElement>('img[data-icon]').forEach((img) => {
    const iconName = img.dataset.icon;
    if (!iconName) {
      return;
    }
    const requestedStyle = (img.dataset.style as IconStyle) ?? 'outlined';
    const iconUrl = getIconPath(iconName, requestedStyle);
    if (!iconUrl) {
      return;
    }
    if (img.getAttribute('src') !== iconUrl) {
      img.src = iconUrl;
    }
  });
}

/**
 * 旧版互換性のためのヘルパー（comment-filter2用）
 */
export function getIconSVG(iconName: string): string {
  return createMaterialIcon(iconName, {
    style: 'outlined',
    color: 'white',
    classes: 'cf2-icon cf2-icon-white',
    loading: 'lazy'
  });
}

/**
 * マテリアルアイコンのCSSスタイル
 */
export const materialIconsStyles = `
  /* マテリアルアイコン基本設定 */
  .material-icon {
    display: inline-block;
    width: var(--icon-size-medium, 20px);
    height: var(--icon-size-medium, 20px);
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    vertical-align: middle;
    pointer-events: none; /* ボタン内でのクリックイベント伌のため */
  }

  .material-icon-small {
    width: var(--icon-size-small, 16px);
    height: var(--icon-size-small, 16px);
  }

  .material-icon-large {
    width: var(--icon-size-large, 24px);
    height: var(--icon-size-large, 24px);
  }

  /* 色設定用CSSフィルタ（黒塗りアイコンの色変換用） */
  .icon-white {
    filter: brightness(0) saturate(100%) invert(100%);
  }

  .icon-green {
    filter: brightness(0) saturate(100%) invert(64%) sepia(88%) saturate(3583%) hue-rotate(87deg) brightness(118%) contrast(119%);
  }

  .icon-red {
    filter: brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%);
  }

  .icon-dark {
    filter: brightness(0) saturate(100%) invert(20%) sepia(8%) saturate(7%) hue-rotate(314deg) brightness(96%) contrast(93%);
  }

  /* 基本カラー（outlined版での白色設定） */
  .icon-outlined {
    filter: brightness(0) saturate(100%) invert(100%);
  }

  /* CSS変数定義 */
  :root {
    --icon-size-small: 16px;
    --icon-size-medium: 20px;
    --icon-size-large: 24px;
    --icon-color-default: #ffffff;
    --icon-color-success: #4caf50;
    --icon-color-danger: #f44336;
    --icon-color-dark: #333333;
  }

  /* ボタン内のアイコン調整 */
  .control-btn .material-icon,
  .action-card .material-icon {
    margin: 0;
    vertical-align: middle;
  }

  /* FABアイコン */
  .fab-icon {
    width: 24px;
    height: 24px;
  }

  /* タブアイコン */
  .tab-icon {
    width: 20px;
    height: 20px;
    margin-right: 8px;
  }

  /* comment-filter2互換クラス */
  .cf2-icon {
    display: inline-block;
    vertical-align: middle;
  }

  .cf2-icon-white {
    filter: brightness(0) saturate(100%) invert(100%);
  }

  .material-icon-missing {
    opacity: 0;
  }
`;

/**
 * よく使われるアイコンのショートカット
 */
export const commonIcons = {
  close: () => createMaterialIcon(ICONS.close, { color: 'white' }),
  settings: () => createMaterialIcon(ICONS.settings, { color: 'white' }),
  save: () => createMaterialIcon(ICONS.save, { color: 'green' }),
  error: () => createMaterialIcon(ICONS.error, { color: 'red' }),
  warning: () => createMaterialIcon(ICONS.warning, { color: 'red' }),
  success: () => createMaterialIcon(ICONS.check, { color: 'green' }),
  info: () => createMaterialIcon(ICONS.info, { color: 'white' }),
} as const;

// 型は上で既にexportされているため、ここでの再エクスポートは不要 
