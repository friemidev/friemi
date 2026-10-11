import { z } from "zod";
import { joinUnoRoom } from "@/features/game-tools/unoRoomServer";
import { unoResponse, unoWriteIdentity } from "@/features/game-tools/unoApi";

export async function POST(request: Request) {
  const identity = await unoWriteIdentity(request, "join", 30, true);
  if (identity.response) return identity.response;
  const parsed = z.object({ code: z.string().trim().regex(/^[a-zA-Z0-9]{6,8}$/), expectedRoomId: z.string().min(1).max(64).optional() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success || !identity.profile) return unoResponse({ error: "INVALID_REQUEST" }, 400);
  return unoResponse(await joinUnoRoom({ ...parsed.data, profileId: identity.profileId!, name: identity.profile.nickname }));
}
