import { getDdzRoomView } from "@/features/game-tools/doudizhuRoomServer";
import { ddzAvailabilityResponse, ddzResponse } from "@/features/game-tools/doudizhuApi";
import { getExistingDdzProfileId } from "@/features/game-tools/doudizhuAuth";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ roomId: string }> }) {
  const unavailable = ddzAvailabilityResponse(); if (unavailable) return unavailable;
  const actor = await getExistingDdzProfileId(); if (!actor) return ddzResponse({ error: "SIGN_IN_REQUIRED" }, 401);
  return ddzResponse(await getDdzRoomView((await context.params).roomId, actor));
}
