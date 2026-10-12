import "server-only";
import { DICE_ROOM_EVENT, getDiceRoomTopic } from "./diceRealtime";

// Broadcast is only an invalidation notice. Private hands always come from an authenticated snapshot.
export async function broadcastDiceRoomChange(roomId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return false;
  const endpoint = `${url.replace(/\/$/, "")}/realtime/v1/api/broadcast/${encodeURIComponent(getDiceRoomTopic(roomId))}/events/${encodeURIComponent(DICE_ROOM_EVENT)}`;
  try {
    const response = await fetch(endpoint, {
      body: JSON.stringify({ roomId }), cache: "no-store",
      headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
      method: "POST", signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch { return false; }
}
