import type { DdzActionResult, DdzMatchState, DdzMatchView, DdzPlayer, DdzRoomSettings, DdzState, DdzViewerState } from "./doudizhuTypes";

export const DDZ_ROUND_COUNTS = [1, 3, 6, 12] as const;
export const DDZ_PLAY_SECONDS = [30, 60, 90] as const;
export const DEFAULT_DDZ_ROOM_SETTINGS: Readonly<DdzRoomSettings> = { roundCount: 6, playSeconds: 60 };

export function isDdzRoomSettings(value: unknown): value is DdzRoomSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const settings = value as Partial<DdzRoomSettings>;
  return DDZ_ROUND_COUNTS.some((count) => count === settings.roundCount) && DDZ_PLAY_SECONDS.some((seconds) => seconds === settings.playSeconds);
}

export function getDdzRoomSettings(state: { settings?: DdzRoomSettings }): DdzRoomSettings {
  return isDdzRoomSettings(state.settings) ? { roundCount: state.settings.roundCount, playSeconds: state.settings.playSeconds } : { ...DEFAULT_DDZ_ROOM_SETTINGS };
}

function emptyMatch(matchNo: number, settings: DdzRoomSettings): DdzMatchState {
  return { matchNo, status: "READY", roundIndex: 0, roundCount: settings.roundCount, roster: [], rounds: [] };
}

type MatchSource = Pick<DdzState, "phase" | "gameNo" | "players" | "result" | "settings" | "match">;

/** Legacy in-flight games become a single-round match; no earlier scores are invented. */
export function getDdzMatchState(state: MatchSource): DdzMatchState {
  if (state.match) return structuredClone(state.match);
  const settings = getDdzRoomSettings(state);
  if (!["BIDDING", "PLAYING", "RESULT"].includes(state.phase)) return emptyMatch(0, settings);
  const result = state.phase === "RESULT" && state.result?.gameNo === state.gameNo ? state.result : null;
  return {
    matchNo: 1, status: result ? "COMPLETE" : "ACTIVE", roundIndex: 1, roundCount: 1,
    roster: structuredClone(state.players),
    rounds: result ? [{ roundIndex: 1, gameNo: state.gameNo, result: structuredClone(result) }] : [],
  };
}

/** Explicit projection: internal roster account IDs must never reach room or history responses. */
export function getDdzMatchView(state: DdzState | DdzViewerState): DdzMatchView {
  const publicMatch = state.match && "players" in state.match ? state.match : null;
  const match = publicMatch ?? getDdzMatchState(state as DdzState);
  const roster = match.status === "READY" ? state.players : publicMatch ? publicMatch.players : (match as DdzMatchState).roster;
  const rounds = (match.status === "READY" ? [] : match.rounds.slice(0, 12)).map((round) => ({
    roundIndex: round.roundIndex, gameNo: round.gameNo,
    result: {
      gameNo: round.result.gameNo, winnerSeat: round.result.winnerSeat, winnerSide: round.result.winnerSide,
      landlordSeat: round.result.landlordSeat, baseScore: round.result.baseScore, bombCount: round.result.bombCount,
      spring: round.result.spring, multiplier: round.result.multiplier, capped: round.result.capped,
      scores: round.result.scores.map(({ seat, delta }) => ({ seat, delta })), finishedAt: round.result.finishedAt,
    },
  }));
  const players = roster.map((player) => ({
    seat: player.seat, name: player.name, ...(player.catId ? { catId: player.catId } : {}),
    totalScore: rounds.reduce((score, round) => score + (round.result.scores.find((row) => row.seat === player.seat)?.delta ?? 0), 0),
  }));
  return {
    matchNo: match.matchNo, status: match.status, roundIndex: match.roundIndex, roundCount: match.roundCount,
    players: players.map((player) => ({ ...player, rank: 1 + players.filter((other) => other.totalScore > player.totalScore).length })),
    rounds,
  };
}

export function canChangeDdzRoomSettings(state: { phase: DdzState["phase"]; match?: Pick<DdzMatchState, "status"> }): boolean {
  return state.phase === "LOBBY" && state.match?.status !== "ACTIVE";
}

