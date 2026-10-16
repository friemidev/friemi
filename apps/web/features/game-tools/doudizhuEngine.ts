import { getDdzCard, isDdzDeck, sortDdzCards } from "./doudizhuCards";
import { beatsDdzPlay, classifyDdzPlay } from "./doudizhuPatterns";
import { createDdzLobbyState, getDdzMatchState, getDdzMatchView, getDdzRoomSettings, isDdzRoomSettings, prepareDdzMatchRound, recordDdzMatchResult } from "./doudizhuMatch";
import { DDZ_RULESET_VERSION, type DdzAction, type DdzActionResult, type DdzDealSource, type DdzEvent, type DdzPlayer, type DdzResult, type DdzRoomSettings, type DdzStartDeal, type DdzState, type DdzViewerState } from "./doudizhuTypes";
export * from "./doudizhuTypes";
export { DDZ_ROUND_COUNTS, DDZ_PLAY_SECONDS, DEFAULT_DDZ_ROOM_SETTINGS, canChangeDdzRoomSettings, createDdzLobbyState, getDdzMatchView, getDdzRoomSettings, isDdzRoomSettings, updateDdzRoomSettings } from "./doudizhuMatch";
export { createDdzDeck, getDdzCard, sortDdzCards } from "./doudizhuCards";
export { beatsDdzPlay, classifyDdzPlay } from "./doudizhuPatterns";
export { listDdzHints } from "./doudizhuHints";

const seatRecord = <T>(value: (seat: number) => T): Record<number, T> => Object.fromEntries([0, 1, 2].map((seat) => [seat, value(seat)]));
const nextSeat = (seat: number) => (seat + 1) % 3;
function emit(state: DdzState, now: number, event: Omit<DdzEvent, "id" | "gameNo" | "dealNo" | "turnId" | "at">) {
  state.eventSeq += 1;
  state.events.push({ ...event, id: state.eventSeq, gameNo: state.gameNo, dealNo: state.dealNo, turnId: state.turnId, at: now });
  state.events = state.events.slice(-64);
}
function setTurn(state: DdzState, seat: number, now: number) {
  state.currentSeat = seat;
  state.turnId += 1;
  const seconds = state.managedSeats.includes(seat) ? state.rules.managedSeconds : state.phase === "BIDDING" ? state.rules.bidSeconds : state.rules.playSeconds;
  state.deadlineAt = now + seconds * 1000;
}
function deal(state: DdzState, deck: string[], firstBidSeat: number, now: number) {
  state.phase = "BIDDING";
  state.hands = seatRecord((seat) => sortDdzCards(deck.slice(seat * 17, (seat + 1) * 17)));
  state.handVersions = seatRecord((seat) => (state.handVersions[seat] ?? 0) + 1);
  state.bottomCards = deck.slice(51);
  state.landlordSeat = null;
  state.bid = { startSeat: firstBidSeat, highestScore: 0, highestSeat: null, bids: [] };
  state.targetPlay = null;
  state.consecutivePasses = 0;
  state.playedCards = [];
  state.playCounts = seatRecord(() => 0);
  setTurn(state, firstBidSeat, now);
  emit(state, now, { kind: "DEAL", seat: firstBidSeat });
}
function chooseLandlord(state: DdzState, seat: number, score: 1 | 2 | 3, now: number) {
  state.landlordSeat = seat;
  state.bid.highestSeat = seat;
  state.bid.highestScore = score;
  state.hands[seat] = sortDdzCards([...state.hands[seat], ...state.bottomCards]);
  state.handVersions[seat] += 1;
  state.phase = "PLAYING";
  state.trickId = 1;
  setTurn(state, seat, now);
  emit(state, now, { kind: "LANDLORD", seat, score });
}

