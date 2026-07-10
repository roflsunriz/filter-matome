import { describe, expect, test } from "bun:test";

import { parseServerResponseMetaContent } from "../src/common/server-response-parser";

const createServerResponse = (description: string) => ({
  data: {
    response: {
      video: {
        id: "sm9",
        description,
      },
    },
  },
});

describe("server-response meta parser", () => {
  test("parses raw JSON containing a literal percent sign", () => {
    const response = createServerResponse("達成率は100%です");

    expect(parseServerResponseMetaContent(JSON.stringify(response))).toEqual(
      response,
    );
  });

  test("parses URI-encoded JSON", () => {
    const response = createServerResponse("URIエンコード済み");

    expect(
      parseServerResponseMetaContent(
        encodeURIComponent(JSON.stringify(response)),
      ),
    ).toEqual(response);
  });

  test("preserves a malformed percent sequence in encoded JSON", () => {
    const response = createServerResponse("達成率は100%です");
    const malformedContent = encodeURIComponent(
      JSON.stringify(response),
    ).replace("%25", "%");

    expect(parseServerResponseMetaContent(malformedContent)).toEqual(response);
  });

  test("reports content that is not JSON", () => {
    expect(() => parseServerResponseMetaContent("%broken")).toThrow(
      "server-response metaのJSON解析に失敗しました",
    );
  });
});
