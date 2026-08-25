import { describe, expect, test } from "bun:test";
import {
  readOfficialPlaybackRate,
  writeOfficialPlaybackRate,
} from "@/mlink-video-controller/services/official-playback-rate-bridge";

describe("公式再生速度ブリッジ", () => {
  test("版付きAPIで公式media controllerの状態を読み書きする", () => {
    let rate = 1;
    const host = {
      FilterMatomePlaybackRateApi: {
        version: 1,
        get: () => rate,
        set: (nextRate: number) => {
          rate = nextRate;
          return rate;
        },
      },
    };

    expect(writeOfficialPlaybackRate(host, 3.25)).toBe(true);
    expect(readOfficialPlaybackRate(host)).toBe(3.25);
  });

  test("API不在・旧版・不正値・例外は直接操作へフォールバックできる", () => {
    expect(writeOfficialPlaybackRate({}, 1.5)).toBe(false);
    expect(readOfficialPlaybackRate({})).toBeNull();
    expect(
      writeOfficialPlaybackRate(
        {
          FilterMatomePlaybackRateApi: {
            version: 2,
            get: () => 1,
            set: () => 1,
          },
        },
        1.5,
      ),
    ).toBe(false);
    expect(
      writeOfficialPlaybackRate(
        {
          FilterMatomePlaybackRateApi: {
            version: 1,
            get: () => 1,
            set: () => 1,
          },
        },
        Number.NaN,
      ),
    ).toBe(false);
    expect(
      readOfficialPlaybackRate({
        FilterMatomePlaybackRateApi: {
          version: 1,
          get: () => {
            throw new Error("disposed");
          },
          set: () => null,
        },
      }),
    ).toBeNull();
  });

  test("APIが要求値を反映しない場合は成功扱いにしない", () => {
    const host = {
      FilterMatomePlaybackRateApi: {
        version: 1,
        get: () => 1,
        set: () => 1,
      },
    };

    expect(writeOfficialPlaybackRate(host, 1.5)).toBe(false);
  });
});
