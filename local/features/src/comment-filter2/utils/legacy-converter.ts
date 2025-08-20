// CommentFilter（旧機能）のレガシー設定データをJSON Lines形式に変換するユーティリティ

import { NgRuleJson, Settings, CommandSettings, UnknownData, Action, NicoruCond } from '@/types/filter-types';

/**
 * レガシー設定データの型定義
 */
export interface LegacyCommentFilterSettings {
  DEBUG?: boolean;
  lotOfNicorare?: boolean;
  filterMode?: string;
  NGWord?: string;
  NGRegex?: string;
  OKWord?: string;
  OKRegex?: string;
  excludeMovieIds?: string;
  replaceRules?: string;
  excludeUserIds?: string;
  userIdFilters?: string;
  ownerCommands?: string;
  normalCommands?: string;
  easyCommands?: string;
  superNgWords?: string;
  superUserIdFilters?: string;
  specificNgUsers?: string;
  specificNgWords?: string;
  superNgRegex?: string;
  superNgReplaceRules?: string;
}

/**
 * レガシー変換結果の型定義
 */
export interface LegacyConversionResult {
  rules: NgRuleJson[];
  settings: Settings;
  conversionLog: string[];
}

/**
 * CommentFilter（旧機能）の設定をJSON Lines形式に変換
 */
export class LegacyConverter {
  
  /**
   * レガシー設定データをJSON Lines形式に変換
   */
  public static convert(legacyData: LegacyCommentFilterSettings): LegacyConversionResult {
    const conversionLog: string[] = [];
    const rules: NgRuleJson[] = [];
    
    // 基本設定の変換
    const settings: Settings = {
      debugMode: legacyData.DEBUG || false,
      isEnabled: true, // レガシーデータでは常に有効とみなす
      commandSettings: this.convertCommandSettings(legacyData, conversionLog)
    };

    conversionLog.push(`基本設定を変換しました: DEBUG=${settings.debugMode}`);

    // NGワードの変換
    if (legacyData.NGWord) {
      const ngWordRules = this.convertNGWords(legacyData.NGWord, conversionLog);
      rules.push(...ngWordRules);
    }

    // NG正規表現の変換
    if (legacyData.NGRegex) {
      const ngRegexRules = this.convertNGRegex(legacyData.NGRegex, conversionLog);
      rules.push(...ngRegexRules);
    }

    // SuperNG関連の変換
    if (legacyData.superNgWords) {
      const superNgRules = this.convertSuperNGWords(legacyData.superNgWords, conversionLog);
      rules.push(...superNgRules);
    }

    if (legacyData.superNgRegex) {
      const superNgRegexRules = this.convertSuperNGRegex(legacyData.superNgRegex, conversionLog);
      rules.push(...superNgRegexRules);
    }

    // 置換ルールの変換
    if (legacyData.replaceRules) {
      const replaceRules = this.convertReplaceRules(legacyData.replaceRules, conversionLog);
      rules.push(...replaceRules);
    }

    if (legacyData.superNgReplaceRules) {
      const superReplaceRules = this.convertReplaceRules(legacyData.superNgReplaceRules, conversionLog);
      rules.push(...superReplaceRules);
    }

    // ユーザーID除外の変換
    if (legacyData.userIdFilters) {
      const userIdRules = this.convertUserIdFilters(legacyData.userIdFilters, conversionLog);
      rules.push(...userIdRules);
    }

    if (legacyData.superUserIdFilters) {
      const superUserIdRules = this.convertUserIdFilters(legacyData.superUserIdFilters, conversionLog);
      rules.push(...superUserIdRules);
    }

    conversionLog.push(`変換完了: ルール数=${rules.length}, 設定項目数=${Object.keys(settings).length}`);

    return {
      rules,
      settings,
      conversionLog
    };
  }

