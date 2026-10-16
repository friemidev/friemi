import type { DrawGuessRoomView } from "./components/DrawGuessRoomClient";
import { fetchDrawGuessResponse } from "./drawGuessRequest";

export type DrawGuessRoomResponse = { room?: DrawGuessRoomView; error?: string };
export type DrawGuessRoomRecoveryInit = RequestInit & {
  /** Rechecked after the snapshot resolves, before restoring membership. */
  shouldRecover?: () => boolean;
  timeoutMs?: number;
};

/** Restore expired membership once, then fetch a complete authorized snapshot. */
export async function fetchDrawGuessRoomWithRecovery(
  roomId: string,
  code: string,
  init: DrawGuessRoomRecoveryInit = {},
): Promise<{ response: Response; data: DrawGuessRoomResponse | null; requestedAt: number }> {
  const { shouldRecover, timeoutMs, ...requestInit } = init;
  const path = `/api/game-tools/draw-guess/rooms/${roomId}`;
  const snapshotInit = { ...requestInit, method: "GET", body: undefined, cache: "no-store" as const };
  const requestedAt = Date.now();
  const snapshot = { ...await fetchDrawGuessResponse<DrawGuessRoomResponse>(path, snapshotInit, timeoutMs), requestedAt };
  if (snapshot.response.status === 401 || snapshot.data?.error !== "NOT_A_PLAYER" || shouldRecover?.() === false) return snapshot;

  // A recovered member must receive a full view even if the room revision did
  // not change while their presence expired.
  const headers = new Headers(requestInit.headers);
  headers.delete("if-none-match");
  headers.delete("if-modified-since");
  const joinHeaders = new Headers(headers);
  joinHeaders.set("content-type", "application/json");
  const joined = await fetchDrawGuessResponse<{ roomId?: string; error?: string }>(
    "/api/game-tools/draw-guess/join",
    { ...requestInit, method: "POST", headers: joinHeaders, body: JSON.stringify({ code, expectedRoomId: roomId }), cache: "no-store" },
    timeoutMs,
  );
  if (!joined.response.ok || joined.data?.error) {
    return { response: joined.response, data: { error: joined.data?.error ?? "JOIN_FAILED" }, requestedAt };
  }
  if (joined.data?.roomId !== roomId || shouldRecover?.() === false) return snapshot;

  // Deliberately do not recurse: a second NOT_A_PLAYER is returned to the caller.
  // Clock synchronization must measure this GET's travel time, excluding the
  // failed membership lookup and join that preceded the returned snapshot.
  const freshRequestedAt = Date.now();
  const freshSnapshot = await fetchDrawGuessResponse<DrawGuessRoomResponse>(path, { ...snapshotInit, headers }, timeoutMs);
  return { ...freshSnapshot, requestedAt: freshRequestedAt };
}
