import { randomUUID } from "node:crypto";
import { StorageClient } from "@supabase/storage-js";
import { isHotlinkProtectedCoverUrl } from "@/lib/activity-cover-shared";
import {
  allowedImageMimeTypes,
  areCompatibleImageMimeTypes,
  getAllowedImageMimeTypes,
  getImageUploadSizeLimit,
  maxImageBucketFileSize,
  maxImageUploadFileSize,
  maxProfileAvatarUploadFileSize,
  normalizeImageMimeType,
  type AllowedImageMimeType,
  type ImageUploadSizeProfile,
} from "@/lib/image-upload-policy";

export { isHotlinkProtectedCoverUrl } from "@/lib/activity-cover-shared";

export const maxActivityCoverFileSize = maxImageUploadFileSize;
export const maxProfileAvatarFileSize = maxProfileAvatarUploadFileSize;
const defaultBucket = "activity-covers";
const readyBuckets = new Set<string>();

export type AllowedCoverMimeType = AllowedImageMimeType;

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

export type ValidatedImageUploadFile =
  | { error: Extract<ActivityCoverStorageErrorCode, "FILE_TOO_LARGE" | "INVALID_IMAGE_CONTENT" | "UNSUPPORTED_FILE_TYPE"> }
  | { detectedMimeType: AllowedCoverMimeType; fileBuffer: Buffer };

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
  if (buffer.length < 8) {
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

  const gifSignature = buffer.subarray(0, 6).toString("ascii");

  if (gifSignature === "GIF87a" || gifSignature === "GIF89a") {
    return "image/gif";
  }

  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return "image/bmp";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(4, 8).toString("ascii") === "ftyp"
  ) {
    const brands = buffer
      .subarray(8, Math.min(buffer.length, 64))
      .toString("ascii");

    if (brands.includes("avif") || brands.includes("avis")) {
      return "image/avif";
    }

    if (
      brands.includes("heic") ||
      brands.includes("heix") ||
      brands.includes("hevc") ||
      brands.includes("hevx") ||
      brands.includes("heim") ||
      brands.includes("heis") ||
      brands.includes("hevm") ||
      brands.includes("hevs")
    ) {
      return "image/heic";
    }

    if (brands.includes("mif1") || brands.includes("msf1")) {
      return "image/heif";
    }
  }

  return null;
}

export function normalizeActivityCoverMimeType(
  mimeType: string | null | undefined,
): AllowedCoverMimeType | null {
  return normalizeImageMimeType(mimeType);
}

export function getAllowedActivityCoverMimeTypes() {
  return getAllowedImageMimeTypes();
}

export async function validateImageUploadFile(
  file: File,
  options: { sizeProfile?: ImageUploadSizeProfile } = {},
): Promise<ValidatedImageUploadFile> {
  if (file.size > maxImageBucketFileSize) {
    return { error: "FILE_TOO_LARGE" };
  }

  const uploadedMimeType = normalizeActivityCoverMimeType(file.type);
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const detectedMimeType = detectActivityCoverMimeType(fileBuffer);

  if (!detectedMimeType) {
    return file.type && !uploadedMimeType
      ? { error: "UNSUPPORTED_FILE_TYPE" }
      : { error: "INVALID_IMAGE_CONTENT" };
  }

  if (
    uploadedMimeType &&
    !areCompatibleImageMimeTypes(uploadedMimeType, detectedMimeType)
  ) {
    return { error: "INVALID_IMAGE_CONTENT" };
  }

  const sizeLimit = getImageUploadSizeLimit(
    detectedMimeType,
    options.sizeProfile,
  );

  if (file.size > sizeLimit) {
    return { error: "FILE_TOO_LARGE" };
  }

  return { detectedMimeType, fileBuffer };
}

function getSafePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

async function ensurePublicBucket(storage: StorageClient, bucket: string) {
  if (readyBuckets.has(bucket)) {
    return true;
  }

  const bucketResult = await storage.getBucket(bucket);

  if (!bucketResult.error) {
    const updated = await storage.updateBucket(bucket, {
      public: true,
      allowedMimeTypes: getAllowedActivityCoverMimeTypes(),
      fileSizeLimit: maxImageBucketFileSize,
    });

    if (!updated.error) {
      readyBuckets.add(bucket);
      return true;
    }

    console.error("Failed to update activity cover storage bucket", {
      bucket,
      message: updated.error.message,
    });

    return false;
  }

  const created = await storage.createBucket(bucket, {
    public: true,
    allowedMimeTypes: getAllowedActivityCoverMimeTypes(),
    fileSizeLimit: maxImageBucketFileSize,
  });

  if (!created.error) {
    readyBuckets.add(bucket);
    return true;
  }

  console.error("Failed to create activity cover storage bucket", {
    bucket,
    message: created.error?.message ?? bucketResult.error.message,
  });

  return false;
}

