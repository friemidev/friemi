import { commandDdzRoom } from "@/features/game-tools/doudizhuRoomServer";
import { ddzCommandSchema } from "@/features/game-tools/doudizhuRequest";
import { ddzResponse, ddzWriteIdentity } from "@/features/game-tools/doudizhuApi";
export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const identity = await ddzWriteIdentity(request, "actions", 90); if (identity.response) return identity.response;
  const parsed = ddzCommandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return ddzResponse({ error: "INVALID_REQUEST" }, 400);
  return ddzResponse(await commandDdzRoom((await context.params).roomId, identity.profileId!, parsed.data));
}
