import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const testFiles = [
  ...new Bun.Glob("tests/*.test.ts").scanSync({
    cwd: projectRoot,
    absolute: true,
    onlyFiles: true,
  }),
].sort();

if (testFiles.length === 0) {
  throw new Error("No unit test files were found");
}

const child = Bun.spawn([process.execPath, "test", ...testFiles], {
  cwd: projectRoot,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});
const exitCode = await child.exited;
process.exit(exitCode);
