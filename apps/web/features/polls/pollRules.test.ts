import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_POLL_RESULT_VISIBILITY,
  DEFAULT_POLL_VOTER_VISIBILITY,
  MAX_POLL_OPTIONS,
  MIN_POLL_OPTIONS,
  POLL_GUEST_IDENTITY_MODE,
  isValidPollSelection,
  isValidPollVoterIdentity,
  normalizePollOptions,
  resolveEffectivePollStatus,
} from "./pollRules";

test("poll option limits allow up to twenty choices", () => {
  assert.equal(MIN_POLL_OPTIONS, 2);
  assert.equal(MAX_POLL_OPTIONS, 20);
});

test("poll defaults expose voters to participants after voting", () => {
  assert.equal(DEFAULT_POLL_RESULT_VISIBILITY, "AFTER_VOTE");
  assert.equal(DEFAULT_POLL_VOTER_VISIBILITY, "PARTICIPANTS_VISIBLE");
  assert.equal(POLL_GUEST_IDENTITY_MODE, "NICKNAME_OPTIONAL_ANONYMOUS");
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

test("guests may replace a nickname with an explicit anonymous vote", () => {
  assert.equal(
    isValidPollVoterIdentity({
      guestNickname: "",
      isAnonymous: false,
      isAuthenticated: false,
    }),
    false,
  );
  assert.equal(
    isValidPollVoterIdentity({
      guestNickname: "",
      isAnonymous: true,
      isAuthenticated: false,
    }),
    true,
  );
  assert.equal(
    isValidPollVoterIdentity({
      guestNickname: "Alice",
      isAnonymous: false,
      isAuthenticated: false,
    }),
    true,
  );
  assert.equal(
    isValidPollVoterIdentity({
      guestNickname: "",
      isAnonymous: false,
      isAuthenticated: true,
    }),
    true,
  );
});
