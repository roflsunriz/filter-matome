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

export interface PlaybackRateNlFilterContract {
  match: string;
  replace: string;
}

const MINIFIED_PLAYBACK_RATE_ANCHOR =
  "this.getPlaybackRate=()=>this.media.getPlaybackRate()";
const NLFILTER_PLAYBACK_RATE_PATTERN =
  "this\\.getPlaybackRate=\\(\\)=>this\\.media\\.getPlaybackRate\\(\\)";
const PLAYBACK_RATE_SECTION_NAME =
  "Name = 公式プレイヤーとmlink-video-controllerの再生速度同期（nimg用）";
const EXPOSED_API_FRAGMENT =
  "globalThis.FilterMatomePlaybackRateApi={version:1";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseLatestCapture = (value: unknown): LatestCapture => {
  if (!isRecord(value) || typeof value["captureDirectory"] !== "string") {
    throw new TypeError("latest.jsonにcaptureDirectoryがありません");
  }
  return { captureDirectory: value["captureDirectory"] };
};

const parseCaptureManifest = (value: unknown): CaptureManifest => {
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
};

export const findPlaybackRateBundle = (
  files: CaptureFile[],
  sources: ReadonlyMap<string, string>,
): CaptureFile => {
  const matches = files.filter((file) =>
    sources.get(file.fileName)?.includes(MINIFIED_PLAYBACK_RATE_ANCHOR),
  );
  if (matches.length !== 1) {
    throw new Error(
      `公式media controllerを含む資産は1件必要です（検出: ${String(matches.length)}件）`,
    );
  }
  return matches[0];
};

const findAssetByNamePrefix = (
  files: CaptureFile[],
  prefix: string,
): CaptureFile => {
  const matches = files.filter((file) => {
    const name = new URL(file.url).pathname.split("/").at(-1) ?? "";
    return name.startsWith(prefix);
  });
  if (matches.length !== 1) {
    throw new Error(
      `${prefix}資産は1件必要です（検出: ${String(matches.length)}件）`,
    );
  }
  return matches[0];
};

const readBlock = (section: string, name: "Match" | "Replace"): string => {
  const value = section.match(
    new RegExp(`(?:^|\\r?\\n)${name}<\\r?\\n([\\s\\S]*?)\\r?\\n>`, "u"),
  )?.[1];
  if (value === undefined) {
    throw new Error(
      `101_disable_official_function.txtに${name}ブロックがありません`,
    );
  }
  return value;
};

export const assertPlaybackRateNlFilterContract = (
  filterSource: string,
): PlaybackRateNlFilterContract => {
  const sections = filterSource.split(
    /(?=^\[(?:Replace|Script|Style)\]\r?$)/mu,
  );
  const section = sections.find((candidate) =>
    candidate.includes(PLAYBACK_RATE_SECTION_NAME),
  );
  if (!section) {
    throw new Error(
      "101_disable_official_function.txtに再生速度同期セクションがありません",
    );
  }
  const contract = {
    match: readBlock(section, "Match"),
    replace: readBlock(section, "Replace"),
  };
  if (contract.match !== NLFILTER_PLAYBACK_RATE_PATTERN) {
    throw new Error(
      "101番nlFilterのMatchが公式media controller境界と一致しません",
    );
  }
  if (!contract.replace.includes(EXPOSED_API_FRAGMENT)) {
    throw new Error("101番nlFilterに版付き再生速度APIの注入処理がありません");
  }
  if (contract.replace.includes("_x_")) {
    throw new Error("101番nlFilterに旧playbackRate全面置換が残っています");
  }
  return contract;
};

export const applyPlaybackRateNlFilter = (
  source: string,
  contract: PlaybackRateNlFilterContract,
): string => {
  const pattern = new RegExp(contract.match, "gu");
  const matchCount = Array.from(source.matchAll(pattern)).length;
  if (matchCount !== 1) {
    throw new Error(
      `再生速度APIのMatchは対象資産に1回だけ必要です（検出: ${String(matchCount)}回）`,
    );
  }
  return source.replace(pattern, contract.replace);
};

const main = async (): Promise<void> => {
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

  const bundle = findPlaybackRateBundle(javascriptFiles, sources);
  const optionPresenter = findAssetByNamePrefix(
    javascriptFiles,
    "PlayerOptionPresenter-",
  );
  const optionSelect = findAssetByNamePrefix(
    javascriptFiles,
    "PlayerOptionSelect-",
  );
  const source = sources.get(bundle.fileName);
  const optionPresenterSource = sources.get(optionPresenter.fileName);
  const optionSelectSource = sources.get(optionSelect.fileName);
  if (
    source === undefined ||
    optionPresenterSource === undefined ||
    optionSelectSource === undefined
  ) {
    throw new Error(`公式資産を読み込めませんでした: ${bundle.fileName}`);
  }
  const filterPath = resolve(
    dirname(projectRoot),
    "../nlFilters/101_disable_official_function.txt",
  );
  const contract = assertPlaybackRateNlFilterContract(
    await readFile(filterPath, "utf8"),
  );
  const transformed = applyPlaybackRateNlFilter(source, contract);
  const [deminified, optionPresenterDeminified, optionSelectDeminified] =
    await Promise.all([
      format(transformed, { parser: "babel" }),
      format(optionPresenterSource, { parser: "babel" }),
      format(optionSelectSource, { parser: "babel" }),
    ]);
  if (
    !deminified.includes("FilterMatomePlaybackRateApi") ||
    !deminified.includes("this.media.setPlaybackRate(e)") ||
    !deminified.includes("media.playbackRate !== this.playbackRate") ||
    !deminified.includes("media.playbackRate = this.playbackRate")
  ) {
    throw new Error(
      "nlFilter適用・de-minify後に公式状態同期と版付きAPIを確認できませんでした",
    );
  }
  if (
    !optionPresenterDeminified.includes("changePlaybackRate") ||
    !optionPresenterDeminified.includes("再生速度") ||
    !/value:\s*\w+\.value\s*\?\s*\[\w+\.value\.id\]\s*:\s*void 0/u.test(
      optionSelectDeminified,
    ) ||
    !/\.value\?\.label\s*\?\?\s*`-`/u.test(optionSelectDeminified)
  ) {
    throw new Error(
      "de-minify後に公式再生速度UIまたは未選択値の安全な表示を確認できませんでした",
    );
  }

  console.log(`[playback-rate] capturedAt: ${manifest.capturedAt}`);
  console.log(`[playback-rate] asset: ${bundle.url}`);
  console.log(`[playback-rate] sha256: ${bundle.sha256}`);
  console.log(
    "[playback-rate] verified: official media state, HTMLMediaElement correction, official option UI, versioned bridge injection",
  );
};

if (import.meta.main) {
  await main();
}
