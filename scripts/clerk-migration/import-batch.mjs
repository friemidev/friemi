import { createHash } from "node:crypto";

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function indexUsers(users, label) {
  const index = new Map();
  for (const user of users) {
    check(/^user_[A-Za-z0-9]+$/.test(user.id), `${label}: invalid user ID`);
    check(!index.has(user.id), `${label}: duplicate user ID`);
    index.set(user.id, user);
  }
  return index;
}

// This deliberately supports the audited source's single verified email only.
// Other identifiers/factors require a migration path that preserves verification.
export function buildImportBatch({
  source,
  csvRows,
  expectedSource,
  expectedTarget,
}) {
  check(
    /^ins_[A-Za-z0-9]+$/.test(expectedSource) &&
      /^ins_[A-Za-z0-9]+$/.test(expectedTarget) &&
      expectedSource !== expectedTarget,
    "Distinct source and target instance IDs required",
  );
  check(source.instanceId === expectedSource, "Source instance mismatch");
  check(
    Array.isArray(source.users) &&
      source.users.length > 0 &&
      source.totalCount === source.users.length,
    "Incomplete source API export",
  );
  check(Array.isArray(csvRows), "CSV rows required");
  const sourceUsers = indexUsers(source.users, "Source");
  const credentials = indexUsers(csvRows, "CSV");
  check(
    sourceUsers.size === credentials.size &&
      [...credentials.keys()].every((id) => sourceUsers.has(id)),
    "CSV and source API user sets differ",
  );
  const emails = new Set();
  const externalIds = new Set();
  const usernames = new Set();
  const users = source.users.map((user) => {
    const row = credentials.get(user.id);
    for (const flag of [
      "password_enabled",
      "banned",
      "locked",
      "two_factor_enabled",
      "totp_enabled",
      "backup_code_enabled",
      "requires_password_reset",
      "deprovisioned",
    ]) {
      check(typeof user[flag] === "boolean", `Missing ${flag} state`);
      if (flag !== "password_enabled") {
        check(!user[flag], `${flag} requires a separate migration path`);
      }
    }
    for (const field of [
      "phone_numbers",
      "web3_wallets",
      "passkeys",
      "saml_accounts",
      "enterprise_accounts",
    ]) {
      check(
        Array.isArray(user[field]) && user[field].length === 0,
        `${field} requires a separate migration path`,
      );
    }
    check(
      Array.isArray(user.email_addresses) && user.email_addresses.length === 1,
      "Exactly one verified email is required by this import path",
    );
    const email = user.email_addresses[0];
    check(
      typeof email.email_address === "string" &&
        email.email_address.length > 0 &&
        email.verification?.status === "verified" &&
        email.id === user.primary_email_address_id,
      "Primary email verification is not confirmed",
    );
    check(
      row.primary_email_address === email.email_address &&
        row.verified_email_addresses === email.email_address,
      "CSV and API email identities differ",
    );
    for (const field of [
      "unverified_email_addresses",
      "primary_phone_number",
      "verified_phone_numbers",
      "unverified_phone_numbers",
      "totp_secret",
    ]) {
      check(row[field] === "", `CSV ${field} requires separate review`);
    }
    for (const field of ["first_name", "last_name", "username"]) {
      check(row[field] === (user[field] ?? ""), `CSV ${field} changed`);
    }
    const normalizedEmail = email.email_address.toLowerCase();
    check(!emails.has(normalizedEmail), "Duplicate email identity");
    emails.add(normalizedEmail);
    for (const [value, values, label] of [
      [user.external_id, externalIds, "external ID"],
      [user.username, usernames, "username"],
    ]) {
      if (value != null) {
        check(typeof value === "string" && value, `Invalid ${label}`);
        check(!values.has(value), `Duplicate ${label}`);
        values.add(value);
      }
    }
    for (const field of [
      "public_metadata",
      "private_metadata",
      "unsafe_metadata",
    ]) {
      check(
        user[field] != null &&
          typeof user[field] === "object" &&
          !Array.isArray(user[field]),
        `Invalid ${field}`,
      );
    }
    check(
      !Object.hasOwn(user.private_metadata, "friemiMigration"),
      "Reserved migration marker already exists",
    );
    check(
      Number.isSafeInteger(user.created_at) && user.created_at > 0,
      "Invalid source creation timestamp",
    );
    const payload = {
      email_address: [email.email_address],
      first_name: user.first_name ?? undefined,
      last_name: user.last_name ?? undefined,
      username: user.username ?? undefined,
      external_id: user.external_id ?? undefined,
      locale: user.locale ?? undefined,
      created_at: new Date(user.created_at).toISOString(),
      public_metadata: structuredClone(user.public_metadata),
      private_metadata: {
        ...structuredClone(user.private_metadata),
        friemiMigration: {
          sourceInstanceId: expectedSource,
          sourceUserId: user.id,
          targetInstanceId: expectedTarget,
        },
      },
      unsafe_metadata: structuredClone(user.unsafe_metadata),
    };
    if (user.password_enabled) {
      check(
        row.password_hasher === "bcrypt" &&
          /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(row.password_digest),
        "Missing or unsupported password digest",
      );
      payload.password_digest = row.password_digest;
      payload.password_hasher = row.password_hasher;
    } else {
      check(
        row.password_digest === "" && row.password_hasher === "",
        "CSV and API password states differ",
      );
      payload.skip_password_requirement = true;
    }
    let avatarUrl = null;
    if (user.has_image) {
      const url = new URL(user.image_url);
      check(
        url.protocol === "https:" &&
          url.hostname === "img.clerk.com" &&
          !url.username &&
          !url.password &&
          !url.port,
        "Source image requires manual origin review",
      );
      avatarUrl = url.href;
    }
    return { sourceUserId: user.id, payload, avatarUrl };
  });
  return {
    version: 1,
    sourceInstanceId: expectedSource,
    targetInstanceId: expectedTarget,
    sourceFingerprint: createHash("sha256")
      .update(JSON.stringify(source.users))
      .digest("hex"),
    summary: {
      users: users.length,
      passwords: users.filter((user) => user.payload.password_digest).length,
      externalIds: externalIds.size,
      avatars: users.filter((user) => user.avatarUrl).length,
    },
    users,
  };
}
