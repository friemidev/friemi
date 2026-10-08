import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { verifyAppleNativeProfile } from "./appleNativeAuth";
import {
  findOrCreateNativeOAuthUser,
  type NativeOAuthUsers,
} from "./nativeOAuthUser";

const audience = "com.friemi.app";
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const signingKey = {
  ...publicKey.export({ format: "jwk" }),
  kid: "test-apple-key",
};
const options = { audience, getSigningKeys: async () => [signingKey] };

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function token(
  claims: Record<string, unknown> = {},
  header: Record<string, unknown> = {},
) {
  const input = `${encode({ alg: "RS256", kid: signingKey.kid, ...header })}.${encode(
    {
      iss: "https://appleid.apple.com",
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 300,
      sub: "apple-subject",
      ...claims,
    },
  )}`;
  return `${input}.${sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url")}`;
}

function userStore(
  config: { linked?: boolean; emailMatch?: boolean; migrated?: boolean } = {},
) {
  const calls: { method: string; params: unknown }[] = [];
  const users: NativeOAuthUsers = {
    async getUserList(query) {
      calls.push({ method: "list", params: query });
      if (query.externalId && config.linked) {
        return {
          data: [{ id: "old-apple-user", externalId: "apple:apple-subject" }],
        };
      }
      if (query.emailAddress && config.emailMatch) {
        return {
          data: [
            {
              id: "existing-user",
              externalId: config.migrated ? "legacy-clerk-user" : null,
            },
          ],
        };
      }
      return { data: [] };
    },
    async updateUser(id, params) {
      calls.push({ method: "update", params: { id, ...params } });
      return { id, ...params };
    },
    async createUser(params) {
      calls.push({ method: "create", params });
      return { id: "new-user", externalId: params.externalId };
    },
  };
  return { calls, users };
}

async function signIn(
  identityToken: string,
  store = userStore(),
  email = "victim@example.com",
) {
  const request = {
    identityToken,
    email,
    firstName: "First",
    lastName: "Last",
  };
  const profile = await verifyAppleNativeProfile(request, options);
  return findOrCreateNativeOAuthUser(store.users, profile);
}

for (const [name, claims] of [
  ["missing email", {}],
  ["unverified email", { email: "victim@example.com", email_verified: false }],
  ["string false", { email: "victim@example.com", email_verified: "false" }],
  ["missing verification", { email: "victim@example.com" }],
  [
    "non-boolean verification",
    { email: "victim@example.com", email_verified: 1 },
  ],
  [
    "non-standard verification",
    { email: "victim@example.com", email_verified: "1" },
  ],
  ["empty email", { email: "", email_verified: true }],
  ["whitespace email", { email: "  ", email_verified: true }],
  ["non-string email", { email: ["victim@example.com"], email_verified: true }],
] as const) {
  test(`Apple ${name} never falls back to client email to link or create an account`, async () => {
    const store = userStore({ emailMatch: true });
    await assert.rejects(signIn(token(claims), store), /must share an email/);
    assert.deepEqual(store.calls, [
      {
        method: "list",
        params: { externalId: ["apple:apple-subject"], limit: 1 },
      },
    ]);
  });
}

test("an already-linked Apple subject can sign in without sharing email again", async () => {
  const store = userStore({ linked: true });
  const user = await signIn(token(), store);
  assert.equal(user.id, "old-apple-user");
  assert.equal(store.calls.length, 1);
});

for (const verified of [true, "true"]) {
  test(`signed Apple email (${verified === true ? "boolean" : "string"} verified) overrides client email`, async () => {
    const store = userStore({ emailMatch: true });
    const user = await signIn(
      token({ email: "owner@example.com", email_verified: verified }),
      store,
    );
    assert.equal(user.id, "existing-user");
    assert.deepEqual(store.calls, [
      {
        method: "list",
        params: { externalId: ["apple:apple-subject"], limit: 1 },
      },
      {
        method: "list",
        params: { emailAddress: ["owner@example.com"], limit: 1 },
      },
      {
        method: "update",
        params: { id: "existing-user", externalId: "apple:apple-subject" },
      },
    ]);
  });
}

