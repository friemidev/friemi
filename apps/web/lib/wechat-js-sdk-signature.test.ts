import assert from "node:assert/strict";
import test from "node:test";
import {
  createWechatJsSdkSignature,
  normalizeWechatJsSdkUrl,
} from "./wechat-js-sdk-signature";

test("normalizeWechatJsSdkUrl keeps query strings and strips hash fragments", () => {
  assert.equal(
    normalizeWechatJsSdkUrl(
      "https://friemi.example/zh-CN/activities/a1?access=token#participants",
    ),
    "https://friemi.example/zh-CN/activities/a1?access=token",
  );
});

test("normalizeWechatJsSdkUrl rejects non-http urls", () => {
  assert.equal(normalizeWechatJsSdkUrl("javascript:alert(1)"), null);
  assert.equal(normalizeWechatJsSdkUrl(""), null);
});

test("createWechatJsSdkSignature follows WeChat JS-SDK source string order", () => {
  assert.equal(
    createWechatJsSdkSignature({
      jsapiTicket: "ticket_value",
      nonceStr: "nonce_value",
      timestamp: 1710000000,
      url: "https://friemi.example/zh-CN/activities/a1?access=token",
    }),
    "8332e152ebd0ac2e291f4e6fba717ba43b55bee2",
  );
});
