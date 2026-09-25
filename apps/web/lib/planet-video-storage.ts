import { randomUUID } from "node:crypto";
import { StorageClient } from "@supabase/storage-js";
import {
  allowedPlanetVideoMimeTypes,
  getPlanetVideoMimeType,
  maxPlanetVideoUploadFileSize,
} from "@/lib/video-upload-policy";

const defaultPlanetMediaBucket = "planet-media";
let bucketReady = false;

export type PlanetVideoStorageErrorCode =
  | "STORAGE_NOT_CONFIGURED"
  | "UNSUPPORTED_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "BUCKET_NOT_AVAILABLE"
  | "UPLOAD_FAILED"
  | "INVALID_UPLOAD_PATH";

type SignedUploadResult =
  | { error: PlanetVideoStorageErrorCode }
  | { path: string; signedUrl: string };

type FinalizedUploadResult =
  | { error: PlanetVideoStorageErrorCode }
  | { path: string; url: string };

function getConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket =
    process.env.SUPABASE_PLANET_MEDIA_BUCKET || defaultPlanetMediaBucket;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return { bucket, serviceRoleKey, supabaseUrl };
}

function createStorageClient(
  config: NonNullable<ReturnType<typeof getConfig>>,
) {
  return new StorageClient(
    `${config.supabaseUrl.replace(/\/$/, "")}/storage/v1`,
    {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
    },
  );
}

function safePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

async function ensureBucket(
  storage: StorageClient,
  config: NonNullable<ReturnType<typeof getConfig>>,
) {
  if (bucketReady) return true;
  const settings = {
    public: true,
    allowedMimeTypes: Object.keys(allowedPlanetVideoMimeTypes),
    fileSizeLimit: maxPlanetVideoUploadFileSize,
  };
  const existing = await storage.getBucket(config.bucket);
  const result = existing.error
    ? await storage.createBucket(config.bucket, settings)
    : await storage.updateBucket(config.bucket, settings);
  if (result.error) {
    console.error("Failed to prepare planet media bucket", {
      bucket: config.bucket,
      message: result.error.message,
    });
    return false;
  }
  bucketReady = true;
  return true;
}

function isOwnedVideoPath(userId: string, path: string) {
  const extensions = Object.values(allowedPlanetVideoMimeTypes).join("|");
  return new RegExp(
    `^planet-videos/${safePathSegment(userId)}/[0-9a-f-]{36}\\.(${extensions})$`,
    "i",
  ).test(path);
}

export async function createSignedPlanetVideoUpload(
  userId: string,
  file: { name: string; size: number; type?: string | null },
): Promise<SignedUploadResult> {
  const config = getConfig();
  if (!config) return { error: "STORAGE_NOT_CONFIGURED" };
  const mimeType = getPlanetVideoMimeType(file.type, file.name);
  if (!mimeType) return { error: "UNSUPPORTED_FILE_TYPE" };
  if (file.size > maxPlanetVideoUploadFileSize) {
    return { error: "FILE_TOO_LARGE" };
  }

  const storage = createStorageClient(config);
  if (!(await ensureBucket(storage, config))) {
    return { error: "BUCKET_NOT_AVAILABLE" };
  }
  const extension = allowedPlanetVideoMimeTypes[mimeType];
  const path = `planet-videos/${safePathSegment(userId)}/${randomUUID()}.${extension}`;
  const signed = await storage
    .from(config.bucket)
    .createSignedUploadUrl(path, { upsert: false });
  if (signed.error) return { error: "UPLOAD_FAILED" };
  return { path: signed.data.path, signedUrl: signed.data.signedUrl };
}

export async function finalizeSignedPlanetVideoUpload(
  userId: string,
  path: string,
): Promise<FinalizedUploadResult> {
  const config = getConfig();
  if (!config) return { error: "STORAGE_NOT_CONFIGURED" };
  if (!isOwnedVideoPath(userId, path)) {
    return { error: "INVALID_UPLOAD_PATH" };
  }

  const storage = createStorageClient(config);
  const bucket = storage.from(config.bucket);
  const info = await bucket.info(path);
  if (info.error) return { error: "UPLOAD_FAILED" };
  const mimeType = getPlanetVideoMimeType(info.data.contentType, path);
  const size = info.data.size ?? 0;
  if (!mimeType || size <= 0 || size > maxPlanetVideoUploadFileSize) {
    await bucket.remove([path]);
    return {
      error:
        size > maxPlanetVideoUploadFileSize
          ? "FILE_TOO_LARGE"
          : "UNSUPPORTED_FILE_TYPE",
    };
  }
  const expectedExtension = allowedPlanetVideoMimeTypes[mimeType];
  if (!path.toLowerCase().endsWith(`.${expectedExtension}`)) {
    await bucket.remove([path]);
    return { error: "UNSUPPORTED_FILE_TYPE" };
  }
  return { path, url: bucket.getPublicUrl(path).data.publicUrl };
}

export function isAllowedPlanetVideoUrl(value: string) {
  const config = getConfig();
  if (!config) return false;
  try {
    const url = new URL(value);
    const supabaseUrl = new URL(config.supabaseUrl);
    const prefix = `/storage/v1/object/public/${config.bucket}/planet-videos/`;
    return (
      url.protocol === "https:" &&
      url.hostname === supabaseUrl.hostname &&
      url.pathname.startsWith(prefix)
    );
  } catch {
    return false;
  }
}
