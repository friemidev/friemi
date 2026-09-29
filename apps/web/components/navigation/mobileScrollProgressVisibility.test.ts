import assert from "node:assert/strict";
import test from "node:test";
import { shouldHideMobileScrollProgress } from "./mobileScrollProgressVisibility";

test("shared poll routes hide the mobile scroll progress", () => {
  assert.equal(shouldHideMobileScrollProgress("/poll/token"), true);
  assert.equal(shouldHideMobileScrollProgress("/zh-CN/poll/token"), true);
  assert.equal(shouldHideMobileScrollProgress("/en/poll/token"), true);
  assert.equal(shouldHideMobileScrollProgress("/fr/poll/token"), true);
});

test("internal poll routes keep their normal route behavior", () => {
  assert.equal(
    shouldHideMobileScrollProgress(
      "/zh-CN/lobby/activity-id/polls/poll-id",
    ),
    false,
  );
});
