import { z } from "zod";
import { unoResponse, unoWriteIdentity } from "@/features/game-tools/unoApi";
import { UNO_REACTION_KINDS } from "@/features/game-tools/unoReactions";
import { sendUnoReaction } from "@/features/game-tools/unoRoomServer";

const schema = z.object({ reactionId: z.string().uuid(), kind: z.enum(UNO_REACTION_KINDS) }).strict();

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const identity = await unoWriteIdentity(request, "reaction", 20);
  if (identity.response) return identity.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return unoResponse({ error: "INVALID_REACTION" }, 400);
  return unoResponse(await sendUnoReaction((await context.params).roomId, identity.profileId!, parsed.data));
}
