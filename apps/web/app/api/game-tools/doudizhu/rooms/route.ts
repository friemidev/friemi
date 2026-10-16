import { createDdzRoom } from "@/features/game-tools/doudizhuRoomServer";
import { ddzCreateSchema } from "@/features/game-tools/doudizhuRequest";
import { ddzResponse, ddzWriteIdentity } from "@/features/game-tools/doudizhuApi";
export async function POST(request: Request) {
  const identity = await ddzWriteIdentity(request, "create", 10, true); if (identity.response) return identity.response;
  const parsed = ddzCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !identity.profile) return ddzResponse({ error: "INVALID_REQUEST" }, 400);
  const result = await createDdzRoom({ ...parsed.data, profileId: identity.profileId!, name: identity.profile.nickname });
  return ddzResponse(result, result.error ? 409 : 201);
}
