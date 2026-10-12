import {
  UNO_COLORS,
  type UnoAction,
  type UnoActionResult,
  type UnoCard,
  type UnoColor,
  type UnoEvent,
  type UnoOptions,
  type UnoPlayer,
  type UnoRosterSeat,
  type UnoState,
  type UnoValue,
  type UnoViewerState,
} from "./unoTypes";

export * from "./unoTypes";
type Random = () => number;
const isColor = (value: unknown): value is UnoColor => UNO_COLORS.includes(value as UnoColor);
export const isUnoNumber = (card: UnoCard) => /^[0-9]$/.test(card.value);
export const unoCardPoints = (card: UnoCard) => isUnoNumber(card) ? Number(card.value) : card.color ? 20 : 50;

export function createUnoDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  for (const color of UNO_COLORS) {
    deck.push({ id: `${color}-0-0`, color, value: "0" });
    const values: UnoValue[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
    for (const value of values) for (let copy = 0; copy < 2; copy += 1) {
      deck.push({ id: `${color}-${value}-${copy}`, color, value });
    }
  }
  for (const value of ["wild", "wild4"] as const) for (let copy = 0; copy < 4; copy += 1) {
    deck.push({ id: `${value}-${copy}`, color: null, value });
  }
  return deck;
}

function shuffle(cards: UnoCard[], random: Random): UnoCard[] {
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function createUnoState(roster: UnoRosterSeat[], options: UnoOptions = {}): UnoState {
  if (roster.length > 10 || new Set(roster.map((p) => p.seat)).size !== roster.length || roster.some((p) => !Number.isInteger(p.seat) || p.seat < 0)) {
    throw new Error("INVALID_PLAYERS");
  }
  const turnSeconds = options.turnSeconds ?? 60;
  const targetScore = options.targetScore ?? 500;
  const matchMode = options.matchMode ?? "score";
  if (![30, 60, 90].includes(turnSeconds) || !Number.isInteger(targetScore) || targetScore <= 0 || !["score", "single"].includes(matchMode)) throw new Error("INVALID_OPTIONS");
  return {
    rulesetVersion: 2, phase: "LOBBY", players: roster.map((p) => ({ ...p, hand: [], handVersion: 0, score: 0, declared: false, episodeId: 0, grace: false, unoReportOpen: false })),
    turnSeat: roster[0]?.seat ?? 0, dealerSeat: roster[0]?.seat ?? 0, direction: 1, roundNumber: 0, matchNumber: 1, turnId: 0,
    deadlineAt: null, turnSeconds, targetScore, matchMode, drawPile: [], discard: [], currentColor: null, drawnCardId: null,
    colorChoiceSeat: null, challenge: null, events: [], eventId: 0, falseReports: [], caughtEpisodes: [], roundResult: null,
  };
}

function nextSeat(state: UnoState, seat: number, steps = 1, direction = state.direction): number {
  const index = state.players.findIndex((p) => p.seat === seat);
  return state.players[((index + steps * direction) % state.players.length + state.players.length) % state.players.length].seat;
}

function event(state: UnoState, value: Omit<UnoEvent, "id">) {
  state.eventId += 1;
  state.events.push({ id: state.eventId, ...value });
  state.events = state.events.slice(-12);
}

function changeHand(state: UnoState, player: UnoPlayer, cards: UnoCard[]) {
  const oldLength = player.hand.length;
  player.hand = cards;
  player.handVersion += 1;
  if (state.rulesetVersion === 2) {
    player.grace = false;
    player.unoReportOpen = oldLength === 2 && cards.length === 1;
    if (player.unoReportOpen) player.episodeId += 1;
    else player.declared = false;
    return;
  }
  if (cards.length === 1 && oldLength !== 1) {
    player.episodeId += 1;
    player.grace = true;
    player.declared = false;
  } else if (cards.length !== 1) {
    player.grace = false;
    player.declared = false;
  }
}

function draw(state: UnoState, seat: number, count: number, random: Random): UnoCard[] {
  const player = state.players.find((p) => p.seat === seat)!;
  const cards: UnoCard[] = [];
  for (let i = 0; i < count; i += 1) {
    if (!state.drawPile.length && state.discard.length > 1) {
      const top = state.discard.pop()!;
      state.drawPile = shuffle(state.discard, random);
      state.discard = [top];
    }
    const card = state.drawPile.pop();
    if (!card) break;
    cards.push(card);
  }
  if (cards.length) changeHand(state, player, [...player.hand, ...cards]);
  return cards;
}

function beginTurn(state: UnoState, seat: number, now: number) {
  state.phase = "PLAYING";
  state.turnSeat = seat;
  state.turnId += 1;
  state.drawnCardId = null;
  state.colorChoiceSeat = null;
  state.challenge = null;
  state.deadlineAt = now + state.turnSeconds * 1_000;
}

function closeExistingUnoWindow(state: UnoState, before: Map<number, number>) {
  if (state.phase !== "PLAYING" && state.phase !== "CHALLENGE") return;
  for (const player of state.players) {
    if (player.hand.length === 1 && before.get(player.seat) === player.episodeId) {
      if (state.rulesetVersion === 2) player.unoReportOpen = false;
      else player.grace = false;
    }
  }
}

function existingEpisodes(state: UnoState) {
  return new Map(state.players.filter((p) => p.hand.length === 1).map((p) => [p.seat, p.episodeId]));
}

function dealRound(state: UnoState, now: number, random: Random): UnoState {
  state.matchMode ??= "score";
  state.roundNumber += 1;
  state.direction = 1;
  state.drawPile = shuffle(createUnoDeck(), random);
  state.discard = [];
  state.falseReports = [];
  state.caughtEpisodes = [];
  state.events = [];
  state.roundResult = null;
  for (const player of state.players) {
    player.hand = [];
    player.handVersion += 1;
    player.declared = false;
    player.grace = false;
    player.unoReportOpen = false;
  }
  for (let card = 0; card < 7; card += 1) for (const player of state.players) draw(state, player.seat, 1, random);
  const returned: UnoCard[] = [];
  let top = state.drawPile.pop()!;
  while (top.value === "wild4") {
    returned.push(top);
    top = state.drawPile.pop()!;
  }
  if (returned.length) state.drawPile = shuffle([...state.drawPile, ...returned], random);
  state.discard = [top];
  state.currentColor = top.color;
  const first = nextSeat(state, state.dealerSeat);
  beginTurn(state, first, now);
  if (top.value === "reverse") {
    state.direction = -1;
    state.turnSeat = state.dealerSeat;
  } else if (top.value === "skip") {
    state.turnSeat = nextSeat(state, first);
  } else if (top.value === "draw2") {
    draw(state, first, 2, random);
    state.turnSeat = nextSeat(state, first);
  } else if (top.value === "wild") {
    state.colorChoiceSeat = first;
  }
  event(state, { kind: "DEAL", seat: state.dealerSeat });
  return state;
}

export function startUnoGame(input: UnoState, now: number, random: Random = Math.random): UnoActionResult {
  if (input.phase !== "LOBBY") return { state: input, error: "WRONG_PHASE" };
  if (input.players.length < 2 || input.players.length > 10) return { state: input, error: "INVALID_PLAYERS" };
  const state = structuredClone(input);
  state.rulesetVersion = 2;
  state.dealerSeat = state.players[Math.min(state.players.length - 1, Math.max(0, Math.floor(random() * state.players.length)))].seat;
  return { state: dealRound(state, now, random) };
}

function matches(card: UnoCard, color: UnoColor | null, top: UnoCard | null): boolean {
  return card.color === null || card.color === color || card.value === top?.value;
}

export function isUnoCardPlayable(view: UnoViewerState, card: UnoCard): boolean {
  return view.phase === "PLAYING" && view.selfSeat === view.turnSeat && view.colorChoiceSeat === null &&
    view.hand.some((c) => c.id === card.id) && (view.rulesetVersion === 2 || view.hand.length > 1 || isUnoNumber(card)) &&
    (!view.drawnCardId || card.id === view.drawnCardId) && matches(card, view.currentColor, view.topCard);
}

function finishRound(state: UnoState, winner: UnoPlayer) {
  const remaining = state.players.filter((p) => p.seat !== winner.seat).map((p) => ({ seat: p.seat, cardCount: p.hand.length, points: p.hand.reduce((sum, card) => sum + unoCardPoints(card), 0) }));
  const points = remaining.reduce((sum, p) => sum + p.points, 0);
  winner.score += points;
  state.roundResult = { roundNumber: state.roundNumber, winnerSeat: winner.seat, points, remaining };
  state.phase = state.matchMode === "single" || winner.score >= state.targetScore ? "FINISHED" : "ROUND_END";
  state.deadlineAt = null;
  state.drawnCardId = null;
  state.challenge = null;
  state.colorChoiceSeat = null;
  event(state, { kind: "ROUND_WIN", seat: winner.seat, count: points });
}

function resolveChallenge(state: UnoState, challenged: boolean, now: number, random: Random) {
  const challenge = state.challenge!;
  const won = challenged && challenge.illegal;
  const seat = won ? challenge.offenderSeat : challenge.targetSeat;
  const count = draw(state, seat, won || !challenged ? 4 : 6, random).length;
  event(state, { kind: challenged ? (won ? "CHALLENGE_WON" : "CHALLENGE_LOST") : "ACCEPT_DRAW_FOUR", seat: challenge.targetSeat, targetSeat: seat, count });
  beginTurn(state, won ? challenge.targetSeat : nextSeat(state, challenge.targetSeat), now);
}

export function applyUnoAction(input: UnoState, actorSeat: number, action: UnoAction, now: number, random: Random = Math.random): UnoActionResult {
  const originalPlayer = input.players.find((p) => p.seat === actorSeat);
  const fail = (error: NonNullable<UnoActionResult["error"]>): UnoActionResult => ({ state: input, error });
  if (!originalPlayer) return fail("NOT_A_PLAYER");
  if (action.type === "NEXT_ROUND") {
    if (input.phase !== "ROUND_END" || input.matchMode === "single") return fail("WRONG_PHASE");
    const state = structuredClone(input);
    state.dealerSeat = nextSeat(state, state.dealerSeat, 1, 1);
    return { state: dealRound(state, now, random) };
  }
  if (action.type === "REMATCH") {
    if (input.phase !== "FINISHED") return fail("WRONG_PHASE");
    const state = createUnoState(input.players.map(({ seat, name }) => ({ seat, name })), { turnSeconds: input.turnSeconds, targetScore: input.targetScore, matchMode: input.matchMode ?? "score" });
    state.matchNumber = input.matchNumber + 1;
    state.eventId = input.eventId;
    state.turnId = input.turnId;
    return startUnoGame(state, now, random);
  }
  if (input.phase !== "PLAYING" && input.phase !== "CHALLENGE") return fail("WRONG_PHASE");
  if (input.deadlineAt !== null && now >= input.deadlineAt) return fail("DEADLINE_EXPIRED");
  const state = structuredClone(input);
  state.matchMode ??= "score";
  const player = state.players.find((p) => p.seat === actorSeat)!;
  const before = existingEpisodes(state);
  if (action.type === "CALL_UNO") {
    if (action.episodeId !== player.episodeId || (state.rulesetVersion === 2 && action.handVersion !== player.handVersion)) return fail("STALE_HAND");
    if ((state.rulesetVersion === 1 && player.hand.length !== 1) || player.declared) return { state: input };
    player.declared = true;
    event(state, { kind: "UNO", seat: actorSeat });
    return { state };
  }
  if (action.type === "CATCH_UNO") {
    const target = state.players.find((p) => p.seat === action.targetSeat);
    if (!target || target.seat === actorSeat || target.hand.length !== 1 || (state.rulesetVersion === 2 ? !target.unoReportOpen || target.declared : target.grace) || action.roundNumber !== state.roundNumber || action.episodeId !== target.episodeId) return fail("INVALID_REPORT");
    const episode = `${state.roundNumber}:${target.seat}:${target.episodeId}`;
    const report = `${episode}:${actorSeat}`;
    if (state.caughtEpisodes.includes(episode) || state.falseReports.includes(report)) return fail("DUPLICATE_REPORT");
    if (target.declared) {
      state.falseReports.push(report);
      const count = draw(state, actorSeat, 2, random).length;
      event(state, { kind: "FALSE_CATCH", seat: actorSeat, targetSeat: target.seat, count });
    } else {
      state.caughtEpisodes.push(episode);
      const count = draw(state, target.seat, 2, random).length;
      event(state, { kind: "CAUGHT", seat: actorSeat, targetSeat: target.seat, count });
    }
    return { state };
  }
  if (state.turnSeat !== actorSeat) return fail("NOT_YOUR_TURN");
  if (state.phase === "CHALLENGE") {
    if (action.type !== "ACCEPT_DRAW_FOUR" && action.type !== "CHALLENGE_DRAW_FOUR") return fail("WRONG_PHASE");
    resolveChallenge(state, action.type === "CHALLENGE_DRAW_FOUR", now, random);
    if (state.rulesetVersion === 2) closeExistingUnoWindow(state, before);
    return { state };
  }
  if (state.colorChoiceSeat !== null) {
    if (action.type !== "CHOOSE_COLOR") return fail("CHOOSE_COLOR");
    if (!isColor(action.color)) return fail("INVALID_COLOR");
    state.currentColor = action.color;
    state.colorChoiceSeat = null;
    event(state, { kind: "COLOR", seat: actorSeat, color: action.color });
    return { state };
  }
  if (action.type === "PLAY") {
    if (action.handVersion !== player.handVersion) return fail("STALE_HAND");
    const card = player.hand.find((c) => c.id === action.cardId);
    if (!card) return fail("CARD_NOT_FOUND");
    if (state.rulesetVersion === 1 && player.hand.length === 1 && !isUnoNumber(card)) return fail("LAST_CARD_MUST_BE_NUMBER");
    if (state.drawnCardId && state.drawnCardId !== card.id) return fail("ONLY_DRAWN_CARD");
    if (!matches(card, state.currentColor, state.discard.at(-1) ?? null)) return fail("CARD_NOT_PLAYABLE");
    if (card.color === null && !isColor(action.color)) return fail("INVALID_COLOR");
    const illegalDrawFour = card.value === "wild4" && player.hand.some((c) => c.id !== card.id && c.color === state.currentColor);
    changeHand(state, player, player.hand.filter((c) => c.id !== card.id));
    state.discard.push(card);
    state.currentColor = card.color ?? action.color!;
    event(state, { kind: "PLAY", seat: actorSeat, card: { ...card }, color: state.currentColor });
    if (!player.hand.length) {
      if (state.rulesetVersion === 2) {
        if (card.value === "reverse") state.direction = state.direction === 1 ? -1 : 1;
        if (card.value === "draw2" || card.value === "wild4") {
          // A final +4 has no other cards in hand, so it is necessarily legal.
          const seat = nextSeat(state, actorSeat);
          const count = draw(state, seat, card.value === "draw2" ? 2 : 4, random).length;
          event(state, { kind: "DRAW", seat, count });
        }
      }
      finishRound(state, player);
      return { state };
    }
    if (card.value === "reverse") state.direction = state.direction === 1 ? -1 : 1;
    const next = nextSeat(state, actorSeat);
    if (card.value === "wild4") {
      state.phase = "CHALLENGE";
      state.challenge = { offenderSeat: actorSeat, targetSeat: next, illegal: illegalDrawFour };
      state.turnSeat = next;
      state.turnId += 1;
      state.drawnCardId = null;
      state.deadlineAt = now + 15_000;
    } else {
      if (card.value === "draw2") {
        const count = draw(state, next, 2, random).length;
        event(state, { kind: "DRAW", seat: next, count });
      }
      const skips = card.value === "skip" || card.value === "draw2" || (card.value === "reverse" && state.players.length === 2);
      beginTurn(state, nextSeat(state, actorSeat, skips ? 2 : 1), now);
    }
    closeExistingUnoWindow(state, before);
    return { state };
  }
  if (action.type === "DRAW") {
    if (state.drawnCardId !== null) return fail("ALREADY_DREW");
    const drawn = draw(state, actorSeat, 1, random)[0];
    event(state, { kind: "DRAW", seat: actorSeat, count: drawn ? 1 : 0 });
    if (drawn && matches(drawn, state.currentColor, state.discard.at(-1) ?? null)) {
      state.drawnCardId = drawn.id;
    } else {
      beginTurn(state, nextSeat(state, actorSeat), now);
    }
    closeExistingUnoWindow(state, before);
    return { state };
  }
  if (action.type === "PASS") {
    if (!state.drawnCardId) return fail("MUST_DRAW_FIRST");
    event(state, { kind: "PASS", seat: actorSeat });
    beginTurn(state, nextSeat(state, actorSeat), now);
    return { state };
  }
  return fail("INVALID_ACTION");
}

export function advanceUnoDeadline(input: UnoState, now: number, random: Random = Math.random): UnoState {
  if (input.deadlineAt === null || now < input.deadlineAt || (input.phase !== "PLAYING" && input.phase !== "CHALLENGE")) return input;
  const state = structuredClone(input);
  state.matchMode ??= "score";
  if (state.phase === "CHALLENGE") {
    const before = existingEpisodes(state);
    resolveChallenge(state, false, now, random);
    if (state.rulesetVersion === 2) closeExistingUnoWindow(state, before);
    return state;
  }
  const before = existingEpisodes(state);
  if (state.colorChoiceSeat !== null) {
    // An opening wild has no chosen colour yet; choosing one is not a second turn.
    state.currentColor = UNO_COLORS[Math.min(3, Math.max(0, Math.floor(random() * 4)))];
    state.colorChoiceSeat = null;
  }
  const count = state.drawnCardId ? 0 : draw(state, state.turnSeat, 1, random).length;
  event(state, { kind: "TIMEOUT", seat: state.turnSeat, count });
  beginTurn(state, nextSeat(state, state.turnSeat), now);
  closeExistingUnoWindow(state, before);
  return state;
}

export function getUnoViewerState(state: UnoState, seat: number): UnoViewerState {
  const self = state.players.find((p) => p.seat === seat);
  return structuredClone({
    rulesetVersion: state.rulesetVersion, phase: state.phase,
    players: state.players.map((p) => ({ seat: p.seat, name: p.name, cardCount: p.hand.length, score: p.score, episodeId: p.episodeId })),
    selfSeat: seat, hand: self?.hand ?? [], handVersion: self?.handVersion ?? 0, declared: self?.declared ?? false,
    turnSeat: state.turnSeat, dealerSeat: state.dealerSeat, direction: state.direction, roundNumber: state.roundNumber, matchNumber: state.matchNumber,
    turnId: state.turnId, deadlineAt: state.deadlineAt, turnSeconds: state.turnSeconds, targetScore: state.targetScore, matchMode: state.matchMode ?? "score",
    currentColor: state.currentColor, topCard: state.discard.at(-1) ?? null, drawPileCount: state.drawPile.length,
    drawnCardId: seat === state.turnSeat ? state.drawnCardId : null, colorChoiceSeat: state.colorChoiceSeat,
    challenge: state.challenge ? { offenderSeat: state.challenge.offenderSeat, targetSeat: state.challenge.targetSeat } : null,
    events: state.events.filter((entry) => entry.kind !== "FALSE_CATCH" || entry.seat === seat), roundResult: state.roundResult,
  });
}
