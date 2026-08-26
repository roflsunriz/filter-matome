import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { format } from "prettier";

interface LatestCapture {
  captureDirectory: string;
}

interface CaptureFile {
  fileName: string;
  sha256: string;
  url: string;
}

interface CaptureManifest {
  capturedAt: string;
  files: CaptureFile[];
}

const NLFILTER_MENU_PATTERN =
  "(\\(0,([A-Za-z_$][\\w$]*)\\.jsxs\\)\\(([A-Za-z_$][\\w$]*)," +
  "\\{css:([A-Za-z_$][\\w$]*)\\.raw\\(\\),onPress:([A-Za-z_$][\\w$]*)," +
  "children:\\[`再生時間（`,)(?=\\(0,\\2\\.jsx\\)\\([A-Za-z_$][\\w$]*," +
  "\\{css:\\{fontFamily:`metaNumber`\\},type:`vposMs`,children:" +
  "([A-Za-z_$][\\w$]*)\\.comment\\.vposMs\\}\\),`）に移動`)";
const EXPOSED_MENU_FRAGMENT = "globalThis.FilterMatomeCommentMenuApi";

export interface NlFilterMenuContract {
  match: string;
  replace: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function parseLatestCapture(value: unknown): LatestCapture {
  if (!isRecord(value) || typeof value["captureDirectory"] !== "string") {
    throw new TypeError("latest.jsonにcaptureDirectoryがありません");
  }
  return { captureDirectory: value["captureDirectory"] };
}

function parseCaptureManifest(value: unknown): CaptureManifest {
  if (
    !isRecord(value) ||
    typeof value["capturedAt"] !== "string" ||
    !Array.isArray(value["files"])
  ) {
    throw new TypeError("manifest.jsonの形式が不正です");
  }
  const files = value["files"].map((candidate) => {
    if (
      !isRecord(candidate) ||
      typeof candidate["fileName"] !== "string" ||
      typeof candidate["sha256"] !== "string" ||
      typeof candidate["url"] !== "string"
    ) {
      throw new TypeError("manifest.jsonのfiles要素が不正です");
    }
    return {
      fileName: candidate["fileName"],
      sha256: candidate["sha256"],
      url: candidate["url"],
    };
  });
  return { capturedAt: value["capturedAt"], files };
}

export function findCommentMenuBundle(
  files: CaptureFile[],
  sources: ReadonlyMap<string, string>,
  matchPattern: RegExp,
): CaptureFile {
  const matches = files.filter((file) => {
    const source = sources.get(file.fileName);
    return source !== undefined && new RegExp(matchPattern).test(source);
  });
  if (matches.length !== 1) {
    throw new Error(
      `公式コメントメニューを含む資産は1件必要です（検出: ${String(matches.length)}件）`,
    );
  }
  return matches[0];
}

function readNlFilterBlock(filterSource: string, name: string): string {
  const pattern = new RegExp(
    `(?:^|\\r?\\n)${name}<\\r?\\n([\\s\\S]*?)\\r?\\n>`,
    "u",
  );
  const value = filterSource.match(pattern)?.[1];
  if (value === undefined) {
    throw new Error(
      `103_official_comment_menu.txtに${name}ブロックがありません`,
    );
  }
  return value;
}

export function assertCommentMenuNlFilterContract(
  filterSource: string,
): NlFilterMenuContract {
  const contract = {
    match: readNlFilterBlock(filterSource, "Match"),
    replace: readNlFilterBlock(filterSource, "Replace"),
  };
  if (contract.match !== NLFILTER_MENU_PATTERN) {
    throw new Error(
      "103_official_comment_menu.txtのMatchが公式資産と一致しません",
    );
  }
  if (
    !contract.replace.includes(EXPOSED_MENU_FRAGMENT) ||
    !contract.replace.includes(
      "FilterMatomeCommentMenuBridgeApi={version:1}",
    ) ||
    !contract.replace.includes("e.getItems($6.comment)") ||
    !contract.replace.includes("e.execute(n.id,$6.comment)") ||
    !contract.replace.endsWith("$1")
  ) {
    throw new Error(
      "103_official_comment_menu.txtに版付きメニューAPIの接続がありません",
    );
  }
  return contract;
}

export function applyCommentMenuNlFilter(
  source: string,
  contract: NlFilterMenuContract,
): string {
  const pattern = new RegExp(contract.match, "gu");
  const matchCount = Array.from(source.matchAll(pattern)).length;
  if (matchCount !== 1) {
    throw new Error(
      `コメントメニューAPIのMatchは対象資産に1回だけ必要です（検出: ${String(matchCount)}回）`,
    );
  }
  return source.replace(pattern, contract.replace);
}

async function main(): Promise<void> {
  const projectRoot = resolve(import.meta.dirname, "../..");
  const sandboxRoot = resolve(projectRoot, "src/sandbox/official-watch-bundle");
  const latest = parseLatestCapture(
    JSON.parse(await readFile(resolve(sandboxRoot, "latest.json"), "utf8")),
  );
  const captureRoot = resolve(sandboxRoot, latest.captureDirectory);
  const manifest = parseCaptureManifest(
    JSON.parse(await readFile(resolve(captureRoot, "manifest.json"), "utf8")),
  );
  const javascriptFiles = manifest.files.filter((file) =>
    file.fileName.endsWith(".js"),
  );
  const sources = new Map<string, string>();
  await Promise.all(
    javascriptFiles.map(async (file) => {
      sources.set(
        file.fileName,
        await readFile(resolve(captureRoot, file.fileName), "utf8"),
      );
    }),
  );

  const filterPath = resolve(
    dirname(projectRoot),
    "../nlFilters/103_official_comment_menu.txt",
  );
  const contract = assertCommentMenuNlFilterContract(
    await readFile(filterPath, "utf8"),
  );
  const matchPattern = new RegExp(contract.match, "gu");
  const allMatchCount = Array.from(sources.values()).reduce(
    (count, candidate) =>
      count +
      Array.from(candidate.matchAll(new RegExp(contract.match, "gu"))).length,
    0,
  );
  if (allMatchCount !== 1) {
    throw new Error(
      `nlFilterのMatchは全公式資産で1回だけ必要です（検出: ${String(allMatchCount)}回）`,
    );
  }
  const bundle = findCommentMenuBundle(javascriptFiles, sources, matchPattern);
  const source = sources.get(bundle.fileName);
  if (source === undefined) {
    throw new Error(`公式資産を読み込めませんでした: ${bundle.fileName}`);
  }
  const transformed = applyCommentMenuNlFilter(source, contract);
  const deminified = await format(transformed, { parser: "babel" });
  if (
    !deminified.includes("FilterMatomeCommentMenuApi") ||
    !deminified.includes("FilterMatomeCommentMenuBridgeApi") ||
    !deminified.includes("getItems(t.comment)") ||
    !deminified.includes("execute(n.id, t.comment)") ||
    !deminified.includes("コメントをNG登録") ||
    !deminified.includes("ユーザーをNG登録")
  ) {
    throw new Error(
      "nlFilter適用・de-minify後に公式メニューとcomment-filter2の接続を確認できませんでした",
    );
  }

  console.log(`[comment-menu] capturedAt: ${manifest.capturedAt}`);
  console.log(`[comment-menu] asset: ${bundle.url}`);
  console.log(`[comment-menu] sha256: ${bundle.sha256}`);
  console.log(
    "[comment-menu] verified: official React menu model, versioned action API, original NG actions",
  );
}

if (import.meta.main) {
  await main();
}
