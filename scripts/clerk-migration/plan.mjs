import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

const clerkId = /^user_[A-Za-z0-9]+$/;
const instanceId = /^ins_[A-Za-z0-9]+$/;

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function uniqueBy(items, key, label) {
  const result = new Map();
  for (const item of items) {
    check(
      typeof item[key] === "string" && item[key],
      `${label}: missing ${key}`,
    );
    check(!result.has(item[key]), `${label}: duplicate ${key}`);
    result.set(item[key], item);
  }
  return result;
}

function identifiers(user, key, valueKey, primaryKey) {
  const values = user[key] ?? [];
  check(Array.isArray(values), `Invalid ${key}`);
  return values
    .map((value) => ({
      value: value[valueKey],
      verified: value.verification?.status === "verified",
      primary: value.id === user[primaryKey],
    }))
    .sort((a, b) => String(a.value).localeCompare(String(b.value)));
}

export function sameIdentity(source, target) {
  for (const flag of [
    "password_enabled",
    "banned",
    "locked",
    "two_factor_enabled",
  ]) {
    check(
      typeof source[flag] === "boolean" && typeof target[flag] === "boolean",
      `Missing ${flag} state`,
    );
  }
  // Email similarity is never authority to attach an existing Friemi profile.
  for (const [key, value, primary] of [
    ["email_addresses", "email_address", "primary_email_address_id"],
    ["phone_numbers", "phone_number", "primary_phone_number_id"],
  ]) {
    check(
      JSON.stringify(identifiers(source, key, value, primary)) ===
        JSON.stringify(identifiers(target, key, value, primary)),
      `Imported ${key} or verification state differs`,
    );
  }
  check(
    (source.external_id ?? null) === (target.external_id ?? null),
    "Imported external_id differs; native Apple/Google login could create a duplicate",
  );
  check(
    (source.username ?? null) === (target.username ?? null),
    "Imported username differs",
  );
  check(
    Boolean(source.password_enabled) === Boolean(target.password_enabled),
    "Imported password availability differs",
  );
  check(
    Boolean(source.banned) === Boolean(target.banned),
    "Imported ban state differs",
  );
  check(
    Boolean(source.locked) === Boolean(target.locked),
    "Imported lock state differs",
  );
  check(
    !source.two_factor_enabled && !target.two_factor_enabled,
    "MFA requires a separately verified migration path",
  );
  for (const field of ["public_metadata", "unsafe_metadata"]) {
    check(
      isDeepStrictEqual(source[field] ?? {}, target[field] ?? {}),
      `Imported ${field} differs`,
    );
  }
  check(
    !source.private_metadata?.friemiMigration,
    "Reserved migration marker exists in source metadata",
  );
  const { friemiMigration: _marker, ...privateMetadata } =
    target.private_metadata ?? {};
  check(
    isDeepStrictEqual(source.private_metadata ?? {}, privateMetadata),
    "Imported private_metadata differs",
  );
}

