import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, delimiter, join, resolve, sep } from "node:path";

const jar = process.argv[2];
if (!jar) throw new Error("NicoCache_nl.jarのパスを指定してください");
const repository = resolve(import.meta.dirname, "..", "..", "..");
const tempParent = realpathSync(tmpdir());
const temp = mkdtempSync(join(tempParent, "movie-fetcher-java-test-"));

try {
  const sources = [
    "extensions/ExtUtil.java",
    "extensions/nlMovieFetcher.java",
    "extensions/FilterMatomeSmartFetcher.java",
    "local/features/tests/java/MovieFetcherCookieTest.java",
  ].map((path) => join(repository, path));
  execFileSync(
    "javac",
    [
      "--release",
      "17",
      "-encoding",
      "UTF-8",
      "-cp",
      resolve(jar),
      "-d",
      temp,
      ...sources,
    ],
    { stdio: "inherit" },
  );
  const extensionClasses = readdirSync(join(temp, "extensions"))
    .filter((name) => name.endsWith(".class"))
    .sort();
  if (
    JSON.stringify(extensionClasses) !==
    JSON.stringify([
      "ExtUtil.class",
      "FilterMatomeSmartFetcher.class",
      "nlMovieFetcher.class",
    ])
  ) {
    throw new Error("拡張が単一classとしてコンパイルされていません");
  }
  for (const [label, classpath] of [
    ["compiled", [temp, resolve(jar)]],
    ["distributed", [repository, temp, resolve(jar)]],
  ] as const) {
    console.log(`Java extension test: ${label}`);
    execFileSync(
      "java",
      [
        `-Dnicocache.userDataRoot=${join(temp, `data-${label}`)}`,
        "-cp",
        classpath.join(delimiter),
        "tests.MovieFetcherCookieTest",
      ],
      { stdio: "inherit" },
    );
  }
} finally {
  const resolvedTemp = realpathSync(temp);
  if (
    resolvedTemp.startsWith(`${tempParent}${sep}`) &&
    basename(resolvedTemp).startsWith("movie-fetcher-java-test-")
  ) {
    rmSync(resolvedTemp, { recursive: true, force: true });
  }
}
