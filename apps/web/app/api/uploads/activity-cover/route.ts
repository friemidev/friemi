import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  detectActivityCoverMimeType,
  getActivityCoverStorageConfig,
  maxActivityCoverFileSize,
  uploadActivityCoverBuffer,
  type ActivityCoverStorageErrorCode,
} from "@/lib/activity-cover-storage";
import { hasClerkKeys } from "@/lib/clerk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedMimeTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

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

  if (!getActivityCoverStorageConfig()) {
    return uploadError("STORAGE_NOT_CONFIGURED", 500);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "MISSING_FILE" }, { status: 400 });
  }

  if (!(file.type in allowedMimeTypes)) {
    return NextResponse.json({ error: "UNSUPPORTED_FILE_TYPE" }, { status: 400 });
  }

  if (file.size > maxActivityCoverFileSize) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 400 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const detectedMimeType = detectActivityCoverMimeType(fileBuffer);

  if (detectedMimeType !== file.type) {
    return NextResponse.json({ error: "INVALID_IMAGE_CONTENT" }, { status: 400 });
  }

  const uploaded = await uploadActivityCoverBuffer(
    userId,
    fileBuffer,
    detectedMimeType,
  );

  if ("error" in uploaded) {
    return uploadError(uploaded.error, 500);
  }

  return NextResponse.json({
    path: uploaded.path,
    url: uploaded.url,
  });
}
