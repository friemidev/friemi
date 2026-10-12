import { timingSafeEqual } from "node:crypto";
import { unoAvailabilityResponse, unoResponse } from "@/features/game-tools/unoApi";
import { sweepDueUnoRooms } from "@/features/game-tools/unoRoomServer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unavailable = unoAvailabilityResponse();
  if (unavailable) return unavailable;
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  if (!secret || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return unoResponse({ error: "UNAUTHORIZED" }, 401);
  const result = await sweepDueUnoRooms();
  return unoResponse(result, result.errors ? 500 : 200);
}
