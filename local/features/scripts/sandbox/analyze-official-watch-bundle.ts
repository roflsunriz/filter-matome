import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface LatestCapture {
  schemaVersion: number;
  captureDirectory: string;
}

interface CaptureFile {
  url: string;
  fileName: string;
  bytes: number;
  sha256: string;
}

interface CaptureManifest {
  schemaVersion: number;
  capturedAt: string;
  watchUrl: string;
  browser: string;
  authenticationMaterialStored: boolean;
  files: CaptureFile[];
}

interface SignalDefinition {
  id: string;
  label: string;
  patterns: RegExp[];
}

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));

const SIGNALS: SignalDefinition[] = [
  {
    id: "playback",
    label: "動画再生・品質・表示モード",
    patterns: [
      /\bplaybackRate\b/gi,
      /\bpictureInPicture\b/gi,
      /\bfullscreen\b/gi,
      /\bautoPlay\b/gi,
      /\bquality\b/gi,
    ],
  },
  {
    id: "comments",
    label: "コメント・ニコる・コメントコマンド",
    patterns: [
      /\bnv-?comment\b/gi,
      /\bnicoru\b/gi,
      /\beasyComment\b/gi,
      /\bcommentCommand\b/gi,
      /\bcomments?\b/gi,
    ],
  },
  {
    id: "library",
    label: "マイリスト・あとで見る・シリーズ",
    patterns: [
      /\bmylist\b/gi,
      /\bwatchLater\b/gi,
      /\bseries\b/gi,
      /\bplaylist\b/gi,
    ],
  },
  {
    id: "social",
    label: "フォロー・いいね・共有",
    patterns: [/\bfollow\b/gi, /\blike\b/gi, /\bshare\b/gi],
  },
  {
    id: "discovery",
    label: "おすすめ・関連動画・検索導線",
    patterns: [/\brecommend/gi, /\brelated/gi, /\branking\b/gi, /\bsearch\b/gi],
  },
  {
    id: "monetization",
    label: "プレミアム・広告・購入",
    patterns: [
      /\bpremium\b/gi,
      /\badvertis/gi,
      /\bpurchase\b/gi,
      /\bticket\b/gi,
    ],
  },
  {
    id: "accessibility",
    label: "キーボード・アクセシビリティ",
    patterns: [
      /\bkeyboardShortcut\b/gi,
      /\baria-/gi,
      /\baccessibility\b/gi,
      /\bscreenReader\b/gi,
    ],
  },
  {
    id: "local-cache",
    label: "ローカルキャッシュ固有語",
    patterns: [
      /\bNicoCache_nl\b/gi,
      /\/cache\/info\/v2/gi,
      /\/local\/features\//gi,
    ],
  },
  {
    id: "advanced-filtering",
    label: "高度なコメント変換・正規表現",
    patterns: [
      /\bregexAnalyzer\b/gi,
      /\bcommentFilter2\b/gi,
      /\breplaceWord\b/gi,
    ],
  },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isLatestCapture = (value: unknown): value is LatestCapture =>
  isRecord(value) &&
  typeof value.schemaVersion === "number" &&
  typeof value.captureDirectory === "string";

const isCaptureFile = (value: unknown): value is CaptureFile =>
  isRecord(value) &&
  typeof value.url === "string" &&
  typeof value.fileName === "string" &&
  typeof value.bytes === "number" &&
  typeof value.sha256 === "string";

const isCaptureManifest = (value: unknown): value is CaptureManifest =>
  isRecord(value) &&
  typeof value.schemaVersion === "number" &&
  typeof value.capturedAt === "string" &&
  typeof value.watchUrl === "string" &&
  typeof value.browser === "string" &&
  typeof value.authenticationMaterialStored === "boolean" &&
  Array.isArray(value.files) &&
  value.files.every(isCaptureFile);

const readJson = async (path: string): Promise<unknown> =>
  JSON.parse(await readFile(path, "utf8")) as unknown;

const countPattern = (source: string, pattern: RegExp): number => {
  pattern.lastIndex = 0;
  let count = 0;
  while (pattern.exec(source) !== null) {
    count += 1;
  }
  return count;
};

const extractDomains = (source: string): string[] => {
  const domains = new Set<string>();
  const pattern = /https?:\\?\/\\?\/([a-zA-Z0-9.-]+)/g;
  for (const match of source.matchAll(pattern)) {
    const domain = match[1];
    if (domain) {
      domains.add(domain.toLowerCase());
    }
  }
  return [...domains];
};

const main = async (): Promise<void> => {
  const outputRoot = join(
    SCRIPT_DIRECTORY,
    "..",
    "..",
    "src",
    "sandbox",
    "official-watch-bundle",
  );
  const latestValue = await readJson(join(outputRoot, "latest.json"));
  if (!isLatestCapture(latestValue)) {
    throw new Error("latest.jsonの形式が不正です。");
  }

  const captureDirectory = resolve(outputRoot, latestValue.captureDirectory);
  if (!captureDirectory.startsWith(resolve(outputRoot))) {
    throw new Error("captureDirectoryがsandbox外を指しています。");
  }
  const manifestValue = await readJson(join(captureDirectory, "manifest.json"));
  if (!isCaptureManifest(manifestValue)) {
    throw new Error("capture manifestの形式が不正です。");
  }
  if (manifestValue.authenticationMaterialStored) {
    throw new Error("認証情報を含むcaptureは解析できません。");
  }

  const sources = await Promise.all(
    manifestValue.files.map(async (file) => ({
      file,
      source: await readFile(join(captureDirectory, file.fileName), "utf8"),
    })),
  );

  const signals = SIGNALS.map((signal) => {
    const matchingFiles: { fileName: string; count: number }[] = [];
    let count = 0;
    for (const entry of sources) {
      const fileCount = signal.patterns.reduce(
        (sum, pattern) => sum + countPattern(entry.source, pattern),
        0,
      );
      if (fileCount > 0) {
        matchingFiles.push({
          fileName: entry.file.fileName,
          count: fileCount,
        });
        count += fileCount;
      }
    }
    return {
      id: signal.id,
      label: signal.label,
      count,
      matchingFiles: matchingFiles.sort(
        (left, right) => right.count - left.count,
      ),
    };
  });

  const domainCounts = new Map<string, number>();
  for (const entry of sources) {
    for (const domain of extractDomains(entry.source)) {
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
    }
  }

  const result = {
    schemaVersion: 1,
    analyzedAt: new Date().toISOString(),
    methodology: "static-text-only",
    officialCodeExecuted: false,
    externalNetworkRequired: false,
    capture: {
      capturedAt: manifestValue.capturedAt,
      watchUrl: manifestValue.watchUrl,
      browser: manifestValue.browser,
      files: manifestValue.files.length,
      bytes: manifestValue.files.reduce((sum, file) => sum + file.bytes, 0),
    },
    signals,
    referencedDomains: [...domainCounts.entries()]
      .map(([domain, fileCount]) => ({ domain, fileCount }))
      .sort((left, right) => right.fileCount - left.fileCount),
    caveats: [
      "文字列の存在は機能の実装や有効化を証明しません。",
      "文字列の不在は遅延ロードされた別バンドルに機能がないことを証明しません。",
      "回数はminify、共通ライブラリ、埋め込みデータの影響を受けます。",
    ],
  };
  const outputPath = join(captureDirectory, "analysis.json");
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(`静的解析完了: ${outputPath}`);
};

await main();