function createActivityCoverStorageClient(config: {
  bucket: string;
  serviceRoleKey: string;
  supabaseUrl: string;
}) {
  return new StorageClient(
    `${config.supabaseUrl.replace(/\/$/, "")}/storage/v1`,
    {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
    },
  );
}

export async function uploadActivityCoverBuffer(
  userId: string,
  fileBuffer: Buffer,
  detectedMimeType: AllowedCoverMimeType,
): Promise<ActivityCoverUploadResult> {
  return uploadPublicImageBuffer(userId, fileBuffer, detectedMimeType);
}

export async function uploadMomentImageBuffer(
  userId: string,
  fileBuffer: Buffer,
  detectedMimeType: AllowedCoverMimeType,
): Promise<ActivityCoverUploadResult> {
  return uploadPublicImageBuffer(userId, fileBuffer, detectedMimeType, {
    pathPrefix: "moments",
  });
}

export async function uploadDirectMessageImageBuffer(
  userId: string,
  fileBuffer: Buffer,
  detectedMimeType: AllowedCoverMimeType,
): Promise<ActivityCoverUploadResult> {
  return uploadPublicImageBuffer(userId, fileBuffer, detectedMimeType, {
    pathPrefix: "direct-messages",
  });
}

export async function uploadTopNewsImageBuffer(
  userId: string,
  fileBuffer: Buffer,
  detectedMimeType: AllowedCoverMimeType,
): Promise<ActivityCoverUploadResult> {
  return uploadPublicImageBuffer(userId, fileBuffer, detectedMimeType, {
    pathPrefix: "top-news",
  });
}

export async function uploadProfileAvatarBuffer(
  userId: string,
  fileBuffer: Buffer,
  detectedMimeType: AllowedCoverMimeType,
): Promise<ActivityCoverUploadResult> {
  return uploadPublicImageBuffer(userId, fileBuffer, detectedMimeType, {
    pathPrefix: "profile-avatars",
  });
}

export function isUploadedProfileAvatarUrl(imageUrl: string) {
  const config = getActivityCoverStorageConfig();

  if (!config) {
    return false;
  }

  try {
    const url = new URL(imageUrl);
    const supabaseUrl = new URL(config.supabaseUrl);
    const expectedPrefix = `/storage/v1/object/public/${config.bucket}/profile-avatars/`;
    const protocolAllowed =
      process.env.NODE_ENV === "production"
        ? url.protocol === "https:"
        : url.protocol === "https:" || url.protocol === "http:";

    return (
      protocolAllowed &&
      url.hostname === supabaseUrl.hostname &&
      url.pathname.startsWith(expectedPrefix)
    );
  } catch {
    return false;
  }
}

async function uploadPublicImageBuffer(
  userId: string,
  fileBuffer: Buffer,
  detectedMimeType: AllowedCoverMimeType,
  options: { pathPrefix?: string } = {},
): Promise<ActivityCoverUploadResult> {
  const config = getActivityCoverStorageConfig();

  if (!config) {
    return { error: "STORAGE_NOT_CONFIGURED" as const };
  }

  const storage = createActivityCoverStorageClient(config);
  const bucketReady = await ensurePublicBucket(storage, config.bucket);

  if (!bucketReady) {
    return { error: "BUCKET_NOT_AVAILABLE" as const };
  }

  const extension = allowedImageMimeTypes[detectedMimeType];
  const safeUserId = getSafePathSegment(userId);
  const path = options.pathPrefix
    ? `${options.pathPrefix}/${safeUserId}/${randomUUID()}.${extension}`
    : `${safeUserId}/${randomUUID()}.${extension}`;
  const uploaded = await storage.from(config.bucket).upload(path, fileBuffer, {
    contentType: detectedMimeType,
    cacheControl: "31536000",
    upsert: false,
  });

  if (uploaded.error) {
    console.error("Failed to upload activity cover image", {
      bucket: config.bucket,
      message: uploaded.error.message,
    });

    return { error: "UPLOAD_FAILED" as const };
  }

  const publicUrl = storage.from(config.bucket).getPublicUrl(path);

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

    if (fileBuffer.length > maxImageBucketFileSize) {
      return null;
    }

    const detectedMimeType = detectActivityCoverMimeType(fileBuffer);

    if (!detectedMimeType) {
      return null;
    }

    if (fileBuffer.length > getImageUploadSizeLimit(detectedMimeType)) {
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
