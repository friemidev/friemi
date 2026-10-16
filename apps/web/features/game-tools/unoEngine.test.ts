import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceUnoDeadline, applyUnoAction, createUnoDeck, createUnoState, getUnoViewerState,
  isUnoCardPlayable, startUnoGame, type UnoAction, type UnoCard, type UnoColor, type UnoState, type UnoValue,
} from "./unoEngine";

let cardId = 0;
const card = (value: UnoValue, color: UnoColor | null = "red"): UnoCard => ({ id: `fixture-${++cardId}`, value, color: value === "wild" || value === "wild4" ? null : color });
const random = () => 0.5;
function fixture(count = 3): UnoState {
  const state = createUnoState(Array.from({ length: count }, (_, seat) => ({ seat, name: `Player ${seat}` })));
  // Keep regression coverage for matches already started under the old rules.
  state.rulesetVersion = 1;
  state.phase = "PLAYING";
  state.roundNumber = 1;
  state.turnId = 1;
  state.deadlineAt = 60_000;
  state.currentColor = "red";
  state.discard = [card("5")];
  state.drawPile = Array.from({ length: 35 }, (_, i) => card(`${i % 10}` as UnoValue, i % 2 ? "red" : "blue"));
  for (const player of state.players) {
    player.hand = [card("5"), card("7", "blue")];
    player.handVersion = 1;
  }
  return state;
}
function act(state: UnoState, seat: number, action: UnoAction, now = 1): UnoState {
  const result = applyUnoAction(state, seat, action, now, random);
  assert.equal(result.error, undefined);
  return result.state;
}
function play(state: UnoState, seat: number, index = 0, color?: UnoColor) {
  const player = state.players.find((p) => p.seat === seat)!;
  return act(state, seat, { type: "PLAY", cardId: player.hand[index].id, handVersion: player.handVersion, color });
}
function single(state: UnoState, seat: number, value: UnoValue = "7", color: UnoColor = "red", grace = false) {
  const player = state.players.find((p) => p.seat === seat)!;
  player.hand = [card(value, color)];
  player.episodeId = 1;
  player.grace = grace;
}
function catchAction(state: UnoState, targetSeat: number): UnoAction {
  return { type: "CATCH_UNO", targetSeat, roundNumber: state.roundNumber, episodeId: state.players.find((p) => p.seat === targetSeat)!.episodeId };
}

test("deck has 108 unique cards and the precise classic composition", () => {
  const deck = createUnoDeck();
  assert.equal(deck.length, 108);
  assert.equal(new Set(deck.map((c) => c.id)).size, 108);
  for (const color of ["red", "yellow", "green", "blue"]) {
    assert.equal(deck.filter((c) => c.color === color).length, 25);
    assert.equal(deck.filter((c) => c.color === color && c.value === "0").length, 1);
    for (const value of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"]) {
      assert.equal(deck.filter((c) => c.color === color && c.value === value).length, 2);
    }
  }
  assert.equal(deck.filter((c) => c.value === "wild").length, 4);
  assert.equal(deck.filter((c) => c.value === "wild4").length, 4);
});

test("seeded deals conserve every card, support ten players and never open +4", () => {
  for (let count = 2; count <= 10; count += 1) {
    let seed = count;
    const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const lobby = createUnoState(Array.from({ length: count }, (_, i) => ({ seat: i * 2, name: `P${i}` })));
    const result = startUnoGame(lobby, 100, rng);
    assert.equal(result.error, undefined);
    assert.notEqual(result.state.discard[0].value, "wild4");
    const all = [...result.state.drawPile, ...result.state.discard, ...result.state.players.flatMap((p) => p.hand)];
    assert.equal(all.length, 108);
    assert.equal(new Set(all.map((c) => c.id)).size, 108);
    assert.ok(result.state.players.every((p) => p.hand.length === 7 || p.hand.length === 9));
    assert.ok(lobby.players.every((p) => p.hand.length === 0));
    assert.equal(result.state.deadlineAt, 60_100);
  }
  assert.equal(startUnoGame(createUnoState([{ seat: 0, name: "alone" }]), 0).error, "INVALID_PLAYERS");
});

