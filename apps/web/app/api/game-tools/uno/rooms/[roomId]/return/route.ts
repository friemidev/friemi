import { unoResponse, unoWriteIdentity } from "@/features/game-tools/unoApi";
import { returnToUnoLobby } from "@/features/game-tools/unoRoomServer";
import { unoMutationSchema } from "@/features/game-tools/unoRequest";

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const identity = await unoWriteIdentity(request, "return", 30);
  if (identity.response) return identity.response;
  const parsed = unoMutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return unoResponse({ error: "INVALID_REQUEST" }, 400);
  return unoResponse(await returnToUnoLobby((await context.params).roomId, identity.profileId!, parsed.data.expectedRevision));
}
