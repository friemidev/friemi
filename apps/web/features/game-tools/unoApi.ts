import "server-only";
import { NextResponse } from "next/server";
import { isUnoSameOrigin } from "./unoRequest";
import { checkDistributedRateLimit } from "@/lib/distributedRateLimit";
import { isUnoEnabled } from "./unoFlags";

const windows = new Map<string, { count: number; until: number }>();

export function unoAvailabilityResponse() {
  return isUnoEnabled() ? null : unoResponse({ error: "UNO_NOT_AVAILABLE" }, 404);
}

export async function unoWriteIdentity(request: Request, scope = "write", limit = 90, syncProfile = false) {
  const unavailable = unoAvailabilityResponse();
  if (unavailable) return { response: unavailable };
  if (!isUnoSameOrigin(request)) return { response: unoResponse({ error: "INVALID_ORIGIN" }, 403) };
  const { getExistingUnoProfileId, getUnoProfile } = await import("./unoAuth");
  const profile = syncProfile ? await getUnoProfile() : null;
  const profileId = syncProfile ? profile?.id : await getExistingUnoProfileId();
  if (!profileId) return { response: unoResponse({ error: "SIGN_IN_REQUIRED" }, 401) };
  const key = `${scope}:${profileId}`;
  const now = Date.now();
  if (windows.size > 5_000) for (const [id, entry] of windows) if (entry.until <= now) windows.delete(id);
  const entry = windows.get(key);
  const bucket = entry && entry.until > now ? entry : { count: 0, until: now + 60_000 };
  bucket.count += 1;
  windows.set(key, bucket);
  if (bucket.count > limit) return { response: unoResponse({ error: "RATE_LIMITED" }, 429) };
  const distributed = await checkDistributedRateLimit({ identifier: profileId, scope: `uno-${scope}`, limit, window: "60 s" });
  if (!distributed.allowed) return { response: unoResponse({ error: "RATE_LIMITED" }, 429) };
  return { profileId, profile };
}

export function unoResponse(result: unknown, status?: number) {
  const error = result && typeof result === "object" && "error" in result ? String(result.error) : null;
  return NextResponse.json(result, {
    status: status ?? (error ? error === "ROOM_NOT_FOUND" ? 404 : error === "NOT_A_MEMBER" ? 403 : 409 : 200),
    headers: { "cache-control": "private, no-store", ...(error === "RATE_LIMITED" ? { "retry-after": "60" } : {}) },
  });
}
