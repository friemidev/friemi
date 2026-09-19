import assert from "node:assert/strict";
import test from "node:test";
import {
  createInitialWerewolfRoomState,
  didWerewolfRoomStartNextRound,
  getWerewolfWinnerFromFinishSelection,
  normalizeWerewolfRoomState,
} from "./werewolfRoomState";

test("initializes Werewolf rooms without a sheriff", () => {
  assert.equal(createInitialWerewolfRoomState().sheriffSeatNumber, null);
  assert.equal(createInitialWerewolfRoomState().roundNumber, 1);
});

test("normalizes Werewolf room rounds for legacy and replayed rooms", () => {
  assert.equal(normalizeWerewolfRoomState({}).roundNumber, 1);
  assert.equal(normalizeWerewolfRoomState({ roundNumber: 3 }).roundNumber, 3);
  assert.equal(normalizeWerewolfRoomState({ roundNumber: 0 }).roundNumber, 1);
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
  assert.equal(getWerewolfWinnerFromFinishSelection("WEREWOLF"), "WEREWOLF");
  assert.equal(getWerewolfWinnerFromFinishSelection("TERMINATED"), null);
});

test("detects when a finished Werewolf room starts its next round", () => {
  assert.equal(
    didWerewolfRoomStartNextRound("FINISHED", "IN_PROGRESS"),
    true,
  );
  assert.equal(
    didWerewolfRoomStartNextRound("LOBBY", "IN_PROGRESS"),
    false,
  );
  assert.equal(
    didWerewolfRoomStartNextRound("IN_PROGRESS", "IN_PROGRESS"),
    false,
  );
});
