import {
  Prisma,
  type ActivityCategory,
  type ActivityStatus,
  type ActivityType,
  type ActivityVisibility,
  type PriceType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AUTO_CREATED_TEAM_CLAIM_WINDOW_HOURS,
  AUTO_CREATED_TEAM_DAILY_LIMIT,
  AUTO_CREATED_TEAM_DAILY_LINK_SOURCE,
  AUTO_CREATED_TEAM_FAVORITE_THRESHOLD,
  AUTO_CREATED_TEAM_SOURCE,
  AUTO_CREATED_TEAM_VIEW_THRESHOLD,
  AUTO_CREATED_TEAM_WINDOW_DAYS,
  buildAutoCreatedTeamDailyLink,
  buildAutoCreatedTeamMetadata,
  getParisDateKey,
} from "../utils/autoCreatedTeams";

const activeAutoCreatedStatuses: ActivityStatus[] = ["RECRUITING", "CONFIRMED"];
const preferredAutoTeamOrganizerHandle = "friemi";

type HotSourcePublicEvent = {
  address: string;
  category: ActivityCategory;
  city: string;
  coverImageUrl: string | null;
  description: string;
  endAt: Date | null;
  favoriteCount: number;
  id: string;
  latitude: number | null;
  longitude: number | null;
  priceText: string | null;
  priceType: PriceType;
  startAt: Date;
  status: "SCHEDULED" | "CANCELLED";
  ticketLabel: string | null;
  ticketUrl: string | null;
  title: string;
  viewCount: number;
  visibility: ActivityVisibility;
};

export type AutoCreateTeamsRunSummary = {
  created: number;
  deletedStale: number;
  skippedActiveExisting: number;
  skippedDuplicateDay: number;
  skippedNotHotEnough: number;
  skippedNoOrganizer: boolean;
  totalCandidates: number;
};

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

