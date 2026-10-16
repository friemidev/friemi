import { z } from "zod";
import { createUnoRoom } from "@/features/game-tools/unoRoomServer";
import { unoResponse, unoWriteIdentity } from "@/features/game-tools/unoApi";

const schema = z.object({ locale: z.enum(["zh-CN", "en", "fr"]).default("zh-CN"), turnSeconds: z.union([z.literal(30), z.literal(60), z.literal(90)]).optional() });

export async function POST(request: Request) {
  const identity = await unoWriteIdentity(request, "create", 10, true);
  if (identity.response) return identity.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !identity.profile) return unoResponse({ error: "INVALID_REQUEST" }, 400);
  const result = await createUnoRoom({ ...parsed.data, profileId: identity.profileId!, name: identity.profile.nickname });
  return unoResponse(result, "error" in result ? 409 : 201);
}
