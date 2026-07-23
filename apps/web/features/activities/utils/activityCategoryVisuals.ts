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

export const defaultActivityCategoryIllustrationSrc =
  "/brand/v2_1/friemi-icon-square-1024.png";

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

  return /^\/illustrations\/(?:png|vector)\/[A-Za-z0-9_-]+\.(?:png|svg)$/i.test(
    imageUrl,
  );
}
