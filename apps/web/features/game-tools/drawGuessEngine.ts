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

export type DrawGuessState = {
  answer: string;
  chainStage: number;
  chains: ChainStep[][];
  commandResults: Record<string, { correct?: boolean; points?: number }>;
  deadlineAt: string | null;
  drawings: DrawStroke[][];
  drafts: Record<string, DrawStroke[]>;
  guessAttempts: Record<string, Record<string, number>>;
  guesses: Record<string, Record<string, { at: string; points: number }>>;
  matchResults: Record<string, boolean>;
  mode: DrawGuessMode;
  options: string[];
  phase: DrawGuessPhase;
  picks: Record<string, number>;
  scores: number[];
  turnIndex: number;
  votes: Record<string, Record<string, boolean>>;
};

export type DrawGuessAction =
  | { type: "CHOOSE_WORD"; value: string }
  | { type: "GUESS"; value: string }
  | { type: "ADD_STROKE"; stroke: DrawStroke }
  | { type: "UNDO_STROKE" }
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
  TURN_REVEAL: 5_000,
  CHAIN_WORD: 20_000,
  CHAIN_DRAW: 60_000,
  CHAIN_GUESS: 20_000,
  REVEAL_VOTE: 90_000,
  AUTHOR_PICK: 30_000,
} as const;

function optionsFor(locale: string, turnIndex: number) {
  const words = WORDS[locale] ?? WORDS.en;
  const start = (turnIndex * 3) % words.length;
  return [words[start], words[(start + 1) % words.length], words[(start + 2) % words.length]];
}

function normalized(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/[\s\p{P}]+/gu, "");
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

export function createDrawGuessState(mode: DrawGuessMode, playerCount: number): DrawGuessState {
  return {
    answer: "",
    chainStage: 0,
    chains: Array.from({ length: playerCount }, () => []),
    commandResults: {},
    deadlineAt: null,
    drawings: Array.from({ length: playerCount }, () => []),
    drafts: {},
    guessAttempts: {},
    guesses: {},
    matchResults: {},
    mode,
    options: [],
    phase: "LOBBY",
    picks: {},
    scores: Array(playerCount).fill(0),
    turnIndex: 0,
    votes: {},
  };
}

export function getChainStageCount(playerCount: number) {
  return 2 * Math.floor((playerCount - 1) / 2);
}

export function getChainActor(owner: number, stage: number, playerCount: number) {
  return (owner + stage) % playerCount;
}

function setDeadline(state: DrawGuessState, phase: DrawGuessPhase, base: number, duration: number) {
  state.phase = phase;
  state.deadlineAt = new Date(base + duration).toISOString();
}

