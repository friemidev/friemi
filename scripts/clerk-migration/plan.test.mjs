import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPlan, buildSql, profileFingerprint } from "./plan.mjs";

function fixture() {
  const old = {
    id: "user_old1",
    external_id: "apple:subject1",
    username: null,
    password_enabled: true,
    banned: false,
    locked: false,
    two_factor_enabled: false,
    primary_email_address_id: "idn_old",
    primary_phone_number_id: null,
    email_addresses: [
      {
        id: "idn_old",
        email_address: "person@example.test",
        verification: { status: "verified" },
      },
    ],
    phone_numbers: [],
  };
  const target = structuredClone(old);
  target.id = "user_new1";
  target.primary_email_address_id = "idn_new";
  target.email_addresses[0].id = "idn_new";
  target.private_metadata = {
    friemiMigration: {
      sourceInstanceId: "ins_source",
      targetInstanceId: "ins_target",
      sourceUserId: old.id,
    },
  };
  return {
    source: { instanceId: "ins_source", totalCount: 1, users: [old] },
    target: { instanceId: "ins_target", totalCount: 1, users: [target] },
    database: {
      projectRef: "abcdefghijklmnopqrst",
      profiles: [{ id: "profile1", clerkUserId: old.id, status: "ACTIVE" }],
    },
    expectedSource: "ins_source",
    expectedTarget: "ins_target",
    expectedProject: "abcdefghijklmnopqrst",
  };
}

test("maps by private migration marker, retaining internal profile ID", () => {
  const plan = buildPlan(fixture());
  assert.equal(plan.blockers.length, 0);
  assert.deepEqual(plan.mappings, [
    { profileId: "profile1", oldClerkId: "user_old1", newClerkId: "user_new1" },
  ]);
  assert.ok(!JSON.stringify(plan).includes("person@example.test"));
  assert.ok(!JSON.stringify(plan).includes("apple:subject1"));
});

test("matching email alone does not authorize relinking", () => {
  const input = fixture();
  delete input.target.users[0].private_metadata;
  const plan = buildPlan(input);
  assert.equal(plan.mappings.length, 0);
  assert.equal(plan.blockers[0].reason, "no_verified_target_mapping");
  assert.throws(() => buildSql(plan), /blockers/);
});

for (const [name, mutate, message] of [
  [
    "wrong source",
    (i) => (i.source.instanceId = "ins_other"),
    /Source instance/,
  ],
  [
    "wrong target",
    (i) => (i.target.instanceId = "ins_other"),
    /Target instance/,
  ],
  [
    "wrong database",
    (i) => (i.database.projectRef = "wrong"),
    /Database project/,
  ],
  ["truncated export", (i) => (i.source.totalCount = 100), /incomplete/],
  [
    "duplicate source",
    (i) => {
      i.source.users.push(structuredClone(i.source.users[0]));
      i.source.totalCount++;
    },
    /duplicate/,
  ],
  [
    "duplicate import",
    (i) => {
      const other = structuredClone(i.target.users[0]);
      other.id = "user_other";
      i.target.users.push(other);
      i.target.totalCount++;
    },
    /Multiple target/,
  ],
  [
    "native subject lost",
    (i) => (i.target.users[0].external_id = "user_old1"),
    /external_id/,
  ],
  [
    "password omitted",
    (i) => (i.target.users[0].password_enabled = false),
    /password/,
  ],
  ["ban omitted", (i) => (i.target.users[0].banned = true), /ban state/],
  ["lock omitted", (i) => (i.target.users[0].locked = true), /lock state/],
  ["MFA account", (i) => (i.source.users[0].two_factor_enabled = true), /MFA/],
  [
    "target MFA added",
    (i) => (i.target.users[0].two_factor_enabled = true),
    /MFA/,
  ],
  [
    "omitted restrictions",
    (i) => delete i.target.users[0].banned,
    /Missing banned/,
  ],
  [
    "admin metadata lost",
    (i) => (i.source.users[0].public_metadata = { role: "admin" }),
    /public_metadata/,
  ],
  [
    "private metadata changed",
    (i) => (i.target.users[0].private_metadata.role = "admin"),
    /private_metadata/,
  ],
  [
    "unsafe metadata lost",
    (i) =>
      (i.source.users[0].unsafe_metadata = { nativeOAuthProvider: "apple" }),
    /unsafe_metadata/,
  ],
  [
    "verification promoted",
    (i) =>
      (i.source.users[0].email_addresses[0].verification.status = "unverified"),
    /verification/,
  ],
  [
    "primary email changed",
    (i) => (i.target.users[0].primary_email_address_id = null),
    /verification/,
  ],
  [
    "incorrect marker",
    (i) =>
      (i.target.users[0].private_metadata.friemiMigration.targetInstanceId =
        "ins_other"),
    /marker instance/,
  ],
  [
    "profile collision",
    (i) =>
      i.database.profiles.push({
        id: "profile2",
        clerkUserId: "user_new1",
        status: "ACTIVE",
      }),
    /already belongs/,
  ],
]) {
  test(`blocks ${name}`, () => {
    const input = fixture();
    mutate(input);
    assert.throws(() => buildPlan(input), message);
  });
}

test("deleted accounts remain deleted and are never automatically linked", () => {
  const input = fixture();
  input.database.profiles[0].status = "DELETED";
  const plan = buildPlan(input);
  assert.equal(plan.mappings.length, 0);
  assert.equal(plan.untouched[0].reason, "deleted_profile");
});

test("active profile missing from export blocks release", () => {
  const input = fixture();
  input.database.profiles.push({
    id: "profile2",
    clerkUserId: "user_missing",
    status: "ACTIVE",
  });
  assert.equal(
    buildPlan(input).blockers[0].reason,
    "active_profile_missing_from_source",
  );
});

