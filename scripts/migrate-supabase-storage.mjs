#!/usr/bin/env node

import { StorageClient } from "@supabase/storage-js";

const requiredEnv = [
  "SOURCE_SUPABASE_URL",
  "SOURCE_SUPABASE_SERVICE_ROLE_KEY",
  "TARGET_SUPABASE_URL",
  "TARGET_SUPABASE_SERVICE_ROLE_KEY",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required env: ${key}`);
    process.exit(1);
  }
}

const bucket = process.env.SUPABASE_STORAGE_BUCKET || "activity-covers";
const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const limit = Number.parseInt(process.env.STORAGE_LIST_LIMIT || "1000", 10);

function createStorageClient(url, serviceRoleKey) {
  return new StorageClient(`${url.replace(/\/$/, "")}/storage/v1`, {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  });
}

function contentTypeForPath(path, fallback) {
  if (fallback) return fallback;
  const lower = path.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

async function ensurePublicBucket(storage) {
  const existing = await storage.getBucket(bucket);

  if (!existing.error) {
    const updated = await storage.updateBucket(bucket, {
      public: true,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      fileSizeLimit: 4 * 1024 * 1024,
    });

    if (updated.error) {
      throw new Error(`Failed to update target bucket: ${updated.error.message}`);
    }

    return;
  }

  const created = await storage.createBucket(bucket, {
    public: true,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    fileSizeLimit: 4 * 1024 * 1024,
  });

  if (created.error) {
    throw new Error(`Failed to create target bucket: ${created.error.message}`);
  }
}

function isFolderEntry(entry) {
  return !entry.id && !entry.metadata;
}

async function listObjects(storage, prefix = "") {
  const paths = [];
  let offset = 0;

  while (true) {
    const listed = await storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (listed.error) {
      throw new Error(
        `Failed to list bucket ${bucket} at ${prefix || "/"}: ${listed.error.message}`,
      );
    }

    const entries = listed.data || [];

    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (isFolderEntry(entry)) {
        paths.push(...(await listObjects(storage, path)));
      } else {
        paths.push(path);
      }
    }

    if (entries.length < limit) break;
    offset += entries.length;
  }

  return paths;
}

const source = createStorageClient(
  process.env.SOURCE_SUPABASE_URL,
  process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY,
);
const target = createStorageClient(
  process.env.TARGET_SUPABASE_URL,
  process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY,
);

console.log(
  JSON.stringify({
    bucket,
    dryRun,
    sourceHost: new URL(process.env.SOURCE_SUPABASE_URL).hostname,
    targetHost: new URL(process.env.TARGET_SUPABASE_URL).hostname,
  }),
);

await ensurePublicBucket(target);

const paths = await listObjects(source);
let copied = 0;
let failed = 0;

console.log(`Found ${paths.length} objects in ${bucket}.`);

for (const path of paths) {
  if (dryRun) {
    console.log(`[dry-run] ${path}`);
    continue;
  }

  const downloaded = await source.from(bucket).download(path);

  if (downloaded.error) {
    failed += 1;
    console.error(`download_failed ${path}: ${downloaded.error.message}`);
    continue;
  }

  const blob = downloaded.data;
  const uploaded = await target.from(bucket).upload(path, blob, {
    cacheControl: "31536000",
    contentType: contentTypeForPath(path, blob.type),
    upsert: true,
  });

  if (uploaded.error) {
    failed += 1;
    console.error(`upload_failed ${path}: ${uploaded.error.message}`);
    continue;
  }

  copied += 1;
  console.log(`copied ${copied}/${paths.length} ${path}`);
}

console.log(
  JSON.stringify({
    bucket,
    dryRun,
    found: paths.length,
    copied,
    failed,
  }),
);

if (failed > 0) {
  process.exit(1);
}
