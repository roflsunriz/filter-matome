import DOMPurify from "dompurify";

import type { VideoLinkTarget } from "@/types/mylist-types";

// 文字列をHTMLエスケープ
export const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// --- 動画リンク先設定（モジュールレベル） ---
let currentVideoLinkTarget: VideoLinkTarget = "official";

/** linkify で生成される動画IDリンクの遷移先を設定する */
export const setVideoLinkTarget = (target: VideoLinkTarget): void => {
  currentVideoLinkTarget = target;
};

/** 動画IDからリンクURLを生成する */
export const buildVideoUrl = (videoId: string): string => {
  if (currentVideoLinkTarget === "local") {
    return `/local/features/dist/src/video-player/standalone/index.html?videoId=${encodeURIComponent(videoId)}`;
  }
  return `https://www.nicovideo.jp/watch/${videoId}`;
};

// URL/動画ID/mylist検出用の正規表現
const LINKIFY_RE =
  /(https?:\/\/[^\s<'"]+)|(\bmylist\/(\d+)\b)|(\b([a-z]{2}\d+)\b)/g;

// プレーンテキストのURL・動画ID・mylistをリンクへ変換（HTMLエスケープ込み）
const linkifyText = (text: string): string => {
  LINKIFY_RE.lastIndex = 0;
  let result = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = LINKIFY_RE.exec(text)) !== null) {
    result += escapeHtml(text.slice(last, m.index));
    let href = "";
    let label = "";
    if (m[1]) {
      href = m[1];
      label = m[1];
    } else if (m[2]) {
      href = `https://www.nicovideo.jp/mylist/${m[3]}`;
      label = m[2];
    } else if (m[4]) {
      href = buildVideoUrl(m[5] ?? "");
      label = m[5] ?? "";
    }
    result += `<a class="cml2-video-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
    last = LINKIFY_RE.lastIndex;
  }
  result += escapeHtml(text.slice(last));
  return result;
};

// 説明文内のURLやID/mylistをリンクへ変換（後方互換）
// - 通常URL: http(s)://...
// - 動画ID: [a-z]{2}\d+ → https://www.nicovideo.jp/watch/<id>
// - mylist: mylist/\d+ → https://www.nicovideo.jp/mylist/<id>
export const linkify = (text: string): string => linkifyText(text);

// DOMPurify設定: 動画説明文向けの安全なタグ・属性のみ許可
const PURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    "a",
    "b",
    "br",
    "em",
    "font",
    "i",
    "li",
    "ol",
    "p",
    "s",
    "span",
    "strong",
    "u",
    "ul",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "color", "size", "class"],
  // javascript: / data: 等の危険なプロトコルをブロック
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  ALLOW_DATA_ATTR: false,
};

/**
 * 動画説明文のHTMLをサニタイズし、安全なタグを保持してレンダリング可能にする。
 *
 * 処理の流れ:
 * 1. DOMPurify で危険なタグ・属性を除去（ホワイトリスト方式）
 * 2. テキストノード内のプレーンURL / 動画ID / mylist をリンクへ変換
 * 3. 既存の <a> タグに target="_blank" / rel / class を強制付与
 */
export const sanitizeDescriptionHtml = (html: string): string => {
  // Step 1: DOMPurify でサニタイズ
  const clean = DOMPurify.sanitize(html, PURIFY_CONFIG);

  // Step 2: サニタイズ済みHTMLをDOM化してテキストノードをリンク化
  const doc = new DOMParser().parseFromString(clean, "text/html");
  const body = doc.body;

  // テキストノードを収集（<a> 内は除外）
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    // <a> タグ内のテキストはリンク化しない
    if (!textNode.parentElement?.closest("a")) {
      textNodes.push(textNode);
    }
    current = walker.nextNode();
  }

  for (const textNode of textNodes) {
    const raw = textNode.textContent ?? "";
    if (!raw.trim()) continue;
    const linked = linkifyText(raw);
    // linkifyText はエスケープ済み文字列を返すので、元テキストと比較
    if (linked !== escapeHtml(raw)) {
      const wrapper = doc.createElement("span");
      wrapper.innerHTML = linked;
      textNode.replaceWith(...Array.from(wrapper.childNodes));
    }
  }

  // Step 3: 全 <a> に target="_blank" / rel / class を強制付与
  const anchors = Array.from(body.querySelectorAll("a[href]"));
  for (const anchor of anchors) {
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
    anchor.classList.add("cml2-video-link");
  }

  return body.innerHTML;
};
