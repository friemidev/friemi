export const achievementCatalog = [
  {
    key: "hello_world",
    title: "Hello World",
    description: "Joined the first activity.",
    metric: "participationCount",
    target: 1,
  },
  {
    key: "open_minded",
    title: "Open Minded",
    description: "Hosted the first activity.",
    metric: "hostedActivityCount",
    target: 1,
  },
  {
    key: "active_guest_20",
    title: "Active Guest",
    description: "Joined 20 activities.",
    metric: "participationCount",
    target: 20,
  },
  {
    key: "host_20",
    title: "Host 20",
    description: "Hosted 20 activities.",
    metric: "hostedActivityCount",
    target: 20,
  },
  {
    key: "co_creator",
    title: "Co-creator",
    description: "Became a Friemi co-creator.",
    metric: "isCoCreator",
    target: 1,
  },
  {
    key: "trusted_profile",
    title: "Trusted Profile",
    description: "Reached Trusted trust level.",
    metric: "trustScore",
    target: 90,
  },
] as const;

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