function historicalFixture() {
  const input = fixture();
  const profile = {
    id: "legacy",
    clerkUserId: "user_legacy",
    status: "ACTIVE",
  };
  input.database.profiles.push(profile);
  input.expectedHistoricalInstance = "ins_historical";
  input.preservedHistory = {
    projectRef: input.expectedProject,
    sourceInstanceId: input.expectedSource,
    targetInstanceId: input.expectedTarget,
    instanceId: "ins_historical",
    totalCount: 1,
    users: [{ id: "user_legacy" }],
    preservedProfiles: [structuredClone(profile)],
  };
  return input;
}

test("explicit historical evidence preserves an exact existing binding", () => {
  const plan = buildPlan(historicalFixture());
  assert.equal(plan.blockers.length, 0);
  assert.equal(plan.mappings.length, 1);
  assert.deepEqual(plan.untouched, [
    {
      profileId: "legacy",
      clerkUserId: "user_legacy",
      status: "ACTIVE",
      historicalInstanceId: "ins_historical",
      reason: "verified_historical_account_preserved",
    },
  ]);
  assert.match(plan.historicalEvidenceSha256, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(buildSql(plan), /user_legacy/);
});

for (const [name, mutate] of [
  ["missing instance confirmation", (i) => delete i.expectedHistoricalInstance],
  ["missing evidence", (i) => delete i.preservedHistory],
  ["wrong project", (i) => (i.preservedHistory.projectRef = "different")],
  ["wrong source", (i) => (i.preservedHistory.sourceInstanceId = "ins_other")],
  ["wrong target", (i) => (i.preservedHistory.targetInstanceId = "ins_other")],
  [
    "wrong historical instance",
    (i) => (i.preservedHistory.instanceId = "ins_other"),
  ],
  ["partial history", (i) => i.preservedHistory.totalCount++],
  [
    "unknown historical identity",
    (i) => (i.preservedHistory.users[0].id = "user_unknown"),
  ],
  [
    "changed Clerk binding",
    (i) => (i.database.profiles[1].clerkUserId = "user_changed"),
  ],
  ["changed status", (i) => (i.database.profiles[1].status = "DELETED")],
  [
    "duplicate preservation",
    (i) =>
      i.preservedHistory.preservedProfiles.push(
        i.preservedHistory.preservedProfiles[0],
      ),
  ],
  [
    "current source exemption",
    (i) => {
      i.preservedHistory.preservedProfiles = [i.database.profiles[0]];
      i.preservedHistory.users[0].id = i.source.users[0].id;
    },
  ],
]) {
  test(`rejects historical preservation with ${name}`, () => {
    const input = historicalFixture();
    mutate(input);
    assert.throws(() => buildPlan(input));
  });
}

test("historical evidence is not a blanket exemption for other missing users", () => {
  const input = historicalFixture();
  input.database.profiles.push({
    id: "unknown",
    clerkUserId: "user_unknown",
    status: "ACTIVE",
  });
  assert.deepEqual(buildPlan(input).blockers, [
    { profileId: "unknown", reason: "active_profile_missing_from_source" },
  ]);
});

test("source user without a business profile cannot be silently dropped", () => {
  const input = fixture();
  const other = structuredClone(input.source.users[0]);
  other.id = "user_other";
  input.source.users.push(other);
  input.source.totalCount++;
  assert.equal(
    buildPlan(input).blockers[0].reason,
    "source_account_missing_from_target",
  );
});

test("fingerprint is stable across row ordering and detects identity changes", () => {
  const profiles = [
    { id: "a", clerkUserId: "user_a" },
    { id: "b", clerkUserId: "user_b" },
  ];
  assert.equal(
    profileFingerprint(profiles),
    profileFingerprint([...profiles].reverse()),
  );
  assert.notEqual(
    profileFingerprint(profiles),
    profileFingerprint([{ id: "a", clerkUserId: "user_changed" }]),
  );
});

test("SQL defaults to transaction rollback and only changes Clerk bindings", () => {
  const sql = buildSql(buildPlan(fixture()));
  assert.match(sql, /BEGIN;/);
  assert.match(
    sql,
    /LOCK TABLE public\."UserProfile" IN SHARE ROW EXCLUSIVE MODE/,
  );
  assert.match(sql, /SET "clerkUserId" = m\.new_id/);
  assert.match(sql, /ROLLBACK;\n$/);
  assert.doesNotMatch(
    sql,
    /(?:DELETE FROM|UPDATE.*SET (?:id|status)|password|email_address)/,
  );
  assert.match(sql, /p\."clerkUserId" NOT IN \(m\.old_id, m\.new_id\)/);
  assert.match(sql, /p\.status::text = 'DELETED'/);
});

test("commit SQL requires explicit maintenance confirmation", () => {
  const plan = buildPlan(fixture());
  assert.throws(() => buildSql(plan, { commit: true }), /maintenance/);
  assert.match(
    buildSql(plan, { commit: true, maintenanceConfirmed: true }),
    /COMMIT;\n$/,
  );
});

test("rollback SQL reverses only the verified bindings", () => {
  assert.match(
    buildSql(buildPlan(fixture()), { rollback: true }),
    /\('profile1', 'user_new1', 'user_old1'\)/,
  );
});

test("profile IDs are SQL escaped", () => {
  const input = fixture();
  input.database.profiles[0].id = "profile'quote";
  assert.match(buildSql(buildPlan(input)), /'profile''quote'/);
});

test("tampered plans with overlapping source and target IDs cannot generate SQL", () => {
  const plan = buildPlan(fixture());
  plan.mappings[0].newClerkId = "user_old1";
  assert.throws(() => buildSql(plan), /overlap/);
});
