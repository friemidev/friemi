import { prisma } from "@/lib/prisma";
import { getViewerFriendIds } from "@/features/friends/queries/getViewerFriendIds";
import type { ActivityStatus, ParticipantStatus, Prisma } from "@prisma/client";
import type {
  ActivityDetailViewModel,
  ActivityParticipantPreviewViewModel,
} from "../types";
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
import {
  formatActivityLocalDateTimeInput,
  splitStoredDescription,
  type ActivityFormValues,
} from "../actions/activityActionUtils";
import {
  getAutoCreatedTeamMetadata,
  isAutoCreatedTeamClaimable,
} from "../utils/autoCreatedTeams";
import {
  getActivityAddressPrivacy,
  shouldHideActivityAddressFromViewer,
} from "../utils/activityAddressPrivacy";

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
  guestParticipants: {
    where: {
      linkedParticipantId: null,
      status: {
        in: countedDetailParticipationStatuses,
      },
    },
    orderBy: {
      joinedAt: "asc",
    },
    select: {
      id: true,
      displayName: true,
    },
  },
  publicEvent: {
    select: {
      id: true,
      title: true,
      coverImageUrl: true,
      officialUrl: true,
      ticketUrl: true,
      ticketLabel: true,
      status: true,
    },
  },
  organizerId: true,
  source: true,
  sourcePayload: true,
  ticketUrl: true,
  ticketLabel: true,
  shareEnabled: true,
  shareToken: true,
} satisfies Prisma.ActivitySelect;

const activityShareMetadataSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  city: true,
  address: true,
  latitude: true,
  longitude: true,
  startAt: true,
  endAt: true,
  capacity: true,
  priceType: true,
  priceText: true,
  coverImageUrl: true,
  publicEventId: true,
  publicEvent: {
    select: {
      coverImageUrl: true,
    },
  },
  organizer: {
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
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
    take: 5,
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
  guestParticipants: {
    where: {
      linkedParticipantId: null,
      status: {
        in: countedDetailParticipationStatuses,
      },
    },
    orderBy: {
      joinedAt: "asc",
    },
    take: 5,
    select: {
      id: true,
      displayName: true,
    },
  },
  _count: {
    select: {
      participants: {
        where: {
          status: {
            in: countedDetailParticipationStatuses,
          },
        },
      },
      guestParticipants: {
        where: {
          linkedParticipantId: null,
          status: {
            in: countedDetailParticipationStatuses,
          },
        },
      },
    },
  },
  status: true,
  visibility: true,
  shareEnabled: true,
  shareToken: true,
  sourcePayload: true,
} satisfies Prisma.ActivitySelect;

type ActivityDetailQueryResult = Prisma.ActivityGetPayload<{
  select: typeof activityDetailSelect;
}>;

type ActivityShareMetadataQueryResult = Prisma.ActivityGetPayload<{
  select: typeof activityShareMetadataSelect;
}>;

export type ActivityShareMetadataViewModel = {
  address: string;
  category: ActivityShareMetadataQueryResult["category"];
  city: string;
  capacity: number;
  coverImageUrl: string | null;
  description: string;
  endAt: string | null;
  id: string;
  latitude: number | null;
  longitude: number | null;
  organizer: {
    avatarUrl: string | null;
    id: string;
    nickname: string;
  };
  participantCount: number;
  participantPreview: ActivityParticipantPreviewViewModel[];
  priceText: string | null;
  priceType: ActivityShareMetadataQueryResult["priceType"];
  publicEventId: string | null;
  startAt: string;
  status: ActivityShareMetadataQueryResult["status"];
  title: string;
  visibility: ActivityShareMetadataQueryResult["visibility"];
};

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function getShareMetadataParticipantPreview(
  activity: ActivityShareMetadataQueryResult,
) {
  const preview: ActivityParticipantPreviewViewModel[] = [
    {
      id: activity.organizer.id,
      nickname: activity.organizer.nickname,
      avatarUrl: activity.organizer.avatarUrl,
      kind: "user",
    },
  ];
  const seen = new Set([activity.organizer.id]);

  activity.participants.forEach((participant) => {
    if (seen.has(participant.userProfile.id)) {
      return;
    }

    seen.add(participant.userProfile.id);
    preview.push({
      id: participant.userProfile.id,
      nickname: participant.userProfile.nickname,
      avatarUrl: participant.userProfile.avatarUrl,
      kind: "user",
    });
  });

  activity.guestParticipants.forEach((participant) => {
    preview.push({
      id: `guest:${participant.id}`,
      nickname: participant.displayName,
      avatarUrl: null,
      kind: "guest",
    });
  });

  return preview;
}

