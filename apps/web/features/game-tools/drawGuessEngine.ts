export type DrawGuessMode = "CLASSIC" | "CHAIN";
export type DrawGuessPhase =
  | "LOBBY"
  | "WORD_SELECT"
  | "DRAW_GUESS"
  | "TURN_REVEAL"
  | "CHAIN_WORD"
  | "CHAIN_STEP"
  | "REVEAL_VOTE"
  | "AUTHOR_PICK"
  | "FINISHED";

export type DrawStroke = {
  color: string;
  points: [number, number][];
  width: number;
};

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
};

export const DRAW_GUESS_DRAW_SECONDS = [30, 60, 90] as const;
export const DRAW_GUESS_GUESS_SECONDS = [20, 40, 60] as const;
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
  chains: ChainStep[][];
  classicAnswers: string[];
  classicChat: DrawGuessChatMessage[];
  commandResults: Record<string, { correct?: boolean; points?: number }>;
  deadlineAt: string | null;
  drawDeadlineAt?: string | null;
  drawings: DrawStroke[][];
  drafts: Record<string, DrawStroke[]>;
  gameNumber: number;
  guessAttempts: Record<string, Record<string, number>>;
  guesses: Record<string, Record<string, { at: string; points: number }>>;
  inkSeq: number;
  matchResults: Record<string, boolean>;
  mode: DrawGuessMode;
  options: string[];
  phase: DrawGuessPhase;
  picks: Record<string, number>;
  practiceBotSeat?: number;
  scores: number[];
  storageVersion?: number;
  timing?: DrawGuessTiming;
  turnIndex: number;
  votes: Record<string, Record<string, boolean>>;
  wordBank?: DrawGuessWordBankSnapshot;
};

export type DrawGuessAction =
  | { type: "CHOOSE_WORD"; value: string }
  | { type: "GUESS"; value: string }
  | { type: "ADD_STROKE"; stroke: DrawStroke }
  | { type: "UNDO_STROKE" }
  | { type: "CLEAR_STROKES" }
  | { type: "SAVE_CLASSIC_DRAFT"; strokes: DrawStroke[]; inkSeq?: number }
  | { type: "SAVE_DRAFT"; strokes: DrawStroke[] }
  | { type: "SUBMIT_STEP"; value?: string; strokes?: DrawStroke[] }
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
  TURN_REVEAL: 8_000,
  ALL_GUESSED_REVEAL: 5_000,
  CHAIN_WORD: 20_000,
  CHAIN_DRAW: 60_000,
  CHAIN_GUESS: 20_000,
  REVEAL_VOTE: 90_000,
  AUTHOR_PICK: 30_000,
} as const;

