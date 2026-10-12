import { unoAvailabilityResponse, unoResponse } from "@/features/game-tools/unoApi";
import { getUnoRoomHistory } from "@/features/game-tools/unoRoomServer";

export async function GET(_request: Request, context: { params: Promise<{ roomId: string }> }) {
  const unavailable = unoAvailabilityResponse();
  if (unavailable) return unavailable;
  const { getExistingUnoProfileId } = await import("@/features/game-tools/unoAuth");
  const profileId = await getExistingUnoProfileId();
  if (!profileId) return unoResponse({ error: "SIGN_IN_REQUIRED" }, 401);
  return unoResponse(await getUnoRoomHistory((await context.params).roomId, profileId));
}
