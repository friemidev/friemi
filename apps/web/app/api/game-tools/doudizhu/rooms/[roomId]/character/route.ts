import { z } from "zod";
import { mutateDdzRoom } from "@/features/game-tools/doudizhuRoomServer";
import { ddzMutationSchema } from "@/features/game-tools/doudizhuRequest";
import { ddzResponse, ddzWriteIdentity } from "@/features/game-tools/doudizhuApi";
const schema = ddzMutationSchema.extend({ catId: z.string().min(1).max(32) }).strict();
export async function PATCH(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const identity = await ddzWriteIdentity(request, "character", 30); if (identity.response) return identity.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return ddzResponse({ error: "INVALID_REQUEST" }, 400);
  return ddzResponse(await mutateDdzRoom((await context.params).roomId, identity.profileId!, { ...parsed.data, type: "CHARACTER" }));
}
