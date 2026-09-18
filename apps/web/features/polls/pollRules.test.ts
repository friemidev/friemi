import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_POLL_OPTIONS,
  MIN_POLL_OPTIONS,
  isValidPollSelection,
  normalizePollOptions,
  resolveEffectivePollStatus,
} from "./pollRules";

test("poll option limits allow up to twenty choices", () => {
  assert.equal(MIN_POLL_OPTIONS, 2);
  assert.equal(MAX_POLL_OPTIONS, 20);
});

test("poll options are trimmed, deduplicated, and length bounded", () => {
  assert.deepEqual(
    normalizePollOptions(["  Coffee  ", "coffee", "Milk   tea", ""]),
    ["Coffee", "Milk tea"],
  );
  assert.equal(normalizePollOptions(["x".repeat(100)])[0]?.length, 80);
});

test("open polls close effectively when their deadline passes", () => {
  const now = new Date("2026-09-18T12:00:00.000Z");

  assert.equal(
    resolveEffectivePollStatus(
      "OPEN",
      new Date("2026-09-18T11:59:59.000Z"),
      now,
    ),
    "CLOSED",
  );
  assert.equal(
    resolveEffectivePollStatus(
      "OPEN",
      new Date("2026-09-18T12:00:01.000Z"),
      now,
    ),
    "OPEN",
  );
  assert.equal(resolveEffectivePollStatus("CANCELLED", null, now), "CANCELLED");
});

test("single and multiple choice selection limits are enforced", () => {
  assert.equal(
    isValidPollSelection({
      kind: "SINGLE_CHOICE",
      maxSelections: null,
      optionCount: 3,
      selectedCount: 1,
    }),
    true,
  );
  assert.equal(
    isValidPollSelection({
      kind: "SINGLE_CHOICE",
      maxSelections: null,
      optionCount: 3,
      selectedCount: 2,
    }),
    false,
  );
  assert.equal(
    isValidPollSelection({
      kind: "MULTIPLE_CHOICE",
      maxSelections: 2,
      optionCount: 4,
      selectedCount: 3,
    }),
    false,
  );
});
