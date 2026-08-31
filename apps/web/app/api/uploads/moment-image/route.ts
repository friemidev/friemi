import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSignedMomentImageUpload,
  finalizeSignedMomentImageUpload,
  getActivityCoverStorageConfig,
  uploadMomentImageBuffer,
  validateImageUploadFile,
  type ActivityCoverStorageErrorCode,
} from "@/lib/activity-cover-storage";
import { hasClerkKeys } from "@/lib/clerk";
import { getUploadRateLimitRejection } from "@/lib/uploadRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const signedUploadRequestSchema = z.discriminatedUnion("action", [
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

function uploadError(error: ActivityCoverStorageErrorCode, status: number) {
  return NextResponse.json({ error }, { status });
}

async function getUploadUserId() {
  if (!hasClerkKeys()) {
    return "local-dev-user";
  }

  const { userId } = await auth();

  return userId;
}

async function handleMomentImageUpload(request: Request) {
  const userId = await getUploadUserId();

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const rateLimitRejection = await getUploadRateLimitRejection(userId);

  if (rateLimitRejection) {
    return rateLimitRejection;
  }

  if (!getActivityCoverStorageConfig()) {
    return uploadError("STORAGE_NOT_CONFIGURED", 500);
  }

  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = await request.json().catch(() => null);
    const parsed = signedUploadRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    const result =
      parsed.data.action === "create"
        ? await createSignedMomentImageUpload(userId, {
            name: parsed.data.fileName,
            size: parsed.data.fileSize,
            type: parsed.data.fileType,
          })
        : await finalizeSignedMomentImageUpload(userId, parsed.data.path);

    if ("error" in result) {
      const status =
        result.error === "FILE_TOO_LARGE" ||
        result.error === "INVALID_IMAGE_CONTENT" ||
        result.error === "INVALID_UPLOAD_PATH" ||
        result.error === "UNSUPPORTED_FILE_TYPE"
          ? 400
          : 500;

      return uploadError(result.error, status);
    }

    return NextResponse.json(result);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "MISSING_FILE" }, { status: 400 });
  }

  const validated = await validateImageUploadFile(file);

  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const uploaded = await uploadMomentImageBuffer(
    userId,
    validated.fileBuffer,
    validated.detectedMimeType,
  );

  if ("error" in uploaded) {
    return uploadError(uploaded.error, 500);
  }

  return NextResponse.json({
    path: uploaded.path,
    url: uploaded.url,
  });
}

export async function POST(request: Request) {
  try {
    return await handleMomentImageUpload(request);
  } catch (error) {
    console.error("Failed to handle moment image upload", error);
    return uploadError("UPLOAD_FAILED", 503);
  }
}
