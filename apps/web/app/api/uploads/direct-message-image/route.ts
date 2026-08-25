import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  getActivityCoverStorageConfig,
  uploadDirectMessageImageBuffer,
  validateImageUploadFile,
  type ActivityCoverStorageErrorCode,
} from "@/lib/activity-cover-storage";
import { hasClerkKeys } from "@/lib/clerk";
import { getUploadRateLimitRejection } from "@/lib/uploadRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function POST(request: Request) {
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

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "MISSING_FILE" }, { status: 400 });
  }

  const validated = await validateImageUploadFile(file);

  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const uploaded = await uploadDirectMessageImageBuffer(
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
