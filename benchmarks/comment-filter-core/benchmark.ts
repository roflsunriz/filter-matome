import { mkdirSync } from "node:fs";
import { cpus } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { SubstringMatcher } from "../../local/features/src/comment-filter2/filter/rule-indexer";

const RULE_COUNT = 700;
const COMMENT_COUNT = 2_000;
const WARMUP_ROUNDS = 8;
const MEASURED_ROUNDS = 15;
const AUTH_HEADERS = {
  "Content-Type": "application/octet-stream",
  "X-Filter-Matome-Benchmark": "1",
};

interface DurationStats {
  averageMs: number;
  medianMs: number;
  minMs: number;
  maxMs: number;
}

interface JavaMatchResponse {
  decodeMs: number;
  matchMs: number;
  results: Int32Array;
}

interface RegexWasmExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
  alloc: (length: number) => number;
  dealloc: (pointer: number, length: number) => void;
  alloc_results: (length: number) => number;
  dealloc_results: (pointer: number, length: number) => void;
  compile_rules: (pointer: number, length: number) => number;
  load_bodies: (pointer: number, length: number) => number;
  match_loaded: (output: number, outputLength: number) => number;
  match_batch: (
    pointer: number,
    length: number,
    output: number,
    outputLength: number,
  ) => number;
}

const benchmarkDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(benchmarkDirectory, "..", "..");
const buildDirectory = join(
  repositoryRoot,
  ".sandbox-tmp",
  "comment-filter-core",
);
const javaOutputDirectory = join(buildDirectory, "java");
const rustTargetDirectory = join(buildDirectory, "rust-target");
const rustManifest = join(benchmarkDirectory, "rust", "Cargo.toml");
const rustWasm = join(
  rustTargetDirectory,
  "wasm32-unknown-unknown",
  "release",
  "comment_filter_regex_core.wasm",
);
const javaSource = join(benchmarkDirectory, "java", "RegexCoreServer.java");

mkdirSync(javaOutputDirectory, { recursive: true });
mkdirSync(rustTargetDirectory, { recursive: true });

runBuild([
  "javac",
  "--add-modules",
  "jdk.httpserver",
  "-Xlint:all",
  "-d",
  javaOutputDirectory,
  javaSource,
]);
runBuild([
  "rustup",
  "run",
  "stable",
  "cargo",
  "build",
  "--release",
  "--target",
  "wasm32-unknown-unknown",
  "--manifest-path",
  rustManifest,
  "--target-dir",
  rustTargetDirectory,
]);

const patterns = Array.from(
  { length: RULE_COUNT },
  (_, index) => `未出現語${index}.*末尾`,
);
const bodies = Array.from(
  { length: COMMENT_COUNT },
  (_, index) => `通常コメント ${index} テスト本文です`,
);
const patternPayload = encodeStringList(patterns);
const bodyPayload = encodeStringList(bodies);
const serializationStats = measureSync(() => encodeStringList(bodies));

const javascriptCompileStarted = performance.now();
const javascriptRules = patterns.map((pattern) => new RegExp(pattern, "gi"));
const javascriptCompileMs = performance.now() - javascriptCompileStarted;
const javascriptResults = new Int32Array(COMMENT_COUNT);
const javascriptCoreStats = measureSync(() => {
  matchWithJavascript(javascriptRules, bodies, javascriptResults);
  assertNoMatches(javascriptResults, "TypeScript");
});

const indexedCompileStarted = performance.now();
const requiredTokenMatcher = new SubstringMatcher();
for (let index = 0; index < RULE_COUNT; index += 1) {
  requiredTokenMatcher.add(`未出現語${index}`, index, false);
}
requiredTokenMatcher.build();
const indexedCompileMs = performance.now() - indexedCompileStarted;
const indexedResults = new Int32Array(COMMENT_COUNT);
const indexedCoreStats = measureSync(() => {
  matchWithRequiredTokenIndex(
    requiredTokenMatcher,
    javascriptRules,
    bodies,
    indexedResults,
  );
  assertNoMatches(indexedResults, "TypeScript required-token index");
});

const javaProcess = Bun.spawn({
  cmd: [
    "java",
    "--add-modules",
    "jdk.httpserver",
    "-cp",
    javaOutputDirectory,
    "RegexCoreServer",
  ],
  cwd: repositoryRoot,
  stdout: "pipe",
  stderr: "inherit",
});

