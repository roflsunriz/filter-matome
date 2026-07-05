import DOMPurify from "dompurify";
import type { Config as DOMPurifyConfig } from "dompurify";

import type { VideoLinkTarget, VideoLinkContext } from "@/types/mylist-types";

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

/**
 * 同期的にローカルプレーヤーへルーティングすべき動画かどうかを判定する。
 *
 * 対象:
 *  - 公式動画 (so プレフィックスの動画ID)
 *  - 「dアニメストア ニコニコ支店」の投稿者
 *
 * 削除済み・非公開動画は API で非同期に判定するため、ここには含めない。
 */
export const shouldUseLocalPlayer = (
  videoId: string,
  context?: VideoLinkContext,
): boolean => {
  if (videoId.startsWith("so")) return true;
  if (context?.authorName === "dアニメストア ニコニコ支店") return true;
  return false;
};

/** 動画IDからリンクURLを生成する */
export const buildVideoUrl = (
  videoId: string,
  context?: VideoLinkContext,
): string => {
  if (
    currentVideoLinkTarget === "local" &&
    shouldUseLocalPlayer(videoId, context)
  ) {
    return `/local/features/dist/src/video-player/standalone/index.html?videoId=${encodeURIComponent(videoId)}`;
  }
  return `https://www.nicovideo.jp/watch/${videoId}`;
};

// --- 動画公開状態の API チェック ---
const availabilityCache = new Map<string, boolean>();

/**
 * ext.nicovideo.jp/api/getthumbinfo で動画の公開状態を確認する。
 * @returns true = 公開中（公式プレーヤーで再生可能）, false = 削除済みまたは非公開, null = 通信失敗などで判定不能
 */
export const checkVideoAvailability = async (
  videoId: string,
): Promise<boolean | null> => {
  const cached = availabilityCache.get(videoId);
  if (cached !== undefined) return cached;

  try {
    const response = await fetch(
      `https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`,
    );
    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");
    const status = xml.documentElement.getAttribute("status");
    const available = status === "ok";
    availabilityCache.set(videoId, available);
    return available;
  } catch (error) {
    window.logger?.warn("[mylist2] 動画公開状態の確認に失敗しました:", error);
    return null;
  }
};

/**
 * 動画リンクのクリック時に API 可用性チェックが必要かどうかを判定する。
 * shouldUseLocalPlayer で即座にルーティング先が確定する動画、
 * および local モードでない場合はチェック不要。
 */
export const needsAvailabilityCheck = (
  videoId: string,
  context?: VideoLinkContext,
): boolean => {
  if (currentVideoLinkTarget !== "local") return false;
  if (shouldUseLocalPlayer(videoId, context)) return false;
  return true;
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
const PURIFY_CONFIG: DOMPurifyConfig = {
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
