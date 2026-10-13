import assert from "node:assert/strict";
import test from "node:test";
import { advanceUnoDeadline, applyUnoAction, createUnoDeck, createUnoState, getUnoViewerState, isUnoCardPlayable, startUnoGame, unoCardPoints } from "./unoEngine";
import { configureUnoLobby, DEFAULT_UNO_RULES, getUnoRules } from "./unoRules";
import { getUnoCopy, unoEventLabel } from "./unoCopy";
import { getUnoExperienceCopy, unoVerdictExplanation } from "./unoExperienceCopy";
import type { UnoAction, UnoColor, UnoRuleSettings, UnoState, UnoValue } from "./unoTypes";

function fixture(count = 3, rules: Partial<UnoRuleSettings> = {}) {
  const state = createUnoState(Array.from({ length: count }, (_, seat) => ({ seat, name: `P${seat}` })), rules);
  state.phase = "PLAYING"; state.roundNumber = 1; state.turnId = 1; state.deadlineAt = 60_000;
  const deck = createUnoDeck();
  const take = (id: string) => deck.splice(deck.findIndex(card => card.id === id), 1)[0];
  state.discard = [take("red-5-0")]; state.currentColor = "red";
  state.players.forEach(player => { player.hand = [take(`blue-${player.seat + 1}-0`), take(`green-${player.seat + 1}-0`)]; player.handVersion = 1; });
  state.drawPile = deck;
  return state;
}
function hand(state: UnoState, seat: number, ids: string[]) {
  const pool = [...state.drawPile, ...state.players[seat].hand];
  state.players[seat].hand = ids.map(id => { const index = pool.findIndex(card => card.id === id); assert.ok(index >= 0, id); return pool.splice(index, 1)[0]; });
  state.drawPile = pool;
}
function act(state: UnoState, seat: number, action: UnoAction) {
  const result = applyUnoAction(state, seat, action, 1, () => .5);
  assert.equal(result.error, undefined);
  return result.state;
}
function play(state: UnoState, seat: number, id = state.players[seat].hand[0].id, color: UnoColor = "blue") {
  return act(state, seat, { type: "PLAY", cardId: id, color, handVersion: state.players[seat].handVersion });
}
function conserved(state: UnoState) {
  const cards = [...state.drawPile, ...state.discard, ...state.players.flatMap(player => player.hand)];
  assert.equal(cards.length, 108);
  assert.equal(new Set(cards.map(card => card.id)).size, 108);
}

test("new rooms default to same-type stacking, no +4 challenge, and action-card finishes", () => {
  const state = createUnoState([{ seat: 0, name: "Host" }]);
  assert.equal(state.rulesetVersion, 3);
  assert.deepEqual(getUnoRules(state), DEFAULT_UNO_RULES);
  assert.equal(state.pendingDraw, null);
  assert.deepEqual(getUnoRules(getUnoViewerState(state, 0)), DEFAULT_UNO_RULES);
});

test("rule switches are independent, clear the old lobby rules, and freeze after start", () => {
  const original = createUnoState([{ seat: 0, name: "A" }, { seat: 1, name: "B" }]);
  const configured = configureUnoLobby(original, { stackDraws: false, challengeDrawFour: true, allowActionFinish: false }).state;
  assert.deepEqual(getUnoRules(original), DEFAULT_UNO_RULES);
  assert.deepEqual(getUnoRules(configured), { stackDraws: false, challengeDrawFour: true, allowActionFinish: false });
  assert.deepEqual(getUnoRules(startUnoGame(configured, 0, () => .5).state), getUnoRules(configured));
  for (const phase of ["PLAYING", "CHALLENGE", "ROUND_END", "FINISHED"] as const) {
    const running = { ...configured, phase };
    assert.equal(configureUnoLobby(running, { stackDraws: true }).error, "WRONG_PHASE");
    assert.equal(configureUnoLobby(running, { stackDraws: true }).state, running);
  }
});

