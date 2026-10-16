import assert from "node:assert/strict";
import test from "node:test";
import { advanceUnoDeadline, applyUnoAction, createUnoDeck, createUnoState, getUnoViewerState, isUnoCardPlayable, startUnoGame, unoCardPoints } from "./unoEngine";
import type { UnoAction, UnoState, UnoValue } from "./unoTypes";
import { getUnoCopy } from "./unoCopy";
import { getUnoExperienceCopy } from "./unoExperienceCopy";

function fixture(count = 3) {
  const state = createUnoState(Array.from({ length: count }, (_, seat) => ({ seat, name: `P${seat}` })));
  state.rulesetVersion = 2;
  state.phase = "PLAYING"; state.roundNumber = 1; state.turnId = 1; state.deadlineAt = 60_000;
  const deck = createUnoDeck();
  const take = (id: string) => deck.splice(deck.findIndex(c => c.id === id), 1)[0];
  state.discard = [take("red-5-0")]; state.currentColor = "red";
  state.players.forEach((p, i) => { p.hand = [take(`red-${i + 1}-0`), take(`blue-${i + 1}-0`)]; p.handVersion = 1; });
  state.drawPile = deck;
  return state;
}
function setHand(state: UnoState, seat: number, ids: string[]) {
  const pool = [...state.drawPile, ...state.players[seat].hand];
  state.players[seat].hand = ids.map(id => pool.splice(pool.findIndex(c => c.id === id), 1)[0]);
  state.drawPile = pool;
}
function act(state: UnoState, seat: number, action: UnoAction) {
  const result = applyUnoAction(state, seat, action, 1, () => .5);
  assert.equal(result.error, undefined);
  return result.state;
}
function call(state: UnoState, seat = 0) {
  const p = state.players[seat];
  return act(state, seat, { type: "CALL_UNO", episodeId: p.episodeId, handVersion: p.handVersion });
}
function play(state: UnoState, seat = 0) {
  const p = state.players[seat], c = p.hand[0];
  return act(state, seat, { type: "PLAY", cardId: c.id, handVersion: p.handVersion, ...(c.color === null ? { color: "red" as const } : {}) });
}
function report(state: UnoState, targetSeat = 0): UnoAction {
  return { type: "CATCH_UNO", targetSeat, episodeId: state.players[targetSeat].episodeId, roundNumber: state.roundNumber };
}

test("classic: UNO can be manually lit at any hand size, off turn, without moving the timer", () => {
  for (const size of [1, 2, 3, 7, 18]) {
    const initial = fixture();
    if (size === 1) setHand(initial, 1, ["red-2-0"]);
    else initial.players[1].hand.push(...initial.drawPile.splice(0, size - 2));
    const state = call(initial, 1);
    assert.equal(state.players[1].declared, true);
    assert.equal(state.turnId, initial.turnId); assert.equal(state.turnSeat, 0); assert.equal(state.deadlineAt, initial.deadlineAt);
    assert.equal(state.events.filter(e => e.kind === "UNO").length, 1);
    assert.equal(call(state, 1), state);
    assert.equal(initial.players[1].declared, false);
  }
});

test("classic: declaring with two cards covers the following play from two to one", () => {
  let state = call(fixture());
  state = play(state);
  assert.equal(state.players[0].hand.length, 1); assert.equal(state.players[0].declared, true);
  assert.equal(applyUnoAction(state, 2, report(state), 1).error, "INVALID_REPORT");
  assert.equal(state.events.filter(e => e.kind === "UNO").length, 1);
});

test("classic: an early declaration clears on a different hand change, and delayed calls cannot arm the new hand", () => {
  let state = fixture(); state.players[0].hand.push(state.drawPile.pop()!);
  state = call(state);
  const old = { type: "CALL_UNO", episodeId: state.players[0].episodeId, handVersion: state.players[0].handVersion } as const;
  state = play(state);
  assert.equal(state.players[0].declared, false); assert.equal(state.players[0].hand.length, 2);
  assert.equal(applyUnoAction(state, 0, old, 1).error, "STALE_HAND");
  assert.equal(applyUnoAction(state, 0, { type: "CALL_UNO", episodeId: state.players[0].episodeId }, 1).error, "STALE_HAND");
});

