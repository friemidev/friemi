import "server-only";

import { DRAW_GUESS_ROOM_EVENT, getDrawGuessRoomTopic } from "@/features/game-tools/drawGuessRealtime";

export async function broadcastDrawGuessRoomChange(roomId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return false;
  const topic = getDrawGuessRoomTopic(roomId);
  const endpoint = `${url.replace(/\/$/, "")}/realtime/v1/api/broadcast/${encodeURIComponent(topic)}/events/${encodeURIComponent(DRAW_GUESS_ROOM_EVENT)}`;
  try {
    const response = await fetch(endpoint, {
      body: JSON.stringify({ roomId }),
      cache: "no-store",
      headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(1_000),
    });
    if (!response.ok) console.warn("[draw-guess] room broadcast failed", { roomId, status: response.status });
    return response.ok;
  } catch {
    console.warn("[draw-guess] room broadcast unavailable", { roomId });
    return false;
  }
}