export function profileFingerprint(profiles) {
  const rows = profiles
    .map(({ id, clerkUserId }) => ({ id, clerkUserId }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

export function buildPlan({
  source,
  target,
  database,
  expectedSource,
  expectedTarget,
  expectedProject,
  preservedHistory,
  expectedHistoricalInstance,
}) {
  check(
    instanceId.test(expectedSource) && instanceId.test(expectedTarget),
    "Explicit instance IDs required",
  );
  check(
    expectedSource !== expectedTarget,
    "Source and target must be different instances",
  );
  check(source.instanceId === expectedSource, "Source instance mismatch");
  check(target.instanceId === expectedTarget, "Target instance mismatch");
  check(
    /^[a-z]{20}$/.test(expectedProject) &&
      database.projectRef === expectedProject,
    "Database project mismatch",
  );
  for (const [name, data] of [
    ["source", source],
    ["target", target],
  ]) {
    check(Array.isArray(data.users), `${name}: users must be an array`);
    check(
      Number.isSafeInteger(data.totalCount) &&
        data.totalCount === data.users.length,
      `${name}: incomplete user export or pagination`,
    );
    for (const user of data.users)
      check(clerkId.test(user.id), `${name}: invalid Clerk ID`);
  }
  check(source.users.length > 0, "Empty source export");
  check(
    Array.isArray(database.profiles) && database.profiles.length > 0,
    "Empty profile snapshot",
  );
  const sourceById = uniqueBy(source.users, "id", "source");
  uniqueBy(target.users, "id", "target");
  uniqueBy(database.profiles, "id", "profiles");
  uniqueBy(database.profiles, "clerkUserId", "profiles");
  const preservedById = new Map();
  if (preservedHistory || expectedHistoricalInstance) {
    check(
      preservedHistory &&
        instanceId.test(expectedHistoricalInstance) &&
        ![expectedSource, expectedTarget].includes(
          expectedHistoricalInstance,
        ) &&
        preservedHistory.instanceId === expectedHistoricalInstance,
      "Historical instance mismatch",
    );
    check(
      preservedHistory.projectRef === expectedProject &&
        preservedHistory.sourceInstanceId === expectedSource &&
        preservedHistory.targetInstanceId === expectedTarget,
      "Historical preservation scope mismatch",
    );
    check(
      Array.isArray(preservedHistory.users) &&
        Number.isSafeInteger(preservedHistory.totalCount) &&
        preservedHistory.totalCount === preservedHistory.users.length &&
        Array.isArray(preservedHistory.preservedProfiles) &&
        preservedHistory.preservedProfiles.length > 0,
      "Incomplete historical preservation evidence",
    );
    const historicalById = uniqueBy(preservedHistory.users, "id", "history");
    uniqueBy(preservedHistory.preservedProfiles, "id", "preserved profiles");
    uniqueBy(
      preservedHistory.preservedProfiles,
      "clerkUserId",
      "preserved profiles",
    );
    for (const row of preservedHistory.preservedProfiles) {
      const profile = database.profiles.find((p) => p.id === row.id);
      check(
        profile &&
          profile.clerkUserId === row.clerkUserId &&
          profile.status === row.status &&
          row.status !== "DELETED" &&
          clerkId.test(row.clerkUserId) &&
          historicalById.has(row.clerkUserId) &&
          !sourceById.has(row.clerkUserId) &&
          !target.users.some((u) => u.id === row.clerkUserId),
        "Historical profile preservation evidence mismatch",
      );
      preservedById.set(row.id, row);
    }
  }
  const importedBySource = new Map();
  for (const user of target.users) {
    check(!sourceById.has(user.id), "Source/target user IDs overlap");
    const marker = user.private_metadata?.friemiMigration;
    if (!marker) continue;
    check(
      marker.sourceInstanceId === expectedSource &&
        marker.targetInstanceId === expectedTarget,
      "Import marker instance mismatch",
    );
    check(
      sourceById.has(marker.sourceUserId),
      "Import marker references an unknown source user",
    );
    check(
      !importedBySource.has(marker.sourceUserId),
      "Multiple target accounts map to one source account",
    );
    sameIdentity(sourceById.get(marker.sourceUserId), user);
    importedBySource.set(marker.sourceUserId, user);
  }
  const profileByClerkId = new Map(
    database.profiles.map((profile) => [profile.clerkUserId, profile]),
  );
  const mappings = [];
  const blockers = [];
  const untouched = [];
  for (const profile of database.profiles) {
    check(typeof profile.status === "string", "Profile status is missing");
    const sourceUser = sourceById.get(profile.clerkUserId);
    if (!sourceUser) {
      if (preservedById.has(profile.id)) {
        untouched.push({
          profileId: profile.id,
          clerkUserId: profile.clerkUserId,
          status: profile.status,
          historicalInstanceId: expectedHistoricalInstance,
          reason: "verified_historical_account_preserved",
        });
      } else if (
        clerkId.test(profile.clerkUserId) &&
        profile.status !== "DELETED"
      ) {
        blockers.push({
          profileId: profile.id,
          reason: "active_profile_missing_from_source",
        });
      } else {
        untouched.push({
          profileId: profile.id,
          reason: "not_an_active_source_account",
        });
      }
      continue;
    }
    if (profile.status === "DELETED") {
      untouched.push({ profileId: profile.id, reason: "deleted_profile" });
      continue;
    }
    const targetUser = importedBySource.get(sourceUser.id);
    if (!targetUser) {
      blockers.push({
        profileId: profile.id,
        reason: "no_verified_target_mapping",
      });
      continue;
    }
    check(
      !profileByClerkId.has(targetUser.id),
      "Target ID already belongs to a database profile",
    );
    mappings.push({
      profileId: profile.id,
      oldClerkId: sourceUser.id,
      newClerkId: targetUser.id,
    });
  }
  // Accounts without business profiles still need migration; never silently omit them.
  for (const user of source.users) {
    if (!profileByClerkId.has(user.id) && !importedBySource.has(user.id)) {
      blockers.push({
        sourceUserId: user.id,
        reason: "source_account_missing_from_target",
      });
    }
  }
  return {
    version: 1,
    sourceInstanceId: expectedSource,
    targetInstanceId: expectedTarget,
    projectRef: expectedProject,
    sourceCount: source.users.length,
    targetCount: target.users.length,
    profileCount: database.profiles.length,
    profileFingerprint: profileFingerprint(database.profiles),
    ...(preservedHistory
      ? {
          historicalEvidenceSha256: createHash("sha256")
            .update(JSON.stringify(preservedHistory))
            .digest("hex"),
        }
      : {}),
    mappings,
    blockers,
    untouched,
  };
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function buildSql(
  plan,
  { rollback = false, commit = false, maintenanceConfirmed = false } = {},
) {
  check(
    plan.version === 1 && /^[a-z]{20}$/.test(plan.projectRef),
    "Invalid migration plan",
  );
  check(
    Array.isArray(plan.blockers) && plan.blockers.length === 0,
    "Resolve all blockers before generating SQL",
  );
  check(
    Number.isSafeInteger(plan.profileCount) && plan.profileCount > 0,
    "Invalid profile count",
  );
  check(
    Array.isArray(plan.mappings) && plan.mappings.length > 0,
    "No verified mappings",
  );
  check(
    !commit || maintenanceConfirmed,
    "Committing requires a confirmed maintenance window",
  );
  uniqueBy(plan.mappings, "profileId", "mappings");
  uniqueBy(plan.mappings, "oldClerkId", "mappings");
  uniqueBy(plan.mappings, "newClerkId", "mappings");
  const oldIds = new Set(plan.mappings.map((row) => row.oldClerkId));
  for (const row of plan.mappings) {
    check(
      clerkId.test(row.oldClerkId) && clerkId.test(row.newClerkId),
      "Invalid mapping Clerk ID",
    );
    check(!oldIds.has(row.newClerkId), "Source/target IDs overlap");
  }
  const values = plan.mappings
    .map(
      (row) =>
        `(${[
          row.profileId,
          rollback ? row.newClerkId : row.oldClerkId,
          rollback ? row.oldClerkId : row.newClerkId,
        ]
          .map(sqlString)
          .join(", ")})`,
    )
    .join(",\n");
  return `-- Friemi Clerk migration: ${rollback ? "ROLLBACK" : "FORWARD"}
-- Expected Supabase project: ${plan.projectRef}; verify the SQL Editor project before running.
-- Stop old/new login writes and Clerk webhooks, drain in-flight requests first.
-- Profile IDs and all business references remain unchanged.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
LOCK TABLE public."UserProfile" IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE friemi_clerk_mapping (
  profile_id text PRIMARY KEY,
  old_id text UNIQUE NOT NULL,
  new_id text UNIQUE NOT NULL
) ON COMMIT DROP;
INSERT INTO friemi_clerk_mapping VALUES
${values};
DO $migration$
BEGIN
  IF (SELECT count(*) FROM public."UserProfile") <> ${plan.profileCount} THEN
    RAISE EXCEPTION 'Profile count changed. Take a fresh snapshot; do not force migration.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM friemi_clerk_mapping m
    LEFT JOIN public."UserProfile" p ON p.id = m.profile_id
    WHERE p.id IS NULL OR p."clerkUserId" NOT IN (m.old_id, m.new_id)
      OR p.status::text = 'DELETED'
  ) THEN
    RAISE EXCEPTION 'Mapping no longer matches the database, or a profile was deleted.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM friemi_clerk_mapping m JOIN public."UserProfile" p
      ON p."clerkUserId" IN (m.old_id, m.new_id) AND p.id <> m.profile_id
  ) THEN
    RAISE EXCEPTION 'Identity collision. Never merge or delete profiles automatically.';
  END IF;
END
$migration$;
UPDATE public."UserProfile" p SET "clerkUserId" = m.new_id
FROM friemi_clerk_mapping m
WHERE p.id = m.profile_id AND p."clerkUserId" = m.old_id;
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM friemi_clerk_mapping m LEFT JOIN public."UserProfile" p
      ON p.id = m.profile_id AND p."clerkUserId" = m.new_id
    WHERE p.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Post-migration identity verification failed.';
  END IF;
END
$migration$;
SELECT count(*) AS verified_profile_bindings FROM friemi_clerk_mapping m
JOIN public."UserProfile" p ON p.id = m.profile_id AND p."clerkUserId" = m.new_id;
${commit ? "COMMIT" : "ROLLBACK"};
`;
}
