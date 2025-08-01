import type { MediaItem, MediaTrack } from '@/types/media-info';

/**
 * メディア情報のバリデーション用ユーティリティなのじゃ
 */
export interface Validators {
  isValidMediaInfo(mediaInfo: any): mediaInfo is MediaItem[];
  isValidFileSize(size: string | number | undefined | null): boolean;
  isValidTrack(track: any): track is MediaTrack;
  isValidBitrate(bitrate: string | number | undefined | null): boolean;
  isValidResolution(width: string | number, height: string | number): boolean;
  isValidMediaRef(ref: string): boolean;
  createErrorMessage(message: string, value: any): string;
}

export const validators: Validators = {
  /**
   * メディアファイルの基本情報をバリデーションするのじゃ
   * @param mediaInfo - メディア情報オブジェクト
   * @returns バリデーション結果
   */
  isValidMediaInfo(mediaInfo: any): mediaInfo is MediaItem[] {
    if (!Array.isArray(mediaInfo)) {
      console.error('メディア情報が配列ではないのじゃ');
      return false;
    }

    if (mediaInfo.length === 0) {
      console.error('メディア情報が空なのじゃ');
      return false;
    }

    return true;
  },

  /**
   * ファイルサイズの値をバリデーションするのじゃ
   * @param size - ファイルサイズ
   * @returns バリデーション結果
   */
  isValidFileSize(size: string | number | undefined | null): boolean {
    if (size === undefined || size === null) {
      return false;
    }

    const parsedSize = parseInt(String(size), 10);
    return !isNaN(parsedSize) && parsedSize >= 0;
  },

  /**
   * トラック情報をバリデーションするのじゃ
   * @param track - トラック情報
   * @returns バリデーション結果
   */
  isValidTrack(track: any): track is MediaTrack {
    return track && 
           typeof track === 'object' && 
           '@type' in track;
  },

  /**
   * ビットレートの値をバリデーションするのじゃ
   * @param bitrate - ビットレート
   * @returns バリデーション結果
   */
  isValidBitrate(bitrate: string | number | undefined | null): boolean {
    if (bitrate === undefined || bitrate === null) {
      return false;
    }

    const parsedBitrate = parseInt(String(bitrate), 10);
    return !isNaN(parsedBitrate) && parsedBitrate > 0;
  },

  /**
   * 解像度の値をバリデーションするのじゃ
   * @param width - 幅
   * @param height - 高さ
   * @returns バリデーション結果
   */
  isValidResolution(width: string | number, height: string | number): boolean {
    const parsedWidth = parseInt(String(width), 10);
    const parsedHeight = parseInt(String(height), 10);

    return !isNaN(parsedWidth) && 
           !isNaN(parsedHeight) && 
           parsedWidth > 0 && 
           parsedHeight > 0;
  },

  /**
   * メディアファイルの参照パスをバリデーションするのじゃ
   * @param ref - ファイルの参照パス
   * @returns バリデーション結果
   */
  isValidMediaRef(ref: string): boolean {
    if (!ref || typeof ref !== 'string') {
      return false;
    }

    // 必要な拡張子のチェック
    const validExtensions = ['.cmfa', '.cmfv', '.m3u8', '.mp4', '.m4s'];
    return validExtensions.some(ext => ref.includes(ext));
  },

  /**
   * エラーメッセージを生成するのじゃ
   * @param message - エラーメッセージ
   * @param value - 問題のある値
   * @returns フォーマットされたエラーメッセージ
   */
  createErrorMessage(message: string, value: any): string {
    return `バリデーションエラー: ${message} (値: ${JSON.stringify(value)})`;
  }
};

/**
 * バリデーションエラーを表すカスタムエラークラスなのじゃ
 */
export class MediaInfoValidationError extends Error {
  public readonly invalidValue: any;

  constructor(message: string, value: any) {
    super(validators.createErrorMessage(message, value));
    this.name = 'MediaInfoValidationError';
    this.invalidValue = value;
  }
} 