test("legal play matches colour or value and rejected requests do not mutate state", () => {
  const state = fixture();
  state.players[0].hand = [card("5", "green"), card("9", "yellow")];
  const original = structuredClone(state);
  assert.equal(applyUnoAction(state, 0, { type: "PLAY", cardId: state.players[0].hand[1].id, handVersion: 1 }, 1).error, "CARD_NOT_PLAYABLE");
  assert.deepEqual(state, original);
  const moved = play(state, 0);
  assert.equal(moved.currentColor, "green");
  assert.equal(moved.turnSeat, 1);
});

test("draw once allows only the drawn card; passing keeps it for the next turn", () => {
  let state = fixture();
  const drawn = card("4");
  state.drawPile.push(drawn);
  const old = state.players[0].hand[0].id;
  state = act(state, 0, { type: "DRAW" });
  assert.equal(state.drawnCardId, drawn.id);
  assert.equal(state.players[0].hand.length, 3);
  assert.equal(applyUnoAction(state, 0, { type: "DRAW" }, 2).error, "ALREADY_DREW");
  assert.equal(applyUnoAction(state, 0, { type: "PLAY", cardId: old, handVersion: state.players[0].handVersion }, 2).error, "ONLY_DRAWN_CARD");
  assert.equal(isUnoCardPlayable(getUnoViewerState(state, 0), state.players[0].hand[0]), false);
  assert.equal(isUnoCardPlayable(getUnoViewerState(state, 0), drawn), true);
  state = act(state, 0, { type: "PASS" });
  assert.equal(state.turnSeat, 1);
  assert.ok(state.players[0].hand.some((c) => c.id === drawn.id));
});

test("unplayable draw ends the turn and passing before drawing is rejected", () => {
  const state = fixture();
  state.drawPile.push(card("9", "green"));
  assert.equal(applyUnoAction(state, 0, { type: "PASS" }, 1).error, "MUST_DRAW_FIRST");
  const next = act(state, 0, { type: "DRAW" });
  assert.equal(next.turnSeat, 1);
  assert.equal(next.drawnCardId, null);
});

test("all five action kinds cannot finish and a retained draw permits later escape", () => {
  for (const value of ["skip", "reverse", "draw2", "wild", "wild4"] as const) {
    const state = fixture(2);
    single(state, 0, value);
    assert.equal(applyUnoAction(state, 0, { type: "PLAY", cardId: state.players[0].hand[0].id, handVersion: 1, color: "red" }, 1).error, "LAST_CARD_MUST_BE_NUMBER");
    assert.equal(isUnoCardPlayable(getUnoViewerState(state, 0), state.players[0].hand[0]), false);
  }
  let state = fixture(2);
  single(state, 0, "reverse");
  const held = state.players[0].hand[0].id;
  state.drawPile.push(card("8"));
  state = act(state, 0, { type: "DRAW" });
  assert.equal(applyUnoAction(state, 0, { type: "PLAY", cardId: held, handVersion: state.players[0].handVersion }, 1).error, "ONLY_DRAWN_CARD");
  state = act(state, 0, { type: "PASS" });
  state = play(state, 1);
  state = play(state, 0);
  assert.equal(state.players[0].hand.length, 1);
  assert.equal(state.players[0].hand[0].value, "8");
});

test("+2 draws and skips; noncontiguous seat rotation follows direction", () => {
  let state = fixture();
  state.players[1].seat = 4;
  state.players[2].seat = 9;
  state.players[0].hand[0] = card("draw2");
  state = play(state, 0);
  assert.equal(state.players[1].hand.length, 4);
  assert.equal(state.turnSeat, 9);
  state.players[2].hand[0] = card("reverse");
  state = play(state, 9);
  assert.equal(state.direction, -1);
  assert.equal(state.turnSeat, 4);
});

