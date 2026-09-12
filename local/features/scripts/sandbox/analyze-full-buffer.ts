import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { format } from "prettier";
import ts from "typescript";

export const BUFFER_ANCHOR =
  "this\\.hlsjs\\.attachMedia\\(this\\.video\\),this\\.hlsjs\\.on\\(([A-Za-z_$][\\w$]*)\\.Events\\.MANIFEST_PARSED,";

export function readBufferContract(source: string): {
  match: string;
  replace: string;
} {
  const section = source
    .split(/(?=^\[Replace\]\r?$)/mu)
    .find((part) => part.includes("Name = 公式プレイヤーの全編先読みAPI"));
  const block = (name: string): string => {
    const value = section?.match(
      new RegExp(`${name}<\\r?\\n([\\s\\S]*?)\\r?\\n>`),
    )?.[1];
    if (!value) throw new Error(`全編先読みAPIの${name}がありません`);
    return value;
  };
  return { match: block("Match"), replace: block("Replace") };
}

export function applyBufferContract(
  source: string,
  contract: { match: string; replace: string },
): string {
  const pattern = new RegExp(contract.match, "gu");
  const count = [...source.matchAll(pattern)].length;
  if (count !== 1)
    throw new Error(`全編先読みAPIのMatchは1回必要です: ${count}`);
  return source.replace(pattern, contract.replace);
}

async function main(): Promise<void> {
  const root = resolve(
    import.meta.dirname,
    "../../src/sandbox/official-watch-bundle",
  );
  const seen = new Set<string>();
  const assets: Record<string, unknown>[] = [];
  const modified: string[] = [];
  const generations = new Set<string>();
  let unrelated = 0;
  const checkFilter = !process.argv.includes("--inspect-only");
  const contract = checkFilter
    ? readBufferContract(
        await readFile(
          resolve(
            root,
            "../../../../../nlFilters/101_disable_official_function.txt",
          ),
          "utf8",
        ),
      )
    : null;
  for (const path of await readdir(root, { recursive: true })) {
    if (!path.endsWith(".js")) continue;
    if (path.includes("deminified")) continue;
    const source = await readFile(resolve(root, path), "utf8");
    const sha256 = createHash("sha256").update(source).digest("hex");
    if (seen.has(sha256)) continue;
    seen.add(sha256);
    const assetName = basename(path).replace(/^[a-f0-9]{12}-/u, "");
    const targetAsset = assetName.startsWith("PlayerSeekBar-");
    if (targetAsset && source.includes("FilterMatomeBufferingApi")) {
      modified.push(path);
      continue;
    }
    const matches = [...source.matchAll(new RegExp(BUFFER_ANCHOR, "gu"))];
    if (!matches.length) {
      if (targetAsset) throw new Error(`${path}: 対象資産のMatchが0回です`);
      unrelated++;
      continue;
    }
    if (!targetAsset) throw new Error(`${path}: 対象外資産へ一致しました`);
    if (matches.length !== 1)
      throw new Error(`${path}: ${matches.length} matches`);
    const tree = ts.createSourceFile(
      path,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    let session = "";
    const visit = (node: ts.Node): void => {
      if (ts.isClassExpression(node)) {
        const body = node.getText(tree);
        if (
          body.includes("this.hlsjs.attachMedia(this.video)") &&
          (!session || body.length < session.length)
        )
          session = body;
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
    if (!session) throw new Error(`${path}: HLS session classがありません`);
    // 過去のcaptureには別機能のnlFilter適用済み資産もある。HLS sessionが無改変なら
    // 世代比較に利用できるが、保管ハッシュをCDN原本ハッシュとして扱わない。
    if (source.includes("FilterMatome")) modified.push(path);
    if (session.includes("FilterMatome")) continue;
    generations.add(basename(path).replace(/^[a-f0-9]{12}-/u, ""));
    const limit = source.match(
      /setBufferingLimit\(([\w$]+)\)\{typeof \1==["`]number["`]\?this\.hlsjs\.config\.maxBufferLength=Math\.max\(1,Math\.min\(\1,([\w$]+)\)\):this\.hlsjs\.config\.maxBufferLength=\2\}/u,
    )?.[0];
    if (
      !limit ||
      !source.includes("getLoadPosition(){") ||
      !source.includes("this.nextLoadPosition")
    )
      throw new Error(`${path}: 未知の読み込み制御`);
    if (
      [
        "get audioTracks()",
        "get audioTrack()",
        "get loadLevel()",
        "getQualityByLevelIndex(",
        ".initSegment",
        ".decryptdata",
        ".byteRangeStartOffset",
        ".byteRangeEndOffset",
      ].some((part) => !source.includes(part))
    )
      throw new Error(`${path}: 未知の先読み計画`);
    const formatted = await format(
      contract ? applyBufferContract(source, contract) : source,
      { parser: "babel" },
    );
    const attach = formatted.indexOf("this.hlsjs.attachMedia(this.video)");
    const outputName = `${basename(path)}.buffer-analysis.txt`;
    await writeFile(
      resolve(root, outputName),
      formatted.slice(Math.max(0, attach - 7000), attach + 6000),
    );
    assets.push({
      file: path,
      url: `https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/${basename(path).replace(/^[a-f0-9]{12}-/u, "")}`,
      sha256,
      bytes: Buffer.byteLength(source),
      matches: matches.length,
      hlsIdentifier: matches[0][1],
      modifiedOutsideSession: source.includes("FilterMatome"),
      sessionSha256: createHash("sha256").update(session).digest("hex"),
      limit,
      syntax: "passed",
    });
  }
  if (generations.size < 3)
    throw new Error(`独立した3世代以上が必要です: ${generations.size}`);
  const result = {
    verifiedAt: new Date().toISOString(),
    assets,
    generations: generations.size,
    unrelated,
    modified,
    contractApplied: checkFilter,
  };
  await writeFile(
    resolve(root, "full-buffer-analysis.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    `[full-buffer] ${generations.size} builds / ${assets.length} assets matched once; ${unrelated} unrelated assets matched zero; syntax passed. ${modified.length} modified captures recorded separately.`,
  );
}

if (import.meta.main) await main();
