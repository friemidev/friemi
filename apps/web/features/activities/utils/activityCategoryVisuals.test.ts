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
