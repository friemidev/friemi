import assert from "node:assert/strict";
import test from "node:test";
import {
  createInitialWerewolfRoomState,
  getWerewolfRoomStateForViewer,
  isWerewolfEventVisibleToViewer,
} from "./werewolfRoomState";

test("hides night-action events from players until the game is finished", () => {
  assert.equal(
    isWerewolfEventVisibleToViewer({
      isFinished: false,
      isJudge: false,
      type: "werewolf_night_action_submitted",
    }),
    false,
  );
  assert.equal(
    isWerewolfEventVisibleToViewer({
      isFinished: false,
      isJudge: true,
      type: "werewolf_night_action_submitted",
    }),
    true,
  );
  assert.equal(
    isWerewolfEventVisibleToViewer({
      isFinished: false,
      isJudge: false,
      type: "werewolf_exile_vote_submitted",
    }),
    true,
  );
});

test("hides private Werewolf flow state from unrelated players", () => {
  const state = createInitialWerewolfRoomState();
  state.flow = {
    ...state.flow,
    cupidSeatNumber: 1,
    cupidSharedAlignment: "good",
    factionAlert: {
      id: "alert",
      kind: "WEREWOLVES_ELIMINATED",
      seatNumbers: [4, 5],
    },
    lastGuardedSeatNumber: 6,
    loverSeatNumbers: [2, 3],
    thirdPartySeatNumbers: [1, 2, 3],
    witchAntidoteUsed: true,
    witchPoisonUsed: true,
  };

  const viewerState = getWerewolfRoomStateForViewer({
    isFinished: false,
    isJudge: false,
    roleKey: "villager",
    seatNumber: 8,
    state,
  });

  assert.deepEqual(viewerState.flow.loverSeatNumbers, []);
  assert.deepEqual(viewerState.flow.thirdPartySeatNumbers, []);
  assert.equal(viewerState.flow.lastGuardedSeatNumber, null);
  assert.equal(viewerState.flow.witchAntidoteUsed, false);
  assert.equal(viewerState.flow.factionAlert, null);
});

test("shows a lover the linked seats without exposing judge-only alerts", () => {
  const state = createInitialWerewolfRoomState();
  state.flow = {
    ...state.flow,
    factionAlert: {
      id: "alert",
      kind: "GODS_ELIMINATED",
      seatNumbers: [4, 5],
    },
    loverSeatNumbers: [2, 3],
    thirdPartySeatNumbers: [1, 2, 3],
  };

  const viewerState = getWerewolfRoomStateForViewer({
    isFinished: false,
    isJudge: false,
    roleKey: "villager",
    seatNumber: 2,
    state,
  });

  assert.deepEqual(viewerState.flow.loverSeatNumbers, [2, 3]);
  assert.deepEqual(viewerState.flow.thirdPartySeatNumbers, [1, 2, 3]);
  assert.equal(viewerState.flow.factionAlert, null);
});

test("keeps the full Werewolf flow visible to the judge", () => {
  const state = createInitialWerewolfRoomState();
  state.flow = {
    ...state.flow,
    lastGuardedSeatNumber: 6,
    loverSeatNumbers: [2, 3],
  };

  assert.equal(
    getWerewolfRoomStateForViewer({
      isFinished: false,
      isJudge: true,
      roleKey: null,
      seatNumber: 13,
      state,
    }),
    state,
  );
});