export function createDdzState(players: DdzPlayer[], settings?: DdzRoomSettings): DdzState {
  if (settings !== undefined && !isDdzRoomSettings(settings)) throw new Error("INVALID_SETTINGS");
  const roomSettings = getDdzRoomSettings({ settings });
  return {
    schemaVersion: 1, rulesetVersion: DDZ_RULESET_VERSION,
    rules: { bidSeconds: 20, playSeconds: roomSettings.playSeconds, managedSeconds: 4, resultSeconds: 60, multiplierCap: 64 },
    settings: roomSettings, match: { matchNo: 0, status: "READY", roundIndex: 0, roundCount: roomSettings.roundCount, roster: [], rounds: [] },
    phase: "LOBBY", players: structuredClone(players), gameNo: 0, dealNo: 0, turnId: 0, trickId: 0, eventSeq: 0,
    hands: seatRecord(() => []), handVersions: seatRecord(() => 0), bottomCards: [], landlordSeat: null,
    bid: { startSeat: 0, highestScore: 0, highestSeat: null, bids: [] }, currentSeat: null, targetPlay: null,
    consecutivePasses: 0, playedCards: [], playCounts: seatRecord(() => 0), multiplier: 1, bombCount: 0,
    managedSeats: [], deadlineAt: null, result: null, events: [],
  };
}

export function startDdzGame(state: DdzState, now: number, firstDeal: DdzStartDeal): DdzActionResult {
  if (state.phase !== "LOBBY") return { state, error: "WRONG_PHASE" };
  if (state.players.length !== 3 || new Set(state.players.map((player) => player.seat)).size !== 3 || !state.players.every((player) => [0, 1, 2].includes(player.seat))) return { state, error: "INVALID_PLAYERS" };
  if (!firstDeal || ![0, 1, 2].includes(firstDeal.firstBidSeat) || !isDdzDeck(firstDeal.deck)) return { state, error: "INVALID_DECK" };
  const prepared = prepareDdzMatchRound(state);
  if (prepared.error) return prepared;
  const next = prepared.state;
  next.gameNo += 1;
  next.dealNo = 1;
  next.trickId = 0;
  next.result = null;
  next.multiplier = 1;
  next.bombCount = 0;
  next.managedSeats = [];
  deal(next, firstDeal.deck, firstDeal.firstBidSeat, now);
  return { state: next };
}

export function settleDdzGame(state: DdzState, winnerSeat: number, now: number): DdzResult {
  if (state.result?.gameNo === state.gameNo) return structuredClone(state.result);
  if (state.landlordSeat === null || !state.players.some((player) => player.seat === winnerSeat)) throw new Error("INVALID_RESULT");
  const landlordWins = winnerSeat === state.landlordSeat;
  const spring = landlordWins
    ? state.players.filter((player) => player.seat !== state.landlordSeat).every((player) => state.playCounts[player.seat] === 0) ? "spring" : null
    : state.playCounts[state.landlordSeat] === 1 ? "antiSpring" : null;
  const rawMultiplier = 2 ** (state.bombCount + (spring ? 1 : 0));
  const multiplier = Math.min(rawMultiplier, state.rules.multiplierCap);
  const baseScore = state.bid.highestScore || 1;
  return {
    gameNo: state.gameNo, winnerSeat, winnerSide: landlordWins ? "landlord" : "farmers", landlordSeat: state.landlordSeat,
    baseScore, bombCount: state.bombCount, spring, multiplier, capped: rawMultiplier >= state.rules.multiplierCap,
    scores: state.players.map((player) => ({ seat: player.seat, delta: baseScore * multiplier * (player.seat === state.landlordSeat ? 2 : -1) * (landlordWins ? 1 : -1) })),
    finishedAt: now,
  };
}

export function applyDdzAction(state: DdzState, seat: number, action: DdzAction, now: number, redealDeck?: DdzDealSource): DdzActionResult {
  if (!state.players.some((player) => player.seat === seat)) return { state, error: "NOT_A_PLAYER" };
  if (state.phase !== "BIDDING" && state.phase !== "PLAYING") return { state, error: "WRONG_PHASE" };
  if (state.deadlineAt !== null && now >= state.deadlineAt) return { state, error: "DEADLINE_EXPIRED" };
  return applyCurrentAction(state, seat, action, now, redealDeck);
}

