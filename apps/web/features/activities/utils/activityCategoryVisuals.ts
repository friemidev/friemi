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

const defaultActivityCategoryIllustrationSrc = "/illustrations/design.png";

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
