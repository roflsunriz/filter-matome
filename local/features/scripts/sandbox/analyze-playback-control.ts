import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { format } from "prettier";

export const PLAYBACK_CONTROL_ANCHOR =
  "this\\.getCurrentTime=\\(([A-Za-z_$][\\w$]*)=!0\\)=>this\\.media\\.getCurrentTime\\(\\1\\)";

export function readPlaybackControlContract(source: string): {
  match: string;
  replace: string;
} {
  const section = source
    .split(/(?=^\[Replace\]\r?$)/mu)
    .find((part) => part.includes("Name = 公式プレイヤーの再生位置同期API"));
  const block = (name: string): string => {
    const value = section?.match(
      new RegExp(`${name}<\\r?\\n([\\s\\S]*?)\\r?\\n>`),
    )?.[1];
    if (!value) throw new Error(`再生位置同期APIの${name}がありません`);
    return value;
  };
  return { match: block("Match"), replace: block("Replace") };
}

export function applyPlaybackControlContract(
  source: string,
  contract: { match: string; replace: string },
): string {
  const expression = new RegExp(contract.match, "gu");
  const count = [...source.matchAll(expression)].length;
  if (count !== 1)
    throw new Error(`再生位置同期APIのMatchは1回必要です: ${count}`);
  return source.replace(expression, contract.replace);
}

async function main(): Promise<void> {
  const root = resolve(
    import.meta.dirname,
    "../../src/sandbox/official-watch-bundle",
  );
  const filter = process.argv.includes("--inspect-only")
    ? null
    : readPlaybackControlContract(
        await readFile(
          resolve(
            root,
            "../../../../../nlFilters/101_disable_official_function.txt",
          ),
          "utf8",
        ),
      );
  const seen = new Set<string>();
  const generations = new Set<string>();
  const assets: Record<string, unknown>[] = [];
  let unrelated = 0;
  for (const path of await readdir(root, { recursive: true })) {
    if (!path.endsWith(".js") || path.includes("deminified")) continue;
    const source = await readFile(resolve(root, path), "utf8");
    const sha256 = createHash("sha256").update(source).digest("hex");
    if (seen.has(sha256)) continue;
    seen.add(sha256);
    const matches = [
      ...source.matchAll(new RegExp(PLAYBACK_CONTROL_ANCHOR, "gu")),
    ];
    if (!matches.length) {
      if (
        basename(path)
          .replace(/^[a-f0-9]{12}-/u, "")
          .startsWith("PlayerSeekBar-")
      )
        throw new Error(`${path}: 対象資産のMatchが0回です`);
      unrelated++;
      continue;
    }
    if (matches.length !== 1) throw new Error(`${path}: multiple matches`);
    if (source.includes("FilterMatomePlaybackControlApi")) continue;
    const name = basename(path).replace(/^[a-f0-9]{12}-/u, "");
    if (!name.startsWith("PlayerSeekBar-"))
      throw new Error(`Unexpected target: ${path}`);
    const formatted = await format(source, { parser: "babel" });
    const invariants = [
      "this.smoothTime =",
      "this._setCurrentTime =",
      "this.getCurrentTimeRaw =",
      "this.media.seek(",
      "this.media.setCurrentTime(",
      "this.media.pause(",
      "this.media.play(",
      "this.getVideoElement =",
      "this.disposes =",
    ];
    if (invariants.some((part) => !formatted.includes(part)))
      throw new Error(`${path}: unknown media clock contract`);
    if (filter)
      await format(applyPlaybackControlContract(source, filter), {
        parser: "babel",
      });
    generations.add(name);
    assets.push({
      name,
      url: `https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/${name}`,
      source: path,
      sha256,
      bytes: Buffer.byteLength(source),
      matches: 1,
      identifier: matches[0][1],
      syntax: "passed",
    });
  }
  if (generations.size < 3) throw new Error("独立した3世代以上が必要です");
  await writeFile(
    resolve(root, "playback-control-analysis.json"),
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        assets,
        generations: generations.size,
        unrelated,
        applied: Boolean(filter),
      },
      null,
      2,
    ),
  );
  console.log(
    `[playback-control] ${generations.size} builds / ${assets.length} assets matched once / ${unrelated} unrelated assets matched zero`,
  );
}

if (import.meta.main) await main();