test("+2 stacks across colours, accumulating six; drawing consumes the penalty and skips", () => {
  let state = fixture();
  hand(state, 0, ["red-draw2-0", "red-7-0"]);
  hand(state, 1, ["blue-draw2-0", "yellow-7-0"]);
  hand(state, 2, ["yellow-draw2-0", "green-7-0"]);
  for (const seat of [0, 1, 2]) {
    state = play(state, seat);
    assert.deepEqual(state.pendingDraw, { value: "draw2", count: (seat + 1) * 2 });
    assert.equal(state.turnSeat, (seat + 1) % 3);
    assert.equal(state.phase, "PLAYING");
    conserved(state);
  }
  state = act(state, 0, { type: "DRAW" });
  assert.equal(state.players[0].hand.length, 7);
  assert.equal(state.pendingDraw, null);
  assert.equal(state.drawnCardId, null);
  assert.equal(state.turnSeat, 1);
  assert.equal(state.events.at(-1)?.count, 6);
  conserved(state);
});

test("+4 stacks freely without a challenge, changes colour, and passes eight to the next player", () => {
  let state = fixture();
  hand(state, 0, ["wild4-0", "red-7-0"]);
  hand(state, 1, ["wild4-1", "blue-7-0"]);
  state = play(state, 0);
  assert.equal(state.phase, "PLAYING"); assert.equal(state.challenge, null);
  assert.equal(applyUnoAction(state, 1, { type: "CHALLENGE_DRAW_FOUR" }, 1).error, "INVALID_ACTION");
  state = play(state, 1, undefined, "green");
  assert.equal(state.currentColor, "green");
  assert.deepEqual(state.pendingDraw, { value: "wild4", count: 8 });
  state = act(state, 2, { type: "DRAW" });
  assert.equal(state.players[2].hand.length, 10);
  assert.equal(state.turnSeat, 0); assert.equal(state.pendingDraw, null);
  conserved(state);
});

for (const value of ["draw2", "wild4"] as const) {
  test(`${value}: pending penalties reject mixing, normal cards, stale and out-of-turn plays`, () => {
    let state = fixture();
    hand(state, 0, [value === "draw2" ? "red-draw2-0" : "wild4-0", "red-7-0"]);
    hand(state, 1, ["blue-draw2-0", "wild4-1", "red-skip-0", "blue-8-0", "wild-0"]);
    state = play(state, 0);
    const view = getUnoViewerState(state, 1);
    for (const card of view.hand) {
      assert.equal(isUnoCardPlayable(view, card), card.value === value);
      if (card.value !== value) assert.equal(applyUnoAction(state, 1, { type: "PLAY", cardId: card.id, color: "green", handVersion: view.handVersion }, 1).error, "CARD_NOT_PLAYABLE");
    }
    const valid = view.hand.find(card => card.value === value)!;
    assert.equal(applyUnoAction(state, 1, { type: "PLAY", cardId: valid.id, color: "green", handVersion: 0 }, 1).error, "STALE_HAND");
    assert.equal(applyUnoAction(state, 2, { type: "DRAW" }, 1).error, "NOT_YOUR_TURN");
    assert.equal(applyUnoAction(state, 1, { type: "PASS" }, 1).error, "MUST_DRAW_FIRST");
    conserved(state);
  });
}

test("a player may take the penalty while holding a valid stack card", () => {
  let state = fixture();
  hand(state, 0, ["red-draw2-0", "red-7-0"]); hand(state, 1, ["blue-draw2-0", "green-8-0"]);
  state = act(play(state, 0), 1, { type: "DRAW" });
  assert.equal(state.players[1].hand.length, 4);
  assert.ok(state.players[1].hand.some(card => card.id === "blue-draw2-0"));
  assert.equal(state.turnSeat, 2);
});

test("accumulated draws refill an exhausted deck without drawing the top card or losing the colour", () => {
  for (const value of ["draw2", "wild4"] as const) {
    let state = fixture();
    for (let seat = 0; seat < 3; seat++) hand(state, seat, [value === "draw2" ? `${["red", "blue", "green"][seat]}-draw2-0` : `wild4-${seat}`, `${["red", "yellow", "green"][seat]}-7-0`]);
    for (const seat of [0, 1, 2]) state = play(state, seat, undefined, "green");
    const penalty = state.pendingDraw!.count;
    state.discard.splice(-1, 0, ...state.drawPile.splice(0, penalty));
    state.players[1].hand.push(...state.drawPile.splice(0, state.drawPile.length - 1));
    const top = structuredClone(state.discard.at(-1)), before = state.players[0].hand.length;
    state = act(state, 0, { type: "DRAW" });
    assert.equal(state.players[0].hand.length, before + penalty);
    assert.deepEqual(state.discard, [top]); assert.equal(state.currentColor, "green");
    assert.equal(state.players[0].hand.some(card => card.id === top!.id), false);
    assert.equal(state.drawnCardId, null); assert.equal(state.pendingDraw, null); assert.equal(state.turnSeat, 1);
    conserved(state);
  }
});

