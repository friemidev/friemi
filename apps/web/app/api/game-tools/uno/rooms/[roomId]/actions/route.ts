import { unoCommandSchema } from "@/features/game-tools/unoRequest";
import { unoResponse, unoWriteIdentity } from "@/features/game-tools/unoApi";
import { commandUnoRoom } from "@/features/game-tools/unoRoomServer";

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const identity = await unoWriteIdentity(request, "action", 90);
  if (identity.response) return identity.response;
  const parsed = unoCommandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return unoResponse({ error: "INVALID_REQUEST" }, 400);
  return unoResponse(await commandUnoRoom((await context.params).roomId, identity.profileId!, parsed.data));
}