test("legacy: two-player reverse/skip returns to actor; an immediate numeric finish has no report pause", () => {
  for (const value of ["reverse", "skip"] as const) {
    let state = fixture(2);
    state.players[0].hand = [card(value), card("8")];
    state = play(state, 0);
    assert.equal(state.turnSeat, 0);
    assert.equal(state.players[0].grace, true);
    state = play(state, 0);
    assert.equal(state.phase, "ROUND_END");
    assert.equal(state.deadlineAt, null);
    assert.equal(state.roundResult?.winnerSeat, 0);
  }
});

test("wild4 legality freezes before colour changes; challenge success draws offender and retains target turn", () => {
  let state = fixture();
  state.players[0].hand = [card("wild4"), card("9")];
  state = play(state, 0, 0, "blue");
  assert.equal(state.phase, "CHALLENGE");
  assert.equal(state.currentColor, "blue");
  assert.equal(state.challenge?.illegal, true);
  assert.equal(state.deadlineAt, 15_001);
  state = act(state, 1, { type: "CHALLENGE_DRAW_FOUR" });
  assert.equal(state.players[0].hand.length, 5);
  assert.equal(state.players[0].declared, false);
  assert.equal(state.turnSeat, 1);
  assert.equal(state.phase, "PLAYING");
});

test("legal wild4 failed challenge draws six and acceptance draws four, both skip target", () => {
  for (const type of ["CHALLENGE_DRAW_FOUR", "ACCEPT_DRAW_FOUR"] as const) {
    let state = fixture();
    state.players[0].hand = [card("wild4"), card("9", "green")];
    state = play(state, 0, 0, "yellow");
    state = act(state, 1, { type });
    assert.equal(state.players[1].hand.length, type === "CHALLENGE_DRAW_FOUR" ? 8 : 6);
    assert.equal(state.turnSeat, 2);
  }
});

test("only a matching colour makes +4 illegal; another wild or matching number does not", () => {
  for (const other of [card("wild"), card("5", "blue")]) {
    let state = fixture();
    state.players[0].hand = [card("wild4"), other];
    state = play(state, 0, 0, "green");
    assert.equal(state.challenge?.illegal, false);
  }
});

test("legacy: UNO declaration works off turn and is broadcast once without ending any grace", () => {
  let state = fixture();
  single(state, 1, "8", "red", true);
  state = act(state, 1, { type: "CALL_UNO", episodeId: 1 });
  assert.equal(state.players[1].declared, true);
  assert.equal(state.players[1].grace, true);
  assert.equal(act(state, 1, { type: "CALL_UNO", episodeId: 1 }), state);
  assert.equal(state.events.filter((e) => e.kind === "UNO").length, 1);
  assert.equal(act(state, 0, { type: "CALL_UNO", episodeId: 0 }), state);
});

test("legacy: new one-card grace survives its creation; next play opens old grace but preserves new grace", () => {
  let state = fixture();
  state = play(state, 0);
  const report = catchAction(state, 0);
  assert.equal(state.players[0].grace, true);
  assert.equal(applyUnoAction(state, 1, report, 1).error, "INVALID_REPORT");
  state = play(state, 1);
  assert.equal(state.players[0].grace, false);
  assert.equal(state.players[1].grace, true);
  const turn = state.turnSeat;
  state = act(state, 2, report);
  assert.equal(state.players[0].hand.length, 3);
  assert.equal(state.turnSeat, turn);
  assert.equal(state.players[1].grace, true);
});

test("legacy: ordinary draw and timeout close grace but +4 resolution does not", () => {
  let state = fixture();
  single(state, 2, "7", "red", true);
  state.drawPile.push(card("8", "blue"));
  const drawn = act(state, 0, { type: "DRAW" });
  assert.equal(drawn.players[2].grace, false);
  assert.equal(advanceUnoDeadline(state, 60_000, random).players[2].grace, false);
  state.players[0].hand[0] = card("wild4");
  state = play(state, 0, 0, "green");
  assert.equal(state.players[0].grace, true);
  state = act(state, 1, { type: "ACCEPT_DRAW_FOUR" });
  assert.equal(state.players[0].grace, true);
});

