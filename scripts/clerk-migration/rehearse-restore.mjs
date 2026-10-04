import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { buildSql } from "./plan.mjs";

const { values } = parseArgs({
  options: {
    archive: { type: "string" },
    plan: { type: "string" },
    database: { type: "string" },
    report: { type: "string" },
  },
});
for (const key of ["archive", "plan", "database", "report"])
  assert.ok(values[key], `Missing --${key}`);
const root = fileURLToPath(new URL("../../", import.meta.url));
const reportLocation = relative(root, resolve(values.report));
assert.ok(
  isAbsolute(values.report) &&
    (reportLocation.startsWith("../") || isAbsolute(reportLocation)),
  "Private report must be outside checkout",
);
const plan = JSON.parse(readFileSync(values.plan, "utf8"));
const original = JSON.parse(readFileSync(values.database, "utf8"));
assert.equal(plan.projectRef, original.projectRef);
const archive = readFileSync(values.archive);
const name = `friemi-clerk-rehearsal-${randomBytes(8).toString("hex")}`;
const image = "public.ecr.aws/supabase/postgres:17.6.1.167";
const docker = (args, input) =>
  spawnSync("docker", args, {
    input,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    timeout: 180000,
  });
const run = (args, input) => {
  const result = docker(args, input);
  // Restore errors can include real row data. Never echo them to the terminal.
  assert.equal(result.status, 0, `Isolated Docker ${args[0]} command failed`);
  return result.stdout.trim();
};
let created = false;
try {
  run([
    "run",
    "-d",
    "--name",
    name,
    "--network",
    "none",
    "-e",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    "--tmpfs",
    "/var/lib/postgresql/data:rw",
    image,
    "postgres",
  ]);
  created = true;
  let ready = false;
  // pg_isready also succeeds against the temporary bootstrap server, which
  // restarts during initialization. Wait for the final server before restoring.
  for (let attempt = 0; attempt < 120; attempt++) {
    const logs = docker(["logs", name]);
    if (
      (logs.stdout + logs.stderr).includes(
        "PostgreSQL init process complete",
      ) &&
      docker(["exec", name, "pg_isready", "-U", "supabase_admin"]).status === 0
    ) {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.ok(ready, "Isolated PostgreSQL did not initialize");
  console.log("Isolated PostgreSQL initialized; restoring archive");
  run(["exec", name, "createdb", "-U", "supabase_admin", "friemi_rehearsal"]);
  run(
    [
      "exec",
      "-i",
      name,
      "pg_restore",
      "-U",
      "supabase_admin",
      "-d",
      "friemi_rehearsal",
      "--exit-on-error",
      "--no-owner",
    ],
    archive,
  );
  const sql = (input) =>
    run(
      [
        "exec",
        "-i",
        name,
        "psql",
        "-X",
        "-q",
        "-A",
        "-t",
        "-U",
        "supabase_admin",
        "-d",
        "friemi_rehearsal",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      input,
    );
  const tables = JSON.parse(
    sql(
      "SELECT jsonb_agg(tablename ORDER BY tablename) FROM pg_tables WHERE schemaname='public';",
    ),
  );
  const businessState = () =>
    sql(
      tables
        .map((table) => {
          const identifier = `"${table.replaceAll('"', '""')}"`;
          const row =
            table === "UserProfile"
              ? "(to_jsonb(p)-'clerkUserId')"
              : "to_jsonb(p)";
          return `SELECT count(*), md5(coalesce(string_agg(md5(${row}::text), '' ORDER BY md5(${row}::text)), '')) FROM public.${identifier} p;`;
        })
        .join("\n"),
    );
  const identities = () =>
    JSON.parse(
      sql(`SELECT jsonb_agg(jsonb_build_object('id', id,
    'clerkUserId', "clerkUserId", 'status', status) ORDER BY id) FROM public."UserProfile";`),
    );
  const normalize = (profiles) =>
    profiles
      .map(({ id, clerkUserId, status }) => ({ id, clerkUserId, status }))
      .sort((a, b) => a.id.localeCompare(b.id));
  const before = identities();
  const businessBefore = businessState();
  assert.deepEqual(normalize(before), normalize(original.profiles));
  sql(buildSql(plan));
  assert.deepEqual(identities(), before);
  const commit = { commit: true, maintenanceConfirmed: true };
  sql(buildSql(plan, commit));
  const mappings = new Map(
    plan.mappings.map((mapping) => [mapping.profileId, mapping]),
  );
  assert.deepEqual(
    identities(),
    before.map((profile) => ({
      ...profile,
      clerkUserId: mappings.get(profile.id)?.newClerkId ?? profile.clerkUserId,
    })),
  );
  assert.equal(businessState(), businessBefore);
  sql(buildSql(plan, commit));
  assert.equal(businessState(), businessBefore);
  sql(buildSql(plan, { ...commit, rollback: true }));
  assert.deepEqual(identities(), before);
  assert.equal(businessState(), businessBefore);
  const report = {
    verifiedAt: new Date().toISOString(),
    image,
    archiveSha256: createHash("sha256").update(archive).digest("hex"),
    mappedProfiles: plan.mappings.length,
    preservedProfiles: plan.untouched.length,
    publicTables: tables.length,
    fullRestore: true,
    dryRunRolledBack: true,
    forwardExactBindings: true,
    allPublicBusinessDataUnchanged: true,
    idempotentRetry: true,
    reverseExactBindings: true,
    networkMode: "none",
    productionWrites: false,
  };
  writeFileSync(values.report, JSON.stringify(report, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  console.log(JSON.stringify(report));
} catch {
  console.error(
    "Isolated restore/rebinding rehearsal failed; production was not modified.",
  );
  process.exitCode = 1;
} finally {
  if (created) run(["rm", "-f", name]);
}
