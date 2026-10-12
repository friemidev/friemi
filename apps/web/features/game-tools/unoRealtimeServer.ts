import "server-only";
import { getUnoRoomTopic, UNO_ROOM_EVENT } from "./unoRealtime";

// Invalidation only: no hands, draw order, grace or declaration state leaves here.
export async function broadcastUnoRoomChange(roomId: string, revision: number) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return false;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/realtime/v1/api/broadcast/${encodeURIComponent(getUnoRoomTopic(roomId))}/events/${UNO_ROOM_EVENT}`, {
      method: "POST",
      headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ roomId, revision }), cache: "no-store", signal: AbortSignal.timeout(1_000),
    });
    return response.ok;
  } catch { return false; }
}