test("legacy: false reports penalize reporter once and stale/grace/self reports never punish", () => {
  let state = fixture();
  single(state, 1);
  state = act(state, 1, { type: "CALL_UNO", episodeId: 1 });
  const report = catchAction(state, 1);
  state = act(state, 0, report);
  assert.equal(state.players[0].hand.length, 4);
  assert.equal(state.players[1].declared, true);
  assert.equal(applyUnoAction(state, 0, report, 1).error, "DUPLICATE_REPORT");
  assert.equal(applyUnoAction(state, 1, report, 1).error, "INVALID_REPORT");
  assert.equal(applyUnoAction(state, 2, { ...report, type: "CATCH_UNO", targetSeat: 1, episodeId: 99, roundNumber: 1 }, 1).error, "INVALID_REPORT");
  assert.equal(state.players[2].hand.length, 2);
});

test("hand growth clears declaration; later reduction creates another report episode", () => {
  let state = fixture(2);
  single(state, 0);
  state = act(state, 0, { type: "CALL_UNO", episodeId: 1 });
  state.drawPile.push(card("8"));
  state = act(state, 0, { type: "DRAW" });
  assert.equal(state.players[0].declared, false);
  state = play(state, 0, 1);
  assert.equal(state.players[0].episodeId, 2);
  assert.equal(state.players[0].grace, true);
  assert.equal(applyUnoAction(state, 0, { type: "CALL_UNO", episodeId: 1 }, 1).error, "STALE_HAND");
  assert.equal(state.players[0].declared, false);
});

test("caught-first invalidates the old final play; play-first settles permanently", () => {
  let state = fixture();
  single(state, 0);
  const command: UnoAction = { type: "PLAY", cardId: state.players[0].hand[0].id, handVersion: state.players[0].handVersion };
  const report = catchAction(state, 0);
  const caught = act(state, 1, report);
  assert.equal(applyUnoAction(caught, 0, command, 1).error, "STALE_HAND");
  const ended = act(state, 0, command);
  assert.equal(ended.phase, "ROUND_END");
  const after = applyUnoAction(ended, 1, report, 1);
  assert.equal(after.error, "WRONG_PHASE");
  assert.equal(after.state, ended);
  assert.equal(ended.players[0].hand.length, 0);
});

test("declaration-first makes report false; report-first prevents declaration", () => {
  const state = fixture();
  single(state, 0);
  const report = catchAction(state, 0);
  const declared = act(state, 0, { type: "CALL_UNO", episodeId: 1 });
  assert.equal(act(declared, 1, report).players[1].hand.length, 4);
  const caught = act(state, 1, report);
  const declaration = act(caught, 0, { type: "CALL_UNO", episodeId: 1 });
  assert.equal(declaration.players[0].declared, false);
  assert.equal(declaration.players[0].hand.length, 3);
});

test("numeric last card must still match and scoring settles once, then rematch increments match", () => {
  let state = fixture();
  single(state, 0, "8", "blue");
  const bad = applyUnoAction(state, 0, { type: "PLAY", cardId: state.players[0].hand[0].id, handVersion: 1 }, 1);
  assert.equal(bad.error, "CARD_NOT_PLAYABLE");
  state.players[0].hand[0].color = "red";
  state.players[0].score = 480;
  state.players[1].hand = [card("9"), card("reverse"), card("wild4")];
  state.players[2].hand = [card("0")];
  state = play(state, 0);
  assert.equal(state.phase, "FINISHED");
  assert.equal(state.roundResult?.points, 79);
  assert.equal(state.players[0].score, 559);
  assert.equal(applyUnoAction(state, 0, { type: "CALL_UNO", episodeId: 1 }, 1).error, "WRONG_PHASE");
  const rematch = act(state, 0, { type: "REMATCH" });
  assert.equal(rematch.matchNumber, 2);
  assert.equal(rematch.roundNumber, 1);
  assert.ok(rematch.players.every((p) => p.score === 0));
});

