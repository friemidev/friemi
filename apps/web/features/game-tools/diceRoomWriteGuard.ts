import "server-only";
import { NextResponse } from "next/server";
import { checkDistributedRateLimit } from "@/lib/distributedRateLimit";
import { isDiceSameOrigin } from "./diceRoomRequest";

const windows = new Map<string, { count: number; until: number }>();
export async function guardDiceWrite(request: Request, scope: string, profileId?: string, limit = 90) {
  if (!isDiceSameOrigin(request)) return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  if (!profileId) return null;
  const now = Date.now();
  if (windows.size > 5000) for (const [key, value] of windows) if (value.until <= now) windows.delete(key);
  const key = `${scope}:${profileId}`;
  const previous = windows.get(key);
  const bucket = previous && previous.until > now ? previous : { count: 0, until: now + 60_000 };
  bucket.count += 1;
  windows.set(key, bucket);
  if (bucket.count > limit) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429, headers: { "retry-after": "60" } });
  const distributed = await checkDistributedRateLimit({ identifier: profileId, scope: `dice-${scope}`, limit, window: "60 s" });
  return distributed.allowed ? null : NextResponse.json({ error: "RATE_LIMITED" }, { status: 429, headers: { "retry-after": "60" } });
}
