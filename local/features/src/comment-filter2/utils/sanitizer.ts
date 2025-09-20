// サニタイズユーティリティ



// 計画書に基づく許可されたコメントコマンドのリスト
const ALLOWED_COMMENT_COMMANDS = new Set([
  // サイズ
  'big', 'medium', 'small',
  // フォント
  'defont', 'gothic', 'mincho',
  // 位置
  'ue', 'naka', 'shita',
  // 特殊効果
  '_live', 'invisible', 'full', 'ender', 'patissier', 'ca',
  // 一般+プレミアム色
  'white', 'red', 'pink', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'black',
  // プレミアム専用色
  'white2', 'red2', 'pink2', 'orange2', 'yellow2', 'green2', 'cyan2', 'blue2', 'purple2', 'black2',
  // 内部表現の数字コマンド（ニコニコ動画が自動変換）
  '184' // red の内部表現
]);

// 排他的なコマンドのカテゴリ定義
const EXCLUSIVE_COMMAND_CATEGORIES = {
  size: new Set(['big', 'medium', 'small']),
  font: new Set(['defont', 'gothic', 'mincho']),
  position: new Set(['ue', 'naka', 'shita']),
  color: new Set([
    'white', 'red', 'pink', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'black',
    'white2', 'red2', 'pink2', 'orange2', 'yellow2', 'green2', 'cyan2', 'blue2', 'purple2', 'black2'
  ])
};

/**
 * 正規表現パターンをサニタイズして安全な形式に変換
 * 完全なES6+正規表現フラグサポート（gimuysd）
 */
export function sanitizeRegexPattern(pattern: string): { pattern: string; flags: string } | null {
  try {
    // 正規表現のフラグを抽出（gimuysdフラグを完全サポート）
    const flagMatch = pattern.match(/^\/(.+)\/([gimuysd]*)$/);
    
    let cleanPattern: string;
    let flags = '';
    
    if (flagMatch) {
      cleanPattern = flagMatch[1];
      // ユーザーが指定したフラグを処理
      const userFlags = flagMatch[2];
      flags = normalizeRegexFlags(userFlags);
    } else {
      // スラッシュがない場合はそのまま使用し、デフォルトでgiを適用
      cleanPattern = pattern.replace(/^\/|\/$/g, '');
      flags = 'gi';
    }
    
    // 危険なパターンをチェック
    if (cleanPattern.length === 0) {
      return null;
    }
    
    // 正規表現として有効かテスト（フラグも含めてチェック）
    new RegExp(cleanPattern, flags);
    
    return { pattern: cleanPattern, flags };
  } catch (error) {
    window.logger?.warn('[CommentFilter2] Invalid regex pattern:', pattern, error);
    return null;
  }
}

/**
 * 正規表現フラグを正規化（重複除去、順序統一、無効フラグ検出）
 * サポート: g(global), i(ignorecase), m(multiline), u(unicode), y(sticky), s(dotAll), d(hasIndices)
 */
function normalizeRegexFlags(inputFlags: string): string {
  if (!inputFlags) {
    return 'gi'; // デフォルトフラグ
  }
  
  // サポートされているフラグの定義（ES6+完全対応）
  const supportedFlags = new Set(['g', 'i', 'm', 'u', 'y', 's', 'd']);
  const validFlags = new Set<string>();
  
  // 入力フラグを1文字ずつチェック
  for (const flag of inputFlags) {
    if (supportedFlags.has(flag)) {
      validFlags.add(flag);
    } else {
      window.logger?.warn(`[CommentFilter2] Unsupported regex flag ignored: '${flag}'`);
    }
  }
  
  // フラグが何も指定されていない場合はデフォルト
  if (validFlags.size === 0) {
    return 'gi';
  }
  
  // フラグを決まった順序で並べる（標準的な順序）
  const flagOrder = ['d', 'g', 'i', 'm', 's', 'u', 'y'];
  const normalizedFlags = flagOrder.filter(flag => validFlags.has(flag)).join('');
  
  return normalizedFlags;
}

/**
 * 置換文字列をサニタイズ
 */
export function sanitizeReplaceString(replace: string): string {
  // 先頭と末尾のスラッシュを除去
  return replace.replace(/^\/|\/$/g, '');
}

/**
 * SMIDをサニタイズ
 */
export function sanitizeSmid(smid: string): string {
  const cleaned = smid.trim();
  const upper = cleaned.toUpperCase();

  if (upper === 'ALL') {
    return 'ALL';
  }

  if (/^[a-z]{2}\d+$/i.test(cleaned)) {
    return cleaned.toLowerCase();
  }

  return 'ALL';
}


/**
 * ニコる数をサニタイズ
 */
export function sanitizeNicoruCount(nicoru: string): number | 'EMPTY' {
  const cleaned = nicoru.trim();
  
  if (cleaned === 'EMPTY' || cleaned === '') {
    return 'EMPTY';
  }
  
  const num = parseInt(cleaned, 10);
  if (isNaN(num) || num < 0) {
    return 'EMPTY';
  }
  
  return num;
}

/**
 * コメントコマンドをサニタイズ（許可リストに基づく + 排他性処理）
 */
export function sanitizeCommentCommands(commands: string[]): string[] {
  // まず有効なコマンドのみを抽出
  const validCommands = commands.filter(command => {
    // 16進数カラーコード（#RRGGBB形式）をチェック
    if (/^#[0-9A-Fa-f]{6}$/.test(command)) {
      return true;
    }
    
    // 許可リストに含まれるコマンドかチェック
    return ALLOWED_COMMENT_COMMANDS.has(command.toLowerCase());
  });

  // 排他性を考慮して重複を除去
  const result: string[] = [];
  const usedCategories = new Set<string>();

  for (const command of validCommands) {
    const lowerCommand = command.toLowerCase();
    let categoryFound = false;

    // 16進数カラーコードの場合は色カテゴリとして扱う
    if (/^#[0-9A-Fa-f]{6}$/.test(command)) {
      if (!usedCategories.has('color')) {
        result.push(command);
        usedCategories.add('color');
      }
      categoryFound = true;
    } else {
      // 各カテゴリをチェック
      for (const [categoryName, categoryCommands] of Object.entries(EXCLUSIVE_COMMAND_CATEGORIES)) {
        if (categoryCommands.has(lowerCommand)) {
          // まだそのカテゴリのコマンドが使われていない場合のみ追加
          if (!usedCategories.has(categoryName)) {
            result.push(command);
            usedCategories.add(categoryName);
          }
          categoryFound = true;
          break;
        }
      }
    }

    // どのカテゴリにも属さないコマンド（特殊効果など）はそのまま追加
    if (!categoryFound) {
      result.push(command);
    }
  }

  return result;
}



/**
 * HTMLエスケープ
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * コメント本文をサニタイズ
 * <と>は表示のためにそのまま残し、最低限の危険な文字のみをエスケープする。
 * スラッシュ(/)はそのままにしてURLが壊れないようにする。
 */
export function sanitizeCommentBody(body: string): string {
  // <と>をそのまま表示するため、手動で最低限のエスケープのみ実行
  return body
    .replace(/&/g, '&amp;')   // &を最初にエスケープ（他のエスケープと干渉しないため）
    .replace(/"/g, '&quot;')  // ダブルクォートをエスケープ
    .replace(/'/g, '&#x27;'); // シングルクォートをエスケープ
  // <と>は意図的にエスケープしない（お主の要求により）
} 