  /**
   * コマンド設定を変換
   */
  private static convertCommandSettings(legacyData: LegacyCommentFilterSettings, log: string[]): CommandSettings {
    const defaultCommands = ['big', 'medium', 'small', 'defont', 'gothic', 'mincho', 
                            'ue', 'naka', 'shita', 'white', 'red', 'pink', 'orange', 
                            'yellow', 'green', 'cyan', 'blue', 'purple', 'black',
                            'white2', 'red2', 'pink2', 'orange2', 'yellow2', 'green2', 
                            'cyan2', 'blue2', 'purple2', 'black2', '_live', 'invisible', 
                            'full', 'ender', 'patissier', 'ca'];

    const ownerCommands = legacyData.ownerCommands ? 
      this.parseCommands(legacyData.ownerCommands) : defaultCommands;
    const mainCommands = legacyData.normalCommands ? 
      this.parseCommands(legacyData.normalCommands) : defaultCommands;
    const easyCommands = legacyData.easyCommands ? 
      this.parseCommands(legacyData.easyCommands) : defaultCommands;

    log.push(`コマンド設定を変換: owner=${ownerCommands.length}, main=${mainCommands.length}, easy=${easyCommands.length}`);

    return {
      owner: ownerCommands,
      main: mainCommands,
      easy: easyCommands,
      normal: mainCommands  // normalはmainと同じ設定を使用
    };
  }

  /**
   * コマンド文字列をパース
   * 注意：レガシーのコマンドにはカンマは含まれないため、単純分割で問題なし
   */
  private static parseCommands(commandStr: string): string[] {
    return commandStr.split(',').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
  }

  /**
   * NGワードを変換（JSON Lines形式）
   */
  private static convertNGWords(ngWords: string, log: string[]): NgRuleJson[] {
    const words = ngWords.split('\n').filter(word => word.trim() !== '');
    const rules: NgRuleJson[] = [];

    for (const word of words) {
      const trimmedWord = word.trim();
      if (trimmedWord) {
        // 特殊文字をエスケープして部分一致の正規表現として使用
        // レガシーのNGワードは文中での部分一致を前提としている
        const escapedWord = this.escapeRegExp(trimmedWord);
        rules.push({
          pattern: escapedWord, // 部分一致（文中に含まれればマッチ）
          flags: 'gi',
          action: { type: 'hide' } as Action,
          smid: ['ALL'],
          enabled: true,
          description: `NGワード: ${trimmedWord}`
        });
      }
    }

    log.push(`NGワードを変換: ${rules.length}個のルール（部分一致）`);
    return rules;
  }

  /**
   * NG正規表現を変換（JSON Lines形式）
   */
  private static convertNGRegex(ngRegex: string, log: string[]): NgRuleJson[] {
    const regexes = ngRegex.split('\n').filter(regex => regex.trim() !== '');
    const rules: NgRuleJson[] = [];

    for (const regex of regexes) {
      const trimmedRegex = regex.trim();
      if (trimmedRegex) {
        try {
          // 正規表現の妥当性をチェック
          new RegExp(trimmedRegex);
          rules.push({
            pattern: trimmedRegex,
            flags: 'gi',
            action: { type: 'hide' } as Action,
            smid: ['ALL'],
            enabled: true,
            description: `NG正規表現: ${trimmedRegex}`
          });
        } catch (error) {
          void error;
          log.push(`無効な正規表現をスキップ: ${trimmedRegex}`);
        }
      }
    }

    log.push(`NG正規表現を変換: ${rules.length}個のルール`);
    return rules;
  }

  /**
   * SuperNGワードを変換（JSON Lines形式）
   */
  private static convertSuperNGWords(superNgWords: string, log: string[]): NgRuleJson[] {
    const words = superNgWords.split('\n').filter(word => word.trim() !== '');
    const rules: NgRuleJson[] = [];

    for (const word of words) {
      const trimmedWord = word.trim();
      if (trimmedWord) {
        // SuperNGワードも部分一致を前提とする
        const escapedWord = this.escapeRegExp(trimmedWord);
        rules.push({
          pattern: escapedWord, // 部分一致（文中に含まれればマッチ）
          flags: 'gi',
          action: { type: 'hide' } as Action,
          smid: ['ALL'],
          nicoru_cond: { op: '>=', value: 0, mode: 'exclude' } as NicoruCond, // SuperNGはニコる数に関係なく適用
          enabled: true,
          description: `SuperNGワード: ${trimmedWord}`
        });
      }
    }

    log.push(`SuperNGワードを変換: ${rules.length}個のルール（部分一致）`);
    return rules;
  }

