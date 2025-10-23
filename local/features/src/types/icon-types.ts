/**
 * アイコン関連の型定義
 */

/**
 * マテリアルアイコンのスタイル
 */
export type IconStyle = "filled" | "outlined" | "round" | "sharp" | "two-tone";

/**
 * アイコンのサイズ
 */
export type IconSize = "small" | "medium" | "large" | number;

/**
 * アイコンのカラー
 */
export type IconColor = "white" | "green" | "red" | "dark" | "default";

/**
 * アイコン生成オプション
 */
export interface IconOptions {
  style?: IconStyle;
  size?: IconSize;
  color?: IconColor;
  classes?: string;
  alt?: string;
  loading?: "lazy" | "eager";
}

/**
 * 共通アイコン定数の型
 * 注意: この型は material-icons.ts の ICONS 定数と同期する必要があります
 */
export type IconName =
  | "close"
  | "settings"
  | "filter_list" // filterではなくfilter_list
  | "save"
  | "clear_all" // clearではなくclear_all
  | "file_download" // exportではなくfile_download
  | "file_upload" // importではなくfile_upload
  | "bug_report" // debugではなくbug_report
  | "visibility"
  | "visibility_off"
  | "warning_amber" // warningではなくwarning_amber
  | "check_circle" // checkではなくcheck_circle
  | "error"
  | "info"
  | "comment"
  | "delete"
  | "edit"
  | "folder_open" // folderではなくfolder_open
  | "refresh"
  | "push_pin"
  | "play_arrow" // playではなくplay_arrow
  | "pause"
  | "stop"
  | "volume_up"
  | "volume_down"
  | "volume_off"
  | "fullscreen"
  | "fullscreen_exit"
  | "search"
  | "menu"
  | "home"
  | "bookmark"
  | "favorite"
  | "share"
  | "more_vert"
  | "more_horiz";