function optionsFor(state: DrawGuessState, turnIndex: number, locale = "en") {
  const words = state.wordBank?.words.length ? state.wordBank.words : WORDS[locale] ?? WORDS.en;
  const start = (turnIndex * 3) % words.length;
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

export function isValidDrawing(strokes: unknown): strokes is DrawStroke[] {
  return Array.isArray(strokes) && strokes.length <= 120 && strokes.every(isValidStroke) &&
    JSON.stringify(strokes).length <= 90_000;
}

export function createDrawGuessState(mode: DrawGuessMode, playerCount: number, wordBank?: DrawGuessWordBankSnapshot, timing?: DrawGuessTiming): DrawGuessState {
  return {
    answer: "",
    chainStage: 0,
    chains: Array.from({ length: playerCount }, () => []),
    classicAnswers: [],
    classicChat: [],
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
    mode,
    options: [],
    phase: "LOBBY",
    picks: {},
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

function allVotesDone(state: DrawGuessState, count: number) {
  const voters = Array.from({ length: count }, (_, seat) => seat).filter((seat) => seat !== state.practiceBotSeat && !state.managedSeats?.includes(seat));
  return state.chains.every((_, owner) => voters.every((seat) => state.votes[String(owner)]?.[String(seat)] !== undefined));
}

function allPicksDone(state: DrawGuessState) {
  return state.chains.every((chain, owner) => {
    if (owner === state.practiceBotSeat || state.managedSeats?.includes(owner)) return true;
    const hasArtwork = chain.some((step) => step.kind === "DRAWING" && !step.system);
    return !hasArtwork || state.picks[String(owner)] !== undefined;
  });
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
      const last = chain.at(-1);
      if (last?.kind === "WORD" && !last.system && !state.forfeitedChainSeats?.includes(last.seat)) state.scores[last.seat] += 40;
    }
    const picked = state.picks[String(owner)];
    const artwork = picked === undefined ? null : chain[picked];
    if (artwork?.kind === "DRAWING" && !artwork.system && !state.forfeitedChainSeats?.includes(artwork.seat)) state.scores[artwork.seat] += 100;
  }
}

export function advanceDrawGuessGame(state: DrawGuessState, count: number, now: number, locale: string) {
  const next = structuredClone(state);
  for (let safety = 0; safety < count * 3 + 8; safety += 1) {
    if (!next.deadlineAt || next.phase === "LOBBY" || next.phase === "FINISHED") break;
    fillPracticeBotStep(next, count, locale);
    fillManagedSteps(next, count, locale);
    const deadline = Date.parse(next.deadlineAt);
    const timedOut = now >= deadline;
    const allDone = next.phase === "WORD_SELECT" ? Boolean(next.answer) || Boolean(next.managedSeats?.includes(next.turnIndex))
      : next.phase === "DRAW_GUESS" ? Array.from({ length: count }, (_, seat) => seat).filter((seat) => seat !== next.turnIndex && !next.managedSeats?.includes(seat)).every((seat) => Boolean(next.guesses[String(next.turnIndex)]?.[String(seat)]))
        || Boolean(next.managedSeats?.includes(next.turnIndex))
      : next.phase === "CHAIN_WORD" || next.phase === "CHAIN_STEP" ? allChainStepsDone(next)
      : next.phase === "REVEAL_VOTE" ? allVotesDone(next, count)
      : next.phase === "AUTHOR_PICK" ? allPicksDone(next)
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
      next.classicChat = [];
      next.turnIndex += 1;
      next.inkSeq = 0;
      next.answer = "";
      if (next.turnIndex >= count) {
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
        next.chains[owner][next.chainStage] ??= next.chainStage % 2
          ? { kind: "DRAWING", seat, system: true, value: next.drafts[`${owner}:${next.chainStage}`] ?? [] }
          : { kind: "WORD", seat, system: true, value: "未猜出" };
      }
      if (next.chainStage >= getChainStageCount(count)) {
        setDeadline(next, "REVEAL_VOTE", base, DURATION.REVEAL_VOTE);
      } else {
        next.chainStage += 1;
        setDeadline(next, "CHAIN_STEP", base, (next.chainStage % 2
          ? next.timing?.drawSeconds ?? DURATION.CHAIN_DRAW / 1_000
          : next.timing?.guessSeconds ?? DURATION.CHAIN_GUESS / 1_000) * 1_000);
      }
    } else if (next.phase === "REVEAL_VOTE") {
      const eligibleVoters = Array.from({ length: count }, (_, seat) => seat).filter((seat) => seat !== next.practiceBotSeat && !next.managedSeats?.includes(seat));
      for (let owner = 0; owner < count; owner += 1) {
        const yes = eligibleVoters.filter((seat) => next.votes[String(owner)]?.[String(seat)] === true).length;
        next.matchResults[String(owner)] = yes > eligibleVoters.length / 2;
      }
      setDeadline(next, "AUTHOR_PICK", base, DURATION.AUTHOR_PICK);
    } else if (next.phase === "AUTHOR_PICK") {
      settleChainScores(next, count);
      next.phase = "FINISHED";
      next.deadlineAt = null;
    }
  }
  return next;
}

