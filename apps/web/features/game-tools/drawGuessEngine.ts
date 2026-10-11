export type DrawGuessMode = "CLASSIC" | "CHAIN";
export type DrawGuessPhase =
  | "LOBBY"
  | "WORD_SELECT"
  | "DRAW_GUESS"
  | "TURN_REVEAL"
  | "CHAIN_WORD"
  | "CHAIN_STEP"
  | "MATCH_VOTE"
  | "MATCH_RESULT"
  | "CHAIN_REVEAL"
  | "ARTWORK_VOTE"
  | "ARTWORK_RESULT"
  | "REVEAL_VOTE"
  | "AUTHOR_PICK"
  | "ROUND_BREAK"
  | "FINISHED";

export type DrawStroke = {
  color: string;
  points: [number, number][];
  width: number;
};

export type DrawGuessInkCursor = { clientId: string; seq: number };

export function isValidDrawGuessInkCursor(value: unknown): value is DrawGuessInkCursor {
  if (!value || typeof value !== "object") return false;
  const cursor = value as Partial<DrawGuessInkCursor>;
  return typeof cursor.clientId === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(cursor.clientId) &&
    typeof cursor.seq === "number" && Number.isSafeInteger(cursor.seq) && cursor.seq > 0;
}

export type ChainStep =
  | { kind: "WORD"; seat: number; system: boolean; value: string }
  | { kind: "DRAWING"; seat: number; system: boolean; value: DrawStroke[] };

export type DrawGuessWordBankSnapshot = {
  id: string;
  category: string | null;
  title: string;
  description: string | null;
  words: string[];
};

export type DrawGuessChatMessage = {
  id: string;
  seat: number;
  text: string | null;
  correct: boolean;
  at: string;
  laughedBy?: number[];
  reactedBy?: Partial<Record<DrawGuessReactionKind, number[]>>;
};

export const DRAW_GUESS_REACTIONS = ["😂", "👏", "👀", "❓"] as const;
export type DrawGuessReactionKind = (typeof DRAW_GUESS_REACTIONS)[number];
export type DrawGuessReaction = { seat: number; kind: DrawGuessReactionKind; at: string };
export function getDrawGuessMessageReactorSeats(message: DrawGuessChatMessage, kind: DrawGuessReactionKind) {
  return kind === "😂" ? message.laughedBy ?? [] : message.reactedBy?.[kind] ?? [];
}
export const DRAW_GUESS_CHAIN_REACTIONS = ["😂", "👏", "😮"] as const;
export type DrawGuessChainReactionKind = (typeof DRAW_GUESS_CHAIN_REACTIONS)[number];
export type DrawGuessChainReaction = { seat: number; kind: DrawGuessChainReactionKind; owner: number; step: number; stage: number; at: string };
export type DrawGuessClassicHighlight = {
  answer: string;
  artistSeat: number;
  drawing: DrawStroke[];
  laughCount: number;
  reactionCount: number;
  wrongGuesses: { seat: number; text: string; artistSeat: number; answer: string; laughs: number }[];
};

export const DRAW_GUESS_DRAW_SECONDS = [30, 60, 90] as const;
export const DRAW_GUESS_GUESS_SECONDS = [20, 40, 60] as const;
export const DRAW_GUESS_ROUND_COUNTS = [1, 2, 3] as const;
export type DrawGuessRoundCount = (typeof DRAW_GUESS_ROUND_COUNTS)[number];
export function isDrawGuessRoundCount(value: unknown): value is DrawGuessRoundCount {
  return DRAW_GUESS_ROUND_COUNTS.some((count) => count === value);
}
export type DrawGuessTiming = {
  drawSeconds: (typeof DRAW_GUESS_DRAW_SECONDS)[number];
  guessSeconds: (typeof DRAW_GUESS_GUESS_SECONDS)[number];
};

export function isDrawGuessTiming(value: unknown): value is DrawGuessTiming {
  if (!value || typeof value !== "object") return false;
  const timing = value as Partial<DrawGuessTiming>;
  return DRAW_GUESS_DRAW_SECONDS.some((seconds) => seconds === timing.drawSeconds) &&
    DRAW_GUESS_GUESS_SECONDS.some((seconds) => seconds === timing.guessSeconds);
}

export type DrawGuessState = {
  autoSize?: boolean;
  managedSeats?: number[];
  forfeitedTurns?: Record<string, number[]>;
  forfeitedChainSeats?: number[];
  answer: string;
  chainStage: number;
  chainReveal?: { elapsedMs: number; startedAt: string | null; pausedUntil: string | null };
  chainReactions?: DrawGuessChainReaction[];
  chainReactionLastAt?: Record<string, number>;
  chainReactionUsed?: Record<string, boolean>;
  chains: ChainStep[][];
  classicAnswers: string[];
  classicChat: DrawGuessChatMessage[];
  classicChats: DrawGuessChatMessage[][];
  classicReactionCounts: Record<string, Partial<Record<DrawGuessReactionKind, number>>>;
  commandResults: Record<string, { correct?: boolean; points?: number }>;
  deadlineAt: string | null;
  drawDeadlineAt?: string | null;
  drawings: DrawStroke[][];
  drafts: Record<string, DrawStroke[]>;
  draftVersions?: Record<string, Record<string, number>>;
  gameNumber: number;
  guessAttempts: Record<string, Record<string, number>>;
  guesses: Record<string, Record<string, { at: string; points: number }>>;
  inkSeq: number;
  inkCursor?: DrawGuessInkCursor | null;
  matchResults: Record<string, boolean>;
  matchVoterSeats?: number[];
  artworkVotes?: Record<string, Record<string, number>>;
  artworkVoterSeats?: number[];
  mode: DrawGuessMode;
  options: string[];
  phase: DrawGuessPhase;
  picks: Record<string, number>;
  practiceBotSeat?: number;
  roundCount?: DrawGuessRoundCount;
  roundIndex?: number;
  reactions: DrawGuessReaction[];
  returnedProfileIds?: string[];
  reactionUsed: Record<string, DrawGuessReactionKind[]>;
  reactionLastAt: Record<string, number>;
  scores: number[];
  storageVersion?: number;
  timing?: DrawGuessTiming;
  turnIndex: number;
  votes: Record<string, Record<string, boolean>>;
  wordBank?: DrawGuessWordBankSnapshot;
};

type DrawGuessDraftOrder = { draftClientId?: string; draftVersion?: number };

