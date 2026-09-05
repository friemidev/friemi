import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultActivityCategoryPreviewSrc,
  getActivityCategoryPreviewSrc,
  getActivityListCoverSrc,
  isActivityCategoryIllustrationSrc,
} from "./activityCategoryVisuals";

test("activity lists use lightweight category previews for stored defaults", () => {
  assert.equal(
    getActivityListCoverSrc("/illustrations/png/music.png", "MUSIC"),
    "/illustrations/preview/music.webp",
  );
  assert.equal(
    getActivityListCoverSrc(
      "/brand/v2_1/friemi-icon-square-1024.png",
      "WANDER",
    ),
    "/illustrations/preview/wandering.webp",
  );
  assert.equal(
    getActivityListCoverSrc("/brand/v2_1/friemi-icon-pwa-192.png", "ART"),
    "/illustrations/preview/art.webp",
  );
  assert.equal(
    getActivityListCoverSrc(
      "https://dryhbxognbrljslzciuh.supabase.co/storage/v1/object/public/activity-covers/user_3FXdKbIeD1kh3wbRYYRn9xPVOvJ/4d9e6eaa-98ab-4782-88a1-20a15682ccdd.png",
      "ART",
    ),
    "/illustrations/preview/art.webp",
  );
});

test("activity lists preserve custom covers and use a small unknown fallback", () => {
  const customCover = "https://images.example.com/cover.jpg";

  assert.equal(getActivityListCoverSrc(customCover, "MUSIC"), customCover);
  assert.equal(
    getActivityCategoryPreviewSrc("UNKNOWN"),
    defaultActivityCategoryPreviewSrc,
  );
});

test("preview webp assets are recognized as category artwork", () => {
  assert.equal(
    isActivityCategoryIllustrationSrc("/illustrations/preview/sports.webp"),
    true,
  );
});