function getActivityDetailViewModel(
  activity: ActivityDetailQueryResult,
  viewerProfileId?: string | null,
): ActivityDetailViewModel {
  const isActivityInfo = isLegacyActivityInfoSource(activity);
  const autoCreatedTeamMetadata = getAutoCreatedTeamMetadata(
    activity.source,
    activity.sourcePayload,
  );
  const addressPrivacy = getActivityAddressPrivacy(activity.sourcePayload);
  const participantCount = isActivityInfo
    ? 0
    : activity._count.participants + activity._count.guestParticipants;
  const participantPreview = isActivityInfo
    ? []
    : [
        ...(activity.participants ?? []).map((participant) => ({
          id: participant.userProfile.id,
          nickname: participant.userProfile.nickname,
          avatarUrl: participant.userProfile.avatarUrl,
          kind: "user" as const,
        })),
        ...(activity.guestParticipants ?? []).map((participant) => ({
          id: `guest:${participant.id}`,
          nickname: participant.displayName,
          avatarUrl: null,
          kind: "guest" as const,
        })),
      ];
  const isViewerParticipant = Boolean(
    viewerProfileId &&
      activity.participants?.some(
        (participant) => participant.userProfile.id === viewerProfileId,
      ),
  );
  const isAddressHiddenFromViewer = shouldHideActivityAddressFromViewer({
    isActivityInfo,
    isViewerParticipant,
    organizerId: activity.organizerId,
    sourcePayload: activity.sourcePayload,
    viewerProfileId,
  });

  return {
    autoCreatedTeam: autoCreatedTeamMetadata
      ? {
          ...autoCreatedTeamMetadata,
          isClaimable: isAutoCreatedTeamClaimable(autoCreatedTeamMetadata),
        }
      : null,
    id: activity.id,
    title: activity.title,
    description: activity.description,
    itinerary: activity.itinerary,
    type: isActivityInfo ? "PUBLIC_EVENT" : activity.type,
    category: activity.category,
    city: activity.city,
    destination: activity.destination,
    address: isAddressHiddenFromViewer ? activity.city : activity.address,
    latitude: isAddressHiddenFromViewer ? null : activity.latitude,
    longitude: isAddressHiddenFromViewer ? null : activity.longitude,
    startAt: toIsoString(activity.startAt) ?? new Date().toISOString(),
    endAt: toIsoString(activity.endAt),
    capacity: isActivityInfo ? 0 : activity.capacity,
    coverImageUrl:
      activity.coverImageUrl ?? activity.publicEvent?.coverImageUrl ?? null,
    customCoverImageUrl: isActivityInfo ? null : activity.coverImageUrl,
    favoriteCount: activity._count.favorites,
    minParticipants: activity.minParticipants,
    requiresApproval: activity.requiresApproval,
    priceType: activity.priceType,
    participantCount,
    priceText: activity.priceText,
    status: activity.status,
    visibility: activity.visibility ?? "PUBLIC",
    hideAddressFromNonParticipants: addressPrivacy.hideFromNonParticipants,
    isAddressHiddenFromViewer,
    coverTone: getActivityCoverTone(activity.id),
    isActivityInfo,
    officialUrl: activity.externalUrl ?? activity.sourceUrl,
    ticketUrl: activity.ticketUrl,
    ticketLabel: activity.ticketLabel,
    publicEventId: activity.publicEventId,
    organizerId: activity.organizerId,
    shareEnabled: activity.shareEnabled,
    shareToken: activity.shareToken,
    participantPreview,
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
          coverImageUrl: activity.publicEvent.coverImageUrl,
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
  const activityViewModel = getActivityDetailViewModel(activity, viewerProfileId);

  if (!activityViewModel.isActivityInfo && !organizerParticipation) {
    return {
      ...activityViewModel,
      participantCount: activityViewModel.participantCount + 1,
      participantPreview: [
        {
          id: activityViewModel.organizer.id,
          nickname: activityViewModel.organizer.nickname,
          avatarUrl: activityViewModel.organizer.avatarUrl,
          kind: "user" as const,
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

function getActivityCopyValues(
  activity: ActivityDetailViewModel,
): ActivityFormValues {
  const descriptionParts = splitStoredDescription(
    activity.category,
    activity.description,
  );

  return {
    title: activity.title,
    description: descriptionParts.description,
    itinerary: activity.itinerary ?? "",
    coverImageUrl: activity.customCoverImageUrl ?? activity.coverImageUrl ?? "",
    type: activity.type,
    category: activity.category,
    visibility: activity.visibility ?? "PUBLIC",
    otherCategoryText: descriptionParts.otherCategoryText,
    city: activity.city,
    destination: activity.destination ?? "",
    address: activity.address,
    hideAddressFromNonParticipants:
      activity.hideAddressFromNonParticipants ?? false,
    latitude: activity.latitude === null ? "" : String(activity.latitude),
    longitude: activity.longitude === null ? "" : String(activity.longitude),
    startAt: formatActivityLocalDateTimeInput(activity.startAt),
    endAt: formatActivityLocalDateTimeInput(activity.endAt),
    capacity: String(activity.capacity),
    capacityLimitEnabled: activity.capacity > 0,
    minParticipants: activity.minParticipants
      ? String(activity.minParticipants)
      : "",
    requiresApproval: activity.requiresApproval,
    priceType: activity.priceType,
    priceText: activity.priceText ?? "",
    ticketUrl: activity.ticketUrl ?? "",
    ticketLabel: activity.ticketLabel ?? "",
    publicEventId: activity.publicEventId ?? undefined,
    importSourceUrl: "",
  };
}

export async function getActivityCopyValuesById(
  activityId: string,
  viewerProfileId?: string | null,
): Promise<ActivityFormValues | null> {
  const activity = await getActivityById(activityId, viewerProfileId);

  if (!activity) {
    return null;
  }

  return getActivityCopyValues(activity);
}

export async function getActivityShareMetadataById(
  activityId: string,
  accessToken?: string | null,
): Promise<ActivityShareMetadataViewModel | null> {
  const activity = await prisma.activity.findFirst({
    where: {
      id: activityId,
      status: {
        in: detailActivityStatuses,
      },
      OR: [
        {
          visibility: {
            in: publicActivityVisibility,
          },
        },
        ...buildPrivateActivityShareAccessWhere(accessToken),
      ],
      organizer: {
        status: "ACTIVE",
      },
    },
    select: activityShareMetadataSelect,
  });

  if (!activity) {
    return null;
  }

  const organizerParticipation = await prisma.activityParticipant.findUnique({
    where: {
      activityId_userProfileId: {
        activityId: activity.id,
        userProfileId: activity.organizer.id,
      },
    },
    select: {
      status: true,
    },
  });
  const organizerIsCounted = organizerParticipation
    ? countedDetailParticipationStatuses.includes(organizerParticipation.status)
    : false;
  const countedParticipantCount =
    activity._count.participants +
    activity._count.guestParticipants +
    (organizerIsCounted ? 0 : 1);
  const participantPreview = getShareMetadataParticipantPreview(activity);
  const hideAddressFromShare = getActivityAddressPrivacy(
    activity.sourcePayload,
  ).hideFromNonParticipants;

  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    category: activity.category,
    city: activity.city,
    capacity: activity.capacity,
    address: hideAddressFromShare ? activity.city : activity.address,
    latitude: hideAddressFromShare ? null : activity.latitude,
    longitude: hideAddressFromShare ? null : activity.longitude,
    startAt: toIsoString(activity.startAt) ?? new Date().toISOString(),
    endAt: toIsoString(activity.endAt),
    priceType: activity.priceType,
    priceText: activity.priceText,
    publicEventId: activity.publicEventId,
    organizer: {
      id: activity.organizer.id,
      nickname: activity.organizer.nickname,
      avatarUrl: activity.organizer.avatarUrl,
    },
    participantCount: Math.max(
      participantPreview.length,
      countedParticipantCount,
    ),
    participantPreview,
    coverImageUrl:
      activity.coverImageUrl ?? activity.publicEvent?.coverImageUrl ?? null,
    status: activity.status,
    visibility: activity.visibility,
  };
}
