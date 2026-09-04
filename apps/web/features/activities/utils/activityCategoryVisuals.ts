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
    imageUrl === legacyDefaultActivityCategoryIllustrationSrc
  ) {
    return true;
  }

  return /^\/illustrations\/(?:png|preview|vector)\/[A-Za-z0-9_-]+\.(?:png|svg|webp)$/i.test(
    imageUrl,
  );
}
