// JSON Lines パーサ/シリアライザ - 新形式ルール処理
import { NgRuleJson, NgRuleJsonCollection, MigrationResult, Action } from '@/types/filter-types';

/**
 * JSON Lines形式の文字列をパースしてルール配列に変換
 */
export function parseJsonl(text: string): NgRuleJson[] {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const rules: NgRuleJson[] = [];
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // コメント行をスキップ
    if (line.startsWith('//') || line.startsWith('#')) {
      continue;
    }

    try {
      const rule = JSON.parse(line) as NgRuleJson;
      
      // 基本バリデーション
      if (validateRule(rule)) {
        // デフォルト値を設定
        rules.push(normalizeRule(rule));
      } else {
        errors.push(`Line ${i + 1}: Invalid rule format`);
      }
    } catch (error) {
      errors.push(`Line ${i + 1}: JSON parse error - ${String(error)}`);
    }
  }

  if (errors.length > 0) {
    window.logger?.warn('[CommentFilter2] JSONL parse errors:', errors);
  }

  return rules;
}

/**
 * ルール配列をJSON Lines形式の文字列に変換
 */
export function stringifyJsonl(rules: NgRuleJson[]): string {
  return rules
    .map(rule => JSON.stringify(rule))
    .join('\n');
}

/**
 * JSON形式（コレクション）をパース
 */
export function parseJsonCollection(text: string): NgRuleJson[] {
  try {
    const data = JSON.parse(text) as NgRuleJsonCollection;
    
    if (data.version && data.rules) {
      return data.rules.map(normalizeRule);
    }
    
    // 配列形式の場合
    if (Array.isArray(data)) {
      return (data as NgRuleJson[]).map(normalizeRule);
    }
    
    throw new Error('Invalid JSON collection format');
  } catch (error) {
    throw new Error(`JSON collection parse error: ${String(error)}`);
  }
}

/**
 * ルール配列をJSON形式（コレクション）に変換
 */
export function stringifyJsonCollection(rules: NgRuleJson[]): string {
  const collection: NgRuleJsonCollection = {
    version: "3.0",
    rules,
    metadata: {
      exportedAt: new Date().toISOString(),
      exportedBy: "CommentFilter2",
      totalRules: rules.length
    }
  };
  
  return JSON.stringify(collection, null, 2);
}

/**
 * ルールの基本バリデーション
 */
export function validateRule(rule: unknown): rule is NgRuleJson {
  if (!rule || typeof rule !== 'object' || rule === null) {
    return false;
  }

  const ruleObj = rule as Record<string, unknown>;

  // パターンまたはユーザーIDのいずれかが必要
  if (!ruleObj.pattern && !ruleObj.userId) {
    return false;
  }

  // パターンとユーザーIDの両方は指定不可
  if (ruleObj.pattern && ruleObj.userId) {
    return false;
  }

  // アクションが必要
  if (!ruleObj.action || typeof ruleObj.action !== 'object' || ruleObj.action === null) {
    return false;
  }

  const action = ruleObj.action as Record<string, unknown>;
  if (!action.type) {
    return false;
  }

  // アクションタイプの検証
  if (action.type === 'replace' && !action.replacement) {
    return false;
  }

  // SMIDが必要
  if (!ruleObj.smid || !Array.isArray(ruleObj.smid) || ruleObj.smid.length === 0) {
    return false;
  }

  // nicoru_condの検証
  if (ruleObj.nicoru_cond) {
    if (typeof ruleObj.nicoru_cond !== 'object' || ruleObj.nicoru_cond === null) {
      return false;
    }
    
    const cond = ruleObj.nicoru_cond as Record<string, unknown>;
    if (!cond.op || typeof cond.value === 'undefined') {
      return false;
    }
    
    if (cond.op === 'range' && (!Array.isArray(cond.value) || cond.value.length !== 2)) {
      return false;
    }
  }

  return true;
}

/**
 * ルールにデフォルト値を設定
 */