try {
  const javaPort = await readPort(javaProcess.stdout);
  const javaBaseUrl = `http://127.0.0.1:${javaPort}`;
  const javaCompile = await postJava(`${javaBaseUrl}/compile`, patternPayload);
  await postJava(`${javaBaseUrl}/load-bodies`, bodyPayload);

  for (let round = 0; round < WARMUP_ROUNDS; round += 1) {
    await postJava(`${javaBaseUrl}/match-loaded`, new Uint8Array());
  }

  const javaCoreDurations: number[] = [];
  const javaLoadedRoundTripDurations: number[] = [];
  let javaLoadedResults = new Int32Array();
  for (let round = 0; round < MEASURED_ROUNDS; round += 1) {
    const startedAt = performance.now();
    const response = await postJava(
      `${javaBaseUrl}/match-loaded`,
      new Uint8Array(),
    );
    javaLoadedRoundTripDurations.push(performance.now() - startedAt);
    javaCoreDurations.push(response.matchMs);
    javaLoadedResults = response.results;
  }
  assertNoMatches(javaLoadedResults, "Java loaded");

  for (let round = 0; round < WARMUP_ROUNDS; round += 1) {
    await postJava(`${javaBaseUrl}/match-batch`, bodyPayload);
  }

  const javaBatchRoundTripDurations: number[] = [];
  const javaBatchDecodeDurations: number[] = [];
  const javaBatchMatchDurations: number[] = [];
  let javaBatchResults = new Int32Array();
  for (let round = 0; round < MEASURED_ROUNDS; round += 1) {
    const startedAt = performance.now();
    const response = await postJava(`${javaBaseUrl}/match-batch`, bodyPayload);
    javaBatchRoundTripDurations.push(performance.now() - startedAt);
    javaBatchDecodeDurations.push(response.decodeMs);
    javaBatchMatchDurations.push(response.matchMs);
    javaBatchResults = response.results;
  }
  assertNoMatches(javaBatchResults, "Java batch");

  const wasmBytes = await Bun.file(rustWasm).arrayBuffer();
  const { instance } = await WebAssembly.instantiate(wasmBytes, {});
  const wasm = instance.exports as RegexWasmExports;

  const rustCompileStats = measureSync(
    () => callWasmWithInput(wasm, patternPayload, wasm.compile_rules),
    0,
    1,
  );
  if (
    callWasmWithInput(wasm, bodyPayload, wasm.load_bodies) !== COMMENT_COUNT
  ) {
    throw new Error("Rust/WASM failed to load benchmark comments");
  }

  const rustOutputPointer = wasm.alloc_results(COMMENT_COUNT);
  try {
    const rustCoreStats = measureSync(() => {
      const count = wasm.match_loaded(rustOutputPointer, COMMENT_COUNT);
      if (count !== COMMENT_COUNT) {
        throw new Error(`Rust/WASM returned ${count} comments`);
      }
    });
    const rustLoadedResults = readWasmResults(
      wasm,
      rustOutputPointer,
      COMMENT_COUNT,
    );
    assertNoMatches(rustLoadedResults, "Rust/WASM loaded");

    const rustBatchStats = measureSync(() => {
      const inputPointer = wasm.alloc(bodyPayload.byteLength);
      const outputPointer = wasm.alloc_results(COMMENT_COUNT);
      try {
        new Uint8Array(
          wasm.memory.buffer,
          inputPointer,
          bodyPayload.byteLength,
        ).set(bodyPayload);
        const count = wasm.match_batch(
          inputPointer,
          bodyPayload.byteLength,
          outputPointer,
          COMMENT_COUNT,
        );
        if (count !== COMMENT_COUNT) {
          throw new Error(`Rust/WASM batch returned ${count} comments`);
        }
        assertNoMatches(
          readWasmResults(wasm, outputPointer, COMMENT_COUNT),
          "Rust/WASM batch",
        );
      } finally {
        wasm.dealloc(inputPointer, bodyPayload.byteLength);
        wasm.dealloc_results(outputPointer, COMMENT_COUNT);
      }
    });

    console.log(
      JSON.stringify(
        {
          environment: {
            cpu: cpus()[0]?.model ?? "unknown",
            bun: Bun.version,
            java: "17",
            rust: "stable",
          },
          dataset: {
            comments: COMMENT_COUNT,
            regexRules: RULE_COUNT,
            scenario: "全正規表現が不一致になる現行ホットパスの最悪ケース",
            regexTestsPerRound: COMMENT_COUNT * RULE_COUNT,
          },
          serialization: {
            utf8BinaryEncode: serializationStats,
            payloadBytes: bodyPayload.byteLength,
          },
          typescript: {
            compileMs: round(javascriptCompileMs),
            regexLoop: javascriptCoreStats,
            requiredTokenIndexCompileMs: round(indexedCompileMs),
            requiredTokenIndexedLoop: indexedCoreStats,
          },
          javaExtensionPrototype: {
            compileCoreMs: round(javaCompile.matchMs),
            regexLoopCore: stats(javaCoreDurations),
            loadedHttpRoundTrip: stats(javaLoadedRoundTripDurations),
            batchDecodeCore: stats(javaBatchDecodeDurations),
            batchRegexLoopCore: stats(javaBatchMatchDurations),
            batchHttpRoundTrip: stats(javaBatchRoundTripDurations),
          },
          rustWasmPrototype: {
            wasmBytes: wasmBytes.byteLength,
            compileBoundary: rustCompileStats,
            regexLoopCore: rustCoreStats,
            batchBoundary: rustBatchStats,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    wasm.dealloc_results(rustOutputPointer, COMMENT_COUNT);
  }
} finally {
  javaProcess.kill();
  await javaProcess.exited;
}

function runBuild(command: string[]): void {
  const result = Bun.spawnSync({
    cmd: command,
    cwd: repositoryRoot,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (result.exitCode !== 0) {
    throw new Error(`Build failed: ${command.join(" ")}`);
  }
}

function encodeStringList(values: readonly string[]): Uint8Array {
  const encoder = new TextEncoder();
  const encoded = values.map((value) => encoder.encode(value));
  const byteLength =
    4 + encoded.reduce((total, value) => total + 4 + value.byteLength, 0);
  const payload = new Uint8Array(byteLength);
  const view = new DataView(payload.buffer);
  let offset = 0;
  view.setUint32(offset, encoded.length, true);
  offset += 4;
  for (const value of encoded) {
    view.setUint32(offset, value.byteLength, true);
    offset += 4;
    payload.set(value, offset);
    offset += value.byteLength;
  }
  return payload;
}

function matchWithJavascript(
  rules: readonly RegExp[],
  bodies: readonly string[],
  results: Int32Array,
): void {
  for (let bodyIndex = 0; bodyIndex < bodies.length; bodyIndex += 1) {
    let matchedRule = -1;
    for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
      const rule = rules[ruleIndex];
      rule.lastIndex = 0;
      if (rule.test(bodies[bodyIndex])) {
        rule.lastIndex = 0;
        matchedRule = ruleIndex;
        break;
      }
    }
    results[bodyIndex] = matchedRule;
  }
}

function matchWithRequiredTokenIndex(
  matcher: SubstringMatcher,
  rules: readonly RegExp[],
  bodies: readonly string[],
  results: Int32Array,
): void {
  for (let bodyIndex = 0; bodyIndex < bodies.length; bodyIndex += 1) {
    const body = bodies[bodyIndex];
    const candidates = Array.from(
      matcher.matchSet(body, body.toLocaleLowerCase()),
    ).toSorted((left, right) => left - right);
    let matchedRule = -1;
    for (const ruleIndex of candidates) {
      const rule = rules[ruleIndex];
      rule.lastIndex = 0;
      if (rule.test(body)) {
        rule.lastIndex = 0;
        matchedRule = ruleIndex;
        break;
      }
    }
    results[bodyIndex] = matchedRule;
  }
}

function measureSync(
  operation: () => void,
  warmupRounds = WARMUP_ROUNDS,
  measuredRounds = MEASURED_ROUNDS,
): DurationStats {
  for (let round = 0; round < warmupRounds; round += 1) {
    operation();
  }
  const durations: number[] = [];
  for (let round = 0; round < measuredRounds; round += 1) {
    const startedAt = performance.now();
    operation();
    durations.push(performance.now() - startedAt);
  }
  return stats(durations);
}

function stats(durations: readonly number[]): DurationStats {
  const sorted = durations.toSorted((left, right) => left - right);
  const average =
    durations.reduce((total, duration) => total + duration, 0) /
    durations.length;
  return {
    averageMs: round(average),
    medianMs: round(sorted[Math.floor(sorted.length / 2)]),
    minMs: round(sorted[0]),
    maxMs: round(sorted[sorted.length - 1]),
  };
}

function round(value: number): number {
  return Number(value.toFixed(3));
}

async function readPort(stream: ReadableStream<Uint8Array>): Promise<number> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  while (!buffered.includes("\n")) {
    const { value, done } = await reader.read();
    if (done) {
      throw new Error("Java benchmark server exited before reporting its port");
    }
    buffered += decoder.decode(value, { stream: true });
  }
  const port = Number(buffered.slice(0, buffered.indexOf("\n")).trim());
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(
      `Java benchmark server reported an invalid port: ${buffered}`,
    );
  }
  return port;
}

async function postJava(
  url: string,
  payload: Uint8Array,
): Promise<JavaMatchResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: AUTH_HEADERS,
    body: payload.slice().buffer,
  });
  if (!response.ok) {
    throw new Error(`Java benchmark request failed: ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decodeNanos = Number(view.getBigUint64(0, true));
  const matchNanos = Number(view.getBigUint64(8, true));
  const count = view.getUint32(16, true);
  const results = new Int32Array(count);
  for (let index = 0; index < count; index += 1) {
    results[index] = view.getInt32(20 + index * 4, true);
  }
  return {
    decodeMs: decodeNanos / 1_000_000,
    matchMs: matchNanos / 1_000_000,
    results,
  };
}

function callWasmWithInput(
  wasm: RegexWasmExports,
  payload: Uint8Array,
  operation: (pointer: number, length: number) => number,
): number {
  const pointer = wasm.alloc(payload.byteLength);
  try {
    new Uint8Array(wasm.memory.buffer, pointer, payload.byteLength).set(
      payload,
    );
    return operation(pointer, payload.byteLength);
  } finally {
    wasm.dealloc(pointer, payload.byteLength);
  }
}

function readWasmResults(
  wasm: RegexWasmExports,
  pointer: number,
  length: number,
): Int32Array {
  return new Int32Array(wasm.memory.buffer, pointer, length).slice();
}

function assertNoMatches(results: Int32Array, engine: string): void {
  for (const result of results) {
    if (result !== -1) {
      throw new Error(`${engine} unexpectedly matched rule ${result}`);
    }
  }
}