function applyCurrentAction(state: DdzState, seat: number, action: DdzAction, now: number, redealDeck?: DdzDealSource): DdzActionResult {
  if (!action || typeof action !== "object") return { state, error: "INVALID_ACTION" };
  const next = structuredClone(state);
  next.settings = getDdzRoomSettings(state);
  next.match = getDdzMatchState(state);
  if (action.type === "SET_MANAGED") {
    if (typeof action.managed !== "boolean") return { state, error: "INVALID_ACTION" };
    next.managedSeats = action.managed ? [...new Set([...next.managedSeats, seat])] : next.managedSeats.filter((managed) => managed !== seat);
    if (action.managed !== state.managedSeats.includes(seat)) emit(next, now, { kind: "MANAGED", seat, managed: action.managed });
    return { state: next };
  }
  if (state.currentSeat !== seat) return { state, error: "NOT_YOUR_TURN" };
  if (action.type === "BID") {
    if (state.phase !== "BIDDING") return { state, error: "WRONG_PHASE" };
    if (![0, 1, 2, 3].includes(action.score) || (action.score !== 0 && action.score <= state.bid.highestScore)) return { state, error: "INVALID_BID" };
    next.bid.bids.push({ seat, score: action.score });
    if (action.score > 0) { next.bid.highestScore = action.score; next.bid.highestSeat = seat; }
    emit(next, now, { kind: "BID", seat, score: action.score });
    if (action.score === 3 || (next.bid.bids.length === 3 && next.bid.highestScore > 0)) {
      chooseLandlord(next, next.bid.highestSeat!, next.bid.highestScore as 1 | 2 | 3, now);
    } else if (next.bid.bids.length === 3) {
      if (next.dealNo < 3) {
        if (!redealDeck) return { state, error: "RANDOMNESS_REQUIRED" };
        const deck = redealDeck();
        if (!isDdzDeck(deck)) return { state, error: "INVALID_DECK" };
        next.dealNo += 1;
        deal(next, deck, nextSeat(next.bid.startSeat), now);
      } else chooseLandlord(next, next.bid.startSeat, 1, now);
    } else setTurn(next, nextSeat(seat), now);
    return { state: next };
  }
  if (state.phase !== "PLAYING") return { state, error: "WRONG_PHASE" };
  if (action.type === "PASS") {
    if (!state.targetPlay) return { state, error: "MUST_LEAD" };
    next.consecutivePasses += 1;
    emit(next, now, { kind: "PASS", seat });
    if (next.consecutivePasses === 2) {
      const leadSeat = next.targetPlay!.seat;
      next.targetPlay = null;
      next.consecutivePasses = 0;
      next.trickId += 1;
      setTurn(next, leadSeat, now);
      emit(next, now, { kind: "TRICK", seat: leadSeat });
    } else setTurn(next, nextSeat(seat), now);
    return { state: next };
  }
  if (action.type !== "PLAY") return { state, error: "INVALID_ACTION" };
  if (action.handVersion !== undefined && action.handVersion !== state.handVersions[seat]) return { state, error: "STALE_HAND" };
  if (!Array.isArray(action.cardIds) || action.cardIds.length === 0 || action.cardIds.length > 20 || action.cardIds.some((id) => typeof id !== "string" || !state.hands[seat].includes(id))) return { state, error: "CARD_NOT_FOUND" };
  const play = classifyDdzPlay(action.cardIds);
  if (!play) return { state, error: "INVALID_COMBINATION" };
  if (!beatsDdzPlay(play, state.targetPlay)) return { state, error: "CANNOT_BEAT" };
  const used = new Set(play.cardIds);
  next.hands[seat] = next.hands[seat].filter((id) => !used.has(id));
  next.handVersions[seat] += 1;
  next.playedCards.push(...play.cardIds);
  next.playCounts[seat] += 1;
  next.targetPlay = { ...play, seat };
  next.consecutivePasses = 0;
  if (play.type === "BOMB" || play.type === "ROCKET") next.bombCount += 1;
  next.multiplier = Math.min(2 ** next.bombCount, next.rules.multiplierCap);
  emit(next, now, { kind: "PLAY", seat, play });
  if (next.hands[seat].length === 0) {
    next.result = settleDdzGame(next, seat, now);
    next.match = recordDdzMatchResult(next);
    next.multiplier = next.result.multiplier;
    next.phase = "RESULT";
    next.currentSeat = null;
    next.turnId += 1;
    next.deadlineAt = now + next.rules.resultSeconds * 1000;
    emit(next, now, { kind: "RESULT", seat });
  } else setTurn(next, nextSeat(seat), now);
  return { state: next };
}

