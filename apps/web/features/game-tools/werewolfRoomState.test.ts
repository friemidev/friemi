import assert from "node:assert/strict";
import test from "node:test";
import {
  canJoinWerewolfRoom,
  canViewWerewolfVoteSubmission,
  createInitialWerewolfRoomState,
  getWerewolfDepartureBehavior,
  getWerewolfRoomStateForViewer,
  isWerewolfEventVisibleToViewer,
} from "./werewolfRoomState";

test("leaving a finished Werewolf room fully exits instead of only releasing the seat", () => {
  assert.deepEqual(
    getWerewolfDepartureBehavior({
      intent: "leave_seat",
      status: "FINISHED",
    }),
    {
      notice: "exited",
      shouldLeaveRoom: true,
      shouldReleaseSeat: true,
    },
  );
});

test("leaving a lobby seat keeps the member in the room", () => {
  assert.deepEqual(
    getWerewolfDepartureBehavior({
      intent: "leave_seat",
      status: "LOBBY",
    }),
    {
      notice: "left",
      shouldLeaveRoom: false,
      shouldReleaseSeat: true,
    },
  );
});

test("hides private actions and in-progress vote choices from players", () => {
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
    false,
  );
  assert.equal(
    isWerewolfEventVisibleToViewer({
      isFinished: false,
      isJudge: false,
      type: "werewolf_exile_vote_resolved",
    }),
    true,
  );
});

test("a player sees only their own pending vote while the judge sees every vote", () => {
  assert.equal(
    canViewWerewolfVoteSubmission({
      isJudge: false,
      viewerSeatNumber: 3,
      voterSeatNumber: 3,
    }),
    true,
  );
  assert.equal(
    canViewWerewolfVoteSubmission({
      isJudge: false,
      viewerSeatNumber: 3,
      voterSeatNumber: 5,
    }),
    false,
  );
  assert.equal(
    canViewWerewolfVoteSubmission({
      isJudge: true,
      viewerSeatNumber: 13,
      voterSeatNumber: 5,
    }),
    true,
  );
});

test("allows late members to join a running room as spectators", () => {
  assert.equal(canJoinWerewolfRoom("LOBBY"), true);
  assert.equal(canJoinWerewolfRoom("IN_PROGRESS"), true);
  assert.equal(canJoinWerewolfRoom("FINISHED"), true);
  assert.equal(canJoinWerewolfRoom("CANCELLED"), false);
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
