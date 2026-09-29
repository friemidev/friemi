import "server-only";

import {
  getWerewolfRealtimeTopic,
  WEREWOLF_REALTIME_EVENT,
} from "@/features/game-tools/werewolfRealtime";

const broadcastTimeoutMs = 1_000;

export async function broadcastWerewolfRoomChange(roomId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !secretKey) {
    return false;
  }

  const topic = getWerewolfRealtimeTopic(roomId);
  const endpoint = `${url.replace(/\/$/, "")}/realtime/v1/api/broadcast/${encodeURIComponent(topic)}/events/${encodeURIComponent(WEREWOLF_REALTIME_EVENT)}`;

  try {
    const response = await fetch(endpoint, {
      body: JSON.stringify({
        changedAt: new Date().toISOString(),
        roomId,
      }),
      cache: "no-store",
      headers: {
        apikey: secretKey,
        authorization: `Bearer ${secretKey}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(broadcastTimeoutMs),
    });

    if (!response.ok) {
      console.warn("Werewolf Realtime broadcast was rejected", {
        roomId,
        status: response.status,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.warn("Werewolf Realtime broadcast failed", {
      message: error instanceof Error ? error.message : "Unknown error",
      roomId,
    });
    return false;
  }
}
