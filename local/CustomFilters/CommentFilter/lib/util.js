/**
 * 共通ユーティリティ関数
 */

/**
 * 文字列型のブーリアン値を実際のブーリアン値に変換
 * @param {string|boolean} value - 変換する値
 * @returns {boolean} - 変換後のブーリアン値
 */
export const toBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return Boolean(value);
  };
  
  /**
   * 動画IDの正規表現パターン
   */
  export const VIDEO_ID_PATTERN = /(?:[smno]{2})?\d+/;
  
  /**
   * コメントAPIのエンドポイント
   */
  export const COMMENT_API_ENDPOINT = 'https://public.nvcomment.nicovideo.jp/v1/threads';
  
  /**
   * デバッグメッセージを生成
   * @param {string} type - メッセージタイプ
   * @param {Object} params - パラメータ
   * @returns {string} - フォーマットされたデバッグメッセージ
   */
  export const createDebugMessage = (type, params) => {
    const paramString = Object.entries(params)
      .map(([key, value]) => {
        // 値が空文字列の場合は表示しない
        if (value === '') return null;
        // 値がundefinedまたはnullの場合は表示しない
        if (value == null) return null;
        return `${key}:「${value}」`;
      })
      .filter(Boolean) // nullを除外
      .join(' | ');
    return `[${type}] ${paramString}`;
  };
  
  /**
   * 設定値の検証
   * @param {*} value - 検証する値
   * @param {*} defaultValue - デフォルト値
   * @param {string} type - 期待する型
   * @returns {*} - 検証済みの値
   */
  export const validateSetting = (value, defaultValue, type) => {
    if (value === null || value === undefined) return defaultValue;
    
    switch (type) {
      case 'boolean':
        return toBoolean(value);
      case 'array':
        return Array.isArray(value) ? value : String(value).split('\n').filter(Boolean);
      case 'number':
        return Number(value) || defaultValue;
      default:
        return value;
    }
  };
  
  /**
   * エラーハンドリング用のラッパー関数
   * @param {Function} fn - 実行する関数
   * @param {string} errorMessage - エラーメッセージ
   * @returns {Promise} - 処理結果
   */
  export const asyncErrorHandler = async (fn, errorMessage) => {
    try {
      return await fn();
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      throw error;
    }
  };
  
  /**
   * 設定のエクスポート/インポート用のフォーマット処理
   */
  export const settingsFormatter = {
    stringify: (settings) => JSON.stringify(settings, null, 2),
    parse: (json) => {
      try {
        return JSON.parse(json);
      } catch (e) {
        throw new Error('無効な設定データです');
      }
    }
  };
  
  // 許可されたコマンドのリスト
  export const ALLOWED_COMMANDS = new Set([
    // サイズ
    'big', 'medium', 'small',
    // フォント
    'defont', 'gothic', 'mincho',
    // 位置
    'ue', 'naka', 'shita',
    // 基本色
    'white', 'red', 'pink', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'black',
    // プレミアム会員のみ
    'white2', 'red2', 'pink2', 'orange2', 'yellow2', 'green2', 'cyan2', 'blue2', 'purple2', 'black2',
    // 特殊コマンド
    '_live', 'invisible', 'full', 'ender', 'patissier', 'ca'
  ]);
  
  // 16進数カラーコードの正規表現
  const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
  
  /**
   * コマンドをサニタイズする関数
   * @param {string} command - サニタイズするコマンド
   * @returns {string|null} - サニタイズされたコマンド、無効な場合はnull
   */
  export const sanitizeCommand = (command) => {
    const trimmed = command.trim();
    
    // 空のコマンドは無視
    if (!trimmed) return null;
    
    // 許可リストにあるコマンド
    if (ALLOWED_COMMANDS.has(trimmed)) {
      return trimmed;
    }
    
    // 16進数カラーコード
    if (HEX_COLOR_PATTERN.test(trimmed)) {
      return trimmed.toLowerCase();
    }
    
    return null;
  };
  
  /**
   * コマンド文字列をサニタイズする関数
   * @param {string} commandString - カンマ区切りのコマンド文字列
   * @returns {string[]} - サニタイズされたコマンドの配列
   */
  export const sanitizeCommandString = (commandString) => {
    if (!commandString) return [];
    
    return commandString
      .split(',')
      .map(cmd => sanitizeCommand(cmd))
      .filter(Boolean); // nullや空文字を除外
  };