export function updateDdzRoomSettings(state: DdzState, settings: DdzRoomSettings): DdzActionResult {
  if (!isDdzRoomSettings(settings)) return { state, error: "INVALID_SETTINGS" };
  if (!canChangeDdzRoomSettings(state)) return { state, error: "SETTINGS_LOCKED" };
  const current = getDdzRoomSettings(state);
  if (current.roundCount === settings.roundCount && current.playSeconds === settings.playSeconds) return { state };
  const next = structuredClone(state);
  next.settings = { roundCount: settings.roundCount, playSeconds: settings.playSeconds };
  next.rules.playSeconds = settings.playSeconds;
  next.match = getDdzMatchState(state);
  if (next.match.status === "READY") next.match.roundCount = settings.roundCount;
  return { state: next };
}

function sameRoster(a: DdzPlayer[], b: DdzPlayer[]): boolean {
  return a.length === b.length && a.every((player) => {
    const other = b.find((candidate) => candidate.seat === player.seat);
    if (!other) return false;
    // Production always supplies profileId. Name is the identity fallback for local previews.
    if (player.profileId || other.profileId) return Boolean(player.profileId && player.profileId === other.profileId);
    return player.name === other.name;
  });
}

/** Shared by server lobby rebuilds and local previews; never attach old seat scores to a new account. */
export function createDdzLobbyState(previous: DdzState, players: DdzPlayer[]): DdzState {
  const next = structuredClone(previous);
  next.settings = getDdzRoomSettings(previous);
  next.match = getDdzMatchState(previous);
  const changed = !sameRoster(previous.players, players) || (next.match.roster.length > 0 && !sameRoster(next.match.roster, players));
  if (changed) {
    next.match = emptyMatch(next.match.matchNo, next.settings);
    next.result = null;
    next.events = [];
  } else if (next.match.roster.length) {
    next.match.roster = structuredClone(players);
  }
  next.players = structuredClone(players);
  next.phase = "LOBBY";
  next.deadlineAt = null;
  next.currentSeat = null;
  next.targetPlay = null;
  next.hands = Object.fromEntries([0, 1, 2].map((seat) => [seat, []]));
  next.handVersions = Object.fromEntries([0, 1, 2].map((seat) => [seat, (previous.handVersions[seat] ?? 0) + (previous.phase !== "LOBBY" || changed ? 1 : 0)]));
  next.bottomCards = [];
  next.managedSeats = [];
  next.landlordSeat = null;
  next.bid = { startSeat: 0, highestScore: 0, highestSeat: null, bids: [] };
  next.consecutivePasses = 0;
  next.playedCards = [];
  next.playCounts = Object.fromEntries([0, 1, 2].map((seat) => [seat, 0]));
  next.multiplier = 1;
  next.bombCount = 0;
  return next;
}

/** Called only once a validated START has a complete shuffled deal. */
export function prepareDdzMatchRound(state: DdzState): DdzActionResult {
  const next = structuredClone(state);
  next.settings = getDdzRoomSettings(state);
  next.match = getDdzMatchState(state);
  if (next.match.status === "ACTIVE") {
    const settled = next.match.rounds.some((round) => round.roundIndex === next.match!.roundIndex && round.gameNo === state.gameNo);
    if (!settled || next.match.roundIndex >= next.match.roundCount) return { state, error: "MATCH_ROUND_PENDING" };
    if (!sameRoster(next.match.roster, state.players)) return { state, error: "INVALID_PLAYERS" };
    next.match.roundIndex += 1;
    next.match.roster = structuredClone(state.players);
  } else {
    next.match = {
      matchNo: next.match.matchNo + 1, status: "ACTIVE", roundIndex: 1, roundCount: next.settings.roundCount,
      roster: structuredClone(state.players), rounds: [],
    };
  }
  next.rules.playSeconds = next.settings.playSeconds;
  return { state: next };
}

/** Pure, bounded ledger. Repeated settlement of the same room game cannot add points twice. */
export function recordDdzMatchResult(state: DdzState): DdzMatchState {
  const match = getDdzMatchState(state);
  if (!state.result || state.result.gameNo !== state.gameNo || match.rounds.some((round) => round.gameNo === state.gameNo)) return match;
  if (match.status !== "ACTIVE" || match.rounds.length >= match.roundCount || match.rounds.length >= 12) return match;
  match.rounds.push({ roundIndex: match.roundIndex, gameNo: state.gameNo, result: structuredClone(state.result) });
  if (match.rounds.length === match.roundCount) match.status = "COMPLETE";
  return match;
}
