import assert from "node:assert/strict";
import test from "node:test";
import {
  createInitialWerewolfRoomState,
  getWerewolfWinnerFromFinishSelection,
  normalizeWerewolfRoomState,
} from "./werewolfRoomState";

test("initializes Werewolf rooms without a sheriff", () => {
  assert.equal(createInitialWerewolfRoomState().sheriffSeatNumber, null);
});

test("normalizes a valid sheriff seat and rejects invalid values", () => {
  assert.equal(
    normalizeWerewolfRoomState({ sheriffSeatNumber: 4 }).sheriffSeatNumber,
    4,
  );
  assert.equal(
    normalizeWerewolfRoomState({ sheriffSeatNumber: 0 }).sheriffSeatNumber,
    null,
  );
  assert.equal(
    normalizeWerewolfRoomState({ sheriffSeatNumber: "invalid" })
      .sheriffSeatNumber,
    null,
  );
});

test("maps a judge finish selection without recording a terminated winner", () => {
  assert.equal(getWerewolfWinnerFromFinishSelection("GOOD"), "GOOD");
  assert.equal(
    getWerewolfWinnerFromFinishSelection("WEREWOLF"),
    "WEREWOLF",
  );
  assert.equal(getWerewolfWinnerFromFinishSelection("TERMINATED"), null);
});
