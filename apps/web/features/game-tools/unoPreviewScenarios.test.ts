import assert from "node:assert/strict";
import test from "node:test";
import { applyUnoAction, createUnoState, getUnoViewerState, isUnoCardPlayable, startUnoGame } from "./unoEngine";
import { applyUnoPreviewScenario, isUnoPreviewScenario } from "./unoPreviewScenarios";
import { getUnoRules } from "./unoRules";
import type { UnoRuleSettings } from "./unoTypes";

function deal(rules: Partial<UnoRuleSettings> = {}) {
  return startUnoGame(createUnoState([0, 1, 2, 3].map(seat => ({ seat, name: `P${seat}` })), rules), Date.now(), () => .5).state;
}

test("preview route accepts both new stacking scenarios and rejects unknown query values", () => {
  for (const value of ["draw-stack", "wild-stack"]) assert.equal(isUnoPreviewScenario(value), true);
  for (const value of [undefined, null, [], "", "draw-stack-extra"]) assert.equal(isUnoPreviewScenario(value), false);
});

test("preview scenarios preserve all eight room rule combinations", () => {
  for (let bits = 0; bits < 8; bits++) {
    const rules = { stackDraws: Boolean(bits & 1), challengeDrawFour: Boolean(bits & 2), allowActionFinish: Boolean(bits & 4) };
    for (const scenario of ["draw-stack", "wild-stack", "challenge"] as const) {
      const before = deal(rules), state = applyUnoPreviewScenario(before, scenario);
      assert.deepEqual(getUnoRules(state), rules);
      if (state.pendingDraw) assert.equal(rules.stackDraws, true);
      if (state.phase === "CHALLENGE") assert.equal(rules.challengeDrawFour, true);
      const cards = [...state.drawPile, ...state.discard, ...state.players.flatMap(player => player.hand)];
      assert.equal(cards.length, 108); assert.equal(new Set(cards.map(card => card.id)).size, 108);
      if (!rules.stackDraws && (scenario === "draw-stack" || scenario === "wild-stack")
        || !rules.challengeDrawFour && scenario === "challenge") assert.equal(state, before);
    }
  }
});

test("enabled stacking scenarios accept the advertised stack and accumulate the next penalty", () => {
  for (const [scenario, cardId, count] of [["draw-stack", "blue-draw2-0", 4], ["wild-stack", "wild4-1", 8]] as const) {
    const state = applyUnoPreviewScenario(deal(), scenario), view = getUnoViewerState(state, 0);
    const card = view.hand.find(card => card.id === cardId)!;
    assert.equal(isUnoCardPlayable(view, card), true);
    const played = applyUnoAction(state, 0, { type: "PLAY", cardId, handVersion: view.handVersion, color: "blue" }, Date.now());
    assert.equal(played.error, undefined); assert.equal(played.state.pendingDraw?.count, count);
    assert.equal(played.state.phase, "PLAYING");
  }
});

test("challenge preview respects stacking off and accepts exactly four cards", () => {
  const state = applyUnoPreviewScenario(deal({ stackDraws: false, challengeDrawFour: true }), "challenge");
  assert.equal(state.phase, "CHALLENGE"); assert.equal(state.pendingDraw, null);
  const before = state.players[0].hand.length;
  const accepted = applyUnoAction(state, 0, { type: "ACCEPT_DRAW_FOUR" }, Date.now());
  assert.equal(accepted.error, undefined); assert.equal(accepted.state.players[0].hand.length, before + 4);
  assert.equal(accepted.state.phase, "PLAYING"); assert.equal(accepted.state.turnSeat, 1);
});

test("UI playability agrees with command validation if a stale penalty survives stacking off", () => {
  const state = applyUnoPreviewScenario(deal(), "draw-stack"); state.stackDraws = false;
  const view = getUnoViewerState(state, 0);
  for (const card of view.hand) {
    assert.equal(isUnoCardPlayable(view, card), false);
    assert.equal(applyUnoAction(state, 0, { type: "PLAY", cardId: card.id, handVersion: view.handVersion }, Date.now()).error, "CARD_NOT_PLAYABLE");
  }
});
