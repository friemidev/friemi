export type DiceBid = { count: number; face: number; callerSeat: number };
export type DiceResult = { total: number; callerSeat: number; challengerSeat: number; winnerSeat: number; loserSeat: number; bid: DiceBid };
export type DicePhase = "LOBBY" | "BIDDING" | "REVEAL" | "FINISHED";
export type DiceRoomState = {
  phase: DicePhase;
  /** Monotonic room round, also used to reject commands from previous matches. */
  round: number;
  matchStartRound?: number;
  seatNumbers: number[];
  hands: Record<string, number[]>;
  scores: Record<string, number>;
  turnSeat: number | null;
  bid: DiceBid | null;
  history: DiceBid[];
  result: DiceResult | null;
  commandLog: { id: string; actorSeat: number }[];
};
export type DiceAction = { type: "BID"; count: number; face: number } | { type: "CHALLENGE" } | { type: "NEXT_ROUND" };
export class DiceRuleError extends Error {
  constructor(readonly code: string) { super(code); }
}
const invalid = (code: string): never => { throw new DiceRuleError(code); };

export function createDiceLobbyState(round = 0): DiceRoomState {
  if (!Number.isSafeInteger(round) || round < 0) invalid("INVALID_ROUND");
  return { phase: "LOBBY", round, matchStartRound: round + 1, seatNumbers: [], hands: {}, scores: {}, turnSeat: null, bid: null, history: [], result: null, commandLog: [] };
}

function deal(seatNumbers: number[], randomDie: () => number) {
  const hands: Record<string, number[]> = {};
  for (const seat of seatNumbers) {
    hands[String(seat)] = Array.from({ length: 5 }, () => {
      const value = randomDie();
      if (!Number.isInteger(value) || value < 1 || value > 6) invalid("INVALID_RANDOM_DIE");
      return value;
    });
  }
  return hands;
}

export function startDiceMatch(seatNumbers: number[], randomDie: () => number, firstRound = 1): DiceRoomState {
  if (seatNumbers.length < 2 || seatNumbers.length > 6 || new Set(seatNumbers).size !== seatNumbers.length) invalid("INVALID_ROSTER");
  if (!Number.isSafeInteger(firstRound) || firstRound < 1) invalid("INVALID_ROUND");
  const order = [...seatNumbers].sort((a, b) => a - b);
  return {
    ...createDiceLobbyState(firstRound - 1), phase: "BIDDING", round: firstRound, seatNumbers: order,
    hands: deal(order, randomDie), scores: Object.fromEntries(order.map((seat) => [String(seat), 0])),
    turnSeat: order[0],
  };
}

export function applyDiceAction(state: DiceRoomState, actorSeat: number, action: DiceAction, randomDie: () => number): DiceRoomState {
  if (!state.seatNumbers.includes(actorSeat)) invalid("NOT_A_PLAYER");
  if (action.type === "NEXT_ROUND") {
    const previousResult = state.result;
    if (state.phase !== "REVEAL" || !previousResult) throw new DiceRuleError("ROUND_NOT_REVEALED");
    const winnerSeat = previousResult.winnerSeat;
    return {
      ...state, phase: "BIDDING", round: state.round + 1, hands: deal(state.seatNumbers, randomDie),
      turnSeat: winnerSeat, bid: null, history: [], result: null, commandLog: [],
    };
  }
  if (state.phase !== "BIDDING") invalid("ROUND_NOT_ACTIVE");
  if (state.turnSeat !== actorSeat) invalid("NOT_YOUR_TURN");
  if (action.type === "BID") {
    if (!Number.isInteger(action.count) || action.count < state.seatNumbers.length || action.count > state.seatNumbers.length * 5) invalid("INVALID_COUNT");
    if (!Number.isInteger(action.face) || action.face < 2 || action.face > 6) invalid("INVALID_FACE");
    if (state.bid && (action.count < state.bid.count || action.count === state.bid.count && action.face <= state.bid.face)) invalid("BID_NOT_HIGHER");
    const bid = { count: action.count, face: action.face, callerSeat: actorSeat };
    const next = state.seatNumbers[(state.seatNumbers.indexOf(actorSeat) + 1) % state.seatNumbers.length];
    return { ...state, bid, history: [...state.history, bid], turnSeat: next };
  }
  const bid = state.bid;
  if (!bid) throw new DiceRuleError("NO_BID");
  const total = state.seatNumbers.reduce((sum, seat) => sum + state.hands[String(seat)].filter((face) => face === 1 || face === bid.face).length, 0);
  const callerWins = total >= bid.count;
  const winnerSeat = callerWins ? bid.callerSeat : actorSeat;
  const result: DiceResult = {
    total, callerSeat: bid.callerSeat, challengerSeat: actorSeat, winnerSeat,
    loserSeat: callerWins ? actorSeat : bid.callerSeat, bid,
  };
  const scores = { ...state.scores, [String(winnerSeat)]: (state.scores[String(winnerSeat)] ?? 0) + 1 };
  return { ...state, phase: scores[String(winnerSeat)] >= 3 ? "FINISHED" : "REVEAL", scores, turnSeat: null, result };
}

export function diceViewFor(state: DiceRoomState, viewerSeat: number) {
  const reveal = state.phase === "REVEAL" || state.phase === "FINISHED";
  return {
    phase: state.phase, round: state.round,
    roundNumber: state.phase === "LOBBY" ? 0 : state.round - (state.matchStartRound ?? 1) + 1,
    seatNumbers: state.seatNumbers,
    scores: state.scores, turnSeat: state.turnSeat, bid: state.bid, history: state.history,
    myHand: state.seatNumbers.includes(viewerSeat) ? state.hands[String(viewerSeat)] ?? null : null,
    revealedHands: reveal ? state.hands : null,
    result: reveal ? state.result : null,
  };
}

export function removeDiceSeat(state: DiceRoomState, departingSeat: number, randomDie: () => number): DiceRoomState {
  if (!state.seatNumbers.includes(departingSeat)) return state;
  const seatNumbers = state.seatNumbers.filter((seat) => seat !== departingSeat);
  const scores = Object.fromEntries(Object.entries(state.scores).filter(([seat]) => Number(seat) !== departingSeat));
  if (state.phase === "LOBBY") return state;
  if (seatNumbers.length < 2) {
    return { ...state, phase: "FINISHED", seatNumbers, scores, turnSeat: null, bid: null,
      result: null, hands: Object.fromEntries(seatNumbers.map((seat) => [String(seat), state.hands[String(seat)]])) };
  }
  if (state.phase === "FINISHED") return { ...state, seatNumbers, scores };
  // An unfinished call cannot be settled after a player takes their private dice away.
  // Re-deal for the remaining seats and keep the score they already earned.
  const nextStarter = seatNumbers.find((seat) => seat > departingSeat) ?? seatNumbers[0];
  return { ...state, phase: "BIDDING", round: state.round + 1, seatNumbers, hands: deal(seatNumbers, randomDie),
    scores, turnSeat: nextStarter, bid: null, history: [], result: null, commandLog: [] };
}
