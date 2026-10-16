import type { UnoActionResult, UnoRoomSettings, UnoRuleSettings, UnoRulesetVersion, UnoState } from "./unoTypes";

export const DEFAULT_UNO_RULES: UnoRuleSettings = {
  stackDraws: true,
  challengeDrawFour: false,
  allowActionFinish: true,
};

export function getUnoRules(state: Partial<UnoRuleSettings> & { rulesetVersion: UnoRulesetVersion }): UnoRuleSettings {
  // Started v1/v2 matches retain their rules until they return to the lobby.
  if (state.rulesetVersion < 3) return { stackDraws: false, challengeDrawFour: true, allowActionFinish: state.rulesetVersion === 2 };
  return {
    stackDraws: state.stackDraws ?? DEFAULT_UNO_RULES.stackDraws,
    challengeDrawFour: state.challengeDrawFour ?? DEFAULT_UNO_RULES.challengeDrawFour,
    allowActionFinish: state.allowActionFinish ?? DEFAULT_UNO_RULES.allowActionFinish,
  };
}

export function configureUnoLobby(state: UnoState, patch: UnoRoomSettings): UnoActionResult {
  if (state.phase !== "LOBBY") return { state, error: "WRONG_PHASE" };
  if (!Object.values(patch).some(value => value !== undefined)
    || patch.turnSeconds !== undefined && ![30, 60, 90].includes(patch.turnSeconds)
    || patch.matchMode !== undefined && !["single", "score"].includes(patch.matchMode)
    || (["stackDraws", "challengeDrawFour", "allowActionFinish"] as const).some(key => patch[key] !== undefined && typeof patch[key] !== "boolean")) {
    return { state, error: "INVALID_OPTIONS" };
  }
  const rules = state.rulesetVersion === 3 ? getUnoRules(state) : DEFAULT_UNO_RULES;
  return { state: {
    ...state, rulesetVersion: 3, ...rules, pendingDraw: null,
    turnSeconds: patch.turnSeconds ?? state.turnSeconds,
    matchMode: patch.matchMode ?? state.matchMode ?? "score",
    stackDraws: patch.stackDraws ?? rules.stackDraws,
    challengeDrawFour: patch.challengeDrawFour ?? rules.challengeDrawFour,
    allowActionFinish: patch.allowActionFinish ?? rules.allowActionFinish,
  } };
}
