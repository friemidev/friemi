import assert from "node:assert/strict";
import test from "node:test";
import {
  getAuthRedirectFallback,
  getSignInHref,
  getSignUpHref,
  normalizeAuthRedirectTarget,
} from "./auth-redirect";

test("normalizeAuthRedirectTarget preserves safe in-app path state", () => {
  assert.equal(
    normalizeAuthRedirectTarget(
      "zh-CN",
      "/activities/abc?tab=join#comments",
    ),
    "/zh-CN/activities/abc?tab=join#comments",
  );
  assert.equal(
    normalizeAuthRedirectTarget("en", "/fr/lobby?category=friends"),
    "/fr/lobby?category=friends",
  );
});

test("normalizeAuthRedirectTarget rejects external or malformed redirects", () => {
  assert.equal(
    normalizeAuthRedirectTarget("zh-CN", "https://evil.example/phish"),
    getAuthRedirectFallback("zh-CN"),
  );
  assert.equal(
    normalizeAuthRedirectTarget("zh-CN", "//evil.example/phish"),
    getAuthRedirectFallback("zh-CN"),
  );
  assert.equal(
    normalizeAuthRedirectTarget("zh-CN", "/activities/abc\u0000"),
    getAuthRedirectFallback("zh-CN"),
  );
});

test("normalizeAuthRedirectTarget avoids redirecting back to auth pages", () => {
  assert.equal(
    normalizeAuthRedirectTarget("zh-CN", "/zh-CN/sign-in?x=1"),
    getAuthRedirectFallback("zh-CN"),
  );
  assert.equal(
    normalizeAuthRedirectTarget("zh-CN", "/sign-up"),
    getAuthRedirectFallback("zh-CN"),
  );
});

test("auth links carry the normalized target through sign-in and sign-up", () => {
  assert.equal(
    getSignInHref("zh-CN", "/activities/abc?tab=join#comments"),
    "/zh-CN/sign-in?redirect_url=%2Fzh-CN%2Factivities%2Fabc%3Ftab%3Djoin%23comments",
  );
  assert.equal(
    getSignUpHref("en", "/lobby?status=open"),
    "/en/sign-up?redirect_url=%2Fen%2Flobby%3Fstatus%3Dopen",
  );
});
