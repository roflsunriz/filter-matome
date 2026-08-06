import { mkdir, rm } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { composeWatchHistoryDocument } from "./watch-history-document";

const projectRoot = resolve(import.meta.dirname, "..");
const outDir = resolve(projectRoot, "dist");
const relativeOutDir = relative(projectRoot, outDir);

if (
  relativeOutDir === "" ||
  relativeOutDir.startsWith("..") ||
  relativeOutDir.includes(":")
) {
  throw new Error(`Unsafe output directory: ${outDir}`);
}

const htmlPages = [
  {
    source: "src/mylist2/index.html",
    output: "pages/mylist2/index.html",
  },
  {
    source: "src/movie-info/index.html",
    output: "pages/movie-info/index.html",
  },
  {
    source: "src/video-player/standalone/index.html",
    output: "pages/video-player/index.html",
  },
  {
    source: "src/watch-history/index.html",
    output: "pages/watch-history/index.html",
  },
] as const;

const commonBuildOptions = {
  outdir: outDir,
  root: projectRoot,
  target: "browser" as const,
  sourcemap: "linked" as const,
  minify: true,
  keepNames: true,
  packages: "bundle" as const,
};

const featureEntrypoints = [
  "src/cache-data-manager/main.ts",
  "src/comment-filter2/index.ts",
  "src/common/index.ts",
  "src/mlink-video-controller/index.ts",
  "src/movie-info/index.ts",
  "src/movie-fetcher/index.ts",
  "src/mylist2/index.ts",
  "src/video-player/index.ts",
  "src/video-player/standalone/main.ts",
  "src/watch-history/app.ts",
  "src/watch-history/watch-tracker.ts",
] as const;

async function copyHtmlPages(): Promise<void> {
  for (const page of htmlPages) {
    const source = resolve(projectRoot, page.source);
    const output = resolve(outDir, page.output);
    await mkdir(dirname(output), { recursive: true });
    await Bun.write(
      output,
      page.source === "src/watch-history/index.html"
        ? composeWatchHistoryDocument(projectRoot)
        : Bun.file(source),
    );
  }
}

async function assertOutputContract(): Promise<void> {
  const requiredFiles = [
    "features.js",
    "features.js.map",
    "server-context-override.js",
    "server-context-override.js.map",
    ...featureEntrypoints.flatMap((entrypoint) => {
      const relativeEntry = entrypoint
        .replace(/^src\//, "")
        .replace(/\.ts$/, "");
      return [`entries/${relativeEntry}.js`, `entries/${relativeEntry}.js.map`];
    }),
    "workers/comment-filter-worker.js",
    "workers/comment-filter-worker.js.map",
    "workers/json-comment-filter-worker.js",
    "workers/json-comment-filter-worker.js.map",
    "mylist-service-worker.js",
    "mylist-service-worker.js.map",
    ...htmlPages.map((page) => page.output),
  ];

  const missing: string[] = [];
  for (const file of requiredFiles) {
    if (!(await Bun.file(resolve(outDir, file)).exists())) {
      missing.push(file);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Build output is incomplete: ${missing.join(", ")}`);
  }

  for (const page of htmlPages) {
    const html = await Bun.file(resolve(outDir, page.output)).text();
    if (!html.includes("/local/features/dist/features.js")) {
      throw new Error(`${page.output} does not load features.js`);
    }
  }
}

async function build(): Promise<void> {
  const startedAt = performance.now();
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const results = await Promise.all([
    Bun.build({
      ...commonBuildOptions,
      entrypoints: [resolve(projectRoot, "src/features.ts")],
      format: "iife",
      splitting: false,
      naming: { entry: "features.js" },
      loader: { ".svg": "text" },
    }),
    Bun.build({
      ...commonBuildOptions,
      entrypoints: [
        resolve(projectRoot, "src/runtime/server-context-override-entry.ts"),
      ],
      format: "iife",
      splitting: false,
      naming: { entry: "server-context-override.js" },
    }),
    Bun.build({
      ...commonBuildOptions,
      root: resolve(projectRoot, "src"),
      entrypoints: featureEntrypoints.map((entrypoint) =>
        resolve(projectRoot, entrypoint),
      ),
      format: "esm",
      splitting: false,
      naming: { entry: "entries/[dir]/[name].js" },
      loader: { ".svg": "text", ".css": "text" },
    }),
    Bun.build({
      ...commonBuildOptions,
      entrypoints: [
        resolve(
          projectRoot,
          "src/comment-filter2/filter/comment-filter-worker.ts",
        ),
        resolve(
          projectRoot,
          "src/comment-filter2/filter/json-comment-filter-worker.ts",
        ),
      ],
      format: "esm",
      splitting: false,
      naming: { entry: "workers/[name].js" },
    }),
    Bun.build({
      ...commonBuildOptions,
      entrypoints: [resolve(projectRoot, "src/mylist2/service-worker.ts")],
      format: "iife",
      splitting: false,
      naming: { entry: "mylist-service-worker.js" },
    }),
  ]);

  await copyHtmlPages();
  await assertOutputContract();

  const outputCount = results.reduce(
    (count, result) => count + result.outputs.length,
    htmlPages.length,
  );
  const elapsed = ((performance.now() - startedAt) / 1000).toFixed(2);
  console.log(`[build] Created ${outputCount} files in ${elapsed}s`);
}

await build();
