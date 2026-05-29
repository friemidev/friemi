import { randomUUID } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { hasClerkKeys } from "@/lib/clerk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxFileSize = 4 * 1024 * 1024;
const defaultBucket = "activity-covers";
const allowedMimeTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
const readyBuckets = new Set<string>();

type AllowedMimeType = keyof typeof allowedMimeTypes;
type UploadErrorCode =
  | "UNAUTHORIZED"
  | "STORAGE_NOT_CONFIGURED"
  | "MISSING_FILE"
  | "UNSUPPORTED_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "INVALID_IMAGE_CONTENT"
  | "BUCKET_NOT_AVAILABLE"
  | "UPLOAD_FAILED";

function uploadError(error: UploadErrorCode, status: number) {
  return NextResponse.json({ error }, { status });
}

function detectImageMimeType(buffer: Buffer): AllowedMimeType | null {
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

function getStorageConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || defaultBucket;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return { supabaseUrl, serviceRoleKey, bucket };
}

async function getUploadUserId() {
  if (!hasClerkKeys()) {
    return "local-dev-user";
  }

  const { userId } = await auth();
  return userId;
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
      fileSizeLimit: maxFileSize,
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
    fileSizeLimit: maxFileSize,
  });

  if (!created.error) {
    readyBuckets.add(bucket);
    return true;
  }

  return false;
}

export async function POST(request: Request) {
  const userId = await getUploadUserId();

  if (!userId) {
    return uploadError("UNAUTHORIZED", 401);
  }

  const config = getStorageConfig();

  if (!config) {
    return uploadError("STORAGE_NOT_CONFIGURED", 500);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return uploadError("MISSING_FILE", 400);
  }

  if (!(file.type in allowedMimeTypes)) {
    return uploadError("UNSUPPORTED_FILE_TYPE", 400);
  }

  if (file.size > maxFileSize) {
    return uploadError("FILE_TOO_LARGE", 400);
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const detectedMimeType = detectImageMimeType(fileBuffer);

  if (detectedMimeType !== file.type) {
    return uploadError("INVALID_IMAGE_CONTENT", 400);
  }

  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const bucketReady = await ensurePublicBucket(supabase.storage, config.bucket);

  if (!bucketReady) {
    return uploadError("BUCKET_NOT_AVAILABLE", 500);
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
    return uploadError("UPLOAD_FAILED", 500);
  }

  const publicUrl = supabase.storage.from(config.bucket).getPublicUrl(path);

  return NextResponse.json({
    path,
    url: publicUrl.data.publicUrl,
  });
}
