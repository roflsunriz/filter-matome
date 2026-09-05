import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dirname, "../../../nlFilters/100_features.txt"),
  "utf8",
).split("Name = 公式通知パネルの表示更新API")[1];
const match = new RegExp(source.match(/Match<\r?\n([^]*?)\r?\n>/)![1], "g");
const replacement = source.match(/Replace<\r?\n([^]*?)\r?\n>/)![1];

describe("公式通知パネルの再取得接続", () => {
  for (const factory of ["Vn", "Dn", "Wn", "er"]) {
    test(`${factory}: 開いたパネルだけ公式actionで再取得する`, () => {
      // 3.11.0〜3.13.0のaction factory境界。内部状態を公開せずactionのみ呼ぶ。
      const original = `${factory}=e=>{const t={isServiceMenuOpen:!1,isOshiraseBoxOpen:!1,isAccountOpen:!1,isSearchOpen:!1,isTimelineOpen:!1,isPremiumLeadOpen:!1,isYearlyPlanBannerOpen:!1},n={openServiceMenu(n){n.isSearchOpen&&kn.emit("search:close"),e.setState({...t,isServiceMenuOpen:!0})},closeServiceMenu(){e.setState({isServiceMenuOpen:!1})},openOshiraseBox(n){n.isSearchOpen&&kn.emit("search:close"),e.setState({...t,isOshiraseBoxOpen:!0}),e.refresh(n)}};return n};`;
      expect([...original.matchAll(match)]).toHaveLength(1);
      expect(
        original
          .replace("...t,isOshiraseBoxOpen", "...wrong,isOshiraseBoxOpen")
          .match(match),
      ).toBeNull();
      expect(
        original
          .replace(
            "e.setState({isServiceMenuOpen:!1})",
            "wrong.setState({isServiceMenuOpen:!1})",
          )
          .match(match),
      ).toBeNull();
      let state = { isOshiraseBoxOpen: true };
      const seen: unknown[] = [];
      const events: string[] = [];
      const microtasks: Array<() => void> = [];
      const context = {
        Event,
        queueMicrotask: (callback: () => void) => microtasks.push(callback),
        dispatchEvent: (event: Event) => events.push(event.type),
        store: {
          getState: () => state,
          setState: () => undefined,
          refresh: (value: unknown) => seen.push(value),
        },
      };
      runInNewContext(
        original.replace(match, replacement) +
          `${factory}(store);FilterMatomeNotificationReadApi.refresh();`,
        context,
      );
      expect(seen).toEqual([state]);
      expect(events).toEqual([]);
      microtasks.forEach((callback) => callback());
      expect(events).toEqual(["filter-matome:api-status-change"]);
      runInNewContext(`${factory}(store)`, context);
      expect(microtasks).toHaveLength(1);
      state = { isOshiraseBoxOpen: false };
      runInNewContext("FilterMatomeNotificationReadApi.refresh()", context);
      expect(seen).toHaveLength(1);
    });
  }

  test("未知のaction factoryには接続しない", () => {
    expect("Vn=e=>{const t={isOshiraseBoxOpen:!1}}".match(match)).toBeNull();
  });
});
