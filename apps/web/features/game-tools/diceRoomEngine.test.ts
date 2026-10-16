import assert from "node:assert/strict";
import test from "node:test";
import { applyDiceAction, createDiceLobbyState, diceViewFor, removeDiceSeat, startDiceMatch } from "./diceRoomEngine";

test("private hands stay hidden until a challenge; retries reuse the persisted round", () => {
  const faces = [1,2,3,4,5,6,6,6,4,2]; let index = 0;
  const started = startDiceMatch([1,2], () => faces[index++]);
  assert.deepEqual(diceViewFor(started, 1).myHand, [1,2,3,4,5]);
  assert.deepEqual(diceViewFor(started, 2).myHand, [6,6,6,4,2]);
  assert.equal(diceViewFor(started, 1).revealedHands, null);
  assert.equal(diceViewFor(started, 2).revealedHands, null);
  const bid = applyDiceAction(started, 1, { type: "BID", count: 2, face: 6 }, () => 1);
  assert.equal(bid.turnSeat, 2);
  assert.throws(() => applyDiceAction(bid, 1, { type: "BID", count: 3, face: 3 }, () => 1), { code: "NOT_YOUR_TURN" });
  const challenged = applyDiceAction(bid, 2, { type: "CHALLENGE" }, () => 1);
  assert.equal(challenged.result?.total, 4);
  assert.equal(challenged.result?.winnerSeat, 1);
  assert.deepEqual(diceViewFor(challenged, 2).revealedHands?.["1"], [1,2,3,4,5]);
  assert.deepEqual(started.hands["1"], [1,2,3,4,5]);
  const next = applyDiceAction(challenged, 1, { type: "NEXT_ROUND" }, () => 2);
  assert.equal(next.round, 2);
  assert.equal(next.turnSeat, 1);
  assert.equal(diceViewFor(next, 2).revealedHands, null);
});

test("bids must increase and a challenge is unavailable before a bid", () => {
  const state = startDiceMatch([1,2,3], () => 4);
  assert.throws(() => applyDiceAction(state, 1, { type: "CHALLENGE" }, () => 2), { code: "NO_BID" });
  assert.throws(() => applyDiceAction(state, 1, { type: "BID", count: 2, face: 4 }, () => 2), { code: "INVALID_COUNT" });
  assert.throws(() => applyDiceAction(state, 1, { type: "BID", count: 3, face: 1 }, () => 2), { code: "INVALID_FACE" });
  const first = applyDiceAction(state, 1, { type: "BID", count: 3, face: 4 }, () => 2);
  assert.throws(() => applyDiceAction(first, 2, { type: "BID", count: 3, face: 4 }, () => 2), { code: "BID_NOT_HIGHER" });
  assert.equal(applyDiceAction(first, 2, { type: "BID", count: 4, face: 2 }, () => 2).bid?.count, 4);
});

test("leaving mid-round removes the private hand and starts a clean round", () => {
  const state = startDiceMatch([1,2,3], () => 6);
  const bid = applyDiceAction(state, 1, { type: "BID", count: 3, face: 6 }, () => 1);
  const next = removeDiceSeat(bid, 2, () => 3);
  assert.deepEqual(next.seatNumbers, [1,3]);
  assert.equal(next.hands["2"], undefined);
  assert.equal(next.bid, null);
  assert.equal(next.round, 2);
  assert.equal(createDiceLobbyState().phase, "LOBBY");
});

test("a rematch keeps room rounds increasing while displaying its first and second rounds", () => {
  const lobby = createDiceLobbyState(3);
  assert.equal(lobby.round, 3);
  assert.equal(diceViewFor(lobby, 1).roundNumber, 0);
  const started = startDiceMatch([1, 2], () => 6, lobby.round + 1);
  assert.equal(started.round, 4);
  assert.equal(diceViewFor(started, 1).roundNumber, 1);
  const bid = applyDiceAction(started, 1, { type: "BID", count: 2, face: 6 }, () => 1);
  const revealed = applyDiceAction(bid, 2, { type: "CHALLENGE" }, () => 1);
  const next = applyDiceAction(revealed, 1, { type: "NEXT_ROUND" }, () => 2);
  assert.equal(next.round, 5);
  assert.equal(diceViewFor(next, 1).roundNumber, 2);
  assert.equal(diceViewFor(next, 1).revealedHands, null);
});

test("existing persisted matches retain their displayed round without a migration", () => {
  const legacy = { ...startDiceMatch([1, 2], () => 3), round: 3 };
  delete legacy.matchStartRound;
  assert.equal(diceViewFor(legacy, 1).roundNumber, 3);
  assert.equal(diceViewFor(legacy, 1).round, 3);
});
