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
      bio: true,
      _count: {
        select: {
          followers: true,
          following: true,
        },
      },
    },
  },
  publicEvent: {
    select: {
      id: true,
      title: true,
      officialUrl: true,
      status: true,
    },
  },
} satisfies Prisma.ActivitySelect;

type ActivityDetailQueryResult = Prisma.ActivityGetPayload<{
  select: typeof activityDetailSelect;
}>;

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
    startAt: activity.startAt.toISOString(),
    endAt: activity.endAt?.toISOString() ?? null,
    capacity: isActivityInfo ? 0 : activity.capacity,
    coverImageUrl: activity.coverImageUrl,
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
    publicEventId: activity.publicEventId,
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
      bio: activity.organizer.bio,
      followerCount: activity.organizer._count.followers,
      followingCount: activity.organizer._count.following,
    },
    publicEvent: activity.publicEvent
      ? {
          id: activity.publicEvent.id,
          title: activity.publicEvent.title,
          officialUrl: activity.publicEvent.officialUrl,
          status: activity.publicEvent.status,
        }
      : null,
  };
}

export async function getActivityById(
  activityId: string,
  viewerProfileId?: string | null,
): Promise<ActivityDetailViewModel | null> {
  const friendIds = viewerProfileId
    ? await getViewerFriendIds(viewerProfileId)
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
          ...(friendIds.length > 0
            ? [
                {
                  AND: [
                    { visibility: "PRIVATE" as const },
                    { organizerId: { in: friendIds } },
                  ],
                },
              ]
            : []),
        ],
      }
    : {
        visibility: {
          in: publicActivityVisibility,
        },
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

  return activity ? getActivityDetailViewModel(activity) : null;
}
