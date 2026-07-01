import {
  avalonQuestTeamSizes,
  getAvalonFailureThreshold,
  isAvalonPlayerCount,
  type AvalonPlayerCount,
} from "@/features/game-tools/avalonConfig";

export type AvalonGamePhase =
  | "team_building"
  | "team_vote"
  | "mission"
  | "assassination"
  | "finished";

export type AvalonMissionResult = "fail" | "success" | null;
export type AvalonWinner = "evil" | "good" | null;
export type AvalonAssassinationRule = "classic" | "disabled";
export type AvalonFailureRule = "classic" | "single_fail";

export type AvalonAdvancedRules = {
  assassination: AvalonAssassinationRule;
  failure: AvalonFailureRule;
};

export type AvalonVoteResult = {
  approve: number;
  passed: boolean;
  reject: number;
};

export type AvalonRoomState = {
  currentLeaderSeatNumber: number;
  missionFailureCount?: number | null;
  missionResults: AvalonMissionResult[];
  phase: AvalonGamePhase;
  proposedTeamSeatNumbers: number[];
  rules: AvalonAdvancedRules;
  roundIndex: number;
  teamVoteRejectCount: number;
  voteResult?: AvalonVoteResult | null;
  winner?: AvalonWinner;
  winnerReason?: string | null;
};

export const defaultAvalonAdvancedRules: AvalonAdvancedRules = {
  assassination: "classic",
  failure: "classic",
};

const defaultMissionResults: AvalonMissionResult[] = [
  null,
  null,
  null,
  null,
  null,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getPhase(value: unknown): AvalonGamePhase {
  return value === "team_vote" ||
    value === "mission" ||
    value === "assassination" ||
    value === "finished"
    ? value
    : "team_building";
}

function getMissionResults(value: unknown): AvalonMissionResult[] {
  if (!Array.isArray(value)) {
    return [...defaultMissionResults];
  }

  return defaultMissionResults.map((_, index) => {
    const result = value[index];

    return result === "success" || result === "fail" ? result : null;
  });
}

function getSeatNumbers(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "number" ? item : Number(item)))
    .filter((item) => Number.isInteger(item) && item > 0 && item <= 10);
}

function getVoteResult(value: unknown): AvalonVoteResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const approve = getNumber(value.approve, 0);
  const reject = getNumber(value.reject, 0);

  return {
    approve,
    passed: Boolean(value.passed),
    reject,
  };
}

export function normalizeAvalonAdvancedRules(value: unknown): AvalonAdvancedRules {
  if (!isRecord(value)) {
    return defaultAvalonAdvancedRules;
  }

  return {
    assassination:
      value.assassination === "disabled" ? "disabled" : "classic",
    failure: value.failure === "single_fail" ? "single_fail" : "classic",
  };
}

export function normalizeAvalonRoomState(value: unknown): AvalonRoomState {
  const state = isRecord(value) ? value : {};

  return {
    currentLeaderSeatNumber: getNumber(state.currentLeaderSeatNumber, 1),
    missionFailureCount:
      typeof state.missionFailureCount === "number"
        ? state.missionFailureCount
        : null,
    missionResults: getMissionResults(state.missionResults),
    phase: getPhase(state.phase),
    proposedTeamSeatNumbers: getSeatNumbers(state.proposedTeamSeatNumbers),
    rules: normalizeAvalonAdvancedRules(state.rules),
    roundIndex: Math.min(Math.max(getNumber(state.roundIndex, 0), 0), 4),
    teamVoteRejectCount: Math.min(
      Math.max(getNumber(state.teamVoteRejectCount, 0), 0),
      5,
    ),
    voteResult: getVoteResult(state.voteResult),
    winner: state.winner === "good" || state.winner === "evil" ? state.winner : null,
    winnerReason:
      typeof state.winnerReason === "string" ? state.winnerReason : null,
  };
}

export function getAvalonQuestTeamSize({
  playerCount,
  roundIndex,
}: {
  playerCount: number;
  roundIndex: number;
}) {
  if (!isAvalonPlayerCount(playerCount)) {
    return 0;
  }

  return avalonQuestTeamSizes[playerCount][roundIndex] ?? 0;
}

export function getAvalonMissionFailureThresholdFromState({
  playerCount,
  roundIndex,
  rules = defaultAvalonAdvancedRules,
}: {
  playerCount: number;
  roundIndex: number;
  rules?: AvalonAdvancedRules;
}) {
  if (rules.failure === "single_fail") {
    return 1;
  }

  return getAvalonFailureThreshold(playerCount, roundIndex);
}

export function shouldSkipAvalonAssassination(rules: AvalonAdvancedRules) {
  return rules.assassination === "disabled";
}

export function getNextAvalonLeaderSeatNumber({
  currentLeaderSeatNumber,
  playerCount,
}: {
  currentLeaderSeatNumber: number;
  playerCount: AvalonPlayerCount | number;
}) {
  return currentLeaderSeatNumber >= playerCount
    ? 1
    : currentLeaderSeatNumber + 1;
}

export function countAvalonMissionResults(results: AvalonMissionResult[]) {
  return {
    fail: results.filter((result) => result === "fail").length,
    success: results.filter((result) => result === "success").length,
  };
}
