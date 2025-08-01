/**
 * 軽量CSV行パーサ
 * ダブルクォート囲みとエスケープ処理に対応
 * NGワードルールのカンマ区切り問題を解決するためのユーティリティ
 */

/**
 * CSV行を解析して配列に分割
 * - ダブルクォート囲み "..." 対応
 * - クォート内の "" エスケープ処理
 * - カンマ区切りをサポート
 * 
 * @param line CSV形式の1行文字列
 * @returns 分割された文字列配列
 * 
 * @example
 * parseCsvLine('"/test{1,10}/",replace,ALL,EMPTY') 
 * // => ['/test{1,10}/', 'replace', 'ALL', 'EMPTY']
 * 
 * parseCsvLine('simple,no,quotes')
 * // => ['simple', 'no', 'quotes']
 * 
 * parseCsvLine('"quoted ""field""",normal,field')
 * // => ['quoted "field"', 'normal', 'field']
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // ダブルエスケープ: "" → "
        currentField += '"';
        i += 2; // 2文字スキップ
      } else if (char === '"') {
        // クォート終了
        inQuotes = false;
        i++;
      } else {
        // 通常文字
        currentField += char;
        i++;
      }
    } else {
      if (char === ',') {
        // フィールド区切り
        result.push(currentField.trim());
        currentField = '';
        i++;
      } else if (char === '"') {
        // クォート開始
        inQuotes = true;
        i++;
      } else {
        // 通常文字
        currentField += char;
        i++;
      }
    }
  }

  // 最後のフィールドを追加
  result.push(currentField.trim());
  return result;
}



/**
 * 従来のsplit(',')との互換性を保つフォールバック関数
 * クォートが含まれていない場合は従来通りの分割を行う
 * 
 * @param line 解析する行
 * @returns 分割された文字列配列
 */
export function parseNGWordRuleLine(line: string): string[] {
  // クォートが含まれている場合はCSV解析
  if (line.includes('"')) {
    return parseCsvLine(line);
  }
  
  // 従来通りの単純分割（後方互換性）
  return line.split(',').map(part => part.trim());
} 