export function startDrawGuessGame(state: DrawGuessState, now: number, locale: string) {
  if (state.phase !== "LOBBY") return { error: "ALREADY_STARTED" } as const;
  const next = structuredClone(state);
  if (next.mode === "CLASSIC") {
    next.options = optionsFor(locale, 0);
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
  return state.chains.every((_, owner) => Object.keys(state.votes[String(owner)] ?? {}).length === count);
}

function allPicksDone(state: DrawGuessState) {
  return state.chains.every((chain, owner) => {
    const hasArtwork = chain.some((step) => step.kind === "DRAWING" && !step.system);
    return !hasArtwork || state.picks[String(owner)] !== undefined;
  });
}

function settleChainScores(state: DrawGuessState, count: number) {
  for (let owner = 0; owner < count; owner += 1) {
    const chain = state.chains[owner];
    if (state.matchResults[String(owner)]) {
      if (chain[0]?.kind === "WORD" && !chain[0].system) state.scores[owner] += 20;
      for (const step of chain.slice(1)) {
        if (!step.system) state.scores[step.seat] += 40;
      }
      const last = chain.at(-1);
      if (last?.kind === "WORD" && !last.system) state.scores[last.seat] += 40;
    }
    const picked = state.picks[String(owner)];
    const artwork = picked === undefined ? null : chain[picked];
    if (artwork?.kind === "DRAWING" && !artwork.system) state.scores[artwork.seat] += 100;
  }
}

export function advanceDrawGuessGame(state: DrawGuessState, count: number, now: number, locale: string) {
  const next = structuredClone(state);
  for (let safety = 0; safety < 24; safety += 1) {
    if (!next.deadlineAt || next.phase === "LOBBY" || next.phase === "FINISHED") break;
    const deadline = Date.parse(next.deadlineAt);
    const timedOut = now >= deadline;
    const allDone = next.phase === "WORD_SELECT" ? Boolean(next.answer)
      : next.phase === "DRAW_GUESS" ? Object.keys(next.guesses[String(next.turnIndex)] ?? {}).length === count - 1
      : next.phase === "CHAIN_WORD" || next.phase === "CHAIN_STEP" ? allChainStepsDone(next)
      : next.phase === "REVEAL_VOTE" ? allVotesDone(next, count)
      : next.phase === "AUTHOR_PICK" ? allPicksDone(next)
      : false;
    if (!timedOut && !allDone) break;
    const base = timedOut ? deadline : now;

    if (next.phase === "WORD_SELECT") {
      next.answer ||= next.options[0];
      setDeadline(next, "DRAW_GUESS", base, DURATION.DRAW_GUESS);
    } else if (next.phase === "DRAW_GUESS") {
      const solved = Object.keys(next.guesses[String(next.turnIndex)] ?? {}).length;
      next.scores[next.turnIndex] += Math.floor(100 * solved / (count - 1));
      setDeadline(next, "TURN_REVEAL", base, DURATION.TURN_REVEAL);
    } else if (next.phase === "TURN_REVEAL") {
      next.turnIndex += 1;
      next.answer = "";
      if (next.turnIndex >= count) {
        next.phase = "FINISHED";
        next.deadlineAt = null;
      } else {
        next.options = optionsFor(locale, next.turnIndex);
        setDeadline(next, "WORD_SELECT", base, DURATION.WORD_SELECT);
      }
    } else if (next.phase === "CHAIN_WORD") {
      for (let owner = 0; owner < count; owner += 1) {
        next.chains[owner][0] ??= { kind: "WORD", seat: owner, system: true, value: optionsFor(locale, owner)[0] };
      }
      next.chainStage = 1;
      setDeadline(next, "CHAIN_STEP", base, DURATION.CHAIN_DRAW);
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
        setDeadline(next, "CHAIN_STEP", base, next.chainStage % 2 ? DURATION.CHAIN_DRAW : DURATION.CHAIN_GUESS);
      }
    } else if (next.phase === "REVEAL_VOTE") {
      for (let owner = 0; owner < count; owner += 1) {
        const yes = Object.values(next.votes[String(owner)] ?? {}).filter(Boolean).length;
        next.matchResults[String(owner)] = yes > count / 2;
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

export function applyDrawGuessAction(state: DrawGuessState, action: DrawGuessAction, seat: number, count: number, now: number, locale: string) {
  const next = advanceDrawGuessGame(state, count, now, locale);
  const invalid = (error: string) => ({ error, state: next });
  if (seat < 0 || seat >= count) return invalid("NOT_A_PLAYER");
  if (next.deadlineAt && now >= Date.parse(next.deadlineAt)) return invalid("PHASE_ENDED");

  if (action.type === "CHOOSE_WORD") {
    if (next.phase !== "WORD_SELECT" || seat !== next.turnIndex || !next.options.includes(action.value)) return invalid("NOT_ALLOWED");
    next.answer = action.value;
  } else if (action.type === "GUESS") {
    if (next.phase !== "DRAW_GUESS" || seat === next.turnIndex || !action.value.trim() || Array.from(action.value.trim()).length > 20) return invalid("NOT_ALLOWED");
    const results = next.guesses[String(next.turnIndex)] ??= {};
    if (results[String(seat)]) return invalid("ALREADY_GUESSED");
    const attempts = next.guessAttempts[String(next.turnIndex)] ??= {};
    if (now - (attempts[String(seat)] ?? -Infinity) < 1_000) return invalid("TOO_FAST");
    attempts[String(seat)] = now;
    if (normalized(action.value) !== normalized(next.answer)) return { state: next, correct: false };
    const remaining = Math.max(0, Math.min(60_000, Date.parse(next.deadlineAt!) - now));
    const points = 100 + Math.floor(100 * remaining / 60_000);
    results[String(seat)] = { at: new Date(now).toISOString(), points };
    next.scores[seat] += points;
    return { state: advanceDrawGuessGame(next, count, now, locale), correct: true, points };
  } else if (action.type === "ADD_STROKE" || action.type === "UNDO_STROKE") {
    if (next.phase !== "DRAW_GUESS" || seat !== next.turnIndex) return invalid("NOT_ALLOWED");
    const drawing = next.drawings[next.turnIndex];
    if (action.type === "ADD_STROKE") {
      if (!isValidStroke(action.stroke) || drawing.length >= 120) return invalid("INVALID_DRAWING");
      drawing.push(action.stroke);
    } else drawing.pop();
  } else if (action.type === "SAVE_DRAFT" || action.type === "SUBMIT_STEP") {
    if (next.phase === "CHAIN_WORD" && action.type === "SUBMIT_STEP") {
      const word = action.value?.trim() ?? "";
      if (Array.from(word).length < 2 || Array.from(word).length > 12 || /[\u0000-\u001f\u007f]/u.test(word) || next.chains[seat][0]) return invalid("INVALID_WORD");
      next.chains[seat][0] = { kind: "WORD", seat, system: false, value: word };
    } else if (next.phase === "CHAIN_STEP") {
      const owner = Array.from({ length: count }, (_, index) => index).find((index) => getChainActor(index, next.chainStage, count) === seat);
      if (owner === undefined || next.chains[owner][next.chainStage]) return invalid("ALREADY_SUBMITTED");
      if (next.chainStage % 2) {
        if (!isValidDrawing(action.strokes) || (action.type === "SUBMIT_STEP" && !action.strokes?.length)) return invalid("INVALID_DRAWING");
        if (action.type === "SAVE_DRAFT") next.drafts[`${owner}:${next.chainStage}`] = action.strokes;
        else next.chains[owner][next.chainStage] = { kind: "DRAWING", seat, system: false, value: action.strokes! };
      } else {
        if (action.type !== "SUBMIT_STEP" || !action.value?.trim() || action.value.length > 40) return invalid("INVALID_WORD");
        next.chains[owner][next.chainStage] = { kind: "WORD", seat, system: false, value: action.value.trim() };
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
    deadlineAt: state.deadlineAt,
    mode: state.mode,
    phase: state.phase,
    scores: state.scores,
    turnIndex: state.turnIndex,
  };
  if (state.mode === "CLASSIC") {
    return {
      ...shared,
      answer: seat === state.turnIndex || state.phase === "TURN_REVEAL" || state.phase === "FINISHED" ? state.answer : null,
      drawing: state.drawings[state.turnIndex] ?? [],
      guesses: state.guesses[String(state.turnIndex)] ?? {},
      options: seat === state.turnIndex && state.phase === "WORD_SELECT" ? state.options : [],
    };
  }
  if (state.phase === "REVEAL_VOTE" || state.phase === "AUTHOR_PICK" || state.phase === "FINISHED") {
    return {
      ...shared,
      chains: state.chains,
      matchResults: state.phase === "REVEAL_VOTE" ? null : state.matchResults,
      picks: state.phase === "FINISHED" ? state.picks : {},
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
    task: state.phase === "CHAIN_WORD" ? { kind: "WORD", submitted: Boolean(state.chains[seat][0]) }
      : state.phase === "CHAIN_STEP" ? { kind: state.chainStage % 2 ? "DRAWING" : "WORD", owner, previous, submitted, draft: state.chainStage % 2 && owner !== undefined ? state.drafts[`${owner}:${state.chainStage}`] ?? [] : [] } : null,
  };
}