test("next round rotates dealer and preserves scores", () => {
  let state = fixture();
  single(state, 0);
  state = play(state, 0);
  const score = state.players[0].score;
  state = act(state, 0, { type: "NEXT_ROUND" });
  assert.equal(state.dealerSeat, 1);
  assert.equal(state.roundNumber, 2);
  assert.equal(state.players[0].score, score);
});

test("single mode finishes the first numeric win even when remaining cards score zero", () => {
  for (const zeroPoints of [false, true]) {
    let state = fixture();
    state.matchMode = "single";
    single(state, 0);
    if (zeroPoints) for (const player of state.players.slice(1)) player.hand = [card("0")];
    state = play(state, 0);
    assert.equal(state.phase, "FINISHED");
    assert.equal(state.roundNumber, 1);
    assert.equal(state.roundResult?.winnerSeat, 0);
    assert.equal(state.roundResult?.points, zeroPoints ? 0 : 24);
    assert.equal(state.players[0].score, zeroPoints ? 0 : 24);
    assert.equal(state.targetScore, 500);
    assert.equal(state.deadlineAt, null);
    assert.equal(getUnoViewerState(state, 0).matchMode, "single");
    assert.equal(applyUnoAction(state, 0, { type: "NEXT_ROUND" }, 1).error, "WRONG_PHASE");
    const rematch = act(state, 0, { type: "REMATCH" });
    assert.equal(rematch.matchMode, "single");
    assert.equal(rematch.matchNumber, 2);
    assert.equal(rematch.roundNumber, 1);
    assert.ok(rematch.players.every((player) => player.score === 0));
  }
});

test("legacy: single mode retains the numeric-final restriction for every action card", () => {
  for (const value of ["skip", "reverse", "draw2", "wild", "wild4"] as const) {
    const state = fixture();
    state.matchMode = "single";
    single(state, 0, value);
    const result = applyUnoAction(state, 0, { type: "PLAY", cardId: state.players[0].hand[0].id, handVersion: state.players[0].handVersion, color: "red" }, 1);
    assert.equal(result.error, "LAST_CARD_MUST_BE_NUMBER");
    assert.equal(result.state, state);
    assert.equal(state.phase, "PLAYING");
  }
});

test("default score mode retains rounds until 500 and explicit single mode survives dealing", () => {
  const roster = [{ seat: 0, name: "One" }, { seat: 1, name: "Two" }];
  const lobby = createUnoState(roster);
  assert.equal(lobby.matchMode, "score");
  assert.equal(lobby.targetScore, 500);
  const singleLobby = createUnoState(roster, { matchMode: "single" });
  assert.equal(startUnoGame(singleLobby, 0, random).state.matchMode, "single");
  let state = fixture();
  single(state, 0);
  state = play(state, 0);
  assert.equal(state.phase, "ROUND_END");
  assert.equal(state.matchMode, "score");
  state = act(state, 0, { type: "NEXT_ROUND" });
  assert.equal(state.roundNumber, 2);
  assert.equal(state.matchMode, "score");
  state.phase = "ROUND_END";
  state.matchMode = "single";
  assert.equal(applyUnoAction(state, 0, { type: "NEXT_ROUND" }, 1).error, "WRONG_PHASE");
});

test("legacy persisted states without a match mode behave and normalize as score mode", () => {
  let state = fixture();
  delete state.matchMode;
  assert.equal(getUnoViewerState(state, 0).matchMode, "score");
  single(state, 0);
  state = play(state, 0);
  assert.equal(state.phase, "ROUND_END");
  assert.equal(state.matchMode, "score");
  delete state.matchMode;
  state = act(state, 0, { type: "NEXT_ROUND" });
  assert.equal(state.matchMode, "score");
  delete state.matchMode;
  state = advanceUnoDeadline(state, state.deadlineAt!, random);
  assert.equal(state.matchMode, "score");
  delete state.matchMode;
  state.phase = "FINISHED";
  assert.equal(act(state, 0, { type: "REMATCH" }).matchMode, "score");
  const lobby = createUnoState([{ seat: 0, name: "One" }, { seat: 1, name: "Two" }]);
  delete lobby.matchMode;
  assert.equal(startUnoGame(lobby, 0, random).state.matchMode, "score");
});

