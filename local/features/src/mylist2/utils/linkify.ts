// 文字列をHTMLエスケープ
export const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// 説明文内のURLやID/mylistをリンクへ変換
// - 通常URL: http(s)://...
// - 動画ID: [a-z]{2}\d+ → https://www.nicovideo.jp/watch/<id>
// - mylist: mylist/\d+ → https://www.nicovideo.jp/mylist/<id>
export const linkify = (text: string): string => {
  // 1. 通常URL
  // 2. mylist/12345 （単語境界想定）
  // 3. 動画ID（例: sm12345, so12345 など2文字+数字）
  const re = /(https?:\/\/[^\s<'"]+)|(\bmylist\/(\d+)\b)|(\b([a-z]{2}\d+)\b)/g;

  let result = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    result += escapeHtml(text.slice(last, m.index));
    let href = "";
    let label = "";
    if (m[1]) {
      // 通常URL
      href = m[1];
      label = m[1];
    } else if (m[2]) {
      // mylist/12345
      href = `https://www.nicovideo.jp/mylist/${m[3]}`;
      label = m[2];
    } else if (m[4]) {
      // 動画ID
      href = `https://www.nicovideo.jp/watch/${m[5]}`;
      label = m[5];
    }
    result += `<a class="cml2-video-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
    last = re.lastIndex;
  }
  result += escapeHtml(text.slice(last));
  return result;
};
