import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSignedPlanetVideoUpload,
  finalizeSignedPlanetVideoUpload,
  type PlanetVideoStorageErrorCode,
} from "@/lib/planet-video-storage";
import { hasClerkKeys } from "@/lib/clerk";
import { getUploadRateLimitRejection } from "@/lib/uploadRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    fileName: z.string().trim().min(1).max(255),
    fileSize: z.number().int().nonnegative(),
    fileType: z.string().trim().max(100).optional(),
  }),
  z.object({
    action: z.literal("finalize"),
    path: z.string().trim().min(1).max(500),
  }),
]);

function errorResponse(error: PlanetVideoStorageErrorCode) {
  const status =
    error === "FILE_TOO_LARGE" ||
    error === "UNSUPPORTED_FILE_TYPE" ||
    error === "INVALID_UPLOAD_PATH"
      ? 400
      : 500;
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  const userId = hasClerkKeys() ? (await auth()).userId : "local-dev-user";
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const rateLimitRejection = await getUploadRateLimitRejection(userId);
  if (rateLimitRejection) return rateLimitRejection;

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const result =
    parsed.data.action === "create"
      ? await createSignedPlanetVideoUpload(userId, {
          name: parsed.data.fileName,
          size: parsed.data.fileSize,
          type: parsed.data.fileType,
        })
      : await finalizeSignedPlanetVideoUpload(userId, parsed.data.path);
  return "error" in result
    ? errorResponse(result.error)
    : NextResponse.json(result);
}
