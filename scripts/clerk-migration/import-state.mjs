import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { sameIdentity } from "./plan.mjs";

export function assertImportedAccount(source, target, batch) {
  assert.match(target.id, /^user_[A-Za-z0-9]+$/);
  assert.notEqual(source.id, target.id);
  assert.deepEqual(target.private_metadata?.friemiMigration, {
    sourceInstanceId: batch.sourceInstanceId,
    sourceUserId: source.id,
    targetInstanceId: batch.targetInstanceId,
  });
  sameIdentity(source, target);
  for (const field of [
    "first_name",
    "last_name",
    "locale",
    "timezone",
    "created_at",
    "delete_self_enabled",
    "create_organization_enabled",
    "bypass_client_trust",
    "requires_password_reset",
    "deprovisioned",
    "legal_accepted_at",
  ]) {
    assert.deepEqual(
      target[field] ?? null,
      source[field] ?? null,
      `Imported ${field} differs`,
    );
  }
}

export function reconcileImport(source, batch, targetUsers) {
  assert.equal(batch.version, 1);
  assert.equal(batch.sourceInstanceId, source.instanceId);
  assert.match(batch.sourceInstanceId, /^ins_[A-Za-z0-9]+$/);
  assert.match(batch.targetInstanceId, /^ins_[A-Za-z0-9]+$/);
  assert.notEqual(batch.sourceInstanceId, batch.targetInstanceId);
  assert.equal(source.totalCount, source.users.length);
  assert.equal(source.users.length, batch.users.length);
  assert.ok(batch.users.length > 0);
  assert.equal(
    batch.sourceFingerprint,
    createHash("sha256").update(JSON.stringify(source.users)).digest("hex"),
  );
  const sources = new Map(source.users.map((user) => [user.id, user]));
  const jobs = new Map(batch.users.map((user) => [user.sourceUserId, user]));
  assert.equal(sources.size, source.users.length);
  assert.equal(jobs.size, batch.users.length);
  assert.deepEqual([...sources.keys()].sort(), [...jobs.keys()].sort());
  for (const job of jobs.values()) {
    const original = sources.get(job.sourceUserId);
    const payload = job.payload;
    assert.equal(original.email_addresses.length, 1);
    assert.equal(original.email_addresses[0].verification?.status, "verified");
    assert.deepEqual(payload.email_address, [
      original.email_addresses[0].email_address,
    ]);
    for (const field of [
      "first_name",
      "last_name",
      "username",
      "external_id",
      "locale",
      "timezone",
    ])
      assert.equal(payload[field] ?? null, original[field] ?? null);
    assert.equal(Date.parse(payload.created_at), original.created_at);
    assert.deepEqual(payload.public_metadata, original.public_metadata);
    assert.deepEqual(payload.unsafe_metadata, original.unsafe_metadata);
    assert.deepEqual(payload.private_metadata, {
      ...original.private_metadata,
      friemiMigration: {
        sourceInstanceId: batch.sourceInstanceId,
        sourceUserId: original.id,
        targetInstanceId: batch.targetInstanceId,
      },
    });
    if (original.password_enabled) {
      assert.equal(payload.password_hasher, "bcrypt");
      assert.match(
        payload.password_digest,
        /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/,
      );
      assert.equal(payload.skip_password_requirement, undefined);
    } else {
      assert.equal(payload.password_digest, undefined);
      assert.equal(payload.password_hasher, undefined);
      assert.equal(payload.skip_password_requirement, true);
    }
    const allowed = new Set([
      "email_address",
      "first_name",
      "last_name",
      "username",
      "external_id",
      "locale",
      "timezone",
      "created_at",
      "public_metadata",
      "private_metadata",
      "unsafe_metadata",
      "password_digest",
      "password_hasher",
      "skip_password_requirement",
    ]);
    assert.ok(
      Object.keys(payload).every((key) => allowed.has(key)),
      "Unreviewed create-user field",
    );
    assert.equal(job.avatarUrl, original.has_image ? original.image_url : null);
  }
  const imported = new Map();
  const targetIds = new Set();
  for (const target of targetUsers) {
    const sourceId = target.private_metadata?.friemiMigration?.sourceUserId;
    assert.ok(
      sources.has(sourceId),
      "Unmarked or unrelated target account; stop for reconciliation",
    );
    assert.ok(!imported.has(sourceId), "Duplicate source marker in target");
    assert.ok(!targetIds.has(target.id), "Duplicate target user ID");
    assertImportedAccount(sources.get(sourceId), target, batch);
    imported.set(sourceId, target);
    targetIds.add(target.id);
  }
  return { sources, imported };
}

export function assertSourceUnchanged(source, current) {
  assert.equal(
    current.length,
    source.users.length,
    "Source account count changed",
  );
  const currentById = new Map(current.map((user) => [user.id, user]));
  assert.equal(currentById.size, current.length);
  for (const original of source.users) {
    const now = currentById.get(original.id);
    assert.ok(now, "Source account set changed");
    for (const field of [
      "email_addresses",
      "phone_numbers",
      "external_id",
      "external_accounts",
      "username",
      "first_name",
      "last_name",
      "public_metadata",
      "private_metadata",
      "unsafe_metadata",
      "password_enabled",
      "password_last_updated_at",
      "primary_email_address_id",
      "primary_phone_number_id",
      "created_at",
      "banned",
      "locked",
      "two_factor_enabled",
      "totp_enabled",
      "backup_code_enabled",
      "passkeys",
      "web3_wallets",
      "saml_accounts",
      "enterprise_accounts",
      "delete_self_enabled",
      "create_organization_enabled",
      "bypass_client_trust",
      "requires_password_reset",
      "deprovisioned",
      "legal_accepted_at",
      "image_url",
      "has_image",
      "locale",
      "timezone",
    ]) {
      assert.deepEqual(
        now[field],
        original[field],
        `Source ${field} changed; refresh exports`,
      );
    }
  }
}