test("a verified Apple relay email creates an account using only the signed address", async () => {
  const store = userStore();
  const email = "owner@privaterelay.appleid.com";
  const user = await signIn(token({ email, email_verified: true }), store);
  assert.equal(user.id, "new-user");
  assert.deepEqual(store.calls.at(-1), {
    method: "create",
    params: {
      emailAddress: [email],
      externalId: "apple:apple-subject",
      firstName: "First",
      lastName: "Last",
      skipLegalChecks: true,
      skipPasswordRequirement: true,
      unsafeMetadata: { nativeOAuthProvider: "apple" },
    },
  });
});

test("migration IDs remain unchanged when an Apple user matches by verified email", async () => {
  const store = userStore({ emailMatch: true, migrated: true });
  const user = await signIn(
    token({ email: "owner@example.com", email_verified: true }),
    store,
  );
  assert.deepEqual(user, {
    id: "existing-user",
    externalId: "legacy-clerk-user",
  });
  assert.equal(store.calls.length, 2);
  assert.ok(store.calls.every((call) => call.method === "list"));
});

for (const [name, claims, error] of [
  ["wrong issuer", { iss: "https://attacker.example" }, /issuer/],
  ["wrong audience", { aud: "another.app" }, /audience/],
  ["expired token", { exp: Math.floor(Date.now() / 1000) - 60 }, /expired/],
  ["missing expiry", { exp: undefined }, /expired/],
  ["string expiry", { exp: "9999999999" }, /expired/],
  ["non-numeric expiry", { exp: "never" }, /expired/],
  ["missing subject", { sub: undefined }, /subject/],
  ["empty subject", { sub: " " }, /subject/],
  ["non-string subject", { sub: 123 }, /subject/],
] as const) {
  test(`Apple rejects ${name} before any account access`, async () => {
    const store = userStore({ linked: true });
    await assert.rejects(signIn(token(claims), store), error);
    assert.deepEqual(store.calls, []);
  });
}

test("a modified Apple payload fails cryptographic signature verification", async () => {
  const [header, , signature] = token().split(".");
  const forgedPayload = encode({
    iss: "https://appleid.apple.com",
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 300,
    sub: "victim-subject",
    email: "victim@example.com",
    email_verified: true,
  });
  const store = userStore({ linked: true });
  await assert.rejects(
    signIn(`${header}.${forgedPayload}.${signature}`, store),
    /signature is invalid/,
  );
  assert.deepEqual(store.calls, []);
});

for (const [name, identityToken, error] of [
  ["missing token", "", /Missing Apple/],
  ["missing signature", "eyJ9.e30", /malformed/],
  ["extra segment", `${token()}.extra`, /malformed/],
  ["invalid encoding", "@@@.e30.abc", /malformed/],
  ["non-object header", `${encode(null)}.e30.abc`, /malformed/],
  [
    "invalid JSON",
    `${Buffer.from("{").toString("base64url")}.e30.abc`,
    /malformed/,
  ],
  [
    "unsupported algorithm",
    token({}, { alg: "HS256" }),
    /unsupported signature/,
  ],
  ["unknown key", token({}, { kid: "other-key" }), /signing key was not found/],
] as const) {
  test(`Apple rejects ${name} before any account access`, async () => {
    const store = userStore({ linked: true });
    await assert.rejects(signIn(identityToken, store), error);
    assert.deepEqual(store.calls, []);
  });
}

test("Google's existing verified profile follows the same account lookup path", async () => {
  const store = userStore({ emailMatch: true });
  const user = await findOrCreateNativeOAuthUser(store.users, {
    provider: "google",
    subject: "google-subject",
    email: "google-owner@example.com",
  });
  assert.equal(user.id, "existing-user");
  assert.deepEqual(store.calls, [
    {
      method: "list",
      params: { externalId: ["google:google-subject"], limit: 1 },
    },
    {
      method: "list",
      params: { emailAddress: ["google-owner@example.com"], limit: 1 },
    },
    {
      method: "update",
      params: { id: "existing-user", externalId: "google:google-subject" },
    },
  ]);
});
