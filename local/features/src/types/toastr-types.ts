/**
 * Toastr関連の型定義
 */

export interface ToastrOptions {
  tapToDismiss?: boolean;
  toastClass?: string;
  containerId?: string;
  debug?: boolean;
  showMethod?: string;
  showDuration?: number;
  showEasing?: string;
  onShown?: (() => void) | undefined;
  hideMethod?: string;
  hideDuration?: number;
  hideEasing?: string;
  onHidden?: (() => void) | undefined;
  closeMethod?: string | false;
  closeDuration?: number | false;
  closeEasing?: string | false;
  closeOnHover?: boolean;
  extendedTimeOut?: number;
  iconClasses?: {
    error?: string;
    info?: string;
    success?: string;
    warning?: string;
  };
  iconClass?: string;
  positionClass?: string;
  timeOut?: number;
  titleClass?: string;
  messageClass?: string;
  escapeHtml?: boolean;
  target?: string;
  closeHtml?: string;
  closeClass?: string;
  newestOnTop?: boolean;
  preventDuplicates?: boolean;
  progressBar?: boolean;
  progressClass?: string;
  rtl?: boolean;
  closeButton?: boolean;
  onCloseClick?: (e: Event) => void;
  onclick?: (e: Event) => void;
}

/**
 * Toastrオブジェクトのインターフェース
 */
export interface ToastrInstance {
  info(
    message: string,
    title?: string,
    options?: ToastrOptions,
  ): HTMLElement | undefined;
  success(
    message: string,
    title?: string,
    options?: ToastrOptions,
  ): HTMLElement | undefined;
  warning(
    message: string,
    title?: string,
    options?: ToastrOptions,
  ): HTMLElement | undefined;
  error(
    message: string,
    title?: string,
    options?: ToastrOptions,
  ): HTMLElement | undefined;
  clear(): void;
  version: string;
  defaults: Required<ToastrOptions>;
  subscribe(callback: (data: ToastData) => void): void;
  getContainer(options?: ToastrOptions, create?: boolean): HTMLElement | null;
  notify(params: ToastrNotifyParams): HTMLElement | undefined;
  removeToast(toastElement: HTMLElement): void;
  escapeHtml(str: string): string;
  animate(
    element: HTMLElement,
    animationOptions: { method: string; duration: number; easing: string },
    callback?: () => void,
  ): void;
}

export interface ToastrNotifyParams {
  type: "error" | "info" | "success" | "warning";
  iconClass: string;
  message: string;
  title?: string;
  options?: ToastrOptions;
}

/**
 * Toastrリスナーコールバックで使用されるデータの型
 */
export interface ToastData {
  toastId: number;
  state: string;
  startTime: Date;
  options: Required<ToastrOptions>;
  map: ToastrNotifyParams;
}

/**
 * HTMLElementを拡張してtimeoutIdプロパティを追加
 */
export interface ExtendedHTMLElement extends HTMLElement {
  timeoutId?: number;
}
