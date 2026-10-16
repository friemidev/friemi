import type { DdzPatternType, DdzViewerState } from "./doudizhuTypes";

export type DdzPlayEffectKind =
  | "straight"
  | "pairs"
  | "airplane"
  | "bomb"
  | "rocket";
export type DdzPlayEffect = {
  eventId: number;
  gameNo: number;
  dealNo: number;
  kind: DdzPlayEffectKind;
  pattern: DdzPatternType;
  duration: number;
};
export type DdzPlayEffectCursor = {
  roomKey: string;
  selfSeat: number;
  gameNo: number;
  dealNo: number;
  seq: number;
  observedAt: number;
};
type Snapshot = Pick<
  DdzViewerState,
  "selfSeat" | "gameNo" | "dealNo" | "eventSeq" | "phase" | "events"
>;
type Environment = { visible: boolean; hidden: boolean; reduced: boolean };

export function ddzPlayEffectKind(
  pattern: DdzPatternType,
): DdzPlayEffectKind | null {
  switch (pattern) {
    case "STRAIGHT":
      return "straight";
    case "PAIR_STRAIGHT":
      return "pairs";
    case "AIRPLANE":
    case "AIRPLANE_SINGLE":
    case "AIRPLANE_PAIR":
      return "airplane";
    case "BOMB":
      return "bomb";
    case "ROCKET":
      return "rocket";
    default:
      return null;
  }
}

export function canShowDdzPlayEffect(
  phase: DdzViewerState["phase"],
  environment: Environment,
) {
  return (
    (phase === "PLAYING" || phase === "RESULT") &&
    environment.visible &&
    !environment.hidden &&
    !environment.reduced
  );
}

/** Live recovery waits for a baseline snapshot; frozen previews are synchronous. */
export function resumeDdzPlayEffectCursor(
  state: Snapshot,
  roomKey: string,
  observedAt: number,
  freezeClock: boolean,
): DdzPlayEffectCursor | null {
  return freezeClock
    ? {
        roomKey,
        selfSeat: state.selfSeat,
        gameNo: state.gameNo,
        dealNo: state.dealNo,
        seq: state.eventSeq,
        observedAt,
      }
    : null;
}

/**
 * Snapshot projection only. A cursor advances even when presentation is skipped.
 * Select the latest PLAY before checking its type, so a newer ordinary play
 * cannot accidentally replay an older bomb. Never synthesize rule events.
 */
export function consumeDdzPlayEffect(
  previous: DdzPlayEffectCursor | null,
  state: Snapshot,
  roomKey: string,
  serverNow: number,
  observedAt: number,
  environment: Environment,
): {
  cursor: DdzPlayEffectCursor;
  effect: DdzPlayEffect | null;
  clear: boolean;
} {
  const sameContext =
    previous !== null &&
    previous.roomKey === roomKey &&
    previous.selfSeat === state.selfSeat &&
    previous.gameNo === state.gameNo &&
    previous.dealNo === state.dealNo;
  const cursor = {
    roomKey,
    selfSeat: state.selfSeat,
    gameNo: state.gameNo,
    dealNo: state.dealNo,
    seq: sameContext ? Math.max(previous.seq, state.eventSeq) : state.eventSeq,
    observedAt,
  };
  const allowed = canShowDdzPlayEffect(state.phase, environment);
  // Time between snapshots is not connection state: subscribed clients may
  // have twelve-second heartbeats, and a local preview has no polling at all.
  if (!sameContext || !previous || observedAt < previous.observedAt || !allowed)
    return { cursor, effect: null, clear: true };
  if (state.eventSeq <= previous.seq)
    return { cursor, effect: null, clear: false };
  const event = [...state.events]
    .reverse()
    .find(
      (entry) =>
        entry.kind === "PLAY" &&
        entry.id > previous.seq &&
        entry.id <= state.eventSeq &&
        entry.gameNo === state.gameNo &&
        entry.dealNo === state.dealNo,
    );
  if (!event) return { cursor, effect: null, clear: false };
  const kind = event.play && ddzPlayEffectKind(event.play.type);
  const age = serverNow - event.at;
  if (
    !kind ||
    !event.play ||
    !Number.isFinite(age) ||
    age < -250 ||
    age > 1_500
  )
    return { cursor, effect: null, clear: true };
  const duration = {
    straight: 1_000,
    pairs: 1_080,
    airplane: 1_200,
    bomb: 900,
    rocket: 1_300,
  }[kind];
  return {
    cursor,
    effect: {
      eventId: event.id,
      gameNo: event.gameNo,
      dealNo: event.dealNo,
      kind,
      pattern: event.play.type,
      duration,
    },
    clear: true,
  };
}

/** A delayed render must not start a whole effect after its moment has passed. */
export function ddzPlayEffectRemaining(
  duration: number,
  startedAt: number,
  now: number,
) {
  if (![duration, startedAt, now].every(Number.isFinite) || now < startedAt)
    return 0;
  return Math.max(0, duration - (now - startedAt));
}
