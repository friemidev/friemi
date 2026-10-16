import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDdzAction,
  createDdzDeck,
  createDdzState,
  getDdzViewerState,
  startDdzGame,
} from "./doudizhuEngine";
import {
  DDZ_PASS_TRICK_HOLD_MS,
  getDdzPassFeedback,
} from "./doudizhuPassFeedback";

function playing() {
  const started = startDdzGame(
    createDdzState([0, 1, 2].map((seat) => ({ seat, name: String(seat) }))),
    1_000,
    { deck: createDdzDeck().map((card) => card.id), firstBidSeat: 0 },
  ).state;
  const bid = applyDdzAction(
    started,
    0,
    { type: "BID", score: 3 },
    1_100,
  ).state;
  return applyDdzAction(
    bid,
    0,
    { type: "PLAY", cardIds: [bid.hands[0][0]] },
    1_200,
  ).state;
}

test("an accepted pass stays at its own seat while the current play is active", () => {
  const state = applyDdzAction(playing(), 1, { type: "PASS" }, 1_300).state;
  const feedback = getDdzPassFeedback(getDdzViewerState(state, 1), 10_000);
  assert.deepEqual(
    feedback.map((item) => item.seat),
    [1],
  );
  assert.equal(feedback[0].expiresAt, null);
});

test("two PASS events and TRICK in the same snapshot stay readable then expire", () => {
  const first = applyDdzAction(playing(), 1, { type: "PASS" }, 1_300).state;
  const second = applyDdzAction(first, 2, { type: "PASS" }, 1_400).state;
  const viewer = getDdzViewerState(second, 2);
  assert.equal(viewer.targetPlay, null);
  assert.equal(viewer.events.at(-1)?.kind, "TRICK");
  assert.deepEqual(
    getDdzPassFeedback(viewer, 1_400).map((item) => item.seat),
    [1, 2],
  );
  assert.equal(
    getDdzPassFeedback(viewer, 1_400 + DDZ_PASS_TRICK_HOLD_MS - 1).length,
    2,
  );
  assert.deepEqual(
    getDdzPassFeedback(viewer, 1_400 + DDZ_PASS_TRICK_HOLD_MS),
    [],
  );
  assert.deepEqual(getDdzPassFeedback(viewer, 50_000), []);
});

test("a new lead immediately clears both previous passes during their hold", () => {
  const first = applyDdzAction(playing(), 1, { type: "PASS" }, 1_300).state;
  const second = applyDdzAction(first, 2, { type: "PASS" }, 1_400).state;
  const next = applyDdzAction(
    second,
    0,
    { type: "PLAY", cardIds: [second.hands[0][0]] },
    1_500,
  ).state;
  assert.deepEqual(getDdzPassFeedback(getDdzViewerState(next, 0), 1_500), []);
  const nextPass = applyDdzAction(next, 1, { type: "PASS" }, 1_600).state;
  assert.deepEqual(
    getDdzPassFeedback(getDdzViewerState(nextPass, 0), 1_600).map(
      (item) => item.seat,
    ),
    [1],
  );
});

test("a higher play clears the previous pass without waiting for a completed trick", () => {
  const first = applyDdzAction(playing(), 1, { type: "PASS" }, 1_300).state;
  const reply = applyDdzAction(
    first,
    2,
    { type: "PLAY", cardIds: [first.hands[2][1]] },
    1_400,
  );
  assert.equal(reply.error, undefined);
  assert.deepEqual(
    getDdzPassFeedback(getDdzViewerState(reply.state, 1), 1_400),
    [],
  );
});

test("new deals, games, and non-playing phases cannot retain old pass feedback", () => {
  const first = applyDdzAction(playing(), 1, { type: "PASS" }, 1_300).state;
  const viewer = getDdzViewerState(first, 1);
  assert.deepEqual(getDdzPassFeedback({ ...viewer, dealNo: 2 }, 1_400), []);
  assert.deepEqual(getDdzPassFeedback({ ...viewer, gameNo: 2 }, 1_400), []);
  for (const phase of ["BIDDING", "RESULT", "LOBBY", "CLOSED"] as const)
    assert.deepEqual(getDdzPassFeedback({ ...viewer, phase }, 1_400), []);
});
