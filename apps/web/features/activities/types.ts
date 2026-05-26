import type { ActivitySummary, ActivityType, PriceType } from "@chill-club/shared";

export type ActivityCardViewModel = ActivitySummary & {
  coverTone: "moss" | "clay" | "sky";
};

export type ActivityOrganizerViewModel = {
  id: string;
  nickname: string;
  bio: string | null;
};

export type ActivityDetailViewModel = ActivityCardViewModel & {
  itinerary: string | null;
  type: ActivityType;
  destination: string | null;
  minParticipants: number | null;
  requiresApproval: boolean;
  priceType: PriceType;
  organizer: ActivityOrganizerViewModel;
};
