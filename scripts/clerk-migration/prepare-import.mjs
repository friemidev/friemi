import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { buildImportBatch } from "./import-batch.mjs";

try {
  const { values } = parseArgs({
    options: Object.fromEntries(
      ["source", "csv", "source-instance", "target-instance", "output"].map(
        (key) => [key, { type: "string" }],
      ),
    ),
  });
  for (const key of [
    "source",
    "csv",
    "source-instance",
    "target-instance",
    "output",
  ]) {
    if (!values[key]) throw new Error(`Missing --${key}`);
  }
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const output = resolve(values.output);
  const location = relative(root, output);
  if (
    !isAbsolute(values.output) ||
    (!location.startsWith("../") && !isAbsolute(location))
  ) {
    throw new Error(
      "Output must be an absolute directory outside the checkout",
    );
  }
  // Use the standard CSV parser so quotes, commas and multiline names stay intact.
  const parsed = spawnSync(
    "python3",
    [
      "-c",
      "import csv,io,json,sys; print(json.dumps(list(csv.DictReader(io.StringIO(sys.stdin.read()), strict=True))))",
    ],
    {
      input: await readFile(values.csv, "utf8"),
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      timeout: 30000,
    },
  );
  if (parsed.status !== 0)
    throw new Error("CSV parsing failed; python3 required");
  const batch = buildImportBatch({
    source: JSON.parse(await readFile(values.source, "utf8")),
    csvRows: JSON.parse(parsed.stdout),
    expectedSource: values["source-instance"],
    expectedTarget: values["target-instance"],
  });
  process.umask(0o077);
  await mkdir(output, { recursive: false, mode: 0o700 });
  await writeFile(
    resolve(output, "import-batch.json"),
    `${JSON.stringify(batch, null, 2)}\n`,
    { flag: "wx", mode: 0o600 },
  );
  console.log(JSON.stringify({ ...batch.summary, output, accountsCreated: 0 }));
} catch (error) {
  console.error(
    error instanceof SyntaxError ? "Invalid input encoding" : error.message,
  );
  process.exitCode = 1;
}
