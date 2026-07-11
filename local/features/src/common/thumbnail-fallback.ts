const FALLBACK_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" role="img" aria-label="サムネイルなし">
  <rect width="320" height="180" fill="#e5e7eb"/>
  <rect x="112" y="48" width="96" height="70" rx="10" fill="#94a3b8"/>
  <path d="M148 68v30l28-15z" fill="#f8fafc"/>
  <text x="160" y="145" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#475569">NO THUMBNAIL</text>
</svg>`;

export const FALLBACK_THUMBNAIL_URL =
  "data:image/svg+xml;charset=utf-8," + encodeURIComponent(FALLBACK_SVG);

const SAFE_DATA_IMAGE =
  /^data:image\/(?:gif|png|jpeg|webp);base64,[a-z0-9+/=]+$/i;

export const normalizeThumbnailUrl = (
  url: string | null | undefined,
): string => {
  const candidate = url?.trim();
  if (!candidate) return FALLBACK_THUMBNAIL_URL;
  if (SAFE_DATA_IMAGE.test(candidate)) return candidate;
  try {
    const parsed = new URL(candidate, window.location.origin);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch {
    // 不正なURLはフォールバックへ置き換える。
  }
  return FALLBACK_THUMBNAIL_URL;
};

export const applyFallbackThumbnail = (image: HTMLImageElement): void => {
  image.onerror = null;
  image.dataset.fallbackThumbnail = "true";
  image.src = FALLBACK_THUMBNAIL_URL;
};

export const setThumbnailSource = (
  image: HTMLImageElement,
  url: string | null | undefined,
): void => {
  image.onerror = () => applyFallbackThumbnail(image);
  const source = normalizeThumbnailUrl(url);
  image.src = source;
  if (source === FALLBACK_THUMBNAIL_URL) {
    image.dataset.fallbackThumbnail = "true";
  } else {
    delete image.dataset.fallbackThumbnail;
  }
};

export const THUMBNAIL_ERROR_HANDLER = `this.onerror=null;this.dataset.fallbackThumbnail='true';this.src='${FALLBACK_THUMBNAIL_URL}'`;
