import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

async function collectTestFiles(dir, files) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectTestFiles(path, files);
    } else if (entry.name.endsWith(".test.ts")) {
      files.push(path);
    }
  }
}

const roots = process.argv.slice(2);
if (roots.length === 0) {
  console.error("Usage: node run-node-tests.mjs <dir> [dir...]");
  process.exit(1);
}

const files = [];
for (const root of roots) {
  await collectTestFiles(root, files);
}

if (files.length === 0) {
  console.error("No *.test.ts files found under:", roots.join(", "));
  process.exit(1);
}

files.sort();

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...files],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
