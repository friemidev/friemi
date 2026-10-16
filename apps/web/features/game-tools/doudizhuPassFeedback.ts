import type { DdzViewerState } from "./doudizhuTypes";

/** The second PASS and TRICK arrive together; leave time to read both seats. */
export const DDZ_PASS_TRICK_HOLD_MS = 1_400;
export type DdzPassFeedback = {
  seat: number;
  eventId: number;
  expiresAt: number | null;
};

/** Project accepted events only. A later play supersedes all previous passes. */
export function getDdzPassFeedback(
  state: Pick<
    DdzViewerState,
    "phase" | "gameNo" | "dealNo" | "events" | "targetPlay"
  >,
  now: number,
): DdzPassFeedback[] {
  if (state.phase !== "PLAYING") return [];
  const passes = new Map<number, number>();
  let expiresAt: number | null = null;
  for (const event of state.events) {
    if (event.gameNo !== state.gameNo || event.dealNo !== state.dealNo)
      continue;
    if (["DEAL", "LANDLORD", "PLAY", "RESULT", "LOBBY"].includes(event.kind)) {
      passes.clear();
      expiresAt = null;
    } else if (event.kind === "PASS" && event.seat !== undefined) {
      passes.set(event.seat, event.id);
    } else if (event.kind === "TRICK") {
      expiresAt = event.at + DDZ_PASS_TRICK_HOLD_MS;
    }
  }
  if (
    (expiresAt !== null && now >= expiresAt) ||
    (expiresAt === null && !state.targetPlay)
  )
    return [];
  return [...passes].map(([seat, eventId]) => ({ seat, eventId, expiresAt }));
}
