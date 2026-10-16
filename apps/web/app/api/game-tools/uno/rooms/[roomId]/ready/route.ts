import { z } from "zod";
import { unoResponse, unoWriteIdentity } from "@/features/game-tools/unoApi";
import { setUnoRoomReady } from "@/features/game-tools/unoRoomServer";
import { unoMutationSchema } from "@/features/game-tools/unoRequest";

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const identity = await unoWriteIdentity(request, "ready", 30);
  if (identity.response) return identity.response;
  const parsed = unoMutationSchema.extend({ ready: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return unoResponse({ error: "INVALID_REQUEST" }, 400);
  return unoResponse(await setUnoRoomReady((await context.params).roomId, identity.profileId!, parsed.data.ready, parsed.data.expectedRevision));
}
