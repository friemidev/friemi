import assert from "node:assert/strict";
import test from "node:test";
import {
  canChangeNickname,
  getNicknameChangeAvailableAt,
  NICKNAME_CHANGE_COOLDOWN_MS,
} from "./nicknameChangePolicy";

test("a profile without a previous nickname change can change immediately", () => {
  assert.equal(canChangeNickname(null, new Date("2026-08-13T10:00:00Z")), true);
});

test("nickname changes stay locked for 24 hours", () => {
  const changedAt = new Date("2026-08-13T10:00:00Z");

  assert.equal(
    canChangeNickname(
      changedAt,
      new Date(changedAt.getTime() + NICKNAME_CHANGE_COOLDOWN_MS - 1),
    ),
    false,
  );
  assert.equal(
    canChangeNickname(
      changedAt,
      new Date(changedAt.getTime() + NICKNAME_CHANGE_COOLDOWN_MS),
    ),
    true,
  );
});

test("the next nickname change time is exactly 24 hours later", () => {
  assert.equal(
    getNicknameChangeAvailableAt("2026-08-13T10:00:00Z")?.toISOString(),
    "2026-08-14T10:00:00.000Z",
  );
});