export function normalizeRule(rule: NgRuleJson): NgRuleJson {
  const normalized: NgRuleJson = {
    ...rule,
    enabled: rule.enabled !== false, // デフォルトtrue
    flags: rule.flags || 'gi', // デフォルトフラグ
  };

  // nicoru_condのデフォルト値
  if (normalized.nicoru_cond && !normalized.nicoru_cond.mode) {
    normalized.nicoru_cond.mode = 'exclude';
  }

  return normalized;
}

/**
 * ファイル形式を自動判定
 */
export function detectFileFormat(content: string): 'jsonl' | 'json' | 'csv' | 'unknown' {
  const trimmed = content.trim();
  
  // 空ファイル
  if (!trimmed) {
    return 'unknown';
  }

  // JSON形式（オブジェクトまたは配列で開始）
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // JSON parseに失敗した場合はJSONLの可能性
    }
  }

  // JSONL形式（各行がJSONオブジェクト）
  const lines = trimmed.split('\n').filter(line => line.trim() !== '');
  let jsonlCount = 0;
  
  for (const line of lines.slice(0, 5)) { // 最初の5行をチェック
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
      continue; // コメント行
    }
    
    try {
      JSON.parse(trimmedLine);
      jsonlCount++;
    } catch {
      break;
    }
  }
  
  if (jsonlCount > 0) {
    return 'jsonl';
  }

  // CSV形式（カンマ区切り、スラッシュで囲まれた正規表現）
  if (lines.some(line => line.includes('/') && line.includes(','))) {
    return 'csv';
  }

  return 'unknown';
}

/**
 * 旧CSV形式からJSON Lines形式への変換
 */
export function convertCsvToJsonl(csvText: string): MigrationResult {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  const migratedRules: NgRuleJson[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line || line.startsWith('#') || line.startsWith('//')) {
      continue;
    }

    try {
      const rule = convertCsvLineToJsonRule(line);
      if (rule) {
        migratedRules.push(rule);
      } else {
        warnings.push(`Line ${i + 1}: Could not convert rule`);
      }
    } catch (error) {
      errors.push(`Line ${i + 1}: ${String(error)}`);
    }
  }

  return {
    success: errors.length === 0,
    migratedRules,
    errors,
    warnings,
    originalCount: lines.length,
    migratedCount: migratedRules.length
  };
}

/**
 * CSV行を単一のJSONルールに変換
 */
function convertCsvLineToJsonRule(line: string): NgRuleJson | null {
  // 既存のCSVパーサーを使用（import循環を避けるため、ここで簡易実装）
  const fields = parseCsvLineSimple(line);
  
  if (fields.length < 4) {
    throw new Error('Insufficient fields in CSV line');
  }

  // ユーザーIDルールの場合
  if (fields[0].startsWith('@')) {
    const userId = fields[0].substring(1);
    const smid = fields[1] === 'ALL' ? ['ALL'] : [fields[1]];
    const nicoru = fields[2];

    return {
      userId,
      action: { type: 'hide' },
      smid,
      nicoru_cond: nicoru === 'EMPTY' ? undefined : {
        op: '>=',
        value: parseInt(nicoru, 10),
        mode: 'exclude'
      }
    };
  }

  // 正規表現ルールの場合
  const regexMatch = fields[0].match(/^\/(.+)\/([gimuy]*)$/);
  if (!regexMatch) {
    throw new Error('Invalid regex format');
  }

  const pattern = regexMatch[1];
  const flags = regexMatch[2] || 'gi';
  const replaceMatch = fields[1].match(/^\/(.*)\/$/);
  const replacement = replaceMatch ? replaceMatch[1] : fields[1];
  const smid = fields[2] === 'ALL' ? ['ALL'] : [fields[2]];
  const nicoru = fields[3];

  const action: Action = replacement === 'EMPTY' || replacement === '' 
    ? { type: 'hide' }
    : { type: 'replace', replacement };

  return {
    pattern,
    flags,
    action,
    smid,
    nicoru_cond: nicoru === 'EMPTY' ? undefined : {
      op: '>=',
      value: parseInt(nicoru, 10),
      mode: 'exclude'
    }
  };
}

/**
 * 簡易CSVパーサー（循環import回避用）
 */
function parseCsvLineSimple(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  fields.push(current.trim());
  return fields;
} 