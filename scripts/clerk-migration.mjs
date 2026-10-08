import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { buildPlan, buildSql } from "./clerk-migration/plan.mjs";

const { values } = parseArgs({
  options: {
    source: { type: "string" },
    target: { type: "string" },
    database: { type: "string" },
    "source-instance": { type: "string" },
    "target-instance": { type: "string" },
    "database-project": { type: "string" },
    "preserved-history": { type: "string" },
    "historical-instance": { type: "string" },
    output: { type: "string" },
    commit: { type: "boolean", default: false },
    "maintenance-confirmed": { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

if (values.help) {
  console.log(`Offline Clerk migration planner (no network or database writes).
Required: --source source.json --target target.json --database profiles.json
  --source-instance ins_... --target-instance ins_... --database-project projectref
  --output /absolute/private/directory
SQL defaults to ROLLBACK. --commit --maintenance-confirmed generates COMMIT SQL.
Optional: --preserved-history evidence.json --historical-instance ins_...
See docs/clerk-production-migration.md for export formats and release gates.`);
} else {
  try {
    for (const key of [
      "source",
      "target",
      "database",
      "source-instance",
      "target-instance",
      "database-project",
      "output",
    ]) {
      if (!values[key]) throw new Error(`Missing --${key}`);
    }
    const root = fileURLToPath(new URL("../", import.meta.url));
    const output = resolve(values.output);
    const relativeOutput = relative(root, output);
    if (
      !isAbsolute(values.output) ||
      (!relativeOutput.startsWith("../") && !isAbsolute(relativeOutput))
    ) {
      throw new Error(
        "Output must be an absolute directory outside this checkout",
      );
    }
    const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
    const plan = buildPlan({
      source: await readJson(values.source),
      target: await readJson(values.target),
      database: await readJson(values.database),
      expectedSource: values["source-instance"],
      expectedTarget: values["target-instance"],
      expectedProject: values["database-project"],
      preservedHistory: values["preserved-history"]
        ? await readJson(values["preserved-history"])
        : undefined,
      expectedHistoricalInstance: values["historical-instance"],
    });
    process.umask(0o077);
    await mkdir(output, { recursive: false, mode: 0o700 });
    const save = (name, data) =>
      writeFile(resolve(output, name), data, { flag: "wx", mode: 0o600 });
    await save("plan.json", `${JSON.stringify(plan, null, 2)}\n`);
    if (!plan.blockers.length) {
      const options = {
        commit: values.commit,
        maintenanceConfirmed: values["maintenance-confirmed"],
      };
      await save("forward.sql", buildSql(plan, options));
      await save(
        "rollback.sql",
        buildSql(plan, { ...options, rollback: true }),
      );
    }
    console.log(
      JSON.stringify(
        {
          sourceUsers: plan.sourceCount,
          targetUsers: plan.targetCount,
          profiles: plan.profileCount,
          mapped: plan.mappings.length,
          untouched: plan.untouched.length,
          blockers: plan.blockers.length,
          output,
          databaseModified: false,
        },
        null,
        2,
      ),
    );
    if (plan.blockers.length) process.exitCode = 2;
  } catch (error) {
    // SyntaxError can quote raw JSON containing secrets; do not echo input content.
    console.error(
      error instanceof SyntaxError ? "Invalid JSON input" : error.message,
    );
    process.exitCode = 1;
  }
}
