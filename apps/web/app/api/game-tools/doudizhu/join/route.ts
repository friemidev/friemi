import { joinDdzRoom } from "@/features/game-tools/doudizhuRoomServer";
import { ddzJoinSchema } from "@/features/game-tools/doudizhuRequest";
import { ddzResponse, ddzWriteIdentity } from "@/features/game-tools/doudizhuApi";
export async function POST(request: Request) {
  const identity = await ddzWriteIdentity(request, "join", 30, true); if (identity.response) return identity.response;
  const parsed = ddzJoinSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !identity.profile) return ddzResponse({ error: "INVALID_REQUEST" }, 400);
  return ddzResponse(await joinDdzRoom({ ...parsed.data, profileId: identity.profileId!, name: identity.profile.nickname }));
}
