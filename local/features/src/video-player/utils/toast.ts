import "../../types/global.d.ts";

import { ToastMode, ToastConfig } from '@/types/index.js';
import { TOAST_CONFIG } from '../config/constants.js';

/**
 * トースト通知を管理するクラス
 */
export class ToastManager {
  private config: ToastConfig;

  constructor(config: ToastConfig = TOAST_CONFIG) {
    this.config = config;
  }

  /**
   * 情報通知を表示
   * @param title メインメッセージ
   * @param middle サブメッセージ（省略可）
   * @param low 追加情報（省略可）
   */
  public showInfo(title: string, middle: string = "", low: string = ""): void {
    this.showToast(ToastMode.INFO, title, middle, low, this.config.TIMEOUTS.START_MS);
  }

  /**
   * 成功通知を表示
   * @param title メインメッセージ
   * @param middle サブメッセージ（省略可）
   * @param low 追加情報（省略可）
   */
  public showSuccess(title: string, middle: string = "", low: string = ""): void {
    this.showToast(ToastMode.SUCCESS, title, middle, low, this.config.TIMEOUTS.PLAYABLE_MS);
  }

  /**
   * 警告通知を表示
   * @param title メインメッセージ
   * @param middle サブメッセージ（省略可）
   * @param low 追加情報（省略可）
   */
  public showWarning(title: string, middle: string = "", low: string = ""): void {
    this.showToast(ToastMode.WARNING, title, middle, low, this.config.TIMEOUTS.WARN_MS);
  }

  /**
   * エラー通知を表示
   * @param title メインメッセージ
   * @param middle サブメッセージ（省略可）
   * @param low 追加情報（省略可）
   */
  public showError(title: string, middle: string = "", low: string = ""): void {
    this.showToast(ToastMode.ERROR, title, middle, low, this.config.TIMEOUTS.ERROR_MS);
  }

  /**
   * カスタム通知を表示
   * @param mode 通知モード
   * @param title メインメッセージ
   * @param middle サブメッセージ（省略可）
   * @param low 追加情報（省略可）
   * @param timeout 表示時間（ミリ秒）
   */
  public showToast(
    mode: ToastMode, 
    title: string, 
    middle: string = "", 
    low: string = "", 
    timeout: number = 5000
  ): void {
    const message = [middle, low].filter(Boolean).join(' ');
    
    switch (mode) {
      case ToastMode.INFO:
        window.toastr.info(message, title, { timeOut: timeout });
        break;
      case ToastMode.SUCCESS:
        window.toastr.success(message, title, { timeOut: timeout });
        break;
      case ToastMode.WARNING:
        window.toastr.warning(message, title, { timeOut: timeout });
        break;
      case ToastMode.ERROR:
        window.toastr.error(message, title, { timeOut: timeout });
        break;
      default:
        window.logger.info(`[Toast-${String(mode)}] ${title} ${message}`);
    }
  }
} 