export type DrawGuessAction =
  | { type: "CHOOSE_WORD"; value: string }
  | { type: "GUESS"; value: string }
  | { type: "REACT"; kind: DrawGuessReactionKind }
  | { type: "CHAIN_REACT"; kind: DrawGuessChainReactionKind; owner: number; step: number }
  | { type: "REVEAL_CONTROL"; command: "PAUSE" | "RESUME" | "NEXT" }
  | { type: "LAUGH_GUESS"; messageId: string }
  | { type: "REACT_GUESS"; messageId: string; kind: DrawGuessReactionKind }
  | { type: "ADD_STROKE"; stroke: DrawStroke }
  | { type: "UNDO_STROKE" }
  | { type: "CLEAR_STROKES" }
  | ({ type: "SAVE_CLASSIC_DRAFT"; strokes: DrawStroke[]; inkSeq?: number; inkCursor?: DrawGuessInkCursor } & DrawGuessDraftOrder)
  | ({ type: "SAVE_DRAFT"; strokes: DrawStroke[] } & DrawGuessDraftOrder)
  | { type: "SUBMIT_STEP"; value?: string; strokes?: DrawStroke[] }
  | { type: "VOTE_ARTWORK"; owner: number; step: number }
  | { type: "VOTE"; owner: number; value: boolean }
  | { type: "PICK"; owner: number; step: number };

const WORDS: Record<string, string[]> = {
  "zh-CN": ["长颈鹿", "热气球", "小提琴", "滑板", "灯塔", "仙人掌", "宇航员", "章鱼", "冰淇淋", "火山", "潜水艇", "雨伞", "机器人", "独角兽", "望远镜", "鲸鱼", "菠萝", "旋转木马"],
  en: ["giraffe", "hot air balloon", "violin", "skateboard", "lighthouse", "cactus", "astronaut", "octopus", "ice cream", "volcano", "submarine", "umbrella", "robot", "unicorn", "telescope", "whale", "pineapple", "carousel"],
  fr: ["girafe", "montgolfière", "violon", "skateboard", "phare", "cactus", "astronaute", "pieuvre", "glace", "volcan", "sous-marin", "parapluie", "robot", "licorne", "télescope", "baleine", "ananas", "manège"],
};

const DURATION = {
  WORD_SELECT: 10_000,
  DRAW_GUESS: 60_000,
  TURN_REVEAL: 5_000,
  ALL_GUESSED_REVEAL: 5_000,
  CHAIN_WORD: 20_000,
  CHAIN_DRAW: 60_000,
  CHAIN_GUESS: 20_000,
  MATCH_RESULT: 12_000,
  ARTWORK_VOTE: 60_000,
  ARTWORK_RESULT: 12_000,
  ROUND_BREAK: 5_000,
} as const;

function revealStepDuration(_step: ChainStep, last: boolean) {
  return last ? 10_000 : 4_000;
}

export function getChainRevealTotalMs(chains: ChainStep[][]) {
  return chains.reduce((sum, chain) => sum + chain.slice(1).reduce((duration, step, index) => duration + revealStepDuration(step, index === chain.length - 2), 0), 0);
}

export function getChainRevealPosition(state: Pick<DrawGuessState, "chains" | "chainReveal">, now: number) {
  const clock = state.chainReveal;
  const totalMs = getChainRevealTotalMs(state.chains);
  const elapsedMs = Math.min(totalMs, Math.max(0, (clock?.elapsedMs ?? 0) + (clock?.startedAt ? Math.max(0, now - Date.parse(clock.startedAt)) : 0)));
  let boundaryMs = 0;
  for (let owner = 0; owner < state.chains.length; owner += 1) {
    for (let step = 1; step < state.chains[owner].length; step += 1) {
      boundaryMs += revealStepDuration(state.chains[owner][step], step === state.chains[owner].length - 1);
      if (elapsedMs < boundaryMs) return { owner, step, elapsedMs, nextBoundaryMs: boundaryMs, totalMs };
    }
  }
  const owner = Math.max(0, state.chains.length - 1);
  return { owner, step: Math.max(0, (state.chains[owner]?.length ?? 1) - 1), elapsedMs, nextBoundaryMs: totalMs, totalMs };
}

function estimateChainRevealMs(playerCount: number) {
  return playerCount * ((getChainStageCount(playerCount) - 1) * 4_000 + 10_000);
}

function artworkVoteDuration(playerCount: number) {
  return Math.max(DURATION.ARTWORK_VOTE, playerCount * 12_000);
}

function matchVoteDuration(playerCount: number) {
  return Math.max(60_000, playerCount * 12_000);
}

function matchResultDuration(playerCount: number) {
  return Math.max(DURATION.MATCH_RESULT, playerCount * 3_000);
}

function artworkResultDuration(playerCount: number) {
  return Math.max(DURATION.ARTWORK_RESULT, playerCount * 2_000);
}

export function estimateDrawGuessDurationSeconds(mode: DrawGuessMode, playerCount: number, timing: DrawGuessTiming, roundCount: DrawGuessRoundCount) {
  const oneRound = mode === "CLASSIC"
    ? playerCount * (DURATION.WORD_SELECT + (timing.drawSeconds + timing.guessSeconds) * 1_000 + DURATION.TURN_REVEAL)
    : DURATION.CHAIN_WORD + Math.floor(getChainStageCount(playerCount) / 2) * (timing.drawSeconds + timing.guessSeconds) * 1_000 + matchVoteDuration(playerCount) + matchResultDuration(playerCount) + artworkVoteDuration(playerCount) + artworkResultDuration(playerCount);
  return Math.ceil((oneRound * roundCount + DURATION.ROUND_BREAK * (roundCount - 1)) / 1_000);
}

function optionsFor(state: DrawGuessState, turnIndex: number, locale = "en") {
  const words = state.wordBank?.words.length ? state.wordBank.words : WORDS[locale] ?? WORDS.en;
  const start = (((state.roundIndex ?? 1) - 1) * state.chains.length * 3 + turnIndex * 3) % words.length;
  return Array.from({ length: Math.min(3, words.length) }, (_, index) => words[(start + index) % words.length]);
}

function normalized(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/[\s\p{P}]+/gu, "");
}

const blockedWordFragments = ["傻逼", "操你妈", "去死", "fuck", "nazi", "connard"];