  /**
   * SuperNG正規表現を変換（JSON Lines形式）
   */
  private static convertSuperNGRegex(superNgRegex: string, log: string[]): NgRuleJson[] {
    const regexes = superNgRegex.split('\n').filter(regex => regex.trim() !== '');
    const rules: NgRuleJson[] = [];

    for (const regex of regexes) {
      const trimmedRegex = regex.trim();
      if (trimmedRegex) {
        try {
          new RegExp(trimmedRegex);
          rules.push({
            pattern: trimmedRegex,
            flags: 'gi',
            action: { type: 'hide' } as Action,
            smid: ['ALL'],
            nicoru_cond: { op: '>=', value: 0, mode: 'exclude' } as NicoruCond,
            enabled: true,
            description: `SuperNG正規表現: ${trimmedRegex}`
          });
        } catch (error) {
          void error;
          log.push(`無効なSuperNG正規表現をスキップ: ${trimmedRegex}`);
        }
      }
    }

    log.push(`SuperNG正規表現を変換: ${rules.length}個のルール`);
    return rules;
  }

  /**
   * 置換ルールを変換（JSON Lines形式）
   */
  private static convertReplaceRules(replaceRules: string, log: string[]): NgRuleJson[] {
    const rules: NgRuleJson[] = [];
    const lines = replaceRules.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.includes(' => ')) {
        const [regex, replace] = trimmedLine.split(' => ');
        if (regex && replace !== undefined) {
          try {
            new RegExp(regex.trim());
            rules.push({
              pattern: regex.trim(),
              flags: 'gi',
              action: { type: 'replace', replacement: replace.trim() } as Action,
              smid: ['ALL'],
              enabled: true,
              description: `置換ルール: ${regex.trim()} => ${replace.trim()}`
            });
          } catch (error) {
            void error;
            log.push(`無効な置換ルールをスキップ: ${trimmedLine}`);
          }
        }
      }
    }

    log.push(`置換ルールを変換: ${rules.length}個のルール`);
    return rules;
  }

  /**
   * ユーザーID除外を変換（JSON Lines形式）
   */
  private static convertUserIdFilters(userIdFilters: string, log: string[]): NgRuleJson[] {
    const userIds = userIdFilters.split('\n').filter(userId => userId.trim() !== '');
    const rules: NgRuleJson[] = [];

    for (const userId of userIds) {
      const trimmedUserId = userId.trim();
      if (trimmedUserId) {
        rules.push({
          userId: trimmedUserId,
          action: { type: 'hide' } as Action,
          smid: ['ALL'],
          enabled: true,
          description: `ユーザーID除外: ${trimmedUserId}`
        });
      }
    }

    log.push(`ユーザーID除外を変換: ${rules.length}個のルール`);
    return rules;
  }

  /**
   * 正規表現の特殊文字をエスケープ
   */
  private static escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * レガシーデータかどうかを判定
   */
  public static isLegacyData(data: UnknownData): boolean {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    // JSON Lines形式（NgRuleJson配列）の場合
    if (Array.isArray(data)) {
      return false;
    }

    // CommentFilter2の形式にはrules/settingsプロパティがある
    if ('rules' in data && 'settings' in data) {
      return false;
    }

    // レガシー形式の特徴的なプロパティをチェック
    const legacyProps = ['NGWord', 'NGRegex', 'filterMode', 'lotOfNicorare', 'replaceRules'];
    return legacyProps.some(prop => prop in data);
  }
} 