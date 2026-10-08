import assert from "node:assert/strict";
import test from "node:test";
import { buildImportBatch } from "./import-batch.mjs";
import {
  assertImportedAccount,
  assertSourceUnchanged,
  reconcileImport,
} from "./import-state.mjs";

function fixture() {
  const user = {
    id: "user_source",
    first_name: "Original",
    last_name: null,
    username: null,
    primary_email_address_id: "email_source",
    email_addresses: [
      {
        id: "email_source",
        email_address: "migration@example.test",
        verification: { status: "verified" },
      },
    ],
    phone_numbers: [],
    web3_wallets: [],
    passkeys: [],
    saml_accounts: [],
    enterprise_accounts: [],
    external_accounts: [],
    external_id: "google:original-subject",
    created_at: 1700000000000,
    public_metadata: { role: "admin" },
    private_metadata: { custom: true },
    unsafe_metadata: { language: "fr-FR" },
    password_enabled: false,
    banned: false,
    locked: false,
    two_factor_enabled: false,
    totp_enabled: false,
    backup_code_enabled: false,
    requires_password_reset: false,
    deprovisioned: false,
    has_image: false,
    locale: null,
    timezone: "Europe/Paris",
    delete_self_enabled: true,
    create_organization_enabled: true,
    bypass_client_trust: false,
    legal_accepted_at: null,
  };
  const source = { instanceId: "ins_source", totalCount: 1, users: [user] };
  const csvRows = [
    {
      id: user.id,
      first_name: "Original",
      last_name: "",
      username: "",
      primary_email_address: "migration@example.test",
      verified_email_addresses: "migration@example.test",
      unverified_email_addresses: "",
      primary_phone_number: "",
      verified_phone_numbers: "",
      unverified_phone_numbers: "",
      totp_secret: "",
      password_digest: "",
      password_hasher: "",
    },
  ];
  const batch = buildImportBatch({
    source,
    csvRows,
    expectedSource: "ins_source",
    expectedTarget: "ins_target",
  });
  const target = {
    ...structuredClone(user),
    id: "user_target",
    private_metadata: structuredClone(batch.users[0].payload.private_metadata),
  };
  return { source, batch, target };
}

test("fresh empty target yields jobs, exact marker supports interrupted import resumption", () => {
  const { source, batch, target } = fixture();
  assert.equal(reconcileImport(source, batch, []).imported.size, 0);
  assert.equal(
    reconcileImport(source, batch, [target]).imported.get("user_source").id,
    "user_target",
  );
});

test("same email without a private marker is never attached", () => {
  const { source, batch, target } = fixture();
  delete target.private_metadata.friemiMigration;
  assert.throws(() => reconcileImport(source, batch, [target]));
});

test("duplicate target markers stop resumption", () => {
  const { source, batch, target } = fixture();
  assert.throws(() =>
    reconcileImport(source, batch, [target, { ...target, id: "user_second" }]),
  );
});

for (const [name, mutate] of [
  [
    "wrong instance",
    (i) =>
      (i.target.private_metadata.friemiMigration.targetInstanceId =
        "ins_wrong"),
  ],
  ["changed external subject", (i) => (i.target.external_id = "google:other")],
  ["lost metadata", (i) => (i.target.public_metadata = {})],
  ["wrong creation date", (i) => i.target.created_at++],
  ["lost timezone", (i) => (i.target.timezone = null)],
  [
    "broader self-delete permission",
    (i) => (i.target.delete_self_enabled = false),
  ],
  ["lost password", (i) => (i.target.password_enabled = true)],
]) {
  test(`target audit rejects ${name}`, () => {
    const i = fixture();
    mutate(i);
    assert.throws(() =>
      assertImportedAccount(i.source.users[0], i.target, i.batch),
    );
  });
}

for (const [name, mutate] of [
  ["email", (p) => (p.email_address = ["other@example.test"])],
  ["external ID", (p) => (p.external_id = "apple:changed")],
  ["admin metadata", (p) => (p.public_metadata = {})],
  [
    "marker",
    (p) => (p.private_metadata.friemiMigration.sourceUserId = "user_other"),
  ],
  ["new unreviewed flag", (p) => (p.skip_password_checks = true)],
  ["password state", (p) => (p.password_digest = "unexpected")],
]) {
  test(`checks payload ${name} before any user is created`, () => {
    const { source, batch } = fixture();
    mutate(batch.users[0].payload);
    assert.throws(() => reconcileImport(source, batch, []));
  });
}

for (const [name, mutate] of [
  ["password change", (u) => (u.password_last_updated_at = 1700000000000)],
  [
    "email change",
    (u) => (u.email_addresses[0].email_address = "changed@example.test"),
  ],
  ["ban", (u) => (u.banned = true)],
  ["metadata change", (u) => (u.public_metadata.role = "user")],
  ["native subject change", (u) => (u.external_id = "google:new")],
]) {
  test(`stops on live source ${name}`, () => {
    const { source } = fixture();
    const current = structuredClone(source.users);
    mutate(current[0]);
    assert.throws(() => assertSourceUnchanged(source, current));
  });
}

test("activity timestamps alone do not require password re-export", () => {
  const { source } = fixture();
  const current = structuredClone(source.users);
  current[0].last_sign_in_at = Date.now();
  current[0].last_active_at = Date.now();
  assertSourceUnchanged(source, current);
});

test("stops on new source user", () => {
  const { source } = fixture();
  assert.throws(() =>
    assertSourceUnchanged(source, [
      ...source.users,
      { ...source.users[0], id: "user_new" },
    ]),
  );
});
