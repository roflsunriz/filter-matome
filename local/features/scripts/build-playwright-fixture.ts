import { dirname, resolve } from "node:path";

const outputPath = process.argv[2];
if (!outputPath) {
  throw new Error("Output path is required");
}

const absoluteOutput = resolve(outputPath);
const result = await Bun.build({
  entrypoints: [
    resolve(import.meta.dirname, "../tests/fixtures/mlink-controller-entry.ts"),
  ],
  outdir: dirname(absoluteOutput),
  target: "browser",
  format: "iife",
  splitting: false,
  minify: false,
  loader: { ".svg": "text" },
  naming: { entry: absoluteOutput.split(/[\\/]/).at(-1) ?? "controller.js" },
});

if (result.outputs.length !== 1) {
  throw new Error(`Unexpected fixture output count: ${result.outputs.length}`);
}
