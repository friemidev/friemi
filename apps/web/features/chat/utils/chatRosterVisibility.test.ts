import assert from "node:assert/strict";
import test from "node:test";
import { isChatRosterEntryHidden } from "./chatRosterVisibility";

test("a chat stays visible until the user removes it", () => {
  assert.equal(
    isChatRosterEntryHidden(null, new Date("2026-08-14T10:00:00Z")),
    false,
  );
});

test("a removed chat stays hidden while it has no newer message", () => {
  const hiddenAt = new Date("2026-08-14T10:00:00Z");

  assert.equal(isChatRosterEntryHidden(hiddenAt, null), true);
  assert.equal(
    isChatRosterEntryHidden(hiddenAt, new Date("2026-08-14T09:59:00Z")),
    true,
  );
});

test("a removed chat returns when a newer message arrives", () => {
  assert.equal(
    isChatRosterEntryHidden(
      new Date("2026-08-14T10:00:00Z"),
      new Date("2026-08-14T10:00:01Z"),
    ),
    false,
  );
});