test("recycling retains top card and chosen colour without exposing or duplicating cards", () => {
  let state = fixture();
  const wild = card("wild");
  const refill = card("9", "blue");
  state.discard = [refill, wild];
  state.currentColor = "yellow";
  state.drawPile = [];
  state = act(state, 0, { type: "DRAW" });
  assert.deepEqual(state.discard, [wild]);
  assert.equal(state.currentColor, "yellow");
  assert.equal(state.players[0].hand.at(-1)?.id, refill.id);
  assert.equal(state.drawPile.length, 0);
});

test("an empty recyclable deck cannot repeatedly punish the same report episode", () => {
  let state = fixture();
  state.drawPile = [];
  single(state, 1);
  const report = catchAction(state, 1);
  state = act(state, 0, report);
  assert.equal(state.players[1].hand.length, 1);
  assert.equal(applyUnoAction(state, 2, report, 1).error, "DUPLICATE_REPORT");
});

test("deadlines reject late commands and advance once; timeout never draws twice", () => {
  let state = fixture();
  assert.equal(applyUnoAction(state, 0, { type: "DRAW" }, 60_000).error, "DEADLINE_EXPIRED");
  const earlier = advanceUnoDeadline(state, 59_999, random);
  assert.equal(earlier, state);
  state.drawPile.push(card("8"));
  state = act(state, 0, { type: "DRAW" });
  const size = state.players[0].hand.length;
  state = advanceUnoDeadline(state, 60_000, random);
  assert.equal(state.players[0].hand.length, size);
  assert.equal(state.turnSeat, 1);
  assert.equal(advanceUnoDeadline(state, 60_000, random), state);
  assert.equal(state.deadlineAt, 120_000);
});

test("legacy: challenge timeout accepts four without closing offender's new grace", () => {
  let state = fixture();
  state.players[0].hand[0] = card("wild4");
  state = play(state, 0, 0, "blue");
  state = advanceUnoDeadline(state, 15_001, random);
  assert.equal(state.players[1].hand.length, 6);
  assert.equal(state.turnSeat, 2);
  assert.equal(state.players[0].grace, true);
});

test("opening wild colour is chosen without consuming the player's turn", () => {
  let state = fixture();
  state.discard = [card("wild")];
  state.currentColor = null;
  state.colorChoiceSeat = 0;
  const version = state.turnId;
  assert.equal(applyUnoAction(state, 0, { type: "DRAW" }, 1).error, "CHOOSE_COLOR");
  state = act(state, 0, { type: "CHOOSE_COLOR", color: "yellow" });
  assert.equal(state.turnId, version);
  assert.equal(state.turnSeat, 0);
  assert.equal(state.currentColor, "yellow");
  assert.equal(state.colorChoiceSeat, null);
});

test("viewer snapshots never contain opponent cards, deck order, declaration or challenge evidence", () => {
  let state = fixture();
  state.players[0].hand = [card("wild4"), card("8")];
  const hidden = state.players[0].hand[1].id;
  const hiddenDeck = state.drawPile[0].id;
  state = play(state, 0, 0, "yellow");
  state = act(state, 0, { type: "CALL_UNO", episodeId: state.players[0].episodeId });
  const view = getUnoViewerState(state, 1);
  const encoded = JSON.stringify(view);
  assert.equal(encoded.includes(hidden), false);
  assert.equal(encoded.includes(hiddenDeck), false);
  assert.equal("illegal" in view.challenge!, false);
  assert.equal("grace" in view.players[0], false);
  assert.equal("declared" in view.players[0], false);
  assert.equal("drawPile" in view, false);
  assert.deepEqual(view.hand, state.players[1].hand);
  assert.equal(view.declared, false);
  assert.equal(getUnoViewerState(state, 0).declared, true);
  view.hand[0].value = "0";
  assert.notEqual(state.players[1].hand[0].value, "0");
});

