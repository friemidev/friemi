import { z } from "zod";
import { unoAvailabilityResponse, unoResponse, unoWriteIdentity } from "@/features/game-tools/unoApi";
import { getUnoRoomView, updateUnoRoomSettings } from "@/features/game-tools/unoRoomServer";
import { unoMutationSchema } from "@/features/game-tools/unoRequest";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ roomId: string }> }) {
  const unavailable = unoAvailabilityResponse();
  if (unavailable) return unavailable;
  const { getExistingUnoProfileId } = await import("@/features/game-tools/unoAuth");
  const profileId = await getExistingUnoProfileId();
  if (!profileId) return unoResponse({ error: "SIGN_IN_REQUIRED" }, 401);
  return unoResponse(await getUnoRoomView((await context.params).roomId, profileId));
}

export async function PATCH(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const identity = await unoWriteIdentity(request, "settings", 30);
  if (identity.response) return identity.response;
  const parsed = unoMutationSchema.extend({
    turnSeconds: z.union([z.literal(30), z.literal(60), z.literal(90)]).optional(),
    matchMode: z.enum(["score", "single"]).optional(),
  }).refine((settings) => settings.turnSeconds !== undefined || settings.matchMode !== undefined).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return unoResponse({ error: "INVALID_REQUEST" }, 400);
  return unoResponse(await updateUnoRoomSettings((await context.params).roomId, identity.profileId!, parsed.data, parsed.data.expectedRevision));
}
