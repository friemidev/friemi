export type WerewolfRoomPhase =
  | "DEALING"
  | "FINISHED"
  | "IN_PROGRESS"
  | "LOBBY"
  | "READY";

export type WerewolfWinner = "GOOD" | "WEREWOLF" | null;

export type WerewolfRoomState = {
  deadSeatNumbers: number[];
  finishedAt?: string | null;
  lockedAt?: string | null;
  phase: WerewolfRoomPhase;
  resultRecordedAt?: string | null;
  startedAt?: string | null;
  winner?: WerewolfWinner;
};

export function createInitialWerewolfRoomState(): WerewolfRoomState {
  return {
    deadSeatNumbers: [],
    finishedAt: null,
    lockedAt: null,
    phase: "LOBBY",
    resultRecordedAt: null,
    startedAt: null,
    winner: null,
  };
}

function getPhase(value: unknown): WerewolfRoomPhase {
  if (
    value === "DEALING" ||
    value === "FINISHED" ||
    value === "IN_PROGRESS" ||
    value === "READY"
  ) {
    return value;
  }

  return "LOBBY";
}

function getWinner(value: unknown): WerewolfWinner {
  if (value === "GOOD" || value === "WEREWOLF") {
    return value;
  }

  return null;
}

function getOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function getDeadSeatNumbers(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "number" ? item : Number(item)))
        .filter((item) => Number.isInteger(item) && item > 0 && item <= 20),
    ),
  ).sort((first, second) => first - second);
}

export function normalizeWerewolfRoomState(value: unknown): WerewolfRoomState {
  if (!value || typeof value !== "object") {
    return createInitialWerewolfRoomState();
  }

  const state = value as Partial<WerewolfRoomState>;

  return {
    deadSeatNumbers: getDeadSeatNumbers(state.deadSeatNumbers),
    finishedAt: getOptionalString(state.finishedAt),
    lockedAt: getOptionalString(state.lockedAt),
    phase: getPhase(state.phase),
    resultRecordedAt: getOptionalString(state.resultRecordedAt),
    startedAt: getOptionalString(state.startedAt),
    winner: getWinner(state.winner),
  };
}

export function isWerewolfRoomLocked(state: WerewolfRoomState) {
  return (
    state.phase === "DEALING" ||
    state.phase === "IN_PROGRESS" ||
    state.phase === "FINISHED"
  );
}
