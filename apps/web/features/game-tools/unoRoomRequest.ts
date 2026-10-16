import type { UnoRoomView } from "./unoRoomTypes";

export type UnoPendingWrite = { path: string; method: "POST" | "PATCH"; body: object };
export type UnoWriteOutcome =
  | { status: "accepted"; room?: UnoRoomView }
  | { status: "rejected"; error: string; room?: UnoRoomView }
  | { status: "uncertain"; error: string };

/** Only these endpoints persist an actor-bound receipt. Other uncertain writes
 * recover from a fresh snapshot; repeating their body could apply stale intent. */
export function canRetryUnoRoomWrite(request: UnoPendingWrite) {
  return request.method === "POST" && (request.path === "/actions" || request.path === "/reactions");
}

/** Preserve the original body, including the command ID or expectedRevision. */
export async function sendUnoRoomWrite(endpoint: string, request: UnoPendingWrite, fetcher: typeof fetch = fetch): Promise<UnoWriteOutcome> {
  try {
    const response = await fetcher(`${endpoint}${request.path}`, {
      method: request.method, headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body), signal: AbortSignal.timeout(12_000),
    });
    const data = await response.json() as { room?: UnoRoomView; error?: string; ok?: boolean };
    if (response.status >= 500 || response.status === 429 || data?.error === "TRY_AGAIN") return { status: "uncertain", error: data?.error ?? "NETWORK" };
    if (!response.ok || data?.error) return { status: "rejected", error: data?.error ?? "UNKNOWN", room: data?.room };
    if (request.path === "/leave" ? data?.ok !== true : !data?.room) return { status: "uncertain", error: "NETWORK" };
    return { status: "accepted", room: data?.room };
  } catch { return { status: "uncertain", error: "NETWORK" }; }
}

export function isUnoRoomAccessError(code: string | undefined) {
  return code === "SIGN_IN_REQUIRED" || code === "NOT_A_MEMBER" || code === "ROOM_NOT_FOUND";
}