test("classic: missing UNO opens reporting immediately, without a reminder or wait", () => {
  const state = play(fixture());
  assert.equal(state.phase, "PLAYING"); assert.equal(state.turnSeat, 1); assert.equal(state.players[0].declared, false);
  assert.equal(state.events.some(e => e.kind === "UNO"), false);
  const command = report(state), caught = act(state, 2, command);
  assert.equal(caught.players[0].hand.length, 3); assert.equal(caught.turnSeat, state.turnSeat); assert.equal(caught.deadlineAt, state.deadlineAt);
  const again = applyUnoAction(caught, 1, command, 1);
  assert.ok(again.error); assert.equal(again.state, caught);
  const otherView = getUnoViewerState(state, 2);
  for (const key of ["declared", "grace", "unoReportOpen", "hand"]) assert.equal(key in otherView.players[0], false);
});

test("classic: the next accepted play closes the old report window and opens the new player's window", () => {
  let state = play(fixture());
  state = play(state, 1);
  assert.equal(applyUnoAction(state, 2, report(state, 0), 1).error, "INVALID_REPORT");
  assert.equal(act(state, 2, report(state, 1)).players[1].hand.length, 3);
});

test("classic: a draw closes reporting even if the drawn card can still be played", () => {
  let state = play(fixture());
  const nextCard = state.drawPile.findIndex(c => c.color === "red");
  state.drawPile.push(state.drawPile.splice(nextCard, 1)[0]);
  state = act(state, 1, { type: "DRAW" });
  assert.equal(state.turnSeat, 1); assert.ok(state.drawnCardId);
  assert.equal(applyUnoAction(state, 2, report(state), 1).error, "INVALID_REPORT");
});

test("classic: rejected actions and other players' UNO clicks do not close reporting", () => {
  let state = play(fixture());
  const rejected = applyUnoAction(state, 2, { type: "DRAW" }, 1);
  assert.equal(rejected.error, "NOT_YOUR_TURN"); assert.equal(rejected.state, state);
  state = call(state, 2);
  assert.equal(act(state, 2, report(state)).players[0].hand.length, 3);
});

test("classic: a late UNO call wins over a subsequent report, with no false-report penalty", () => {
  const missed = play(fixture()), state = call(missed);
  const invalid = applyUnoAction(state, 2, report(state), 1);
  assert.equal(invalid.error, "INVALID_REPORT"); assert.equal(invalid.state, state);
  assert.equal(invalid.state.players[2].hand.length, 2);
  const caught = act(missed, 2, report(missed));
  assert.equal(caught.players[0].declared, false);
  assert.equal(applyUnoAction(caught, 0, { type: "CALL_UNO", episodeId: missed.players[0].episodeId, handVersion: missed.players[0].handVersion }, 1).error, "STALE_HAND");
});

test("classic: invalid, self and cross-round reports never punish the reporter", () => {
  const state = play(fixture());
  for (const [seat, command] of [[0, report(state)], [1, report(state, 2)], [2, { ...report(state), roundNumber: 99 }]] as [number, UnoAction][]) {
    const result = applyUnoAction(state, seat, command, 1);
    assert.equal(result.error, "INVALID_REPORT"); assert.equal(result.state, state);
  }
});

test("classic: the ordinary turn timeout closes reporting", () => {
  const state = advanceUnoDeadline(play(fixture()), 60_001, () => .5);
  assert.equal(applyUnoAction(state, 2, report(state), 60_002).error, "INVALID_REPORT");
});

for (const action of ["ACCEPT_DRAW_FOUR", "CHALLENGE_DRAW_FOUR", "timeout"] as const) {
  test(`classic: ${action} closes the +4 offender's missed-UNO window`, () => {
    let state = fixture(); setHand(state, 0, ["wild4-0", "blue-7-0"]); state = play(state);
    assert.equal(state.phase, "CHALLENGE");
    assert.equal(act(state, 2, report(state)).players[0].hand.length, 3);
    state = action === "timeout" ? advanceUnoDeadline(state, 15_001, () => .5) : act(state, 1, { type: action });
    assert.equal(applyUnoAction(state, 2, report(state), 15_002).error, "INVALID_REPORT");
  });
}