test("a reversed stack follows the direction and two-player stacks return to the first player", () => {
  for (const count of [2, 3]) {
    let state = fixture(count); state.direction = -1;
    hand(state, 0, ["red-draw2-0", "red-7-0"]);
    hand(state, count - 1, ["blue-draw2-0", "yellow-7-0"]);
    state = play(state, 0); assert.equal(state.turnSeat, count - 1);
    state = play(state, count - 1); assert.equal(state.turnSeat, count === 2 ? 0 : 1);
    assert.equal(state.pendingDraw?.count, 4);
  }
});

test("penalty timeouts draw the accumulated total once, clear it, and skip the player", () => {
  let state = fixture();
  hand(state, 0, ["red-draw2-0", "red-7-0"]); hand(state, 1, ["blue-draw2-0", "yellow-7-0"]);
  state = play(play(state, 0), 1);
  const deadline = state.deadlineAt!;
  state = advanceUnoDeadline(state, deadline, () => .5);
  assert.equal(state.players[2].hand.length, 6);
  assert.equal(state.pendingDraw, null); assert.equal(state.turnSeat, 0);
  assert.equal(state.events.at(-1)?.kind, "TIMEOUT"); assert.equal(state.events.at(-1)?.count, 4);
  assert.equal(advanceUnoDeadline(state, deadline), state);
});

test("turning stacking off applies +2 and +4 immediately with no challenge", () => {
  for (const value of ["draw2", "wild4"] as const) {
    let state = fixture(3, { stackDraws: false });
    hand(state, 0, [value === "draw2" ? "red-draw2-0" : "wild4-0", "red-7-0"]);
    state = play(state, 0);
    assert.equal(state.phase, "PLAYING"); assert.equal(state.turnSeat, 2);
    assert.equal(state.pendingDraw, null); assert.equal(state.challenge, null);
    assert.equal(state.players[1].hand.length, value === "draw2" ? 4 : 6);
  }
});

for (const illegal of [true, false]) {
  test(`optional +4 challenge with an eight-card stack: ${illegal ? "success" : "failure"}`, () => {
    let state = fixture(3, { challengeDrawFour: true });
    hand(state, 0, ["wild4-0", "green-7-0"]);
    hand(state, 1, ["wild4-1", illegal ? "blue-7-0" : "yellow-7-0"]);
    state = play(state, 0);
    assert.equal(state.phase, "CHALLENGE");
    assert.equal(isUnoCardPlayable(getUnoViewerState(state, 1), state.players[1].hand[0]), true);
    state = play(state, 1, undefined, "green");
    assert.equal(state.pendingDraw?.count, 8);
    const serialized = JSON.stringify(getUnoViewerState(state, 2));
    assert.equal(serialized.includes("illegal"), false);
    state = act(state, 2, { type: "CHALLENGE_DRAW_FOUR" });
    assert.equal(state.players[illegal ? 1 : 2].hand.length, illegal ? 9 : 12);
    assert.equal(state.turnSeat, illegal ? 2 : 0);
    assert.equal(state.events.at(-1)?.count, illegal ? 8 : 10);
    assert.equal(state.pendingDraw, null); assert.equal(state.challenge, null);
    conserved(state);
  });
}

test("optional +4 acceptance and timeout take eight, with no extra two", () => {
  for (const timeout of [false, true]) {
    let state = fixture(3, { challengeDrawFour: true });
    hand(state, 0, ["wild4-0", "red-7-0"]); hand(state, 1, ["wild4-1", "yellow-7-0"]);
    state = play(play(state, 0), 1);
    state = timeout ? advanceUnoDeadline(state, state.deadlineAt!, () => .5) : act(state, 2, { type: "ACCEPT_DRAW_FOUR" });
    assert.equal(state.players[2].hand.length, 10); assert.equal(state.turnSeat, 0); assert.equal(state.pendingDraw, null);
  }
});

