import type { ActivitySummary } from "@chill-club/shared";

export type ActivityCardViewModel = ActivitySummary & {
  coverTone: "moss" | "clay" | "sky";
};
