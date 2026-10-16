import "server-only";
import { DDZ_ROOM_EVENT, getDdzRoomTopic } from "./doudizhuRealtime";
/** Supabase private REST broadcast: https://supabase.com/docs/guides/realtime/broadcast
 * Invalidation only. Never publish private hands, account IDs or full snapshots. */
export async function broadcastDdzRoomChange(roomId: string, revision: number) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return false;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/realtime/v1/api/broadcast/${encodeURIComponent(getDdzRoomTopic(roomId))}/events/${DDZ_ROOM_EVENT}?private=true`, {
      method: "POST", headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ roomId, revision }), cache: "no-store", signal: AbortSignal.timeout(1_000),
    });
    return response.ok;
  } catch { return false; }
}
