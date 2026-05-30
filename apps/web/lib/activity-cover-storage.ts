import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { isHotlinkProtectedCoverUrl } from "@/lib/activity-cover-shared";

export { isHotlinkProtectedCoverUrl } from "@/lib/activity-cover-shared";

export const maxActivityCoverFileSize = 4 * 1024 * 1024;
const defaultBucket = "activity-covers";
const allowedMimeTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
const readyBuckets = new Set<string>();

export type AllowedCoverMimeType = keyof typeof allowedMimeTypes;

export type ActivityCoverStorageErrorCode =
  | "STORAGE_NOT_CONFIGURED"
  | "UNSUPPORTED_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "INVALID_IMAGE_CONTENT"
  | "BUCKET_NOT_AVAILABLE"
  | "UPLOAD_FAILED"
  | "FETCH_FAILED";

export type ActivityCoverUploadResult =
  | { error: ActivityCoverStorageErrorCode }
  | { path: string; url: string };

export function getActivityCoverStorageConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || defaultBucket;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return { supabaseUrl, serviceRoleKey, bucket };
}

export function shouldMirrorCoverImage(imageUrl: string) {
  if (!imageUrl.startsWith("https://")) {
    return false;
  }

  const config = getActivityCoverStorageConfig();

  if (!config) {
    return false;
  }

  try {
    const hostname = new URL(imageUrl).hostname.toLowerCase();
    const supabaseHost = new URL(config.supabaseUrl).hostname.toLowerCase();

    if (hostname === supabaseHost || hostname.endsWith(`.${supabaseHost}`)) {
      return false;
    }
  } catch {
    return false;
  }

  return isHotlinkProtectedCoverUrl(imageUrl);
}

export function detectActivityCoverMimeType(
  buffer: Buffer,
): AllowedCoverMimeType | null {
  if (buffer.length < 12) {
    return null;
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

function getSafePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

async function ensurePublicBucket(
  storage: ReturnType<typeof createClient>["storage"],
  bucket: string,
) {
  if (readyBuckets.has(bucket)) {
    return true;
  }

  const bucketResult = await storage.getBucket(bucket);

  if (!bucketResult.error) {
    const updated = await storage.updateBucket(bucket, {
      public: true,
      allowedMimeTypes: Object.keys(allowedMimeTypes),
      fileSizeLimit: maxActivityCoverFileSize,
    });

    if (!updated.error) {
      readyBuckets.add(bucket);
      return true;
    }

    return false;
  }

  const created = await storage.createBucket(bucket, {
    public: true,
    allowedMimeTypes: Object.keys(allowedMimeTypes),
    fileSizeLimit: maxActivityCoverFileSize,
  });

  if (!created.error) {
    readyBuckets.add(bucket);
    return true;
  }

  return false;
}

export async function uploadActivityCoverBuffer(
  userId: string,
  fileBuffer: Buffer,
  detectedMimeType: AllowedCoverMimeType,
): Promise<ActivityCoverUploadResult> {
  const config = getActivityCoverStorageConfig();

  if (!config) {
    return { error: "STORAGE_NOT_CONFIGURED" as const };
  }

  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const bucketReady = await ensurePublicBucket(supabase.storage, config.bucket);

  if (!bucketReady) {
    return { error: "BUCKET_NOT_AVAILABLE" as const };
  }

  const extension = allowedMimeTypes[detectedMimeType];
  const path = `${getSafePathSegment(userId)}/${randomUUID()}.${extension}`;
  const uploaded = await supabase.storage
    .from(config.bucket)
    .upload(path, fileBuffer, {
      contentType: detectedMimeType,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploaded.error) {
    return { error: "UPLOAD_FAILED" as const };
  }

  const publicUrl = supabase.storage.from(config.bucket).getPublicUrl(path);

  return {
    path,
    url: publicUrl.data.publicUrl,
  };
}

export async function mirrorExternalCoverImage(
  imageUrl: string,
  userId: string,
) {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      return null;
    }

    const fileBuffer = Buffer.from(await response.arrayBuffer());

    if (fileBuffer.length > maxActivityCoverFileSize) {
      return null;
    }

    const detectedMimeType = detectActivityCoverMimeType(fileBuffer);

    if (!detectedMimeType) {
      return null;
    }

    const uploaded = await uploadActivityCoverBuffer(
      userId,
      fileBuffer,
      detectedMimeType,
    );

    return "url" in uploaded ? uploaded.url : null;
  } catch {
    return null;
  }
}
