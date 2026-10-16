import { applyUnoAction } from "./unoEngine";
import { getUnoRules } from "./unoRules";
import type { UnoState } from "./unoTypes";

export const UNO_PREVIEW_SCENARIOS = ["one-card", "two-cards", "function-last", "report", "challenge", "result", "many-cards", "draw-stack", "wild-stack"] as const;
export type UnoPreviewScenario = (typeof UNO_PREVIEW_SCENARIOS)[number];

export function isUnoPreviewScenario(value: unknown): value is UnoPreviewScenario {
  return typeof value === "string" && (UNO_PREVIEW_SCENARIOS as readonly string[]).includes(value);
}

export function applyUnoPreviewScenario(dealt: UnoState, scenario?: UnoPreviewScenario): UnoState {
  if (!scenario) return dealt;
  const rules = getUnoRules(dealt);
  // A focused fixture must not override the lobby's chosen rules. If its
  // required rule is off, continue with the regular deal instead.
  if ((scenario === "draw-stack" || scenario === "wild-stack") && !rules.stackDraws
    || scenario === "wild-stack" && rules.challengeDrawFour
    || scenario === "challenge" && !rules.challengeDrawFour) return dealt;
  const state = structuredClone(dealt);
  if (scenario === "many-cards") {
    const self = state.players.find(player => player.seat === 0)!;
    self.hand.push(...state.drawPile.splice(-(18 - self.hand.length)));
    self.handVersion += 1;
    return state;
  }
  const deck = [...state.drawPile, ...state.discard, ...state.players.flatMap(player => player.hand)];
  const take = (id: string) => deck.splice(deck.findIndex(card => card.id === id), 1)[0];
  state.discard = [take(scenario === "challenge" || scenario === "wild-stack" ? "wild4-0" : scenario === "draw-stack" ? "red-draw2-0" : "red-5-0")];
  const fewSeat = scenario === "report" ? 1 : 0;
  for (const player of state.players) {
    player.hand = player.seat === fewSeat && scenario !== "challenge" ? [take(scenario === "function-last" ? "red-skip-0" : "red-7-0")] : [];
    if (player.seat === fewSeat && scenario === "two-cards") player.hand.push(take("blue-7-0"));
    if (player.seat === 0 && (scenario === "draw-stack" || scenario === "wild-stack")) player.hand.push(take(scenario === "draw-stack" ? "blue-draw2-0" : "wild4-1"));
  }
  for (const player of state.players) {
    if (!player.hand.length) player.hand = deck.splice(0, 7);
    player.handVersion += 1;
    player.episodeId += 1;
    player.declared = false;
    player.grace = false;
    player.unoReportOpen = scenario === "report" && player.seat === fewSeat;
  }
  state.drawPile = deck;
  state.pendingDraw = rules.stackDraws ? scenario === "draw-stack" ? { value: "draw2", count: 2 } : scenario === "wild-stack" || scenario === "challenge" ? { value: "wild4", count: 4 } : null : null;
  state.currentColor = scenario === "challenge" ? "blue" : "red";
  state.phase = scenario === "challenge" ? "CHALLENGE" : "PLAYING";
  state.challenge = scenario === "challenge" ? { offenderSeat: 1, targetSeat: 0, illegal: false } : null;
  state.turnSeat = 0;
  state.colorChoiceSeat = null;
  state.drawnCardId = null;
  state.deadlineAt = Date.now() + (scenario === "challenge" ? 15 : state.turnSeconds) * 1000;
  state.events = [];
  if (scenario === "result") {
    const self = state.players[0];
    return applyUnoAction(state, 0, { type: "PLAY", cardId: self.hand[0].id, handVersion: self.handVersion }, Date.now()).state;
  }
  return state;
}
