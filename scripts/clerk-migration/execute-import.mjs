import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  appendFile,
  mkdir,
  open,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, parseEnv } from "node:util";
import {
  assertImportedAccount,
  assertSourceUnchanged,
  reconcileImport,
} from "./import-state.mjs";

let lock;
let lockPath;
try {
  process.umask(0o077);
  const { values } = parseArgs({
    options: {
      batch: { type: "string" },
      source: { type: "string" },
      "source-env": { type: "string" },
      "target-env": { type: "string" },
      output: { type: "string" },
      limit: { type: "string", default: "1" },
      apply: { type: "boolean", default: false },
      "webhooks-confirmed-empty": { type: "boolean", default: false },
    },
  });
  for (const key of ["batch", "source", "source-env", "target-env", "output"])
    assert.ok(values[key], `Missing --${key}`);
  const limit = Number(values.limit);
  assert.ok(
    Number.isSafeInteger(limit) && limit > 0 && limit <= 100,
    "Limit must be 1-100",
  );
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const output = resolve(values.output);
  const location = relative(root, output);
  assert.ok(
    isAbsolute(values.output) &&
      (location.startsWith("../") || isAbsolute(location)),
    "Private output must be outside checkout",
  );
  const batchBytes = await readFile(values.batch);
  const batch = JSON.parse(batchBytes);
  const source = JSON.parse(await readFile(values.source, "utf8"));
  const sourceEnv = parseEnv(await readFile(values["source-env"], "utf8"));
  const targetEnv = parseEnv(await readFile(values["target-env"], "utf8"));
  assert.ok(sourceEnv.CLERK_SECRET_KEY?.startsWith("sk_test_"));
  assert.ok(targetEnv.CLERK_SECRET_KEY?.startsWith("sk_live_"));
  assert.ok(
    !values.apply || values["webhooks-confirmed-empty"],
    "Confirm target webhooks empty before import",
  );
  const request = async (key, path, method = "GET", body) => {
    const headers = { Authorization: `Bearer ${key}` };
    if (body && !(body instanceof FormData))
      headers["Content-Type"] = "application/json";
    const response = await fetch(`https://api.clerk.com/v1${path}`, {
      method,
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(30000),
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => ({}));
      const codes = (failure.errors ?? [])
        .map((e) => e.code)
        .filter((c) => typeof c === "string" && /^[a-z_]+$/.test(c));
      throw new Error(
        `Clerk ${method} HTTP ${response.status}; codes: ${codes.join(",")}; no automatic write retry`,
      );
    }
    return response.json();
  };
  const allUsers = async (key) => {
    const before = await request(key, "/users/count");
    const users = [];
    for (let offset = 0; offset < before.total_count; offset += 100) {
      const page = await request(
        key,
        `/users?limit=100&offset=${offset}&order_by=%2Bcreated_at`,
      );
      assert.ok(Array.isArray(page));
      users.push(...page);
    }
    const after = await request(key, "/users/count");
    assert.equal(
      users.length,
      before.total_count,
      "Incomplete user pagination",
    );
    assert.equal(
      users.length,
      after.total_count,
      "Concurrent account creation; stop",
    );
    return users;
  };
  const sourceInstance = await request(sourceEnv.CLERK_SECRET_KEY, "/instance");
  const targetInstance = await request(targetEnv.CLERK_SECRET_KEY, "/instance");
  assert.equal(sourceInstance.id, batch.sourceInstanceId);
  assert.equal(sourceInstance.environment_type, "development");
  assert.equal(targetInstance.id, batch.targetInstanceId);
  assert.equal(targetInstance.environment_type, "production");
  assertSourceUnchanged(source, await allUsers(sourceEnv.CLERK_SECRET_KEY));
  const existing = await allUsers(targetEnv.CLERK_SECRET_KEY);
  const { sources, imported } = reconcileImport(source, batch, existing);
  console.log(
    JSON.stringify({
      mode: values.apply ? "apply" : "dry-run",
      sourceUsers: sources.size,
      alreadyImported: imported.size,
      pending: sources.size - imported.size,
      maxAccountsThisRun: limit,
    }),
  );
  if (values.apply) {
    try {
      await mkdir(output, { mode: 0o700 });
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
    lockPath = resolve(output, "import.lock");
    lock = await open(lockPath, "wx", 0o600);
    await lock.writeFile(String(process.pid));
    const manifest = JSON.stringify({
      sourceInstanceId: batch.sourceInstanceId,
      targetInstanceId: batch.targetInstanceId,
      batchSha256: createHash("sha256").update(batchBytes).digest("hex"),
    });
    const manifestPath = resolve(output, "manifest.json");
    try {
      await writeFile(manifestPath, manifest, { flag: "wx", mode: 0o600 });
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      assert.equal(
        await readFile(manifestPath, "utf8"),
        manifest,
        "Saved import batch differs",
      );
    }
    const record = async (sourceUserId, targetUserId, phase) => {
      await appendFile(
        resolve(output, "journal.jsonl"),
        JSON.stringify({
          sourceUserId,
          targetUserId,
          phase,
          at: new Date().toISOString(),
        }) + "\n",
        { mode: 0o600 },
      );
    };
    let processed = 0;
    for (const job of batch.users) {
      if (processed >= limit) break;
      let target = imported.get(job.sourceUserId);
      if (target && (!job.avatarUrl || target.has_image)) continue;
      if (!target) {
        target = await request(
          targetEnv.CLERK_SECRET_KEY,
          "/users",
          "POST",
          job.payload,
        );
        await record(job.sourceUserId, target.id, "created");
        assertImportedAccount(sources.get(job.sourceUserId), target, batch);
        imported.set(job.sourceUserId, target);
      }
      if (job.avatarUrl && !target.has_image) {
        const url = new URL(job.avatarUrl);
        assert.ok(
          url.protocol === "https:" &&
            url.hostname === "img.clerk.com" &&
            !url.port &&
            !url.username &&
            !url.password,
          "Unapproved image origin",
        );
        const image = await fetch(url, {
          redirect: "error",
          signal: AbortSignal.timeout(20000),
        });
        assert.equal(image.status, 200, "Source avatar download failed");
        const type = image.headers.get("content-type")?.split(";")[0];
        assert.ok(
          /^image\/(jpeg|png|webp|gif)$/.test(type),
          "Unsupported source avatar type",
        );
        assert.ok(
          Number(image.headers.get("content-length") ?? 0) <= 8 * 1024 * 1024,
          "Source avatar too large",
        );
        const data = await image.arrayBuffer();
        assert.ok(
          data.byteLength > 0 && data.byteLength <= 8 * 1024 * 1024,
          "Invalid source avatar size",
        );
        const form = new FormData();
        form.set("file", new Blob([data], { type }), "avatar");
        target = await request(
          targetEnv.CLERK_SECRET_KEY,
          `/users/${target.id}/profile_image`,
          "POST",
          form,
        );
        assert.ok(target.has_image, "Avatar was not saved");
        assertImportedAccount(sources.get(job.sourceUserId), target, batch);
        imported.set(job.sourceUserId, target);
        await record(job.sourceUserId, target.id, "avatar_saved");
      }
      processed++;
      console.log(
        JSON.stringify({
          processed,
          importedAccounts: imported.size,
          total: batch.users.length,
        }),
      );
    }
    const finalUsers = await allUsers(targetEnv.CLERK_SECRET_KEY);
    reconcileImport(source, batch, finalUsers);
    assertSourceUnchanged(source, await allUsers(sourceEnv.CLERK_SECRET_KEY));
    const snapshot = {
      instanceId: batch.targetInstanceId,
      totalCount: finalUsers.length,
      capturedAt: new Date().toISOString(),
      users: finalUsers,
    };
    await writeFile(
      resolve(output, `target-users-${Date.now()}.json`),
      JSON.stringify(snapshot, null, 2) + "\n",
      { flag: "wx", mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        verifiedTargetUsers: finalUsers.length,
        allAccountsImported: finalUsers.length === batch.users.length,
        databaseModified: false,
        liveKeysSwitched: false,
      }),
    );
  }
} catch (error) {
  console.error(
    error instanceof assert.AssertionError
      ? "Import safety check failed; inspect private inputs, never force or email-merge"
      : error instanceof SyntaxError
        ? "Invalid private input"
        : error.message,
  );
  process.exitCode = 1;
} finally {
  if (lock) {
    await lock.close();
    await unlink(lockPath);
  }
}
