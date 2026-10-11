import { fetchDrawGuessResponse } from "./drawGuessRequest";

type JoinRequest = { profileId?: string | null; code: string; expectedRoomId?: string };
const pendingJoins = new Map<string, Promise<string>>();

/** Share an unfinished join across entry/invitation mounts and StrictMode replay. */
export function joinDrawGuessRoomPending({ profileId, code, expectedRoomId }: JoinRequest): Promise<string> {
  const normalizedCode = code.trim().toUpperCase();
  const key = JSON.stringify([profileId ?? null, normalizedCode, expectedRoomId ?? null]);
  const existing = pendingJoins.get(key);
  if (existing) return existing;

  const request = fetchDrawGuessResponse<{ roomId?: string; error?: string }>("/api/game-tools/draw-guess/join", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: normalizedCode, expectedRoomId }),
  }).then(({ response, data }) => {
    if (!response.ok || !data?.roomId) throw new Error(data?.error ?? "UNKNOWN");
    if (expectedRoomId && data.roomId !== expectedRoomId) throw new Error("ROOM_NOT_FOUND");
    return data.roomId;
  });
  const completed = request.finally(() => {
    if (pendingJoins.get(key) === completed) pendingJoins.delete(key);
  });
  pendingJoins.set(key, completed);
  return completed;
}
