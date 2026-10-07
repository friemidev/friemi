import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { hasClerkKeys } from "@/lib/clerk";
import {
  createSignedInventoryItemImageUpload,
  finalizeSignedInventoryItemImageUpload,
  getActivityCoverStorageConfig,
  uploadInventoryItemImageBuffer,
  validateImageUploadFile,
  type ActivityCoverStorageErrorCode,
} from "@/lib/activity-cover-storage";
import {
  getSignedImageUploadErrorStatus,
  parseSignedImageUploadRequest,
} from "@/lib/signed-image-upload-request";
import { getUploadRateLimitRejection } from "@/lib/uploadRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function uploadError(error: ActivityCoverStorageErrorCode, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  if (!hasClerkKeys()) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const rateLimitRejection = await getUploadRateLimitRejection(userId);
  if (rateLimitRejection) return rateLimitRejection;

  if (!getActivityCoverStorageConfig()) {
    return uploadError("STORAGE_NOT_CONFIGURED", 500);
  }

  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = await parseSignedImageUploadRequest(request);
    if (!body) {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    const result =
      body.action === "create"
        ? await createSignedInventoryItemImageUpload(userId, {
            name: body.fileName,
            size: body.fileSize,
            type: body.fileType,
          })
        : await finalizeSignedInventoryItemImageUpload(userId, body.path);

    return "error" in result
      ? uploadError(result.error, getSignedImageUploadErrorStatus(result.error))
      : NextResponse.json(result);
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "MISSING_FILE" }, { status: 400 });
  }

  const validated = await validateImageUploadFile(file);
  if ("error" in validated) {
    return uploadError(validated.error, 400);
  }

  const uploaded = await uploadInventoryItemImageBuffer(
    userId,
    validated.fileBuffer,
    validated.detectedMimeType,
  );

  return "error" in uploaded
    ? uploadError(uploaded.error, 500)
    : NextResponse.json(uploaded);
}
