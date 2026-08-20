import { describe, expect, test } from "bun:test";
import { parseFeatureVersion } from "../scripts/feature-version";

describe("feature release version", () => {
  test.each(["245", "245.1"])("正式なリリース番号 %s を受理する", (version) => {
    expect(parseFeatureVersion(version)).toBe(version);
  });

  test.each([undefined, "", "245.", ".1", "245.1.1", "v245", "245-beta"])(
    "リリース形式ではない値 %s を拒否する",
    (version) => {
      expect(() => parseFeatureVersion(version)).toThrow(
        "Invalid package version",
      );
    },
  );
});