test("false-report feedback is private to the reporter", () => {
  let state = fixture();
  single(state, 1);
  state = act(state, 1, { type: "CALL_UNO", episodeId: 1 });
  state = act(state, 0, catchAction(state, 1));
  assert.equal(getUnoViewerState(state, 0).events.some((entry) => entry.kind === "FALSE_CATCH"), true);
  assert.equal(getUnoViewerState(state, 1).events.some((entry) => entry.kind === "FALSE_CATCH"), false);
  assert.equal(getUnoViewerState(state, 2).events.some((entry) => entry.kind === "FALSE_CATCH"), false);
});

test("all opening effects use the dealer and initial direction correctly", () => {
  const seen = new Set<UnoValue>();
  for (let initialSeed = 1; initialSeed < 500 && seen.size < 5; initialSeed += 1) {
    let seed = initialSeed;
    const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const state = startUnoGame(createUnoState([0, 1, 2].map((seat) => ({ seat, name: `P${seat}` }))), 0, rng).state;
    const top = state.discard[0];
    if (!["wild", "draw2", "skip", "reverse", "0"].includes(top.value)) continue;
    seen.add(top.value);
    const first = (state.dealerSeat + 1) % 3;
    if (top.value === "reverse") {
      assert.equal(state.direction, -1);
      assert.equal(state.turnSeat, state.dealerSeat);
    } else if (top.value === "skip") {
      assert.equal(state.turnSeat, (first + 1) % 3);
    } else if (top.value === "draw2") {
      assert.equal(state.turnSeat, first);
      assert.equal(state.players[first].hand.length, 7);
      assert.deepEqual(state.pendingDraw, { value: "draw2", count: 2 });
    } else {
      assert.equal(state.turnSeat, first);
      assert.equal(state.colorChoiceSeat, top.value === "wild" ? first : null);
    }
  }
  assert.equal(seen.size, 5);
});

test("seeded classic rounds conserve every card and reach an immediate finish", () => {
  for (let game = 1; game <= 12; game += 1) {
    let seed = game;
    const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const count = 2 + game % 9;
    let state = startUnoGame(createUnoState(Array.from({ length: count }, (_, seat) => ({ seat, name: `P${seat}` }))), 0, rng).state;
    for (let step = 0; step < 3_000 && (state.phase === "PLAYING" || state.phase === "CHALLENGE"); step += 1) {
      const actor = state.turnSeat;
      let action: UnoAction;
      if (state.phase === "CHALLENGE") action = { type: rng() < 0.5 ? "CHALLENGE_DRAW_FOUR" : "ACCEPT_DRAW_FOUR" };
      else if (state.colorChoiceSeat !== null) action = { type: "CHOOSE_COLOR", color: "red" };
      else {
        const view = getUnoViewerState(state, actor);
        const playable = view.hand.filter((held) => isUnoCardPlayable(view, held));
        const held = playable[Math.floor(rng() * playable.length)];
        action = held ? { type: "PLAY", cardId: held.id, handVersion: view.handVersion, color: ["red", "yellow", "green", "blue"][Math.floor(rng() * 4)] as UnoColor } : { type: view.drawnCardId ? "PASS" : "DRAW" };
      }
      const result = applyUnoAction(state, actor, action, 1, rng);
      assert.equal(result.error, undefined);
      state = result.state;
      const cards = [...state.drawPile, ...state.discard, ...state.players.flatMap((p) => p.hand)];
      assert.equal(cards.length, 108);
      assert.equal(new Set(cards.map((c) => c.id)).size, 108);
      assert.ok(state.players.every((p) => !p.declared || p.hand.length === 1));
      assert.ok(state.players.some((p) => p.seat === state.turnSeat));
    }
    assert.ok(state.phase === "ROUND_END" || state.phase === "FINISHED", `seed ${game} did not finish`);
    assert.equal(state.rulesetVersion, 3);
    assert.equal(state.players.find(p => p.seat === state.roundResult?.winnerSeat)!.hand.length, 0);
    assert.equal(state.deadlineAt, null);
  }
});
