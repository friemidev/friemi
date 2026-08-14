export type AchievementCategory =
  | "community_identity"
  | "player_growth"
  | "social_connection"
  | "charm"
  | "community_contribution"
  | "legacy";

type AchievementCatalogEntry = {
  category: AchievementCategory;
  description: string;
  imageSrc: string | null;
  key: string;
  metric: string;
  target: number;
  title: string;
};

export const achievementCatalog = [
  {
    key: "co_creator",
    title: "Co-creator",
    description: "Officially recognized as a Friemi co-creator.",
    metric: "isCoCreator",
    target: 1,
    category: "community_identity",
    imageSrc: "/achievement-badges/co-creator.png",
  },
  {
    key: "open_minded",
    title: "Open Host",
    description: "Successfully complete the first open Friemi plan.",
    metric: "completedHostedActivityCount",
    target: 1,
    category: "community_identity",
    imageSrc: "/achievement-badges/open-host.png",
  },
  {
    key: "hello_world",
    title: "First-time Player",
    description: "Attend the first Friemi plan.",
    metric: "participationCount",
    target: 1,
    category: "player_growth",
    imageSrc: "/achievement-badges/first-time-player-01.png",
  },
  {
    key: "active_guest_20",
    title: "Active Player",
    description: "Attend 20 Friemi plans.",
    metric: "participationCount",
    target: 20,
    category: "player_growth",
    imageSrc: null,
  },
  {
    key: "invitation_expert",
    title: "Invitation Expert",
    description: "Invite 15 new users who complete their first plan.",
    metric: "successfulReferralCount",
    target: 15,
    category: "social_connection",
    imageSrc: "/achievement-badges/invitation-expert.png",
  },
  {
    key: "punctuality_star",
    title: "Punctuality Star",
    description:
      "Attend 20 consecutive registered plans without a late cancellation or no-show.",
    metric: "punctualAttendanceStreak",
    target: 20,
    category: "community_contribution",
    imageSrc: null,
  },
  {
    key: "content_contributor",
    title: "Content Contributor",
    description: "Publish 50 original moments.",
    metric: "authoredMomentCount",
    target: 50,
    category: "community_contribution",
    imageSrc: null,
  },
  {
    key: "first_gift",
    title: "First Gift",
    description: "Receive the first gift from another player.",
    metric: "receivedGiftCount",
    target: 1,
    category: "charm",
    imageSrc: "/achievement-badges/first-gift.png",
  },
  {
    key: "gift_ambassador",
    title: "Gift Ambassador",
    description: "Send gifts to 20 different players.",
    metric: "distinctGiftRecipientCount",
    target: 20,
    category: "charm",
    imageSrc: null,
  },
  {
    key: "popularity_star",
    title: "Popularity Star",
    description: "Reach 1,000 charm points.",
    metric: "charmScore",
    target: 1000,
    category: "charm",
    imageSrc: "/achievement-badges/popularity-star.png",
  },
  {
    key: "host_20",
    title: "Host 20",
    description: "Host 20 Friemi plans.",
    metric: "hostedActivityCount",
    target: 20,
    category: "legacy",
    imageSrc: null,
  },
  {
    key: "trusted_profile",
    title: "Trusted Profile",
    description: "Reach the trusted profile score.",
    metric: "trustScore",
    target: 90,
    category: "legacy",
    imageSrc: null,
  },
] as const satisfies readonly AchievementCatalogEntry[];

export const maxEquippedAchievementCount = 3;

export type AchievementDefinition = (typeof achievementCatalog)[number];
export type AchievementKey = AchievementDefinition["key"];
export type AchievementMetric = AchievementDefinition["metric"];

const achievementKeySet = new Set<string>(
  achievementCatalog.map((achievement) => achievement.key),
);

export function isAchievementKey(value: string): value is AchievementKey {
  return achievementKeySet.has(value);
}

export function getAchievementDefinition(key: AchievementKey) {
  return achievementCatalog.find((achievement) => achievement.key === key);
}
