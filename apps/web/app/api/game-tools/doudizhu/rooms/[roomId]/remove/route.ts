import { z } from "zod";
import { mutateDdzRoom } from "@/features/game-tools/doudizhuRoomServer";
import { ddzMutationSchema } from "@/features/game-tools/doudizhuRequest";
import { ddzResponse, ddzWriteIdentity } from "@/features/game-tools/doudizhuApi";
const schema = ddzMutationSchema.extend({ targetSeat: z.number().int().min(0).max(2) }).strict();
export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const identity = await ddzWriteIdentity(request, "remove", 30); if (identity.response) return identity.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return ddzResponse({ error: "INVALID_REQUEST" }, 400);
  return ddzResponse(await mutateDdzRoom((await context.params).roomId, identity.profileId!, { ...parsed.data, type: "REMOVE" }));
}