/** Advances at most one action. The server locks the current snapshot before calling. */
export function advanceDdzDeadline(state: DdzState, now: number, redealDeck?: DdzDealSource): DdzState {
  if (state.deadlineAt === null || now < state.deadlineAt) return state;
  if (state.phase === "RESULT") {
    const next = createDdzLobbyState(state, state.players);
    emit(next, now, { kind: "LOBBY" });
    return next;
  }
  if ((state.phase !== "BIDDING" && state.phase !== "PLAYING") || state.currentSeat === null) return state;
  const next = structuredClone(state);
  const seat = next.currentSeat!;
  next.managedSeats = [...new Set([...next.managedSeats, seat])];
  emit(next, now, { kind: "TIMEOUT", seat });
  let action: DdzAction;
  if (state.phase === "BIDDING") action = { type: "BID", score: 0 };
  else if (!state.targetPlay) action = { type: "PLAY", cardIds: [sortDdzCards(state.hands[seat])[0]], handVersion: state.handVersions[seat] };
  else action = { type: "PASS" };
  const applied = applyCurrentAction(next, seat, action, now, redealDeck);
  return applied.error ? state : applied.state;
}

export function getDdzViewerState(state: DdzState, selfSeat: number): DdzViewerState {
  if (!state.players.some((player) => player.seat === selfSeat)) throw new Error("NOT_A_PLAYER");
  const cards = (ids: string[]) => ids.map((id) => getDdzCard(id)!).filter(Boolean);
  // Deliberate allowlist: never spread server state or roster account identifiers.
  return structuredClone({
    schemaVersion: state.schemaVersion, rulesetVersion: state.rulesetVersion, rules: state.rules, phase: state.phase,
    settings: getDdzRoomSettings(state), match: getDdzMatchView(state),
    gameNo: state.gameNo, dealNo: state.dealNo, turnId: state.turnId, trickId: state.trickId, eventSeq: state.eventSeq,
    players: state.players.map((player) => ({ seat: player.seat, name: player.name, ...(player.catId ? { catId: player.catId } : {}), cardCount: state.hands[player.seat]?.length ?? 0, managed: state.managedSeats.includes(player.seat), gameRole: state.landlordSeat === null ? null : state.landlordSeat === player.seat ? "landlord" as const : "farmer" as const })),
    selfSeat, hand: cards(state.hands[selfSeat] ?? []), handVersion: state.handVersions[selfSeat] ?? 0,
    bottomCards: state.landlordSeat === null ? [] : cards(state.bottomCards), bottomCardCount: state.bottomCards.length,
    landlordSeat: state.landlordSeat, bid: state.bid, currentSeat: state.currentSeat, targetPlay: state.targetPlay,
    consecutivePasses: state.consecutivePasses, multiplier: state.multiplier, bombCount: state.bombCount,
    managedSeats: state.managedSeats, deadlineAt: state.deadlineAt, result: state.result,
    remainingHands: state.phase === "RESULT" ? state.players.map((player) => ({ seat: player.seat, cards: cards(state.hands[player.seat] ?? []) })) : null,
    events: state.events,
  });
}
