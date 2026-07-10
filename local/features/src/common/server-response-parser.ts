const HEX_PAIR_PATTERN = /^[0-9a-f]{2}$/i;

const decodePercentEncodedLeniently = (value: string): string => {
  const decoder = new TextDecoder();
  let decoded = "";
  let index = 0;

  while (index < value.length) {
    if (
      value[index] !== "%" ||
      !HEX_PAIR_PATTERN.test(value.slice(index + 1, index + 3))
    ) {
      decoded += value[index];
      index += 1;
      continue;
    }

    const bytes: number[] = [];
    while (
      value[index] === "%" &&
      HEX_PAIR_PATTERN.test(value.slice(index + 1, index + 3))
    ) {
      bytes.push(Number.parseInt(value.slice(index + 1, index + 3), 16));
      index += 3;
    }
    decoded += decoder.decode(Uint8Array.from(bytes));
  }

  return decoded;
};

/**
 * server-response metaのcontentを解析する。
 * ニコニコ動画側が返す生JSON・URIエンコード済みJSONの両形式を受け入れる。
 */
export const parseServerResponseMetaContent = (content: string): unknown => {
  const normalizedContent = content.trim() || "{}";

  // 生JSONに含まれる「100%」などをURIデコードして壊さないよう先に試す。
  try {
    return JSON.parse(normalizedContent) as unknown;
  } catch {
    // URIエンコード済みなら次の処理で解析する。
  }

  let decodedContent: string;
  try {
    decodedContent = decodeURIComponent(normalizedContent);
  } catch {
    // 不完全な%シーケンスはそのまま残し、正しい%HHだけを復号する。
    decodedContent = decodePercentEncodedLeniently(normalizedContent);
  }

  try {
    return JSON.parse(decodedContent) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new Error(`server-response metaのJSON解析に失敗しました${detail}`);
  }
};
