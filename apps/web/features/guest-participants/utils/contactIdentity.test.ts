import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeGuestEmail,
  normalizeGuestPhone,
  normalizeGuestWechatId,
} from "./contactIdentity";

test("normalizes guest contact identities for matching", () => {
  assert.equal(normalizeGuestEmail(" USER@Example.COM "), "user@example.com");
  assert.equal(normalizeGuestPhone(" +33 6 12 34 56 78 "), "+33612345678");
  assert.equal(normalizeGuestWechatId("  Next Fun  "), "nextfun");
});

test("rejects weak guest contact identities", () => {
  assert.equal(normalizeGuestPhone("123"), null);
  assert.equal(normalizeGuestWechatId(" n "), null);
});