test("a missed-UNO report during a +4 challenge preserves the stack and the frozen legality", () => {
  let state = fixture(3, { challengeDrawFour: true });
  hand(state, 0, ["wild4-0", "red-7-0"]); hand(state, 1, ["wild4-1", "blue-7-0"]);
  state = play(play(state, 0), 1, undefined, "green");
  const episode = state.players[1].episodeId;
  state = act(state, 2, { type: "CATCH_UNO", targetSeat: 1, episodeId: episode, roundNumber: 1 });
  assert.equal(state.players[1].hand.length, 3); assert.equal(state.pendingDraw?.count, 8);
  assert.equal(state.phase, "CHALLENGE"); assert.equal(state.challenge?.illegal, true);
  const view = JSON.stringify(getUnoViewerState(state, 2));
  assert.equal(view.includes("illegal"), false); assert.equal(view.includes("unoReportOpen"), false);
  state = act(state, 2, { type: "CHALLENGE_DRAW_FOUR" });
  assert.equal(state.players[1].hand.length, 11); assert.equal(state.turnSeat, 2);
  assert.equal(state.pendingDraw, null); assert.equal(state.challenge, null);
  assert.equal(applyUnoAction(state, 0, { type: "CATCH_UNO", targetSeat: 1, episodeId: episode, roundNumber: 1 }, 1).error, "INVALID_REPORT");
  conserved(state);
});

for (const value of ["skip", "reverse", "draw2", "wild", "wild4"] as UnoValue[]) {
  test(`${value}: action finishes default on, while the room may forbid them`, () => {
    for (const allowed of [true, false]) {
      let state = fixture(3, { allowActionFinish: allowed });
      hand(state, 0, [value === "wild" || value === "wild4" ? `${value}-0` : `red-${value}-0`]);
      assert.equal(isUnoCardPlayable(getUnoViewerState(state, 0), state.players[0].hand[0]), allowed);
      if (allowed) { state = play(state, 0); assert.equal(state.phase, "ROUND_END"); assert.equal(state.pendingDraw, null); conserved(state); }
      else assert.equal(applyUnoAction(state, 0, { type: "PLAY", cardId: state.players[0].hand[0].id, color: "blue", handVersion: 1 }, 1).error, "LAST_CARD_MUST_BE_NUMBER");
    }
  });
}

test("a final stacked draw card settles the entire penalty before immediately scoring", () => {
  for (const value of ["draw2", "wild4"] as const) {
    let state = fixture(2);
    hand(state, 0, [value === "draw2" ? "red-draw2-0" : "wild4-0", "red-7-0"]);
    hand(state, 1, [value === "draw2" ? "blue-draw2-0" : "wild4-1"]);
    state = play(play(state, 0), 1);
    assert.equal(state.phase, "ROUND_END"); assert.equal(state.roundResult?.winnerSeat, 1);
    assert.equal(state.players[0].hand.length, value === "draw2" ? 5 : 9);
    assert.equal(state.roundResult?.points, state.players[0].hand.reduce((sum, card) => sum + unoCardPoints(card), 0));
    assert.equal(state.pendingDraw, null); assert.equal(state.challenge, null); assert.equal(state.deadlineAt, null);
    conserved(state);
  }
});

test("stacking keeps manual UNO and closes missed-UNO reporting on the next accepted stack", () => {
  let state = fixture();
  hand(state, 0, ["red-draw2-0", "red-7-0"]); hand(state, 1, ["blue-draw2-0", "yellow-7-0"]);
  state = play(state, 0);
  const episode = state.players[0].episodeId;
  assert.equal(state.players[0].unoReportOpen, true);
  assert.equal("unoReportOpen" in getUnoViewerState(state, 1).players[0], false);
  const caught = act(state, 2, { type: "CATCH_UNO", targetSeat: 0, episodeId: episode, roundNumber: 1 });
  assert.equal(caught.players[0].hand.length, 3); assert.equal(caught.pendingDraw?.count, 2);
  state = play(state, 1);
  assert.equal(state.players[0].unoReportOpen, false); assert.equal(state.players[1].unoReportOpen, true);
  assert.equal(applyUnoAction(state, 2, { type: "CATCH_UNO", targetSeat: 0, episodeId: episode, roundNumber: 1 }, 1).error, "INVALID_REPORT");
});

