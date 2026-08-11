import assert from "node:assert/strict";
import test from "node:test";
import {
  isMissingProfileRemarkStorageError,
  normalizeProfileRemarkName,
  resolveRemarkedProfileName,
} from "./profileRemarks";

test("profile remark normalization trims and collapses whitespace", () => {
  assert.equal(normalizeProfileRemarkName("  board   game\nfriend  "), "board game friend");
  assert.equal(normalizeProfileRemarkName(null), "");
});

test("profile remark display name falls back to the public nickname", () => {
  assert.equal(
    resolveRemarkedProfileName({
      publicNickname: "Alice",
      remarkName: "Paris host",
    }),
    "Paris host",
  );
  assert.equal(
    resolveRemarkedProfileName({
      publicNickname: "Alice",
      remarkName: "   ",
    }),
    "Alice",
  );
});

test("profile remark storage guard detects missing Prisma storage", () => {
  assert.equal(isMissingProfileRemarkStorageError({ code: "P2021" }), true);
  assert.equal(isMissingProfileRemarkStorageError({ code: "P2022" }), true);
  assert.equal(isMissingProfileRemarkStorageError({ code: "P2025" }), false);
  assert.equal(isMissingProfileRemarkStorageError(null), false);
});
