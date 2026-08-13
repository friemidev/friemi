import assert from "node:assert/strict";
import test from "node:test";
import {
  isUserManagedProfileAvatarUrl,
  resolveProfileAvatarUrlForClerkSync,
} from "./profileAvatarSync";

test("Clerk sync preserves a selected Friemi default avatar", () => {
  assert.equal(isUserManagedProfileAvatarUrl("/avatar/female-01.png"), true);
  assert.equal(
    resolveProfileAvatarUrlForClerkSync({
      clerkAvatarUrl: "https://img.clerk.com/google-avatar",
      storedAvatarUrl: "/avatar/female-01.png",
    }),
    "/avatar/female-01.png",
  );
});

test("Clerk sync preserves an uploaded Friemi avatar", () => {
  const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousBucket = process.env.SUPABASE_STORAGE_BUCKET;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  process.env.SUPABASE_STORAGE_BUCKET = "activity-covers";

  try {
    const uploadedAvatarUrl =
      "https://example.supabase.co/storage/v1/object/public/activity-covers/profile-avatars/user/avatar.png";

    assert.equal(isUserManagedProfileAvatarUrl(uploadedAvatarUrl), true);
    assert.equal(
      resolveProfileAvatarUrlForClerkSync({
        clerkAvatarUrl: "https://img.clerk.com/google-avatar",
        storedAvatarUrl: uploadedAvatarUrl,
      }),
      uploadedAvatarUrl,
    );
  } finally {
    if (previousSupabaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl;
    }

    if (previousServiceRoleKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey;
    }

    if (previousBucket === undefined) {
      delete process.env.SUPABASE_STORAGE_BUCKET;
    } else {
      process.env.SUPABASE_STORAGE_BUCKET = previousBucket;
    }
  }
});

test("Clerk sync refreshes an existing Clerk avatar", () => {
  assert.equal(
    resolveProfileAvatarUrlForClerkSync({
      clerkAvatarUrl: "https://img.clerk.com/new-google-avatar",
      storedAvatarUrl: "https://img.clerk.com/old-google-avatar",
    }),
    "https://img.clerk.com/new-google-avatar",
  );
});