test("room rule choices survive next rounds and rematches; running v2 matches stay classic", () => {
  let state = fixture(2, { stackDraws: false, challengeDrawFour: true, allowActionFinish: false });
  hand(state, 0, ["red-7-0"]); state = play(state, 0);
  const rules = getUnoRules(state);
  assert.deepEqual(getUnoRules(act(state, 0, { type: "NEXT_ROUND" })), rules);
  state.phase = "FINISHED";
  assert.deepEqual(getUnoRules(act(state, 0, { type: "REMATCH" })), rules);
  const legacy = fixture(); legacy.rulesetVersion = 2;
  assert.deepEqual(getUnoRules(legacy), { stackDraws: false, challengeDrawFour: true, allowActionFinish: true });
  hand(legacy, 0, ["red-draw2-0", "red-7-0"]);
  const played = play(legacy, 0); assert.equal(played.pendingDraw, null); assert.equal(played.turnSeat, 2);
});

test("rule copy and draw-four events use the room choices and the actual accumulated count", () => {
  for (const locale of ["zh-CN", "en", "fr"]) {
    const defaults = getUnoCopy(locale);
    const custom = getUnoCopy(locale, 3, { stackDraws: false, challengeDrawFour: true, allowActionFinish: false });
    assert.notEqual(defaults.rule4, custom.rule4); assert.notEqual(defaults.rule5, custom.rule5);
    assert.notDeepEqual(getUnoExperienceCopy(locale).timeouts, getUnoExperienceCopy(locale, 3, { challengeDrawFour: true }).timeouts);
    const state = getUnoViewerState(fixture(), 0);
    assert.ok(unoEventLabel({ id: 1, kind: "CHALLENGE_LOST", seat: 0, count: 10 }, state, locale).includes("10"));
    for (const kind of ["CHALLENGE_WON", "CHALLENGE_LOST", "ACCEPT_DRAW_FOUR", "TIMEOUT"] as const) assert.ok(unoVerdictExplanation({ id: 1, kind, seat: 0, count: 10 }, locale)?.includes("10"));
  }
});

test("all eight rule combinations conserve the deck and complete a seeded round", () => {
  for (let bits = 0; bits < 8; bits++) {
    let seed = 17 + bits;
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const rules = { stackDraws: Boolean(bits & 1), challengeDrawFour: Boolean(bits & 2), allowActionFinish: Boolean(bits & 4) };
    let state = startUnoGame(createUnoState([0, 1, 2, 3].map(seat => ({ seat, name: `P${seat}` })), rules), 0, random).state;
    for (let step = 0; step < 3000 && ["PLAYING", "CHALLENGE"].includes(state.phase); step++) {
      const view = getUnoViewerState(state, state.turnSeat);
      const playable = view.hand.filter(card => isUnoCardPlayable(view, card));
      let action: UnoAction;
      if (state.phase === "CHALLENGE" && (!playable.length || random() < .5)) action = { type: random() < .5 ? "CHALLENGE_DRAW_FOUR" : "ACCEPT_DRAW_FOUR" };
      else if (state.colorChoiceSeat !== null) action = { type: "CHOOSE_COLOR", color: "red" };
      else if (playable.length) {
        const card = playable[Math.floor(random() * playable.length)];
        action = { type: "PLAY", cardId: card.id, handVersion: view.handVersion, color: ["red", "yellow", "green", "blue"][Math.floor(random() * 4)] as UnoColor };
      } else action = { type: view.drawnCardId ? "PASS" : "DRAW" };
      const result = applyUnoAction(state, state.turnSeat, action, 1, random);
      assert.equal(result.error, undefined); state = result.state; conserved(state);
      assert.deepEqual(getUnoRules(state), rules);
    }
    assert.ok(state.phase === "ROUND_END" || state.phase === "FINISHED", `rules ${bits} did not finish`);
    if (!rules.allowActionFinish) assert.ok(/^\d$/.test(state.discard.at(-1)!.value));
  }
});