export function validateDrawGuessWord(value: string, maxLength: number, minLength = 1) {
  const word = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  const length = Array.from(word).length;
  if (length < minLength || length > maxLength) return null;
  if (!/^[\p{L}\p{N}][\p{L}\p{N} '\-’]*$/u.test(word)) return null;
  if (/https?:|www\.|@|\b\d{6,}\b/iu.test(word)) return null;
  const comparable = word.toLocaleLowerCase().replace(/[\s'’\-]+/gu, "");
  if (blockedWordFragments.some((fragment) => comparable.includes(fragment)) || /(^|[^\p{L}])pute($|[^\p{L}])/iu.test(word)) return null;
  return word;
}

function validateDrawGuessChatText(value: string) {
  const text = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (!text || Array.from(text).length > 20 || /\p{C}/u.test(text)) return null;
  if (/https?:|www\.|@|\b\d{6,}\b|\b[a-z0-9-]+\.(?:com|net|org|io|app|dev|cn|fr|sk|me)\b/iu.test(text)) return null;
  const comparable = text.toLocaleLowerCase().replace(/[\s\p{P}]+/gu, "");
  if (blockedWordFragments.some((fragment) => comparable.includes(fragment)) || /(^|[^\p{L}])pute($|[^\p{L}])/iu.test(text)) return null;
  return text;
}

export function normalizeDrawGuessWordBankWords(words: unknown): string[] | null {
  if (!Array.isArray(words) || words.length < 1 || words.length > 500) return null;
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const value of words) {
    if (typeof value !== "string") return null;
    const word = validateDrawGuessWord(value, 20);
    if (!word) return null;
    const key = word.toLocaleLowerCase();
    if (seen.has(key)) return null;
    seen.add(key);
    normalized.push(word);
  }
  return normalized;
}

export function isValidStroke(stroke: unknown): stroke is DrawStroke {
  if (!stroke || typeof stroke !== "object") return false;
  const value = stroke as Partial<DrawStroke>;
  return (
    typeof value.color === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(value.color) &&
    typeof value.width === "number" &&
    value.width >= 1 && value.width <= 24 &&
    Array.isArray(value.points) &&
    value.points.length >= 1 &&
    value.points.length <= 512 &&
    value.points.every((point) =>
      Array.isArray(point) && point.length === 2 && point.every((part) =>
        typeof part === "number" && Number.isFinite(part) && part >= 0 && part <= 1,
      ),
    )
  );
}

export const DRAW_GUESS_MAX_DRAWING_BYTES = 90_000;

export function isValidDrawing(strokes: unknown): strokes is DrawStroke[] {
  return Array.isArray(strokes) && strokes.length <= 120 && strokes.every(isValidStroke) &&
    JSON.stringify(strokes).length <= DRAW_GUESS_MAX_DRAWING_BYTES;
}

export function createDrawGuessState(mode: DrawGuessMode, playerCount: number, wordBank?: DrawGuessWordBankSnapshot, timing?: DrawGuessTiming, roundCount: DrawGuessRoundCount = 1): DrawGuessState {
  return {
    answer: "",
    chainStage: 0,
    chainReveal: undefined,
    chainReactions: [],
    chainReactionLastAt: {},
    chainReactionUsed: {},
    chains: Array.from({ length: playerCount }, () => []),
    classicAnswers: [],
    classicChat: [],
    classicChats: [],
    classicReactionCounts: {},
    commandResults: {},
    deadlineAt: null,
    drawDeadlineAt: null,
    drawings: Array.from({ length: playerCount }, () => []),
    drafts: {},
    gameNumber: 1,
    guessAttempts: {},
    guesses: {},
    inkSeq: 0,
    matchResults: {},
    artworkVotes: {},
    mode,
    options: [],
    phase: "LOBBY",
    picks: {},
    roundCount,
    roundIndex: 1,
    reactions: [],
    reactionUsed: {},
    reactionLastAt: {},
    scores: Array(playerCount).fill(0),
    storageVersion: 1,
    turnIndex: 0,
    votes: {},
    ...(wordBank ? { wordBank } : {}),
    ...(timing ? { timing } : {}),
  };
}

export function getChainStageCount(playerCount: number) {
  return 2 * Math.floor((playerCount - 1) / 2);
}

export function getChainActor(owner: number, stage: number, playerCount: number) {
  return (owner + stage) % playerCount;
}

export function getDrawGuessRankings(scores: number[]) {
  const sorted = scores.map((score, seat) => ({ score, seat })).sort((a, b) => b.score - a.score || a.seat - b.seat);
  return sorted.map((entry, index) => ({
    ...entry,
    rank: index > 0 && sorted[index - 1].score === entry.score
      ? sorted.findIndex((item) => item.score === entry.score) + 1
      : index + 1,
  }));
}

export function getDrawGuessClassicHighlight(state: DrawGuessState): DrawGuessClassicHighlight | null {
  if (state.mode !== "CLASSIC") return null;
  const candidates = state.drawings.map((drawing, artistSeat) => {
    const counts = state.classicReactionCounts?.[String(artistSeat)] ?? {};
    const wrongCount = (state.classicChats?.[artistSeat] ?? []).filter((message) => !message.correct).length;
    return { answer: state.classicAnswers?.[artistSeat] ?? "", artistSeat, drawing, laughCount: counts["😂"] ?? 0,
      reactionCount: Object.values(counts).reduce((sum, value) => sum + (value ?? 0), 0), wrongCount };
  }).filter((turn) => turn.answer && turn.drawing.length);
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.laughCount - a.laughCount || b.reactionCount - a.reactionCount || b.wrongCount - a.wrongCount || a.artistSeat - b.artistSeat);
  const [featured] = candidates;
  const seen = new Set<string>();
  const wrongGuesses = (state.classicChats ?? []).flatMap((chat, artistSeat) => chat
    .filter((message) => !message.correct && message.text)
    .map((message) => ({ seat: message.seat, text: message.text!, artistSeat,
      answer: state.classicAnswers?.[artistSeat] ?? "", laughs: message.laughedBy?.length ?? 0, at: message.at })))
    .sort((a, b) => b.laughs - a.laughs || Date.parse(a.at) - Date.parse(b.at))
    .filter((guess) => {
      const key = `${guess.artistSeat}:${guess.text.toLocaleLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 2).map(({ at: _at, ...guess }) => guess);
  return { answer: featured.answer, artistSeat: featured.artistSeat, drawing: featured.drawing,
    laughCount: featured.laughCount, reactionCount: featured.reactionCount, wrongGuesses };
}

function setDeadline(state: DrawGuessState, phase: DrawGuessPhase, base: number, duration: number) {
  state.phase = phase;
  state.deadlineAt = new Date(base + duration).toISOString();
}

export function startDrawGuessGame(state: DrawGuessState, now: number, locale: string) {
  if (state.phase !== "LOBBY") return { error: "ALREADY_STARTED" } as const;
  const next = structuredClone(state);
  if (next.mode === "CLASSIC") {
    next.options = optionsFor(next, 0, locale);
    setDeadline(next, "WORD_SELECT", now, DURATION.WORD_SELECT);
  } else {
    setDeadline(next, "CHAIN_WORD", now, DURATION.CHAIN_WORD);
  }
  return { state: next } as const;
}

function allChainStepsDone(state: DrawGuessState) {
  return state.chains.every((chain) => Boolean(chain[state.chainStage]));
}

function allArtworkVotesDone(state: DrawGuessState, count: number) {
  const voters = Array.from({ length: count }, (_, seat) => seat).filter((seat) => seat !== state.practiceBotSeat && !state.managedSeats?.includes(seat));
  if (!state.chains.some((chain) => chain.some((step) => step.kind === "DRAWING" && !step.system))) return true;
  return voters.every((seat) => Object.values(state.artworkVotes ?? {}).some((choices) => choices[String(seat)] !== undefined));
}

function allMatchVotesDone(state: DrawGuessState, count: number) {
  const voters = Array.from({ length: count }, (_, seat) => seat).filter((seat) => seat !== state.practiceBotSeat && !state.managedSeats?.includes(seat));
  return state.chains.every((_, owner) => voters.every((seat) => state.votes[String(owner)]?.[String(seat)] !== undefined));
}

function settleMatchVotes(state: DrawGuessState, count: number) {
  const voters = Array.from({ length: count }, (_, seat) => seat).filter((seat) => seat !== state.practiceBotSeat && !state.managedSeats?.includes(seat));
  state.matchVoterSeats = voters;
  for (let owner = 0; owner < count; owner += 1) {
    const yes = voters.filter((seat) => state.votes[String(owner)]?.[String(seat)] === true).length;
    state.matchResults[String(owner)] = yes > voters.length / 2;
  }
}

export function getDrawGuessVoteCounts(state: DrawGuessState) {
  const voters = state.matchVoterSeats ?? state.chains.map((_, seat) => seat).filter((seat) => seat !== state.practiceBotSeat && !state.managedSeats?.includes(seat));
  return state.chains.map((_, owner) => {
    const votes = voters.flatMap((voter) => state.votes[String(owner)]?.[String(voter)] === undefined ? [] : [state.votes[String(owner)][String(voter)]]);
    return { yes: votes.filter(Boolean).length, no: votes.filter((vote) => !vote).length, abstain: voters.length - votes.length };
  });
}

export function canResetDrawGuessPostgame(returnedProfileIds: string[] | undefined, activeProfileIds: string[]) {
  return activeProfileIds.length > 0 && activeProfileIds.every((profileId) => returnedProfileIds?.includes(profileId));
}

function settleArtworkVotes(state: DrawGuessState, count: number) {
  const voters = Array.from({ length: count }, (_, seat) => seat).filter((seat) => seat !== state.practiceBotSeat && !state.managedSeats?.includes(seat));
  state.artworkVoterSeats = voters;
  const counts = state.chains.flatMap((chain, owner) => chain.flatMap((step, index) => step.kind === "DRAWING" && !step.system
    ? [{ owner, step: index, count: voters.filter((seat) => state.artworkVotes?.[String(owner)]?.[String(seat)] === index).length }] : []));
  counts.sort((a, b) => b.count - a.count || a.owner - b.owner || a.step - b.step);
  if (counts[0]?.count > 0) state.picks[String(counts[0].owner)] = counts[0].step;
}

function fillPracticeBotStep(state: DrawGuessState, count: number, locale: string) {
  const seat = state.practiceBotSeat;
  if (state.mode !== "CHAIN" || count !== 3 || seat === undefined || seat < 0 || seat >= count) return;
  if (state.phase === "CHAIN_WORD") {
    state.chains[seat][0] ??= { kind: "WORD", seat, system: true, value: optionsFor(state, seat, locale)[0] };
  } else if (state.phase === "CHAIN_STEP") {
    const owner = (seat - state.chainStage + count) % count;
    state.chains[owner][state.chainStage] ??= state.chainStage % 2
      ? { kind: "DRAWING", seat, system: true, value: [
        { color: "#156240", width: 8, points: [[0.36, 0.38], [0.42, 0.3], [0.54, 0.3], [0.62, 0.38], [0.62, 0.46], [0.5, 0.56], [0.5, 0.64]] },
        { color: "#156240", width: 9, points: [[0.5, 0.76]] },
      ] }
      : { kind: "WORD", seat, system: true, value: locale === "en" ? "no guess" : locale === "fr" ? "sans réponse" : "未猜出" };
  }
}

function fillManagedSteps(state: DrawGuessState, count: number, locale: string) {
  for (const seat of state.managedSeats ?? []) {
    if (seat < 0 || seat >= count) continue;
    if (state.phase === "CHAIN_WORD") {
      state.chains[seat][0] ??= { kind: "WORD", seat, system: true, value: optionsFor(state, seat, locale)[0] };
    } else if (state.phase === "CHAIN_STEP") {
      const owner = (seat - state.chainStage + count) % count;
      state.chains[owner][state.chainStage] ??= state.chainStage % 2
        ? { kind: "DRAWING", seat, system: true, value: [] }
        : { kind: "WORD", seat, system: true, value: locale === "en" ? "no guess" : locale === "fr" ? "sans réponse" : "未猜出" };
    }
  }
}

function settleChainScores(state: DrawGuessState, count: number) {
  for (let owner = 0; owner < count; owner += 1) {
    const chain = state.chains[owner];
    if (state.matchResults[String(owner)]) {
      if (chain[0]?.kind === "WORD" && !chain[0].system && !state.forfeitedChainSeats?.includes(owner)) state.scores[owner] += 20;
      for (const step of chain.slice(1)) {
        if (!step.system && !state.forfeitedChainSeats?.includes(step.seat)) state.scores[step.seat] += 40;
      }
    }
    const picked = state.picks[String(owner)];
    const artwork = picked === undefined ? null : chain[picked];
    if (artwork?.kind === "DRAWING" && !artwork.system && !state.forfeitedChainSeats?.includes(artwork.seat)) state.scores[artwork.seat] += 100;
  }
}

export function advanceDrawGuessGame(state: DrawGuessState, count: number, now: number, locale: string) {
  let next = structuredClone(state);
  for (let safety = 0; safety < (count * 3 + 8) * (next.roundCount ?? 1); safety += 1) {
    if (!next.deadlineAt || next.phase === "LOBBY" || next.phase === "FINISHED") break;
    fillPracticeBotStep(next, count, locale);
    fillManagedSteps(next, count, locale);
    const deadline = Date.parse(next.deadlineAt);
    const timedOut = now >= deadline;
    const allDone = next.phase === "WORD_SELECT" ? Boolean(next.answer) || Boolean(next.managedSeats?.includes(next.turnIndex))
      : next.phase === "DRAW_GUESS" ? Array.from({ length: count }, (_, seat) => seat).filter((seat) => seat !== next.turnIndex && !next.managedSeats?.includes(seat)).every((seat) => Boolean(next.guesses[String(next.turnIndex)]?.[String(seat)]))
        || Boolean(next.managedSeats?.includes(next.turnIndex))
      : next.phase === "CHAIN_WORD" || next.phase === "CHAIN_STEP" ? allChainStepsDone(next)
      : next.phase === "MATCH_VOTE" ? allMatchVotesDone(next, count)
      : next.phase === "ARTWORK_VOTE" ? allArtworkVotesDone(next, count)
      : next.phase === "REVEAL_VOTE" || next.phase === "AUTHOR_PICK" ? true
      : false;
    if (!timedOut && !allDone) break;
    const base = timedOut ? deadline : now;

    if (next.phase === "WORD_SELECT") {
      next.answer ||= next.options[0];
      if (next.managedSeats?.includes(next.turnIndex)) {
        next.drawDeadlineAt = null;
        setDeadline(next, "TURN_REVEAL", base, 1_000);
        continue;
      }
      const drawDuration = next.timing ? next.timing.drawSeconds * 1_000 : DURATION.DRAW_GUESS;
      next.drawDeadlineAt = next.timing ? new Date(base + drawDuration).toISOString() : null;
      setDeadline(next, "DRAW_GUESS", base, drawDuration + (next.timing?.guessSeconds ?? 0) * 1_000);
    } else if (next.phase === "DRAW_GUESS") {
      const activeGuessers = Array.from({ length: count }, (_, seat) => seat).filter((seat) => seat !== next.turnIndex && !next.managedSeats?.includes(seat));
      const solved = activeGuessers.filter((seat) => next.guesses[String(next.turnIndex)]?.[String(seat)]).length;
      if (!next.managedSeats?.includes(next.turnIndex) && !next.forfeitedTurns?.[String(next.turnIndex)]?.includes(next.turnIndex)) {
        next.scores[next.turnIndex] += activeGuessers.length ? Math.floor(100 * solved / activeGuessers.length) : 0;
      }
      next.drawDeadlineAt = null;
      setDeadline(next, "TURN_REVEAL", base, allDone ? DURATION.ALL_GUESSED_REVEAL : DURATION.TURN_REVEAL);
    } else if (next.phase === "TURN_REVEAL") {
      next.classicAnswers[next.turnIndex] = next.answer;
      next.classicChats[next.turnIndex] = next.classicChat;
      next.classicChat = [];
      next.reactions = [];
      next.reactionUsed = {};
      next.reactionLastAt = {};
      next.turnIndex += 1;
      next.inkSeq = 0;
      next.inkCursor = null;
      next.answer = "";
      if (next.turnIndex >= count) {
        if ((next.roundIndex ?? 1) < (next.roundCount ?? 1)) {
          setDeadline(next, "ROUND_BREAK", base, DURATION.ROUND_BREAK);
          break;
        }
        next.phase = "FINISHED";
        next.deadlineAt = null;
      } else {
        next.options = optionsFor(next, next.turnIndex, locale);
        setDeadline(next, "WORD_SELECT", base, DURATION.WORD_SELECT);
      }
    } else if (next.phase === "CHAIN_WORD") {
      for (let owner = 0; owner < count; owner += 1) {
        next.chains[owner][0] ??= { kind: "WORD", seat: owner, system: true, value: optionsFor(next, owner, locale)[0] };
      }
      next.chainStage = 1;
      setDeadline(next, "CHAIN_STEP", base, (next.timing?.drawSeconds ?? DURATION.CHAIN_DRAW / 1_000) * 1_000);
    } else if (next.phase === "CHAIN_STEP") {
      for (let owner = 0; owner < count; owner += 1) {
        const seat = getChainActor(owner, next.chainStage, count);
        if (next.chains[owner][next.chainStage]) continue;
        if (next.chainStage % 2) {
          const draft = next.drafts[`${owner}:${next.chainStage}`] ?? [];
          next.chains[owner][next.chainStage] = { kind: "DRAWING", seat, system: draft.length === 0, value: draft };
        } else next.chains[owner][next.chainStage] = { kind: "WORD", seat, system: true, value: "未猜出" };
      }
      if (next.chainStage >= getChainStageCount(count)) {
        setDeadline(next, "MATCH_VOTE", base, matchVoteDuration(count));
      } else {
        next.chainStage += 1;
        setDeadline(next, "CHAIN_STEP", base, (next.chainStage % 2
          ? next.timing?.drawSeconds ?? DURATION.CHAIN_DRAW / 1_000
          : next.timing?.guessSeconds ?? DURATION.CHAIN_GUESS / 1_000) * 1_000);
      }
    } else if (next.phase === "MATCH_VOTE") {
      settleMatchVotes(next, count);
      setDeadline(next, "MATCH_RESULT", base, matchResultDuration(count));
    } else if (next.phase === "MATCH_RESULT") {
      setDeadline(next, "ARTWORK_VOTE", base, artworkVoteDuration(count));
    } else if (next.phase === "CHAIN_REVEAL") {
      if (next.chainReveal?.pausedUntil) {
        next.chainReveal.startedAt = new Date(base).toISOString();
        next.chainReveal.pausedUntil = null;
        next.deadlineAt = new Date(base + Math.max(0, getChainRevealTotalMs(next.chains) - next.chainReveal.elapsedMs)).toISOString();
      } else {
        next.chainReveal = undefined;
        next.votes = {};
        next.matchResults = {};
        next.matchVoterSeats = undefined;
        next.artworkVotes = {};
        next.artworkVoterSeats = undefined;
        next.picks = {};
        setDeadline(next, "MATCH_VOTE", base, matchVoteDuration(count));
      }
    } else if (next.phase === "REVEAL_VOTE" || next.phase === "AUTHOR_PICK") {
      next.votes = {};
      next.matchResults = {};
      next.matchVoterSeats = undefined;
      next.artworkVotes = {};
      next.artworkVoterSeats = undefined;
      next.picks = {};
      setDeadline(next, "MATCH_VOTE", base, matchVoteDuration(count));
    } else if (next.phase === "ARTWORK_VOTE") {
      settleArtworkVotes(next, count);
      settleChainScores(next, count);
      setDeadline(next, "ARTWORK_RESULT", base, artworkResultDuration(count));
    } else if (next.phase === "ARTWORK_RESULT") {
      if ((next.roundIndex ?? 1) < (next.roundCount ?? 1)) {
        setDeadline(next, "ROUND_BREAK", base, DURATION.ROUND_BREAK);
        break;
      }
      next.phase = "FINISHED";
      next.deadlineAt = null;
    } else if (next.phase === "ROUND_BREAK") {
      const fresh = createDrawGuessState(next.mode, count, next.wordBank, next.timing, next.roundCount ?? 1);
      fresh.autoSize = next.autoSize;
      fresh.practiceBotSeat = next.practiceBotSeat;
      fresh.managedSeats = next.managedSeats;
      if (next.mode === "CHAIN") fresh.forfeitedChainSeats = [...(next.managedSeats ?? [])];
      fresh.scores = next.scores;
      fresh.gameNumber = next.gameNumber + 1;
      fresh.roundIndex = (next.roundIndex ?? 1) + 1;
      const started = startDrawGuessGame(fresh, base, locale);
      if ("error" in started) break;
      next = started.state;
    }
  }
  return next;
}

export function setDrawGuessSeatManaged(state: DrawGuessState, seat: number, managed: boolean, count: number, now: number, locale: string) {
  // Settle elapsed phases with the voters and presence that existed at their deadline.
  const next = advanceDrawGuessGame(state, count, now, locale);
  const current = new Set(next.managedSeats ?? []);
  if (managed) {
    current.add(seat);
    if (next.mode === "CLASSIC" && (next.phase === "WORD_SELECT" || next.phase === "DRAW_GUESS")) {
      const turn = String(next.turnIndex);
      const forfeited = new Set(next.forfeitedTurns?.[turn] ?? []);
      forfeited.add(seat);
      (next.forfeitedTurns ??= {})[turn] = [...forfeited];
      const guess = next.guesses[turn]?.[String(seat)];
      if (guess?.points) { next.scores[seat] = Math.max(0, next.scores[seat] - guess.points); guess.points = 0; }
    } else if (next.mode === "CHAIN") {
      next.forfeitedChainSeats = [...new Set([...(next.forfeitedChainSeats ?? []), seat])];
    }
  } else current.delete(seat);
  next.managedSeats = [...current].sort((a, b) => a - b);
  // The server must persist this round before an overdue break starts the next one.
  if (next.phase === "ROUND_BREAK") return next;
  return advanceDrawGuessGame(next, count, now, locale);
}

function acceptDrawGuessDraftVersion(state: DrawGuessState, order: DrawGuessDraftOrder, seat: number) {
  const { draftClientId, draftVersion } = order;
  if (draftClientId === undefined && draftVersion === undefined) return "accepted";
  if (typeof draftClientId !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(draftClientId) ||
    typeof draftVersion !== "number" || !Number.isSafeInteger(draftVersion) || draftVersion < 1) return "invalid";
  const versions = (state.draftVersions ??= {})[String(seat)] ??= {};
  if (draftVersion <= (versions[draftClientId] ?? 0)) return "ignored";
  versions[draftClientId] = draftVersion;
  return "accepted";
}

export function applyDrawGuessAction(state: DrawGuessState, action: DrawGuessAction, seat: number, count: number, now: number, locale: string) {
  const next = advanceDrawGuessGame(state, count, now, locale);
  const invalid = (error: string) => ({ error, state: next });
  if (seat < 0 || seat >= count) return invalid("NOT_A_PLAYER");
  if (seat === next.practiceBotSeat) return invalid("NOT_A_PLAYER");
  if (next.managedSeats?.includes(seat)) return invalid("PLAYER_MANAGED");
  if (state.deadlineAt && now >= Date.parse(state.deadlineAt)) return invalid("PHASE_ENDED");
  if (next.phase !== state.phase || next.chainStage !== state.chainStage || next.turnIndex !== state.turnIndex) return invalid("PHASE_ENDED");

  if (action.type === "CHOOSE_WORD") {
    if (next.phase !== "WORD_SELECT" || seat !== next.turnIndex || !next.options.includes(action.value)) return invalid("NOT_ALLOWED");
    next.answer = action.value;
  } else if (action.type === "GUESS") {
    if (next.phase !== "DRAW_GUESS" || seat === next.turnIndex) return invalid("NOT_ALLOWED");
    const chatText = validateDrawGuessChatText(action.value);
    if (!chatText) return invalid("INVALID_WORD");
    const results = next.guesses[String(next.turnIndex)] ??= {};
    if (results[String(seat)]) return invalid("ALREADY_GUESSED");
    const attempts = next.guessAttempts[String(next.turnIndex)] ??= {};
    if (now - (attempts[String(seat)] ?? -Infinity) < 1_000) return invalid("TOO_FAST");
    attempts[String(seat)] = now;
    const correct = normalized(chatText) === normalized(next.answer);
    next.classicChat = [...(next.classicChat ?? []), {
      id: `${next.gameNumber}:${next.turnIndex}:${seat}:${now}`,
      seat,
      text: correct ? null : chatText,
      correct,
      at: new Date(now).toISOString(),
    }].slice(-120);
    if (!correct) return { state: next, correct: false };
    const duration = next.timing ? (next.timing.drawSeconds + next.timing.guessSeconds) * 1_000 : DURATION.DRAW_GUESS;
    const remaining = Math.max(0, Math.min(duration, Date.parse(next.deadlineAt!) - now));
    const points = next.forfeitedTurns?.[String(next.turnIndex)]?.includes(seat) ? 0 : 100 + Math.floor(100 * remaining / duration);
    results[String(seat)] = { at: new Date(now).toISOString(), points };
    next.scores[seat] += points;
    return { state: advanceDrawGuessGame(next, count, now, locale), correct: true, points };
  } else if (action.type === "REACT") {
    if (next.mode !== "CLASSIC" || next.phase !== "DRAW_GUESS" || seat === next.turnIndex) return invalid("NOT_ALLOWED");
    if (!DRAW_GUESS_REACTIONS.includes(action.kind)) return invalid("INVALID_REACTION");
    const used = next.reactionUsed[String(seat)] ?? [];
    if (used.includes(action.kind)) return invalid("REACTION_USED");
    if (now - (next.reactionLastAt[String(seat)] ?? -Infinity) < 1_500) return invalid("TOO_FAST");
    next.reactionUsed[String(seat)] = [...used, action.kind];
    next.reactionLastAt[String(seat)] = now;
    next.reactions = [...next.reactions, { seat, kind: action.kind, at: new Date(now).toISOString() }].slice(-40);
    const counts = next.classicReactionCounts[String(next.turnIndex)] ??= {};
    counts[action.kind] = (counts[action.kind] ?? 0) + 1;
  } else if (action.type === "LAUGH_GUESS" || action.type === "REACT_GUESS") {
    if (next.mode !== "CLASSIC" || next.phase !== "DRAW_GUESS") return invalid("NOT_ALLOWED");
    const message = next.classicChat.find((item) => item.id === action.messageId);
    if (!message || message.correct || !message.text || message.seat === seat) return invalid("NOT_ALLOWED");
    const kind = action.type === "LAUGH_GUESS" ? "😂" : action.kind;
    if (!DRAW_GUESS_REACTIONS.includes(kind)) return invalid("INVALID_REACTION");
    if (getDrawGuessMessageReactorSeats(message, kind).includes(seat)) return invalid("REACTION_USED");
    const usedCount = next.classicChat.reduce((total, item) => total + DRAW_GUESS_REACTIONS.reduce((count, reaction) =>
      count + (getDrawGuessMessageReactorSeats(item, reaction).includes(seat) ? 1 : 0), 0), 0);
    if (usedCount >= (action.type === "LAUGH_GUESS" ? 3 : 8)) return invalid("REACTION_LIMIT");
    if (kind === "😂") message.laughedBy = [...(message.laughedBy ?? []), seat];
    else {
      message.reactedBy ??= {};
      message.reactedBy[kind] = [...(message.reactedBy[kind] ?? []), seat];
    }
  } else if (action.type === "ADD_STROKE" || action.type === "UNDO_STROKE" || action.type === "CLEAR_STROKES" || action.type === "SAVE_CLASSIC_DRAFT") {
    if (next.phase !== "DRAW_GUESS" || seat !== next.turnIndex) return invalid("NOT_ALLOWED");
    if (next.drawDeadlineAt && now >= Date.parse(next.drawDeadlineAt)) return invalid("DRAW_TIME_ENDED");
    const drawing = next.drawings[next.turnIndex];
    if (action.type === "SAVE_CLASSIC_DRAFT") {
      if (!isValidDrawing(action.strokes)) return invalid("INVALID_DRAWING");
      if (action.inkCursor !== undefined && !isValidDrawGuessInkCursor(action.inkCursor)) return invalid("INVALID_INK_CURSOR");
      const order = acceptDrawGuessDraftVersion(next, action, seat);
      if (order === "invalid") return invalid("INVALID_DRAFT_VERSION");
      if (order === "ignored") return { state: next, ignoredDraft: true };
      next.drawings[next.turnIndex] = action.strokes;
      next.inkCursor = action.inkCursor ?? null;
    } else if (action.type === "ADD_STROKE") {
      if (!isValidStroke(action.stroke) || drawing.length >= 120) return invalid("INVALID_DRAWING");
      drawing.push(action.stroke);
    } else if (action.type === "UNDO_STROKE") drawing.pop();
    else drawing.length = 0;
  } else if (action.type === "SAVE_DRAFT" || action.type === "SUBMIT_STEP") {
    if (next.phase === "CHAIN_WORD" && action.type === "SUBMIT_STEP") {
      const word = validateDrawGuessWord(action.value ?? "", next.wordBank ? 20 : 12, next.wordBank ? 1 : 2);
      if (!word || next.chains[seat][0] || next.wordBank && !next.wordBank.words.includes(word)) return invalid("INVALID_WORD");
      next.chains[seat][0] = { kind: "WORD", seat, system: false, value: word };
    } else if (next.phase === "CHAIN_STEP") {
      const owner = Array.from({ length: count }, (_, index) => index).find((index) => getChainActor(index, next.chainStage, count) === seat);
      if (owner === undefined || next.chains[owner][next.chainStage]) return invalid("ALREADY_SUBMITTED");
      if (next.chainStage % 2) {
        if (!isValidDrawing(action.strokes) || (action.type === "SUBMIT_STEP" && !action.strokes?.length)) return invalid("INVALID_DRAWING");
        if (action.type === "SAVE_DRAFT") {
          const order = acceptDrawGuessDraftVersion(next, action, seat);
          if (order === "invalid") return invalid("INVALID_DRAFT_VERSION");
          if (order === "ignored") return { state: next, ignoredDraft: true };
          next.drafts[`${owner}:${next.chainStage}`] = action.strokes;
        } else next.chains[owner][next.chainStage] = { kind: "DRAWING", seat, system: false, value: action.strokes! };
      } else {
        const word = action.type === "SUBMIT_STEP" ? validateDrawGuessWord(action.value ?? "", 40) : null;
        if (!word) return invalid("INVALID_WORD");
        next.chains[owner][next.chainStage] = { kind: "WORD", seat, system: false, value: word };
      }
    } else return invalid("NOT_ALLOWED");
  } else if (action.type === "CHAIN_REACT") {
    if (next.mode !== "CHAIN" || !DRAW_GUESS_CHAIN_REACTIONS.includes(action.kind)) return invalid("NOT_ALLOWED");
    const waiting = next.phase === "CHAIN_WORD" || next.phase === "CHAIN_STEP";
    const reviewing = next.phase === "CHAIN_REVEAL" || next.phase === "ARTWORK_VOTE";
    if (!waiting && !reviewing) return invalid("NOT_ALLOWED");
    if (waiting) {
      const actorOwner = next.phase === "CHAIN_WORD" ? seat : Array.from({ length: count }, (_, owner) => owner).find((owner) => getChainActor(owner, next.chainStage, count) === seat);
      if (actorOwner === undefined || !next.chains[actorOwner][next.chainStage] || action.owner !== -1 || action.step !== -1) return invalid("NOT_ALLOWED");
    } else if (action.owner < 0 || action.owner >= count || action.step < 0 || action.step >= next.chains[action.owner].length) return invalid("NOT_ALLOWED");
    if (next.phase === "CHAIN_REVEAL") {
      const current = getChainRevealPosition(next, now);
      if (action.owner !== current.owner || action.step !== current.step) return invalid("NOT_ALLOWED");
    }
    const target = waiting ? `wait:${next.chainStage}` : `${action.owner}:${action.step}`;
    const usedKey = `${seat}:${target}`;
    if (next.chainReactionUsed?.[usedKey]) return invalid("REACTION_USED");
    if (now - (next.chainReactionLastAt?.[String(seat)] ?? -Infinity) < 900) return invalid("TOO_FAST");
    (next.chainReactionUsed ??= {})[usedKey] = true;
    (next.chainReactionLastAt ??= {})[String(seat)] = now;
    next.chainReactions = [...(next.chainReactions ?? []), { seat, kind: action.kind, owner: action.owner, step: action.step, stage: next.chainStage, at: new Date(now).toISOString() }].slice(-100);
  } else if (action.type === "REVEAL_CONTROL") {
    if (next.phase !== "CHAIN_REVEAL" || !next.chainReveal) return invalid("NOT_ALLOWED");
    const clock = next.chainReveal;
    const position = getChainRevealPosition(next, now);
    if (action.command === "PAUSE") {
      if (clock.pausedUntil) return invalid("NOT_ALLOWED");
      clock.elapsedMs = position.elapsedMs;
      clock.startedAt = null;
      clock.pausedUntil = new Date(now + 60_000).toISOString();
      next.deadlineAt = clock.pausedUntil;
    } else if (action.command === "RESUME") {
      if (!clock.pausedUntil) return invalid("NOT_ALLOWED");
      clock.startedAt = new Date(now).toISOString();
      clock.pausedUntil = null;
      next.deadlineAt = new Date(now + position.totalMs - clock.elapsedMs).toISOString();
    } else if (action.command === "NEXT") {
      clock.elapsedMs = position.nextBoundaryMs;
      clock.startedAt = new Date(now).toISOString();
      clock.pausedUntil = null;
      next.deadlineAt = new Date(now + position.totalMs - clock.elapsedMs).toISOString();
    }
  } else if (action.type === "VOTE") {
    if (next.phase !== "MATCH_VOTE" || action.owner < 0 || action.owner >= count) return invalid("NOT_ALLOWED");
    (next.votes[String(action.owner)] ??= {})[String(seat)] = action.value;
  } else if (action.type === "VOTE_ARTWORK") {
    if (next.phase !== "ARTWORK_VOTE" || action.owner < 0 || action.owner >= count) return invalid("NOT_ALLOWED");
    const step = next.chains[action.owner][action.step];
    if (step?.kind !== "DRAWING" || step.system) return invalid("INVALID_ARTWORK");
    for (const choices of Object.values(next.artworkVotes ?? {})) delete choices[String(seat)];
    ((next.artworkVotes ??= {})[String(action.owner)] ??= {})[String(seat)] = action.step;
  } else if (action.type === "PICK") {
    return invalid("NOT_ALLOWED");
  }
  return { state: advanceDrawGuessGame(next, count, now, locale) };
}

export function getDrawGuessViewerState(state: DrawGuessState, seat: number, count: number) {
  const shared = {
    chainStage: state.chainStage,
    chainFinishedSeats: state.mode === "CHAIN" && (state.phase === "CHAIN_WORD" || state.phase === "CHAIN_STEP")
      ? state.chains.flatMap((chain, owner) => chain[state.phase === "CHAIN_WORD" ? 0 : state.chainStage]
        ? [state.phase === "CHAIN_WORD" ? owner : getChainActor(owner, state.chainStage, count)] : [])
      : undefined,
    drawDeadlineAt: state.drawDeadlineAt ?? null,
    chainSubmittedCount: state.mode === "CHAIN" && (state.phase === "CHAIN_WORD" || state.phase === "CHAIN_STEP")
      ? state.chains.filter((chain) => Boolean(chain[state.phase === "CHAIN_WORD" ? 0 : state.chainStage])).length
      : undefined,
    deadlineAt: state.deadlineAt,
    chainReveal: state.phase === "CHAIN_REVEAL" ? state.chainReveal : undefined,
    gameNumber: state.gameNumber,
    roundCount: state.roundCount ?? 1,
    roundIndex: state.roundIndex ?? 1,
    mode: state.mode,
    chainReactions: state.mode === "CHAIN" && (state.phase === "CHAIN_WORD" || state.phase === "CHAIN_STEP")
      ? (state.chainReactions ?? []).filter((reaction) => reaction.owner === -1 && reaction.stage === state.chainStage).slice(-12)
      : state.mode === "CHAIN" && (state.phase === "CHAIN_REVEAL" || state.phase === "ARTWORK_VOTE")
        ? (state.chainReactions ?? []).filter((reaction) => reaction.owner >= 0).slice(-100) : undefined,
    myChainReactionTargets: state.mode === "CHAIN" && seat >= 0
      ? Object.keys(state.chainReactionUsed ?? {}).filter((key) => key.startsWith(`${seat}:`)).map((key) => key.slice(`${seat}:`.length))
      : undefined,
    phase: state.phase,
    scores: state.scores,
    managedSeats: state.managedSeats ?? [],
    timing: state.timing,
    turnIndex: state.turnIndex,
  };
  if (state.mode === "CLASSIC") {
    return {
      ...shared,
      answer: seat === state.turnIndex || Boolean(state.guesses[String(state.turnIndex)]?.[String(seat)]) || state.phase === "TURN_REVEAL" || state.phase === "FINISHED" ? state.answer : null,
      chat: state.classicChat ?? [],
      reactions: state.reactions ?? [],
      myReactions: state.reactionUsed?.[String(seat)] ?? [],
      reactionCounts: state.classicReactionCounts?.[String(state.turnIndex)] ?? {},
      ...(state.phase === "FINISHED" ? { classicHighlight: getDrawGuessClassicHighlight(state) } : {}),
      ...(state.phase === "FINISHED" ? { classicTurns: state.drawings.map((drawing, artistSeat) => ({
        answer: state.classicAnswers?.[artistSeat] ?? "",
        artistSeat,
        chat: state.classicChats?.[artistSeat] ?? [],
        drawing,
        roundNumber: state.roundIndex ?? 1,
      })) } : {}),
      drawing: state.drawings[state.turnIndex] ?? [],
      inkSeq: state.inkSeq ?? 0,
      inkCursor: state.inkCursor ?? null,
      guesses: state.guesses[String(state.turnIndex)] ?? {},
      options: seat === state.turnIndex && state.phase === "WORD_SELECT" ? state.options : [],
    };
  }
  if (seat < 0 && state.phase !== "MATCH_VOTE" && state.phase !== "MATCH_RESULT" && state.phase !== "CHAIN_REVEAL" && state.phase !== "ARTWORK_VOTE" && state.phase !== "ARTWORK_RESULT" && state.phase !== "ROUND_BREAK" && state.phase !== "FINISHED") return { ...shared, task: null };
  if (state.phase === "MATCH_VOTE" || state.phase === "MATCH_RESULT" || state.phase === "CHAIN_REVEAL" || state.phase === "ARTWORK_VOTE" || state.phase === "ARTWORK_RESULT" || state.phase === "ROUND_BREAK" || state.phase === "FINISHED") {
    return {
      ...shared,
      chains: state.phase === "MATCH_VOTE" || state.phase === "MATCH_RESULT" ? state.chains.map((chain) => [chain[0], chain.at(-1)].filter((step): step is ChainStep => Boolean(step))) : state.chains,
      matchResults: state.phase === "MATCH_VOTE" || state.phase === "CHAIN_REVEAL" ? null : state.matchResults,
      matchVoterSeats: state.phase === "MATCH_VOTE" ? undefined : state.matchVoterSeats,
      picks: state.phase === "ARTWORK_RESULT" || state.phase === "FINISHED" || state.phase === "ROUND_BREAK" ? state.picks : {},
      voteCounts: state.phase === "MATCH_VOTE" || state.phase === "MATCH_RESULT" || state.phase === "ARTWORK_VOTE" || state.phase === "ARTWORK_RESULT" || state.phase === "ROUND_BREAK" || state.phase === "FINISHED" ? getDrawGuessVoteCounts(state) : null,
      matchVotes: state.phase === "MATCH_VOTE" || state.phase === "MATCH_RESULT" || state.phase === "ARTWORK_VOTE" || state.phase === "ARTWORK_RESULT" || state.phase === "ROUND_BREAK" || state.phase === "FINISHED" ? state.votes : {},
      myArtworkVotes: seat < 0 ? {} : Object.fromEntries(Object.entries(state.artworkVotes ?? {}).flatMap(([owner, votes]) => votes[String(seat)] === undefined ? [] : [[owner, votes[String(seat)]]])),
      artworkVotes: state.phase === "ARTWORK_VOTE" || state.phase === "ARTWORK_RESULT" || state.phase === "ROUND_BREAK" || state.phase === "FINISHED" ? state.artworkVotes ?? {} : {},
      artworkVoterSeats: state.phase === "ARTWORK_RESULT" || state.phase === "ROUND_BREAK" || state.phase === "FINISHED" ? state.artworkVoterSeats : undefined,
    };
  }
  const owner = state.phase === "CHAIN_STEP"
    ? Array.from({ length: count }, (_, index) => index).find((index) => getChainActor(index, state.chainStage, count) === seat)
    : seat;
  const previous = owner === undefined ? null : state.chains[owner][state.chainStage - 1] ?? null;
  const submitted = owner === undefined ? false : Boolean(state.chains[owner][state.chainStage]);
  return {
    ...shared,
    task: state.phase === "CHAIN_WORD" ? { kind: "WORD", submitted: Boolean(state.chains[seat][0]), ...(state.wordBank ? { options: optionsFor(state, seat) } : {}) }
      : state.phase === "CHAIN_STEP" ? { kind: state.chainStage % 2 ? "DRAWING" : "WORD", owner, previous, submitted, draft: state.chainStage % 2 && owner !== undefined ? state.drafts[`${owner}:${state.chainStage}`] ?? [] : [] } : null,
  };
}