for (const value of ["skip", "reverse", "draw2", "wild", "wild4"] as UnoValue[]) {
  test(`classic: ${value} can finish; final draw penalties count towards the score`, () => {
    let state = fixture();
    setHand(state, 0, [value === "wild" || value === "wild4" ? `${value}-0` : `red-${value}-0`]);
    const top = state.players[0].hand[0], view = getUnoViewerState(state, 0);
    assert.equal(isUnoCardPlayable(view, top), true);
    const penalty = value === "draw2" ? 2 : value === "wild4" ? 4 : 0;
    const penaltyPoints = (penalty ? state.drawPile.slice(-penalty) : []).reduce((sum, c) => sum + unoCardPoints(c), 0);
    const expectedPoints = state.players.slice(1).flatMap(p => p.hand).reduce((sum, c) => sum + unoCardPoints(c), 0) + penaltyPoints;
    state = play(state);
    assert.equal(state.phase, "ROUND_END"); assert.equal(state.challenge, null); assert.equal(state.deadlineAt, null);
    assert.equal(state.players[1].hand.length, 2 + penalty);
    assert.equal(state.roundResult?.points, expectedPoints); assert.equal(state.players[0].score, expectedPoints);
    assert.equal(state.events.at(-1)?.kind, "ROUND_WIN");
    assert.equal(applyUnoAction(state, 2, report(state), 1).error, "WRONG_PHASE");
  });
}

test("classic: final cards must still match; final wild cards still need a colour", () => {
  const state = fixture(); setHand(state, 0, ["blue-skip-0"]);
  let p = state.players[0];
  assert.equal(applyUnoAction(state, 0, { type: "PLAY", cardId: p.hand[0].id, handVersion: p.handVersion }, 1).error, "CARD_NOT_PLAYABLE");
  setHand(state, 0, ["wild4-0"]); p = state.players[0];
  assert.equal(applyUnoAction(state, 0, { type: "PLAY", cardId: p.hand[0].id, handVersion: p.handVersion }, 1).error, "INVALID_COLOR");
});

test("classic: two-player Skip permits immediate reporting before the same player finishes", () => {
  let state = fixture(2); setHand(state, 0, ["red-skip-0", "red-7-0"]); state = play(state);
  assert.equal(state.turnSeat, 0);
  assert.equal(act(state, 1, report(state)).players[0].hand.length, 3);
  const ended = play(state);
  assert.equal(ended.phase, "ROUND_END"); assert.equal(applyUnoAction(ended, 1, report(state), 1).error, "WRONG_PHASE");
});

test("classic: new starts upgrade to v3; ongoing legacy rounds keep their rules; rematch upgrades", () => {
  const lobby = createUnoState([{ seat: 0, name: "A" }, { seat: 1, name: "B" }]); lobby.rulesetVersion = 1;
  assert.equal(startUnoGame(lobby, 0, () => .5).state.rulesetVersion, 3);
  let legacy = fixture(2); legacy.rulesetVersion = 1; setHand(legacy, 0, ["red-skip-0"]);
  assert.equal(applyUnoAction(legacy, 0, { type: "PLAY", cardId: legacy.players[0].hand[0].id, handVersion: 1 }, 1).error, "LAST_CARD_MUST_BE_NUMBER");
  setHand(legacy, 0, ["red-7-0"]); legacy = play(legacy);
  assert.equal(act(legacy, 0, { type: "NEXT_ROUND" }).rulesetVersion, 1);
  legacy.phase = "FINISHED"; assert.equal(act(legacy, 0, { type: "REMATCH" }).rulesetVersion, 3);
  for (const locale of ["zh-CN", "en", "fr"]) {
    assert.notEqual(getUnoCopy(locale, 1).rule4, getUnoCopy(locale, 2).rule4);
    assert.notEqual(getUnoExperienceCopy(locale, 1).example1, getUnoExperienceCopy(locale, 2).example1);
  }
});
