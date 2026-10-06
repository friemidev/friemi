import assert from "node:assert/strict";
import test from "node:test";
import {
  androidAuthMaxAgeMs,
  getAndroidAccountPortalUrl,
  isAndroidAuthReturnPath,
  normalizeAndroidAuthTarget,
  readAndroidAuthAttempt,
} from "./androidAuthFlow";

test("Android login proof belongs to the initiating app and expires", () => {
  const attempt = {
    flow: "a".repeat(32),
    verifier: "b".repeat(43),
    target: "/zh-CN/profile",
    createdAt: 1000,
  };
  assert.deepEqual(
    readAndroidAuthAttempt(JSON.stringify(attempt), attempt.flow, 1001),
    attempt,
  );
  assert.equal(
    readAndroidAuthAttempt(JSON.stringify(attempt), "c".repeat(32), 1001),
    null,
  );
  assert.equal(
    readAndroidAuthAttempt(JSON.stringify(attempt), attempt.flow, 999),
    null,
  );
  assert.equal(
    readAndroidAuthAttempt(
      JSON.stringify(attempt),
      attempt.flow,
      1000 + androidAuthMaxAgeMs,
    ),
    null,
  );
  for (const raw of [
    null,
    "invalid",
    "null",
    "[]",
    "{}",
    JSON.stringify({ ...attempt, verifier: "bad" }),
    JSON.stringify({ ...attempt, createdAt: null }),
  ]) {
    assert.equal(readAndroidAuthAttempt(raw, attempt.flow, 1001), null);
  }
});

test("Android final target cannot leave the app or restart an auth callback", () => {
  assert.equal(
    normalizeAndroidAuthTarget("zh-CN", "/activities/abc?tab=join#comments"),
    "/zh-CN/activities/abc?tab=join#comments",
  );
  for (const target of [
    "https://evil.example",
    "//evil.example",
    "/sign-in",
    "/android-auth-browser?flow=bad",
    "/fr/android-auth-return",
    "/en/android-auth-complete",
  ]) {
    assert.equal(normalizeAndroidAuthTarget("zh-CN", target), "/zh-CN/home");
  }
  assert.equal(isAndroidAuthReturnPath("/fr/android-auth-return"), true);
  assert.equal(isAndroidAuthReturnPath("/en/android-auth-return/"), true);
  assert.equal(isAndroidAuthReturnPath("/en/android-auth-return-extra"), false);
});

test("Android launches the Account Portal in its own Clerk environment", () => {
  const key = (host: string, mode = "live") =>
    `pk_${mode}_${Buffer.from(`${host}$`).toString("base64")}`;
  assert.equal(
    getAndroidAccountPortalUrl(key("clerk.friemi.com"), "sign-in").href,
    "https://accounts.friemi.com/sign-in",
  );
  assert.equal(
    getAndroidAccountPortalUrl(
      key("example.clerk.accounts.dev", "test"),
      "sign-up",
    ).href,
    "https://example.accounts.dev/sign-up",
  );
  for (const invalid of [
    "",
    "sk_live_secret",
    key("https://clerk.friemi.com"),
    key("clerk.friemi.com@evil.example"),
    key("unknown.example"),
  ]) {
    assert.throws(() => getAndroidAccountPortalUrl(invalid, "sign-in"));
  }
});
