import assert from "node:assert/strict";
import test from "node:test";
import { shouldShowChatTimeSeparator } from "./chatDateSeparators";

test("chat time separator appears for the first message and five-minute gaps", () => {
  assert.equal(
    shouldShowChatTimeSeparator("2026-08-12T10:00:00"),
    true,
  );
  assert.equal(
    shouldShowChatTimeSeparator(
      "2026-08-12T10:05:00",
      "2026-08-12T10:00:00",
    ),
    true,
  );
});

test("chat time separator stays hidden for adjacent messages", () => {
  assert.equal(
    shouldShowChatTimeSeparator(
      "2026-08-12T10:04:59",
      "2026-08-12T10:00:00",
    ),
    false,
  );
});

test("chat time separator appears when the local date changes", () => {
  assert.equal(
    shouldShowChatTimeSeparator(
      "2026-08-13T00:00:01",
      "2026-08-12T23:59:59",
    ),
    true,
  );
});
