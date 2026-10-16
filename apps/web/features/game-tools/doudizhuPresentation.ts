import { ddzPlayEffectKind, type DdzPlayEffect } from "./doudizhuPlayEffects";
import type { DdzEvent, DdzViewerState } from "./doudizhuTypes";

export const DDZ_PRESENTATION_LEAD_MS = 50;
export type DdzPresentation = {
  sourceKey: string;
  event: DdzEvent;
  startAt: number;
  effect: DdzPlayEffect | null;
  result: boolean;
};
export type DdzPresentationCursor = {
  roomKey: string;
  selfSeat: number;
  gameNo: number;
  dealNo: number;
  seq: number;
};
type Snapshot = Pick<
  DdzViewerState,
  "selfSeat" | "gameNo" | "dealNo" | "eventSeq" | "phase" | "events"
>;

export function ddzPresentationCursor(
  state: Snapshot,
  roomKey: string,
): DdzPresentationCursor {
  return {
    roomKey,
    selfSeat: state.selfSeat,
    gameNo: state.gameNo,
    dealNo: state.dealNo,
    seq: state.eventSeq,
  };
}

/** The only snapshot-to-presentation cursor: sounds and decorative UI share its result. */
export function consumeDdzPresentation(
  previous: DdzPresentationCursor | null,
  state: Snapshot,
  roomKey: string,
  serverNow: number,
  observedAt: number,
  allowed: boolean,
): {
  cursor: DdzPresentationCursor;
  presentation: DdzPresentation | null;
  clear: boolean;
} {
  const sameViewer =
    previous?.roomKey === roomKey && previous.selfSeat === state.selfSeat;
  const cursor = ddzPresentationCursor(state, roomKey);
  if (sameViewer && previous)
    cursor.seq = Math.max(previous.seq, state.eventSeq);
  if (
    !allowed ||
    !previous ||
    !sameViewer ||
    !["BIDDING", "PLAYING", "RESULT"].includes(state.phase)
  )
    return { cursor, presentation: null, clear: true };
  if (state.eventSeq <= previous.seq)
    return { cursor, presentation: null, clear: false };
  const events = state.events.filter(
    (event) =>
      event.id > previous.seq &&
      event.id <= state.eventSeq &&
      event.gameNo === state.gameNo &&
      event.dealNo === state.dealNo,
  );
  const meaningful = events.filter((event) =>
    ["PLAY", "PASS", "DEAL", "BID", "RESULT"].includes(event.kind),
  );
  let event = meaningful.at(-1);
  if (!event) return { cursor, presentation: null, clear: false };
  const result = event.kind === "RESULT";
  // PLAY + RESULT is one accepted action. Preserve its voice and defer the finish cue.
  if (result && meaningful.at(-2)?.kind === "PLAY") event = meaningful.at(-2)!;
  const changedDeal =
    previous.gameNo !== state.gameNo || previous.dealNo !== state.dealNo;
  const age = serverNow - event.at;
  if (
    (changedDeal && event.kind !== "DEAL") ||
    !Number.isFinite(age) ||
    age < -250 ||
    age > (event.kind === "DEAL" || event.kind === "RESULT" ? 2_000 : 1_500)
  )
    return { cursor, presentation: null, clear: true };
  const kind =
    event.kind === "PLAY" && event.play
      ? ddzPlayEffectKind(event.play.type)
      : null;
  const effect: DdzPlayEffect | null =
    kind && event.play
      ? {
          eventId: event.id,
          gameNo: event.gameNo,
          dealNo: event.dealNo,
          kind,
          pattern: event.play.type,
          duration: {
            straight: 1_000,
            pairs: 1_080,
            airplane: 1_200,
            bomb: 900,
            rocket: 1_300,
          }[kind],
        }
      : null;
  return {
    cursor,
    clear: true,
    presentation: {
      sourceKey: `${roomKey}:${state.selfSeat}:${event.gameNo}:${event.dealNo}:${event.id}`,
      event,
      effect,
      result,
      startAt: observedAt + DDZ_PRESENTATION_LEAD_MS,
    },
  };
}
