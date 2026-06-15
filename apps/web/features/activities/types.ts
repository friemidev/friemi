import type {
  ActivitySummary,
  ActivityType,
  PriceType,
} from "@chill-club/shared";
import type { ActivityVisibility, CommentType } from "@prisma/client";
import type { PublicEventStatus } from "@prisma/client";

export type ActivityFriendSignalUserViewModel = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
};

export type ActivityFriendSignalViewModel = {
  count: number;
  previewFriends: ActivityFriendSignalUserViewModel[];
  allFriends: ActivityFriendSignalUserViewModel[];
  extraCount: number;
};

export type ActivityParticipantPreviewViewModel = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
};

export type ActivityCardViewModel = ActivitySummary & {
  coverImageUrl: string | null;
  coverTone: "moss" | "clay" | "sky";
  favoriteCount: number;
  latitude: number | null;
  longitude: number | null;
  visibility?: ActivityVisibility;
  merchant: ActivityMerchantViewModel | null;
  isActivityInfo?: boolean;
  officialUrl?: string | null;
  publicEventId?: string | null;
  participantPreview?: ActivityParticipantPreviewViewModel[];
  friendSignal?: ActivityFriendSignalViewModel | null;
  isFavorited?: boolean;
  viewerParticipationStatus?:
    | "JOINED"
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED"
    | null;
};

export type ActivityMerchantViewModel = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  city: string;
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
  publicEvent: {
    id: string;
    title: string;
    officialUrl: string | null;
    status: PublicEventStatus;
  } | null;
};

export type ActivityCommentViewModel = {
  id: string;
  type: CommentType;
  content: string;
  isDeleted: boolean;
  pinnedByOrganizer: boolean;
  createdAt: string;
  editedAt: string | null;
  author: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
  };
  replies: ActivityCommentReplyViewModel[];
};

export type ActivityCommentReplyViewModel = {
  id: string;
  type: CommentType;
  content: string;
  isDeleted: boolean;
  createdAt: string;
  editedAt: string | null;
  author: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
  };
};
