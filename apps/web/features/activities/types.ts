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
  kind?: "user" | "guest";
};

export type ActivityContactableParticipantViewModel = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
};

export type ActivityCardViewModel = ActivitySummary & {
  autoCreatedTeam: {
    autoCreatedAt: string | null;
    claimableUntil: string | null;
    claimedAt: string | null;
    claimedByUserProfileId: string | null;
    isClaimable: boolean;
    sourceActivityId: string | null;
    sourceActivityTitle: string | null;
  } | null;
  coverImageUrl: string | null;
  customCoverImageUrl?: string | null;
  coverTone: "moss" | "clay" | "sky";
  favoriteCount: number;
  latitude: number | null;
  longitude: number | null;
  hideAddressFromNonParticipants?: boolean;
  isAddressHiddenFromViewer?: boolean;
  visibility?: ActivityVisibility;
  merchant: ActivityMerchantViewModel | null;
  isActivityInfo?: boolean;
  officialUrl?: string | null;
  ticketUrl?: string | null;
  ticketLabel?: string | null;
  publicEventId?: string | null;
  organizerId?: string | null;
  participantPreview?: ActivityParticipantPreviewViewModel[];
  contactableParticipants?: ActivityContactableParticipantViewModel[];
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
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number;
  followingCount: number;
};

export type ActivityAnnouncementViewModel = {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  isByOrganizer: boolean;
};

export type ActivityDetailViewModel = ActivityCardViewModel & {
  itinerary: string | null;
  type: ActivityType;
  destination: string | null;
  minParticipants: number | null;
  requiresApproval: boolean;
  priceType: PriceType;
  shareEnabled?: boolean;
  shareToken?: string | null;
  viewerCanManage?: boolean;
  organizer: ActivityOrganizerViewModel;
  announcements: ActivityAnnouncementViewModel[];
  publicEvent: {
    id: string;
    title: string;
    coverImageUrl: string | null;
    officialUrl: string | null;
    ticketUrl: string | null;
    ticketLabel: string | null;
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
