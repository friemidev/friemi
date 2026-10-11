import { z } from "zod";
import { isDrawGuessCatId } from "@/features/game-tools/drawGuessCats";
import { unoResponse, unoWriteIdentity } from "@/features/game-tools/unoApi";
import { setUnoCharacter } from "@/features/game-tools/unoRoomServer";
import { unoMutationSchema } from "@/features/game-tools/unoRequest";

const characterSchema = unoMutationSchema.extend({ catId: z.string().refine(isDrawGuessCatId) });

export async function PATCH(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const identity = await unoWriteIdentity(request, "character", 30);
  if (identity.response) return identity.response;
  const parsed = characterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return unoResponse({ error: "INVALID_CHARACTER" }, 400);
  return unoResponse(await setUnoCharacter((await context.params).roomId, identity.profileId!, parsed.data.catId, parsed.data.expectedRevision));
}
