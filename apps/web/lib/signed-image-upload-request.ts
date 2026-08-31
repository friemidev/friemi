import { z } from "zod";
import type { ActivityCoverStorageErrorCode } from "@/lib/activity-cover-storage";

const signedImageUploadRequestSchema = z.discriminatedUnion("action", [
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

export async function parseSignedImageUploadRequest(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signedImageUploadRequestSchema.safeParse(body);

  return parsed.success ? parsed.data : null;
}

export function getSignedImageUploadErrorStatus(
  error: ActivityCoverStorageErrorCode,
) {
  return error === "FILE_TOO_LARGE" ||
    error === "INVALID_IMAGE_CONTENT" ||
    error === "INVALID_UPLOAD_PATH" ||
    error === "UNSUPPORTED_FILE_TYPE"
    ? 400
    : 500;
}
