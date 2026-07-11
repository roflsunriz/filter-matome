import DOMPurify from "dompurify";
import type { Config as DOMPurifyConfig } from "dompurify";

const DESCRIPTION_CONFIG: DOMPurifyConfig = {
  ALLOWED_TAGS: [
    "a",
    "b",
    "br",
    "code",
    "em",
    "i",
    "li",
    "ol",
    "p",
    "s",
    "span",
    "strong",
    "sub",
    "sup",
    "u",
    "ul",
  ],
  ALLOWED_ATTR: ["href", "title"],
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  ALLOW_DATA_ATTR: false,
};

export const renderDescriptionHtml = (
  container: HTMLElement,
  html: string,
): void => {
  container.innerHTML = DOMPurify.sanitize(html, DESCRIPTION_CONFIG);
  container.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  });
};
