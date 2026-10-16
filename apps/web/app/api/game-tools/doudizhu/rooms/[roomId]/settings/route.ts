import { mutateDdzRoom } from "@/features/game-tools/doudizhuRoomServer";
import { ddzSettingsMutationSchema } from "@/features/game-tools/doudizhuRequest";
import { ddzResponse, ddzWriteIdentity } from "@/features/game-tools/doudizhuApi";

export async function PATCH(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const identity = await ddzWriteIdentity(request, "settings", 30);
  if (identity.response) return identity.response;
  const parsed = ddzSettingsMutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return ddzResponse({ error: "INVALID_REQUEST" }, 400);
  return ddzResponse(await mutateDdzRoom((await context.params).roomId, identity.profileId!, { ...parsed.data, type: "SETTINGS" }));
}
