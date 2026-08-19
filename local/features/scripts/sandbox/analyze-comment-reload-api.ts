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

const MINIFIED_RELOAD_ANCHOR =
  "Le(e,[`initialized`,`fetched`]);let n=e.current(),r=yield lr(";
const NLFILTER_RELOAD_PATTERN =
  "Le\\(e,\\[`initialized`,`fetched`\\]\\);let n=e\\.current\\(\\),r=yield lr\\(";
const EXPOSED_API_FRAGMENT =
  "globalThis.FilterMatomeCommentApi={version:1,reload:()=>Ar(e,e.current().fetchAdditionals)}";

interface NlFilterReplaceContract {
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

export function findCommentReloadBundle(
  files: CaptureFile[],
  sources: ReadonlyMap<string, string>,
): CaptureFile {
  const matches = files.filter((file) =>
    sources.get(file.fileName)?.includes(MINIFIED_RELOAD_ANCHOR),
  );
  if (matches.length !== 1) {
    throw new Error(
      `コメント再取得actionを含む公式資産は1件必要です（検出: ${String(matches.length)}件）`,
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
    throw new Error(`102_comment_reload_api.txtに${name}ブロックがありません`);
  }
  return value;
}

export function assertNlFilterContract(
  filterSource: string,
): NlFilterReplaceContract {
  const contract = {
    match: readNlFilterBlock(filterSource, "Match"),
    replace: readNlFilterBlock(filterSource, "Replace"),
  };
  if (contract.match !== NLFILTER_RELOAD_PATTERN) {
    throw new Error(
      "102_comment_reload_api.txtのMatchが公式資産と一致しません",
    );
  }
  if (!contract.replace.includes(EXPOSED_API_FRAGMENT)) {
    throw new Error(
      "102_comment_reload_api.txtに再取得APIの注入処理がありません",
    );
  }
  return contract;
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

  const bundle = findCommentReloadBundle(javascriptFiles, sources);
  const source = sources.get(bundle.fileName);
  if (source === undefined) {
    throw new Error(`公式資産を読み込めませんでした: ${bundle.fileName}`);
  }
  const filterPath = resolve(
    dirname(projectRoot),
    "../nlFilters/102_comment_reload_api.txt",
  );
  const contract = assertNlFilterContract(await readFile(filterPath, "utf8"));
  const matchPattern = new RegExp(contract.match, "gu");
  const matchCount = Array.from(source.matchAll(matchPattern)).length;
  if (matchCount !== 1) {
    throw new Error(
      `nlFilterのMatchは公式資産に1回だけ必要です（検出: ${String(matchCount)}回）`,
    );
  }
  const transformed = source.replace(matchPattern, contract.replace);
  const deminified = await format(transformed, { parser: "babel" });
  if (
    !deminified.includes("fetchAdditionals") ||
    !deminified.includes("/v1/threads") ||
    !deminified.includes("FilterMatomeCommentApi")
  ) {
    throw new Error(
      "nlFilter適用・de-minify後にコメント再取得契約を確認できませんでした",
    );
  }

  console.log(`[comment-reload] capturedAt: ${manifest.capturedAt}`);
  console.log(`[comment-reload] asset: ${bundle.url}`);
  console.log(`[comment-reload] sha256: ${bundle.sha256}`);
  console.log(
    "[comment-reload] verified: POST /v1/threads action, fetchAdditionals reuse, nlFilter injection",
  );
}

if (import.meta.main) {
  await main();
}