async function getAutoTeamOrganizerProfile() {
  const explicitProfileId = process.env.AUTO_TEAM_ORGANIZER_PROFILE_ID?.trim();
  const explicitFriendCode = process.env.AUTO_TEAM_ORGANIZER_FRIEND_CODE?.trim();

  if (explicitProfileId) {
    return prisma.userProfile.findFirst({
      where: {
        id: explicitProfileId,
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });
  }

  if (explicitFriendCode) {
    return prisma.userProfile.findFirst({
      where: {
        friendCode: explicitFriendCode,
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });
  }

  const preferredProfile = await prisma.userProfile.findFirst({
    where: {
      status: "ACTIVE",
      OR: [
        {
          nickname: {
            equals: preferredAutoTeamOrganizerHandle,
            mode: "insensitive",
          },
        },
        {
          username: {
            equals: preferredAutoTeamOrganizerHandle,
            mode: "insensitive",
          },
        },
      ],
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
    },
  });

  if (preferredProfile) {
    return preferredProfile;
  }

  return prisma.userProfile.findFirst({
    where: {
      role: "ADMIN",
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
    },
  });
}

async function getHotSourceActivities(now: Date) {
  const since = new Date(
    now.getTime() - AUTO_CREATED_TEAM_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const viewRows = await prisma.analyticsEvent.groupBy({
    by: ["entityId"],
    where: {
      createdAt: {
        gte: since,
      },
      entityId: {
        not: null,
      },
      entityType: "public_event",
      name: "public_event_detail_viewed",
    },
    _count: {
      entityId: true,
    },
  });

  const viewCountByActivityId = new Map(
    viewRows
      .filter(
        (row): row is typeof row & { entityId: string } =>
          Boolean(row.entityId) &&
          (row._count.entityId ?? 0) > AUTO_CREATED_TEAM_VIEW_THRESHOLD,
      )
      .map((row) => [row.entityId, row._count.entityId ?? 0]),
  );
  const candidateIds = [...viewCountByActivityId.keys()];

  if (candidateIds.length === 0) {
    return [];
  }

  const publicEvents = await prisma.publicEvent.findMany({
    where: {
      id: {
        in: candidateIds,
      },
      status: "SCHEDULED",
      visibility: "PUBLIC",
      OR: [
        {
          endAt: {
            gt: now,
          },
        },
        {
          endAt: null,
          startAt: {
            gt: now,
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      visibility: true,
      city: true,
      address: true,
      latitude: true,
      longitude: true,
      startAt: true,
      endAt: true,
      priceType: true,
      priceText: true,
      coverImageUrl: true,
      ticketUrl: true,
      ticketLabel: true,
      status: true,
      _count: {
        select: {
          favorites: true,
        },
      },
    },
  });

  return publicEvents
    .map<HotSourcePublicEvent | null>((publicEvent) => {
      const favoriteCount = publicEvent._count.favorites;

      if (favoriteCount <= AUTO_CREATED_TEAM_FAVORITE_THRESHOLD) {
        return null;
      }

      return {
        address: publicEvent.address,
        category: publicEvent.category,
        city: publicEvent.city,
        coverImageUrl: publicEvent.coverImageUrl,
        description: publicEvent.description,
        endAt: publicEvent.endAt,
        favoriteCount,
        id: publicEvent.id,
        latitude: publicEvent.latitude,
        longitude: publicEvent.longitude,
        priceText: publicEvent.priceText,
        priceType: publicEvent.priceType,
        startAt: publicEvent.startAt,
        status: publicEvent.status,
        ticketLabel: publicEvent.ticketLabel,
        ticketUrl: publicEvent.ticketUrl,
        title: publicEvent.title,
        viewCount: viewCountByActivityId.get(publicEvent.id) ?? 0,
        visibility: publicEvent.visibility,
      };
    })
    .filter((activity): activity is HotSourcePublicEvent => Boolean(activity))
    .sort(
      (left, right) =>
        right.viewCount +
        right.favoriteCount * 2 -
        (left.viewCount + left.favoriteCount * 2),
    )
    .slice(0, AUTO_CREATED_TEAM_DAILY_LIMIT);
}

async function deleteStaleAutoCreatedTeams(now: Date) {
  const staleBefore = new Date(
    now.getTime() - AUTO_CREATED_TEAM_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const staleActivities = await prisma.activity.findMany({
    where: {
      source: AUTO_CREATED_TEAM_SOURCE,
      createdAt: {
        lte: staleBefore,
      },
    },
    select: {
      id: true,
      _count: {
        select: {
          guestParticipants: true,
          participants: true,
        },
      },
    },
  });

  const staleIds = staleActivities
    .filter(
      (activity) =>
        activity._count.participants === 0 &&
        activity._count.guestParticipants === 0,
    )
    .map((activity) => activity.id);

  if (staleIds.length === 0) {
    return 0;
  }

  const result = await prisma.activity.deleteMany({
    where: {
      id: {
        in: staleIds,
      },
    },
  });

  return result.count;
}

async function createAutoTeamFromSourceActivity(input: {
  dateKey: string;
  now: Date;
  organizerId: string;
  sourceActivity: HotSourcePublicEvent;
}) {
  const claimableUntil = new Date(
    input.now.getTime() + AUTO_CREATED_TEAM_CLAIM_WINDOW_HOURS * 60 * 60 * 1000,
  );

  try {
    return await prisma.$transaction(async (tx) => {
      const activeExisting = await tx.activity.findFirst({
        where: {
          publicEventId: input.sourceActivity.id,
          status: {
            in: activeAutoCreatedStatuses,
          },
          OR: [
            {
              endAt: {
                gt: input.now,
              },
            },
            {
              endAt: null,
              startAt: {
                gt: input.now,
              },
            },
          ],
        },
        select: {
          id: true,
        },
      });

      if (activeExisting) {
        return {
          created: false,
          reason: "active_existing" as const,
        };
      }

      const createdActivity = await tx.activity.create({
        data: {
          address: input.sourceActivity.address,
          capacity: 0,
          category: input.sourceActivity.category,
          city: input.sourceActivity.city,
          coverImageUrl: input.sourceActivity.coverImageUrl,
          description: input.sourceActivity.description,
          destination: null,
          endAt: input.sourceActivity.endAt,
          itinerary: null,
          latitude: input.sourceActivity.latitude,
          longitude: input.sourceActivity.longitude,
          minParticipants: null,
          organizerId: input.organizerId,
          priceText: input.sourceActivity.priceText ?? "",
          priceType: input.sourceActivity.priceType,
          publicEventId: input.sourceActivity.id,
          requiresApproval: false,
          source: AUTO_CREATED_TEAM_SOURCE,
          sourcePayload: buildAutoCreatedTeamMetadata({
            claimableUntil,
            sourceActivityId: input.sourceActivity.id,
            sourceActivityTitle: input.sourceActivity.title,
          }),
          startAt: input.sourceActivity.startAt,
          status: "RECRUITING",
          ticketLabel: input.sourceActivity.ticketLabel,
          ticketUrl: input.sourceActivity.ticketUrl,
          title: input.sourceActivity.title,
          type: "LOCAL" satisfies ActivityType,
          visibility: input.sourceActivity.visibility,
        },
        select: {
          id: true,
        },
      });

      await tx.activitySourceLink.create({
        data: {
          activityId: createdActivity.id,
          source: AUTO_CREATED_TEAM_DAILY_LINK_SOURCE,
          sourceUrl: buildAutoCreatedTeamDailyLink(
            input.sourceActivity.id,
            input.dateKey,
          ),
        },
      });

      return {
        activityId: createdActivity.id,
        created: true,
        reason: null,
      };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        created: false,
        reason: "duplicate_day" as const,
      };
    }

    throw error;
  }
}

export async function autoCreateTeamsFromHotActivities(): Promise<AutoCreateTeamsRunSummary> {
  const now = new Date();
  const organizer = await getAutoTeamOrganizerProfile();

  if (!organizer) {
    return {
      created: 0,
      deletedStale: 0,
      skippedActiveExisting: 0,
      skippedDuplicateDay: 0,
      skippedNotHotEnough: 0,
      skippedNoOrganizer: true,
      totalCandidates: 0,
    };
  }

  const deletedStale = await deleteStaleAutoCreatedTeams(now);
  const hotActivities = await getHotSourceActivities(now);
  const summary: AutoCreateTeamsRunSummary = {
    created: 0,
    deletedStale,
    skippedActiveExisting: 0,
    skippedDuplicateDay: 0,
    skippedNotHotEnough: 0,
    skippedNoOrganizer: false,
    totalCandidates: hotActivities.length,
  };
  const dateKey = getParisDateKey(now);

  for (const sourceActivity of hotActivities) {
    const result = await createAutoTeamFromSourceActivity({
      dateKey,
      now,
      organizerId: organizer.id,
      sourceActivity,
    });

    if (result.created) {
      summary.created += 1;
      continue;
    }

    if (result.reason === "active_existing") {
      summary.skippedActiveExisting += 1;
      continue;
    }

    if (result.reason === "duplicate_day") {
      summary.skippedDuplicateDay += 1;
    }
  }

  return summary;
}
