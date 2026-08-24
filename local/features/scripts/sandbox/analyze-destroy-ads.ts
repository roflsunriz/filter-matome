import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  type AssetRewriteKind,
  detectAppliedAssetRewrites,
  rewriteOfficialAsset,
} from "../../src/destroy-ads/asset-rewriter";
import {
  type AdBlockReason,
  getAdBlockReason,
} from "../../src/destroy-ads/ad-request-policy";

interface CandidateAsset {
  fileName: string;
  url: string;
}

interface CaptureManifest {
  pages: Array<{
    candidateAssets: CandidateAsset[];
    requests: Array<{ url: string }>;
  }>;
}

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const CAPTURE_ROOT = join(
  SCRIPT_DIRECTORY,
  "..",
  "..",
  "src",
  "sandbox",
  "destroy-ads-captures",
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isManifest = (value: unknown): value is CaptureManifest =>
  isRecord(value) &&
  Array.isArray(value.pages) &&
  value.pages.every(
    (page) =>
      isRecord(page) &&
      Array.isArray(page.candidateAssets) &&
      Array.isArray(page.requests),
  );

const captureNames = (await readdir(CAPTURE_ROOT, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const captureName = captureNames.at(-1);
if (!captureName) {
  throw new Error("destroy-ads captureがありません。");
}

const captureDirectory = join(CAPTURE_ROOT, captureName);
const manifestValue: unknown = JSON.parse(
  await readFile(join(captureDirectory, "manifest.json"), "utf8"),
);
if (!isManifest(manifestValue)) {
  throw new Error("destroy-ads manifestの形式が不正です。");
}

const assets = new Map<string, CandidateAsset>();
for (const page of manifestValue.pages) {
  for (const asset of page.candidateAssets) {
    if (typeof asset.fileName === "string" && typeof asset.url === "string") {
      assets.set(asset.url, asset);
    }
  }
}

const counts = new Map<AssetRewriteKind, number>();
const blockedRequestCounts = new Map<AdBlockReason, number>();
const matches: Array<{
  url: string;
  transformations: readonly AssetRewriteKind[];
}> = [];
for (const asset of assets.values()) {
  const source = await readFile(
    join(captureDirectory, "assets", asset.fileName),
    "utf8",
  );
  const result = rewriteOfficialAsset(asset.url, source);
  const transformations = [
    ...new Set([
      ...result.transformations,
      ...detectAppliedAssetRewrites(asset.url, source),
    ]),
  ];
  if (transformations.length === 0) {
    continue;
  }
  matches.push({ url: asset.url, transformations });
  for (const transformation of transformations) {
    counts.set(transformation, (counts.get(transformation) ?? 0) + 1);
  }
}

for (const page of manifestValue.pages) {
  for (const request of page.requests) {
    const reason = getAdBlockReason(request.url);
    if (reason) {
      blockedRequestCounts.set(
        reason,
        (blockedRequestCounts.get(reason) ?? 0) + 1,
      );
    }
  }
}

const required: readonly AssetRewriteKind[] = [
  "advertisement-component",
  "ads-resource-loader",
  "google-tag-manager-loader",
  "legacy-advertisement-manager",
];
const missing = required.filter((kind) => !counts.has(kind));
if (missing.length > 0) {
  throw new Error(`生成点を書き換えられませんでした: ${missing.join(", ")}`);
}

const report = {
  schemaVersion: 1,
  captureName,
  analyzedAssets: assets.size,
  counts: Object.fromEntries(counts),
  blockedRequestCounts: Object.fromEntries(blockedRequestCounts),
  matches,
};
await writeFile(
  join(captureDirectory, "rewrite-analysis.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify(report.counts));
