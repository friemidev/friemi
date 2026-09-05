import type { ActivityCategory } from "@chill-club/shared";

export const activityCategoryIllustrationImages: Partial<
  Record<ActivityCategory, string>
> = {
  FOOD: "dining.png",
  WANDER: "wandering.png",
  AUDIO_VISUAL: "movies.png",
  ART: "art.png",
  BOARD_GAME: "board-games.png",
  GROWTH: "growth.png",
  TRAVEL: "travel.png",
  MUSIC: "music.png",
  SPORTS: "sports.png",
};

const activityCategoryPreviewImages: Partial<Record<ActivityCategory, string>> =
  Object.fromEntries(
    Object.entries(activityCategoryIllustrationImages).map(
      ([category, image]) => [category, image.replace(/\.png$/i, ".webp")],
    ),
  );

export const defaultActivityCategoryIllustrationSrc =
  "/brand/v2_1/friemi-icon-square-1024.png";

export const defaultActivityCategoryPreviewSrc =
  "/brand/v2_1/friemi-icon-pwa-192.png";

const legacyDefaultActivityCategoryIllustrationSrc =
  "/illustrations/design.png";
const legacyDefaultActivityLogoSrc = "/全背景logo.png";
const legacyUploadedDefaultActivityLogoPath =
  "/storage/v1/object/public/activity-covers/user_3FXdKbIeD1kh3wbRYYRn9xPVOvJ/4d9e6eaa-98ab-4782-88a1-20a15682ccdd.png";

export function getActivityCategoryIllustrationSrc(
  category: string | null | undefined,
) {
  const image =
    category && category in activityCategoryIllustrationImages
      ? activityCategoryIllustrationImages[category as ActivityCategory]
      : null;

  return image
    ? `/illustrations/png/${image}`
    : defaultActivityCategoryIllustrationSrc;
}

export function getActivityCategoryPreviewSrc(
  category: string | null | undefined,
) {
  const image =
    category && category in activityCategoryPreviewImages
      ? activityCategoryPreviewImages[category as ActivityCategory]
      : null;

  return image
    ? `/illustrations/preview/${image}`
    : defaultActivityCategoryPreviewSrc;
}

export function getActivityListCoverSrc(
  imageUrl: string | null | undefined,
  category: string | null | undefined,
) {
  const normalizedUrl = imageUrl?.trim() || null;

  // Stored category defaults point at multi-megabyte originals. Lists use the
  // lightweight equivalent so a cold mobile cache never waits on hero assets.
  if (!normalizedUrl || isActivityCategoryIllustrationSrc(normalizedUrl)) {
    return getActivityCategoryPreviewSrc(category);
  }

  return normalizedUrl;
}

export function isActivityCategoryIllustrationSrc(
  imageUrl: string | null | undefined,
) {
  if (!imageUrl) {
    return false;
  }

  if (
    imageUrl === defaultActivityCategoryIllustrationSrc ||
    imageUrl === defaultActivityCategoryPreviewSrc ||
    imageUrl === legacyDefaultActivityCategoryIllustrationSrc ||
    imageUrl === legacyDefaultActivityLogoSrc
  ) {
    return true;
  }

  try {
    if (new URL(imageUrl).pathname === legacyUploadedDefaultActivityLogoPath) {
      return true;
    }
  } catch {
    // Local illustration paths are handled by the pattern below.
  }

  return /^\/illustrations\/(?:png|preview|vector)\/[A-Za-z0-9_-]+\.(?:png|svg|webp)$/i.test(
    imageUrl,
  );
}
