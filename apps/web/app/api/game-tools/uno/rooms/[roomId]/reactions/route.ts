import { unoResponse, unoWriteIdentity } from "@/features/game-tools/unoApi";
import { unoReactionSchema } from "@/features/game-tools/unoRequest";
import { sendUnoReaction } from "@/features/game-tools/unoRoomServer";

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const identity = await unoWriteIdentity(request, "reaction", 20);
  if (identity.response) return identity.response;
  const parsed = unoReactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return unoResponse({ error: "INVALID_REACTION" }, 400);
  return unoResponse(await sendUnoReaction((await context.params).roomId, identity.profileId!, parsed.data));
}
