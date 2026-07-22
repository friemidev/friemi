import assert from "node:assert/strict";
import test from "node:test";
import { getAvatarInitial, sanitizeDisplayText } from "./display-text";

test("getAvatarInitial keeps emoji as a complete code point", () => {
  assert.equal(getAvatarInitial("🧋 Milk"), "🧋");
  assert.notEqual(getAvatarInitial("🧋 Milk"), "\ud83e");
});

test("getAvatarInitial ignores invalid display characters", () => {
  assert.equal(getAvatarInitial("\ud83e"), "N");
  assert.equal(getAvatarInitial("\udd8a"), "N");
  assert.equal(getAvatarInitial("\ufffd\ufffd"), "N");
  assert.equal(getAvatarInitial("\ufffd Amy"), "A");
});

test("sanitizeDisplayText preserves valid surrogate pairs", () => {
  assert.equal(sanitizeDisplayText("  \ud83e\uddcb Alice  "), "🧋 Alice");
});
