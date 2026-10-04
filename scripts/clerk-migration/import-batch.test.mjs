import assert from "node:assert/strict";
import test from "node:test";
import { buildImportBatch } from "./import-batch.mjs";

function fixture() {
  return {
    expectedSource: "ins_source",
    expectedTarget: "ins_target",
    source: {
      instanceId: "ins_source",
      totalCount: 1,
      users: [
        {
          id: "user_original",
          email_addresses: [
            {
              id: "email_primary",
              email_address: "test@example.test",
              verification: { status: "verified" },
            },
          ],
          primary_email_address_id: "email_primary",
          phone_numbers: [],
          web3_wallets: [],
          passkeys: [],
          saml_accounts: [],
          enterprise_accounts: [],
          first_name: "Test",
          last_name: null,
          username: null,
          external_id: "apple:originalsubject",
          public_metadata: { role: "admin" },
          private_metadata: { legacy: { preserved: true } },
          unsafe_metadata: { locale: "fr-FR" },
          password_enabled: true,
          banned: false,
          locked: false,
          two_factor_enabled: false,
          totp_enabled: false,
          backup_code_enabled: false,
          requires_password_reset: false,
          deprovisioned: false,
          created_at: 1700000000000,
          has_image: true,
          image_url: "https://img.clerk.com/test-avatar",
        },
      ],
    },
    csvRows: [
      {
        id: "user_original",
        first_name: "Test",
        last_name: "",
        username: "",
        primary_email_address: "test@example.test",
        verified_email_addresses: "test@example.test",
        unverified_email_addresses: "",
        primary_phone_number: "",
        verified_phone_numbers: "",
        unverified_phone_numbers: "",
        totp_secret: "",
        password_digest: "$2b$12$" + "a".repeat(53),
        password_hasher: "bcrypt",
      },
    ],
  };
}

test("preserves source credentials, native identity and metadata without mutation", () => {
  const input = fixture();
  const before = structuredClone(input);
  const batch = buildImportBatch(input);
  const { payload, avatarUrl } = batch.users[0];
  assert.equal(payload.password_digest, input.csvRows[0].password_digest);
  assert.equal(payload.external_id, "apple:originalsubject");
  assert.deepEqual(payload.public_metadata, { role: "admin" });
  assert.deepEqual(payload.private_metadata.legacy, { preserved: true });
  assert.deepEqual(payload.private_metadata.friemiMigration, {
    sourceInstanceId: "ins_source",
    targetInstanceId: "ins_target",
    sourceUserId: "user_original",
  });
  assert.equal(avatarUrl, input.source.users[0].image_url);
  assert.deepEqual(input, before);
  assert.deepEqual(batch.summary, {
    users: 1,
    passwords: 1,
    externalIds: 1,
    avatars: 1,
  });
});

test("passwordless users stay passwordless", () => {
  const input = fixture();
  input.source.users[0].password_enabled = false;
  input.csvRows[0].password_digest = "";
  input.csvRows[0].password_hasher = "";
  const payload = buildImportBatch(input).users[0].payload;
  assert.equal(payload.skip_password_requirement, true);
  assert.equal(payload.password_digest, undefined);
});

test("fresh API display names take precedence over the older password CSV", () => {
  const input = fixture();
  input.source.users[0].first_name = "Updated";
  input.source.users[0].last_name = "Name";
  const payload = buildImportBatch(input).users[0].payload;
  assert.equal(payload.first_name, "Updated");
  assert.equal(payload.last_name, "Name");
  assert.equal(payload.password_digest, input.csvRows[0].password_digest);
});

for (const [name, mutate] of [
  ["wrong source", (i) => (i.expectedSource = "ins_other")],
  ["same instance", (i) => (i.expectedTarget = i.expectedSource)],
  ["partial source", (i) => (i.source.totalCount = 2)],
  ["partial CSV", (i) => (i.csvRows = [])],
  ["different CSV user", (i) => (i.csvRows[0].id = "user_other")],
  [
    "duplicate source",
    (i) => {
      i.source.users.push(i.source.users[0]);
      i.source.totalCount = 2;
    },
  ],
  ["duplicate CSV", (i) => i.csvRows.push(i.csvRows[0])],
  [
    "unverified email",
    (i) =>
      (i.source.users[0].email_addresses[0].verification.status = "unverified"),
  ],
  [
    "wrong primary",
    (i) => (i.source.users[0].primary_email_address_id = "email_other"),
  ],
  [
    "changed identity",
    (i) => (i.csvRows[0].primary_email_address = "other@example.test"),
  ],
  ["missing hash", (i) => (i.csvRows[0].password_digest = "")],
  ["different hasher", (i) => (i.csvRows[0].password_hasher = "md5")],
  [
    "inconsistent password",
    (i) => (i.source.users[0].password_enabled = false),
  ],
  ["changed login name", (i) => (i.csvRows[0].username = "Changed")],
  ["missing verification state", (i) => delete i.source.users[0].banned],
  ["ban", (i) => (i.source.users[0].banned = true)],
  ["lock", (i) => (i.source.users[0].locked = true)],
  ["MFA", (i) => (i.source.users[0].two_factor_enabled = true)],
  ["password reset", (i) => (i.source.users[0].requires_password_reset = true)],
  ["deprovisioned", (i) => (i.source.users[0].deprovisioned = true)],
  ["passkey", (i) => i.source.users[0].passkeys.push({ id: "passkey" })],
  [
    "phone",
    (i) =>
      i.source.users[0].phone_numbers.push({ phone_number: "+33123456789" }),
  ],
  [
    "unverified CSV email",
    (i) => (i.csvRows[0].unverified_email_addresses = "other@example.test"),
  ],
  [
    "reserved marker",
    (i) => (i.source.users[0].private_metadata.friemiMigration = {}),
  ],
  ["metadata array", (i) => (i.source.users[0].private_metadata = [])],
  [
    "untrusted image",
    (i) => (i.source.users[0].image_url = "https://example.test/image"),
  ],
]) {
  test(`refuses ${name}`, () => {
    const input = fixture();
    mutate(input);
    assert.throws(() => buildImportBatch(input));
  });
}
