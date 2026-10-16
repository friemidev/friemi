import type { DdzRoomView } from "./doudizhuRoomTypes";
export type DdzPendingWrite = {
  path: string;
  method: "POST" | "PATCH";
  body: Record<string, unknown>;
};
export type DdzWriteOutcome =
  | { status: "accepted"; room?: DdzRoomView; roomId?: string }
  | { status: "rejected"; error: string; room?: DdzRoomView }
  | { status: "uncertain" };
/** A transport error never invents a new command identity. Retry this exact write. */
export async function sendDdzRoomWrite(
  endpoint: string,
  write: DdzPendingWrite,
): Promise<DdzWriteOutcome> {
  try {
    const response = await fetch(`${endpoint}${write.path}`, {
      method: write.method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(write.body),
      signal: AbortSignal.timeout(12_000),
    });
    if (response.status === 401 || response.status === 403)
      return {
        status: "rejected",
        error: response.status === 401 ? "SIGN_IN_REQUIRED" : "NOT_A_MEMBER",
      };
    const data = await response.json();
    if (response.status >= 500 || !data || typeof data !== "object")
      return { status: "uncertain" };
    if (!response.ok || data.error)
      return {
        status: "rejected",
        error: data.error ?? "UNKNOWN",
        room: data.room,
      };
    if (!data.room && !data.roomId && data.ok !== true)
      return { status: "uncertain" };
    return { status: "accepted", room: data.room, roomId: data.roomId };
  } catch {
    return { status: "uncertain" };
  }
}
