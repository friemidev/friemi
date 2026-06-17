import { prisma } from "@/lib/prisma";
import { getViewerFriendIds } from "@/features/friends/queries/getViewerFriendIds";
import type { ActivityStatus, ParticipantStatus, Prisma } from "@prisma/client";
import type { ActivityDetailViewModel } from "../types";
import {
  activityCardSelect,
  getActivityCoverTone,
  isLegacyActivityInfoSource,
  publicActivityVisibility,
} from "./getActivities";
import {
  buildPrivateActivityFriendAccessWhere,
  buildPrivateActivityShareAccessWhere,
} from "../utils/activityShareAccess";

const detailActivityStatuses: ActivityStatus[] = [
  "OPEN",
  "FULL",
  "RECRUITING",
  "CONFIRMED",
  "ENDED",
  "CANCELLED",
];
const visibleDetailParticipationStatuses: ParticipantStatus[] = [
  "JOINED",
  "APPROVED",
  "PENDING",
];
const countedDetailParticipationStatuses: ParticipantStatus[] = [
  "JOINED",
  "APPROVED",
];

const activityDetailSelect = {
  ...activityCardSelect,
  itinerary: true,
  type: true,
  destination: true,
  minParticipants: true,
  requiresApproval: true,
  priceType: true,
  organizer: {
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
      bio: true,
      _count: {
        select: {
          followers: true,
          following: true,
        },
      },
    },
  },
  participants: {
    where: {
      status: {
        in: countedDetailParticipationStatuses,
      },
    },
    orderBy: {
      joinedAt: "asc",
    },
    select: {
      id: true,
      userProfile: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
        },
      },
    },
  },
  publicEvent: {
    select: {
      id: true,
      title: true,
      officialUrl: true,
      ticketUrl: true,
      ticketLabel: true,
      status: true,
    },
  },
  organizerId: true,
  ticketUrl: true,
  ticketLabel: true,
  shareEnabled: true,
  shareToken: true,
} satisfies Prisma.ActivitySelect;

type ActivityDetailQueryResult = Prisma.ActivityGetPayload<{
  select: typeof activityDetailSelect;
}>;

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function getActivityDetailViewModel(
  activity: ActivityDetailQueryResult,
): ActivityDetailViewModel {
  const isActivityInfo = isLegacyActivityInfoSource(activity);

  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    itinerary: activity.itinerary,
    type: isActivityInfo ? "PUBLIC_EVENT" : activity.type,
    category: activity.category,
    city: activity.city,
    destination: activity.destination,
    address: activity.address,
    latitude: activity.latitude,
    longitude: activity.longitude,
    startAt: toIsoString(activity.startAt) ?? new Date().toISOString(),
    endAt: toIsoString(activity.endAt),
    capacity: isActivityInfo ? 0 : activity.capacity,
    coverImageUrl: activity.coverImageUrl,
    favoriteCount: activity._count.favorites,
    minParticipants: activity.minParticipants,
    requiresApproval: activity.requiresApproval,
    priceType: activity.priceType,
    participantCount: isActivityInfo ? 0 : activity._count.participants,
    priceText: activity.priceText,
    status: activity.status,
    visibility: activity.visibility,
    coverTone: getActivityCoverTone(activity.id),
    isActivityInfo,
    officialUrl: activity.externalUrl ?? activity.sourceUrl,
    ticketUrl: activity.ticketUrl,
    ticketLabel: activity.ticketLabel,
    publicEventId: activity.publicEventId,
    organizerId: activity.organizerId,
    shareEnabled: activity.shareEnabled,
    shareToken: activity.shareToken,
    participantPreview: isActivityInfo
      ? []
      : (activity.participants ?? []).map((participant) => ({
          id: participant.userProfile.id,
          nickname: participant.userProfile.nickname,
          avatarUrl: participant.userProfile.avatarUrl,
        })),
    merchant: activity.merchant
      ? {
          id: activity.merchant.id,
          slug: activity.merchant.slug,
          name: activity.merchant.name,
          logoUrl: activity.merchant.logoUrl,
          city: activity.merchant.city,
        }
      : null,
    organizer: {
      id: activity.organizer.id,
      nickname: activity.organizer.nickname,
      avatarUrl: activity.organizer.avatarUrl,
      bio: activity.organizer.bio,
      followerCount: activity.organizer._count.followers,
      followingCount: activity.organizer._count.following,
    },
    publicEvent: activity.publicEvent
      ? {
          id: activity.publicEvent.id,
          title: activity.publicEvent.title,
          officialUrl: activity.publicEvent.officialUrl,
          ticketUrl: activity.publicEvent.ticketUrl,
          ticketLabel: activity.publicEvent.ticketLabel,
          status: activity.publicEvent.status,
        }
      : null,
  };
}

export async function getActivityById(
  activityId: string,
  viewerProfileId?: string | null,
  viewerFriendIds?: string[],
  accessToken?: string | null,
): Promise<ActivityDetailViewModel | null> {
  const friendIds = viewerProfileId
    ? (viewerFriendIds ?? (await getViewerFriendIds(viewerProfileId)))
    : [];
  const accessWhere: Prisma.ActivityWhereInput = viewerProfileId
    ? {
        OR: [
          {
            visibility: {
              in: publicActivityVisibility,
            },
          },
          {
            organizerId: viewerProfileId,
          },
          {
            participants: {
              some: {
                userProfileId: viewerProfileId,
                status: {
                  in: visibleDetailParticipationStatuses,
                },
              },
            },
          },
          ...buildPrivateActivityFriendAccessWhere(friendIds),
          ...buildPrivateActivityShareAccessWhere(accessToken),
        ],
      }
    : {
        OR: [
          {
            visibility: {
              in: publicActivityVisibility,
            },
          },
          ...buildPrivateActivityShareAccessWhere(accessToken),
        ],
      };

  const activity = await prisma.activity.findFirst({
    where: {
      id: activityId,
      status: {
        in: detailActivityStatuses,
      },
      ...accessWhere,
      organizer: {
        status: "ACTIVE",
      },
    },
    select: activityDetailSelect,
  });

  if (!activity) {
    return null;
  }

  const organizerParticipation = await prisma.activityParticipant.findUnique({
    where: {
      activityId_userProfileId: {
        activityId: activity.id,
        userProfileId: activity.organizerId,
      },
    },
    select: {
      status: true,
    },
  });
  const activityViewModel = getActivityDetailViewModel(activity);

  if (
    !activityViewModel.isActivityInfo &&
    !organizerParticipation
  ) {
    return {
      ...activityViewModel,
      participantCount: activityViewModel.participantCount + 1,
      participantPreview: [
        {
          id: activityViewModel.organizer.id,
          nickname: activityViewModel.organizer.nickname,
          avatarUrl: activityViewModel.organizer.avatarUrl,
        },
        ...(activityViewModel.participantPreview ?? []),
      ],
    };
  }

  if (
    organizerParticipation &&
    countedDetailParticipationStatuses.includes(organizerParticipation.status)
  ) {
    return activityViewModel;
  }

  return activityViewModel;
}
