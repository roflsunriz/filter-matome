import { readFile, writeFile } from "node:fs/promises";
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

export interface OfficialWatchCssAnalysis {
  importantCount: number;
  layerNames: string[];
  ruleCount: number;
  topLevelBlockPreludes: string[];
  unlayeredTopLevelBlocks: string[];
}

const EXPECTED_LAYER_NAMES = [
  "reset",
  "base",
  "tokens",
  "recipes",
  "utilities",
] as const;
const OFFICIAL_OUTER_LAYER = "filter-matome-official";

export interface NlFilterCssWrapContract {
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

function topLevelBlockPreludes(source: string): string[] {
  const preludes: string[] = [];
  let boundary = 0;
  let depth = 0;
  let quote: '"' | "'" | null = null;
  let escaped = false;
  let inComment = false;
  const isEscapedAt = (index: number): boolean => {
    let backslashCount = 0;
    for (
      let cursor = index - 1;
      cursor >= 0 && source[cursor] === "\\";
      cursor -= 1
    ) {
      backslashCount += 1;
    }
    return backslashCount % 2 === 1;
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (inComment) {
      if (character === "*" && next === "/") {
        inComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "/" && next === "*") {
      inComment = true;
      index += 1;
      continue;
    }
    if ((character === '"' || character === "'") && !isEscapedAt(index)) {
      quote = character;
      continue;
    }
    if (character === "{" && !isEscapedAt(index)) {
      if (depth === 0) {
        const prelude = source.slice(boundary, index).trim();
        if (prelude) {
          preludes.push(prelude);
        }
      }
      depth += 1;
      continue;
    }
    if (character === "}" && !isEscapedAt(index)) {
      depth -= 1;
      if (depth < 0) {
        throw new Error("公式CSSの閉じ波括弧が対応していません");
      }
      if (depth === 0) {
        boundary = index + 1;
      }
      continue;
    }
    if (character === ";" && depth === 0 && !isEscapedAt(index)) {
      const prelude = source.slice(boundary, index).trim();
      if (prelude.startsWith("@layer ")) {
        preludes.push(prelude);
      }
      boundary = index + 1;
    }
  }

  if (depth !== 0 || quote || inComment) {
    throw new Error(
      `公式CSSを末尾まで構文走査できませんでした (depth=${String(depth)}, quote=${quote ?? "none"}, comment=${String(inComment)})`,
    );
  }
  return preludes;
}

export function analyzeOfficialWatchCss(
  source: string,
): OfficialWatchCssAnalysis {
  const preludes = topLevelBlockPreludes(source);
  const layerNames = preludes.flatMap((prelude) => {
    const match = /^@layer\s+([a-zA-Z0-9_-]+)$/u.exec(prelude);
    return match?.[1] ? [match[1]] : [];
  });
  return {
    importantCount: Array.from(source.matchAll(/!important\b/gu)).length,
    layerNames,
    ruleCount: Array.from(source.matchAll(/\{/gu)).length,
    topLevelBlockPreludes: preludes,
    unlayeredTopLevelBlocks: preludes.filter(
      (prelude) => !/^@layer\s+[a-zA-Z0-9_-]+$/u.test(prelude),
    ),
  };
}

export function assertOfficialWatchCssContract(
  analysis: OfficialWatchCssAnalysis,
): void {
  const unexpectedUnlayeredBlocks = analysis.unlayeredTopLevelBlocks.filter(
    (prelude) =>
      prelude !== "@font-face" &&
      !prelude.includes("simplebar") &&
      !prelude.includes("data-simplebar"),
  );
  if (unexpectedUnlayeredBlocks.length > 0) {
    throw new Error(
      `公式root CSSに未知のlayer外ルールがあります: ${unexpectedUnlayeredBlocks.join(", ")}`,
    );
  }
  if (
    analysis.layerNames.length !== EXPECTED_LAYER_NAMES.length ||
    analysis.layerNames.some(
      (layerName, index) => layerName !== EXPECTED_LAYER_NAMES[index],
    )
  ) {
    throw new Error(
      `公式root CSSのlayer順が変わりました: ${analysis.layerNames.join(", ")}`,
    );
  }
}

export function parseNlFilterCssWrap(source: string): NlFilterCssWrapContract {
  const section =
    /\[Replace\]\r?\nName = 公式Watch CSS layer隔離\r?\n[\s\S]*?Match<\r?\n(?<match>[\s\S]*?)\r?\n>\r?\nReplace<\r?\n(?<replace>[\s\S]*?)\r?\n>/u.exec(
      source,
    );
  const match = section?.groups?.["match"];
  const replace = section?.groups?.["replace"];
  if (!match || !replace) {
    throw new Error(
      "104_watch_harajuku_style.txtのCSS layer隔離を解析できません",
    );
  }
  return { match, replace };
}

export function applyNlFilterCssWrap(
  source: string,
  contract: NlFilterCssWrapContract,
): string {
  const pattern = new RegExp(contract.match, "u");
  const matches = Array.from(source.matchAll(new RegExp(contract.match, "gu")));
  if (matches.length !== 1) {
    throw new Error(
      `公式root CSSの全体Matchは1回必要です（検出: ${String(matches.length)}回）`,
    );
  }
  return source.replace(pattern, contract.replace);
}

export function assertWrappedOfficialWatchCssContract(
  analysis: OfficialWatchCssAnalysis,
): void {
  if (
    analysis.topLevelBlockPreludes.length !== 1 ||
    analysis.layerNames[0] !== OFFICIAL_OUTER_LAYER ||
    analysis.unlayeredTopLevelBlocks.length !== 0
  ) {
    throw new Error(
      "nlFilter適用後の公式root CSSが単一layerに隔離されていません",
    );
  }
}

async function main(): Promise<void> {
  const sandboxRoot = resolve(
    dirname(import.meta.filename),
    "../../src/sandbox/official-watch-bundle",
  );
  const latest = parseLatestCapture(
    JSON.parse(await readFile(resolve(sandboxRoot, "latest.json"), "utf8")),
  );
  const captureDirectory = resolve(sandboxRoot, latest.captureDirectory);
  const manifest = parseCaptureManifest(
    JSON.parse(
      await readFile(resolve(captureDirectory, "manifest.json"), "utf8"),
    ),
  );
  const rootCssFiles = manifest.files.filter((file) =>
    /\/assets\/root-[a-zA-Z0-9_-]+\.css$/u.test(new URL(file.url).pathname),
  );
  if (rootCssFiles.length !== 1) {
    throw new Error(
      `公式root CSSは1件必要です（検出: ${String(rootCssFiles.length)}件）`,
    );
  }
  const rootCss = rootCssFiles[0];
  if (!rootCss) {
    throw new Error("公式root CSSがありません");
  }
  const source = await readFile(
    resolve(captureDirectory, rootCss.fileName),
    "utf8",
  );
  const analysis = analyzeOfficialWatchCss(source);
  assertOfficialWatchCssContract(analysis);
  const repositoryRoot = resolve(dirname(import.meta.filename), "../../../..");
  const filterContract = parseNlFilterCssWrap(
    await readFile(
      resolve(repositoryRoot, "nlFilters/104_watch_harajuku_style.txt"),
      "utf8",
    ),
  );
  const wrappedSource = applyNlFilterCssWrap(source, filterContract);
  const wrappedAnalysis = analyzeOfficialWatchCss(wrappedSource);
  assertWrappedOfficialWatchCssContract(wrappedAnalysis);
  const deminifiedFileName = `${rootCss.fileName}.deminified.css`;
  await writeFile(
    resolve(captureDirectory, deminifiedFileName),
    await format(source, { parser: "css" }),
    "utf8",
  );
  const wrappedDeminifiedFileName = `${rootCss.fileName}.wrapped.deminified.css`;
  await writeFile(
    resolve(captureDirectory, wrappedDeminifiedFileName),
    await format(wrappedSource, { parser: "css" }),
    "utf8",
  );
  await writeFile(
    resolve(captureDirectory, "watch-css-analysis.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        capturedAt: manifest.capturedAt,
        asset: rootCss,
        deminifiedFileName,
        wrappedDeminifiedFileName,
        analysis,
        wrappedAnalysis,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`[watch-css] capturedAt: ${manifest.capturedAt}`);
  console.log(`[watch-css] asset: ${rootCss.url}`);
  console.log(`[watch-css] sha256: ${rootCss.sha256}`);
  console.log(`[watch-css] layers: ${analysis.layerNames.join(", ")}`);
  console.log(`[watch-css] important declarations: ${analysis.importantCount}`);
  console.log(
    "[watch-css] verified: official layers and known tail rules are wrapped before CSS application",
  );
}

if (import.meta.main) {
  await main();
}
