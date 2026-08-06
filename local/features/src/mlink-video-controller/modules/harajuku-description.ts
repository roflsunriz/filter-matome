const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "hr",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "sub",
  "sup",
  "u",
  "ul",
  "wbr",
]);

const BLOCKED_TAGS = new Set([
  "button",
  "embed",
  "form",
  "iframe",
  "input",
  "noscript",
  "object",
  "script",
  "select",
  "style",
  "template",
  "textarea",
]);

export type HarajukuDescriptionState = "ready" | "empty" | "error";

const safeHref = (value: string): string | null => {
  try {
    const url = new URL(value, location.href);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
};

const appendSafeChildren = (source: Node, target: Node): void => {
  for (const child of Array.from(source.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(child.textContent ?? ""));
      continue;
    }
    if (!(child instanceof Element)) {
      continue;
    }

    const tag = child.localName.toLowerCase();
    if (BLOCKED_TAGS.has(tag)) {
      continue;
    }
    if (!ALLOWED_TAGS.has(tag)) {
      appendSafeChildren(child, target);
      continue;
    }

    const element = document.createElement(tag);
    if (tag === "a") {
      const href = child.getAttribute("href");
      const safeUrl = href ? safeHref(href) : null;
      if (safeUrl) {
        element.setAttribute("href", safeUrl);
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      }
    }
    const title = child.getAttribute("title");
    if (title) {
      element.setAttribute("title", title);
    }

    appendSafeChildren(child, element);
    target.appendChild(element);
  }
};

/** server-response由来の動画説明HTMLを原宿UIへ安全に描画する。 */
export const renderHarajukuDescription = (
  container: HTMLElement,
  html: string | null,
): HarajukuDescriptionState => {
  if (html === null) {
    container.replaceChildren(
      "動画説明文を取得できませんでした。再読み込みしてください。",
    );
    return "error";
  }

  const parsed = new DOMParser().parseFromString(html, "text/html");
  const fragment = document.createDocumentFragment();
  appendSafeChildren(parsed.body, fragment);
  container.replaceChildren(fragment);

  if (!container.textContent?.trim() && !container.querySelector("hr")) {
    container.replaceChildren("説明文はありません");
    return "empty";
  }

  return "ready";
};
