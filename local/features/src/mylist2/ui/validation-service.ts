export class ValidationService {
  
  // 入力値のサニタイズとバリデーション用の関数
  sanitizeInput(input: string): string {
    // HTMLタグの除去
    const sanitized = input.replace(/<[^>]*>/g, "");
    
    // 制御文字の除去（改行とタブは許可）- 文字コードを使って処理
    const chars = [];
    for (let i = 0; i < sanitized.length; i++) {
      const code = sanitized.charCodeAt(i);
      // コード9はTAB, 10はLF, 13はCR - これらは許可
      if (
        (code > 8 && code < 14 && code !== 11 && code !== 12) || // TAB,LF,CRは許可
        (code > 31 && code < 127) || // 通常の表示可能なASCII
        (code > 127) // 非ASCII（日本語など）
      ) {
        chars.push(sanitized[i]);
      }
    }
    
    // 前後の空白を削除
    return chars.join("").trim();
  }

  validateInput(input: string, type = "text"): string {
    const sanitized = this.sanitizeInput(input);

    // 空文字チェック
    if (!sanitized) {
      throw new Error("入力値が空です");
    }

    switch (type) {
      case "mylistName":
        // マイリスト名の制限
        if (sanitized.length > 50) {
          throw new Error("マイリスト名は50文字以内にしてください");
        }
        // IndexedDBで問題になる可能性のある文字を制限 - エスケープ不要な記法に修正
        if (/[/\\?*"<>|#:]/.test(sanitized)) {
          throw new Error("マイリスト名に使用できない文字が含まれています");
        }
        break;

      case "videoId":
        // 動画IDまたはURL
        if (sanitized.includes("nicovideo.jp") || sanitized.includes("nico.ms")) {
          // URLの場合はURLとして有効かチェック
          try {
            new URL(sanitized);
          } catch {
            throw new Error("無効なURLです");
          }
        } else {
          // 動画ID形式のチェック
          if (!sanitized.match(/^(?:sm|so|nm|nx)\d+$/)) {
            throw new Error("無効な動画IDです");
          }
        }
        break;
    }

    return sanitized;
  }
} 