export function setDrawGuessSeatManaged(state: DrawGuessState, seat: number, managed: boolean, count: number, now: number, locale: string) {
  const next = structuredClone(state);
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
  return advanceDrawGuessGame(next, count, now, locale);
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
  } else if (action.type === "ADD_STROKE" || action.type === "UNDO_STROKE" || action.type === "CLEAR_STROKES" || action.type === "SAVE_CLASSIC_DRAFT") {
    if (next.phase !== "DRAW_GUESS" || seat !== next.turnIndex) return invalid("NOT_ALLOWED");
    if (next.drawDeadlineAt && now >= Date.parse(next.drawDeadlineAt)) return invalid("DRAW_TIME_ENDED");
    const drawing = next.drawings[next.turnIndex];
    if (action.type === "SAVE_CLASSIC_DRAFT") {
      if (!isValidDrawing(action.strokes)) return invalid("INVALID_DRAWING");
      next.drawings[next.turnIndex] = action.strokes;
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
        if (action.type === "SAVE_DRAFT") next.drafts[`${owner}:${next.chainStage}`] = action.strokes;
        else next.chains[owner][next.chainStage] = { kind: "DRAWING", seat, system: false, value: action.strokes! };
      } else {
        const word = action.type === "SUBMIT_STEP" ? validateDrawGuessWord(action.value ?? "", 40) : null;
        if (!word) return invalid("INVALID_WORD");
        next.chains[owner][next.chainStage] = { kind: "WORD", seat, system: false, value: word };
      }
    } else return invalid("NOT_ALLOWED");
  } else if (action.type === "VOTE") {
    if (next.phase !== "REVEAL_VOTE" || action.owner < 0 || action.owner >= count) return invalid("NOT_ALLOWED");
    (next.votes[String(action.owner)] ??= {})[String(seat)] = action.value;
  } else if (action.type === "PICK") {
    if (next.phase !== "AUTHOR_PICK" || action.owner !== seat) return invalid("NOT_ALLOWED");
    const step = next.chains[seat][action.step];
    if (step?.kind !== "DRAWING" || step.system) return invalid("INVALID_ARTWORK");
    next.picks[String(seat)] = action.step;
  }
  return { state: advanceDrawGuessGame(next, count, now, locale) };
}

export function getDrawGuessViewerState(state: DrawGuessState, seat: number, count: number) {
  const shared = {
    chainStage: state.chainStage,
    drawDeadlineAt: state.drawDeadlineAt ?? null,
    chainSubmittedCount: state.mode === "CHAIN" && (state.phase === "CHAIN_WORD" || state.phase === "CHAIN_STEP")
      ? state.chains.filter((chain) => Boolean(chain[state.phase === "CHAIN_WORD" ? 0 : state.chainStage])).length
      : undefined,
    deadlineAt: state.deadlineAt,
    gameNumber: state.gameNumber,
    mode: state.mode,
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
      drawing: state.drawings[state.turnIndex] ?? [],
      inkSeq: state.inkSeq ?? 0,
      guesses: state.guesses[String(state.turnIndex)] ?? {},
      options: seat === state.turnIndex && state.phase === "WORD_SELECT" ? state.options : [],
    };
  }
  if (seat < 0 && state.phase !== "REVEAL_VOTE" && state.phase !== "AUTHOR_PICK" && state.phase !== "FINISHED") return { ...shared, task: null };
  if (state.phase === "REVEAL_VOTE" || state.phase === "AUTHOR_PICK" || state.phase === "FINISHED") {
    return {
      ...shared,
      chains: state.chains,
      matchResults: state.phase === "REVEAL_VOTE" ? null : state.matchResults,
      picks: state.phase === "FINISHED" ? state.picks
        : state.picks[String(seat)] === undefined ? {} : { [String(seat)]: state.picks[String(seat)] },
      voteCounts: state.phase === "REVEAL_VOTE" ? null : state.chains.map((_, owner) => {
        const votes = Object.values(state.votes[String(owner)] ?? {});
        return { yes: votes.filter(Boolean).length, no: votes.filter((vote) => !vote).length, abstain: count - votes.length };
      }),
      votedOwners: Object.keys(state.votes).filter((owner) => state.votes[owner][String(seat)] !== undefined).map(Number),
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
