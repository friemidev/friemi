import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReferralLink,
  captureReferralCodeFromRequest,
  normalizeReferralCode,
} from "./referrals";

test("referral code normalization accepts only Friemi friend codes", () => {
  assert.equal(normalizeReferralCode("123456"), "123456");
  assert.equal(normalizeReferralCode("@123456"), "123456");
  assert.equal(normalizeReferralCode("abc123"), null);
  assert.equal(normalizeReferralCode("12345"), null);
});

test("referral capture reads raw codes and URLs", () => {
  assert.equal(captureReferralCodeFromRequest("123456"), "123456");
  assert.equal(
    captureReferralCodeFromRequest(
      "https://friemi.com/zh-CN/sign-up?ref=654321",
    ),
    "654321",
  );
  assert.equal(
    captureReferralCodeFromRequest("/zh-CN/sign-up?ref=135790"),
    "135790",
  );
  assert.equal(
    captureReferralCodeFromRequest(
      "https://friemi.com/zh-CN/friends?friendCode=777888",
    ),
    "777888",
  );
});

test("referral link builds a localized sign-up URL", () => {
  const previousBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "https://www.friemi.com/";

  assert.equal(
    buildReferralLink("zh-CN", "123456"),
    "https://www.friemi.com/zh-CN/sign-up?ref=123456",
  );
  assert.equal(buildReferralLink("zh-CN", "bad"), null);

  if (previousBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = previousBaseUrl;
  }
});
