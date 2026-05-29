import type {
  ActivitySummary,
  ActivityType,
  PriceType,
} from "@chill-club/shared";
import type { CommentType } from "@prisma/client";

export type ActivityCardViewModel = ActivitySummary & {
  coverTone: "moss" | "clay" | "sky";
};

export type ActivityOrganizerViewModel = {
  id: string;
  nickname: string;
  bio: string | null;
  followerCount: number;
  followingCount: number;
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

export type ActivityCommentViewModel = {
  id: string;
  type: CommentType;
  content: string;
  pinnedByOrganizer: boolean;
  createdAt: string;
  author: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
  };
};
