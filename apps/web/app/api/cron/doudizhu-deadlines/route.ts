import { timingSafeEqual } from "node:crypto";
import { ddzAvailabilityResponse, ddzResponse } from "@/features/game-tools/doudizhuApi";
import { sweepDueDdzRooms } from "@/features/game-tools/doudizhuRoomServer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unavailable = ddzAvailabilityResponse();
  if (unavailable) return unavailable;
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  if (!secret || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return ddzResponse({ error: "UNAUTHORIZED" }, 401);
  const result = await sweepDueDdzRooms();
  return ddzResponse(result, result.errors ? 500 : 200);
}
