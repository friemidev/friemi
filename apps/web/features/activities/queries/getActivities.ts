import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { attachActivityFriendSignals } from "@/features/friends/queries/getActivityFriendSignals";
import { attachActivityFavoriteStates } from "@/features/favorites/queries/getViewerActivityFavorite";
import { Prisma } from "@prisma/client";
import type {
  ActivityStatus,
  ActivityVisibility,
  ParticipantStatus,
} from "@prisma/client";
import type { ActivityCardViewModel } from "../types";
import type {
  ActivityFilters,
  ActivityRelationFilter,
  ActivityTimeState,
} from "../utils/activityFilters";

export const visibleActivityStatuses: ActivityStatus[] = [
  "RECRUITING",
  "CONFIRMED",
];
const visibleArchivedActivityStatuses: ActivityStatus[] = [
  ...visibleActivityStatuses,
  "ENDED",
];
const participantStatuses: ParticipantStatus[] = ["JOINED", "APPROVED"];
export const publicActivityVisibility: ActivityVisibility[] = ["PUBLIC"];
const coverTones: ActivityCardViewModel["coverTone"][] = [
  "moss",
  "clay",
  "sky",
];
const defaultActivityPageSize = 12;
const dailyRankingTimeZone = "Europe/Paris";
const dayInMs = 24 * 60 * 60 * 1000;
const freshOngoingWindowDays = 2;
const endingSoonWindowDays = 1;
const upcomingSoonWindowDays = 1;
const upcomingWeekWindowDays = 7;
const upcomingMonthWindowDays = 30;

export const activityCardSelect = {
  id: true,
  title: true,
  description: true,
  type: true,
  category: true,
  city: true,
  address: true,
  latitude: true,
  longitude: true,
  startAt: true,
  endAt: true,
  capacity: true,
  coverImageUrl: true,
  priceText: true,
  status: true,
  createdAt: true,
  merchant: {
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      city: true,
      isActive: true,
    },
  },
  _count: {
    select: {
      participants: {
        where: {
          status: {
            in: participantStatuses,
          },
        },
      },
    },
  },
} satisfies Prisma.ActivitySelect;

type GetActivitiesOptions = {
  filters?: ActivityFilters;
  includePast?: boolean;
  limit?: number;
  viewerProfileId?: string | null;
};

export type ActivityListResult = {
  activities: ActivityCardViewModel[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type VisibleActivityWhereOptions = {
  includeEnded?: boolean;
  includePast?: boolean;
  now?: Date;
};

function normalizeLimit(limit: number | undefined) {
  if (limit === undefined) {
    return undefined;
  }

  return Math.min(Math.max(Math.floor(limit), 1), 50);
}

function getKeywordTerms(keyword: string | undefined) {
  if (!keyword) {
    return [];
  }

  return Array.from(
    new Set(
      keyword
        .split(/\s+/)
        .map((term) => term.trim())
        .filter(Boolean),
    ),
  ).slice(0, 5);
}

function getActivityFilterWhere(
  filters: ActivityFilters | undefined,
): Prisma.ActivityWhereInput {
  if (!filters) {
    return {};
  }

  const keywordTerms = getKeywordTerms(filters.keyword);

  return {
    ...(keywordTerms.length > 0
      ? {
          AND: keywordTerms.map((term) => ({
            OR: [
              {
                title: {
                  contains: term,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: term,
                  mode: "insensitive",
                },
              },
            ],
          })),
        }
      : {}),
    ...(filters.category
      ? {
          category: filters.category,
        }
      : {}),
    ...(filters.city
      ? {
          city: {
            equals: filters.city,
            mode: "insensitive",
          },
        }
      : {}),
    ...(filters.type
      ? {
          type: filters.type,
        }
      : {}),
  };
}

async function getViewerFriendIds(viewerProfileId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userAId: viewerProfileId }, { userBId: viewerProfileId }],
    },
    select: {
      userAId: true,
      userBId: true,
    },
  });

  return Array.from(
    new Set(
      friendships.map((friendship) =>
        friendship.userAId === viewerProfileId
          ? friendship.userBId
          : friendship.userAId,
      ),
    ),
  );
}

async function getActivityRelationWhere(
  relation: ActivityRelationFilter,
  viewerProfileId: string | null | undefined,
): Promise<Prisma.ActivityWhereInput> {
  if (relation === "ALL") {
    return {};
  }

  if (!viewerProfileId) {
    return {
      organizerId: "__no_matching_profile__",
    };
  }

  if (relation === "MINE") {
    return {
      organizerId: viewerProfileId,
    };
  }

  const friendIds = await getViewerFriendIds(viewerProfileId);

  if (friendIds.length === 0) {
    return {
      organizerId: "__no_matching_profile__",
    };
  }

  if (relation === "FRIEND_HOSTED") {
    return {
      organizerId: {
        in: friendIds,
      },
    };
  }

  return {
    participants: {
      some: {
        userProfileId: {
          in: friendIds,
        },
        status: {
          in: participantStatuses,
        },
      },
    },
  };
}

export function getActivityCoverTone(activityId: string) {
  const charTotal = [...activityId].reduce(
    (total, char) => total + char.charCodeAt(0),
    0,
  );
  return coverTones[charTotal % coverTones.length];
}

type ActivityQueryResult = Prisma.ActivityGetPayload<{
  select: typeof activityCardSelect;
}>;

export function getVisibleActivityWhere(
  options: VisibleActivityWhereOptions = {},
): Prisma.ActivityWhereInput {
  const now = options.now ?? new Date();

  return {
    ...(options.includePast
      ? {}
      : {
          OR: [
            {
              startAt: {
                gte: now,
              },
            },
            {
              endAt: {
                gte: now,
              },
            },
          ],
        }),
    status: {
      in: options.includeEnded
        ? visibleArchivedActivityStatuses
        : visibleActivityStatuses,
    },
    visibility: {
      in: publicActivityVisibility,
    },
    organizer: {
      status: "ACTIVE",
    },
  };
}

export function getActivityTimeStateWhere(
  timeState: ActivityTimeState,
  now = new Date(),
): Prisma.ActivityWhereInput {
  if (timeState === "UPCOMING") {
    return {
      startAt: {
        gt: now,
      },
      status: {
        not: "ENDED",
      },
    };
  }

  if (timeState === "ONGOING") {
    return {
      startAt: {
        lte: now,
      },
      endAt: {
        gt: now,
      },
      status: {
        not: "ENDED",
      },
    };
  }

  return {
    OR: [
      {
        status: "ENDED",
      },
      {
        endAt: {
          lte: now,
        },
      },
      {
        AND: [
          {
            endAt: null,
          },
          {
            startAt: {
              lte: now,
            },
          },
        ],
      },
    ],
  };
}

export function getActivityCardViewModel(
  activity: ActivityQueryResult,
): ActivityCardViewModel {
  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    type: activity.type,
    category: activity.category,
    city: activity.city,
    address: activity.address,
    latitude: activity.latitude,
    longitude: activity.longitude,
    startAt: activity.startAt.toISOString(),
    endAt: activity.endAt?.toISOString() ?? null,
    capacity: activity.capacity,
    coverImageUrl: activity.coverImageUrl,
    participantCount: activity._count.participants,
    priceText: activity.priceText,
    status: activity.status,
    coverTone: getActivityCoverTone(activity.id),
    merchant: activity.merchant?.isActive
      ? {
          id: activity.merchant.id,
          slug: activity.merchant.slug,
          name: activity.merchant.name,
          logoUrl: activity.merchant.logoUrl,
          city: activity.merchant.city,
        }
      : null,
  };
}

export async function getActivities(
  options: GetActivitiesOptions = {},
): Promise<ActivityCardViewModel[]> {
  const now = new Date();
  const baseWhere = getVisibleActivityWhere({
    includePast: options.includePast,
    now,
  });
  const filterWhere = getActivityFilterWhere(options.filters);
  const relationWhere = await getActivityRelationWhere(
    options.filters?.relation ?? "ALL",
    options.viewerProfileId,
  );
  const orderBy: Prisma.ActivityOrderByWithRelationInput[] =
    options.filters?.sort === "recentlyAdded"
      ? [{ createdAt: "desc" }, { id: "asc" }]
      : [
          {
            startAt: options.filters?.sort === "latest" ? "desc" : "asc",
          },
          { id: "asc" },
        ];
  const activities = await prisma.activity.findMany({
    where: {
      AND: [baseWhere, filterWhere, relationWhere],
    },
    orderBy,
    take: normalizeLimit(options.limit),
    select: activityCardSelect,
  });

  const activityViewModels = await attachActivityFriendSignals(
    activities.map(getActivityCardViewModel),
    options.viewerProfileId,
  );

  return attachActivityFavoriteStates(
    activityViewModels,
    options.viewerProfileId,
  );
}

function getActivityTotalPages(totalCount: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

function getActivityPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), totalPages);
}

function getActivityListOrderBy(
  filters: ActivityFilters,
  timeState?: ActivityTimeState,
): Prisma.ActivityOrderByWithRelationInput[] {
  if (filters.sort === "recentlyAdded") {
    return [{ createdAt: "desc" }, { id: "asc" }];
  }

  if (filters.sort === "latest" || timeState === "ENDED") {
    return [{ startAt: "desc" }, { id: "asc" }];
  }

  return [{ startAt: "asc" }, { id: "asc" }];
}

function hasExplicitActivityListFilters(filters: ActivityFilters) {
  return Boolean(
    filters.keyword ||
    filters.category ||
    filters.city ||
    filters.relation !== "ALL" ||
    filters.type ||
    filters.timeState,
  );
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * dayInMs);
}

function getDailyRankingSeed(now: Date) {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: dailyRankingTimeZone,
    year: "numeric",
  }).formatToParts(now);
  const partMap = new Map(dateParts.map((part) => [part.type, part.value]));

  return [
    partMap.get("year") ?? "0000",
    partMap.get("month") ?? "00",
    partMap.get("day") ?? "00",
  ].join("-");
}

async function getActivityListWhere(
  filters: ActivityFilters,
  now: Date,
  viewerProfileId: string | null | undefined,
): Promise<Prisma.ActivityWhereInput> {
  const relationWhere = await getActivityRelationWhere(
    filters.relation,
    viewerProfileId,
  );

  return {
    AND: [
      getVisibleActivityWhere({
        includeEnded: true,
        includePast: true,
        now,
      }),
      getActivityFilterWhere(filters),
      relationWhere,
      ...(filters.timeState
        ? [getActivityTimeStateWhere(filters.timeState, now)]
        : []),
    ],
  };
}

async function getOrderedActivityList(
  filters: ActivityFilters,
  pageSize: number,
  now: Date,
  viewerProfileId: string | null | undefined,
): Promise<ActivityListResult> {
  const where = await getActivityListWhere(filters, now, viewerProfileId);
  const totalCount = await prisma.activity.count({ where });
  const totalPages = getActivityTotalPages(totalCount, pageSize);
  const page = getActivityPage(filters.page, totalPages);
  const activities = await prisma.activity.findMany({
    where,
    orderBy: getActivityListOrderBy(filters, filters.timeState),
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: activityCardSelect,
  });

  return {
    activities: await attachActivityFavoriteStates(
      await attachActivityFriendSignals(
        activities.map(getActivityCardViewModel),
        viewerProfileId,
      ),
      viewerProfileId,
    ),
    page,
    pageSize,
    totalCount,
    totalPages,
  };
}

async function getRecommendedActivityList(
  filters: ActivityFilters,
  pageSize: number,
  now: Date,
  viewerProfileId: string | null | undefined,
): Promise<ActivityListResult> {
  const where = await getActivityListWhere(filters, now, viewerProfileId);
  const totalCount = await prisma.activity.count({ where });
  const totalPages = getActivityTotalPages(totalCount, pageSize);
  const page = getActivityPage(filters.page, totalPages);
  const activityIds = await getRecommendedActivityIds({
    filters,
    now,
    page,
    pageSize,
    viewerProfileId,
  });

  if (activityIds.length === 0) {
    return {
      activities: [],
      page,
      pageSize,
      totalCount,
      totalPages,
    };
  }

  const activities = await prisma.activity.findMany({
    where: {
      id: {
        in: activityIds,
      },
    },
    select: activityCardSelect,
  });
  const activityById = new Map(
    activities.map((activity) => [activity.id, activity]),
  );

  return {
    activities: await attachActivityFavoriteStates(
      await attachActivityFriendSignals(
        activityIds
          .map((activityId) => activityById.get(activityId))
          .filter((activity): activity is ActivityQueryResult =>
            Boolean(activity),
          )
          .map(getActivityCardViewModel),
        viewerProfileId,
      ),
      viewerProfileId,
    ),
    page,
    pageSize,
    totalCount,
    totalPages,
  };
}

type RecommendedActivityIdRow = {
  id: string;
};

async function getRecommendedActivityIds({
  filters,
  now,
  page,
  pageSize,
  viewerProfileId,
}: {
  filters: ActivityFilters;
  now: Date;
  page: number;
  pageSize: number;
  viewerProfileId: string | null | undefined;
}) {
  const where = await getActivityListWhere(filters, now, viewerProfileId);
  const totalCount = await prisma.activity.count({ where });
  const totalPages = getActivityTotalPages(totalCount, pageSize);
  const currentPage = getActivityPage(page, totalPages);
  const offset = (currentPage - 1) * pageSize;
  const activities = await prisma.activity.findMany({
    where,
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
    },
  });
  const dailySeed = getDailyRankingSeed(now);
  const freshOngoingBoundary = addDays(now, -freshOngoingWindowDays);
  const endingSoonBoundary = addDays(now, endingSoonWindowDays);
  const upcomingSoonBoundary = addDays(now, upcomingSoonWindowDays);
  const upcomingWeekBoundary = addDays(now, upcomingWeekWindowDays);
  const upcomingMonthBoundary = addDays(now, upcomingMonthWindowDays);

  const rankedActivityIds = activities
    .map((activity) => {
      const isActive = visibleActivityStatuses.includes(activity.status);
      const isFreshOngoing =
        isActive &&
        activity.startAt <= now &&
        activity.endAt !== null &&
        activity.endAt > now &&
        activity.startAt >= freshOngoingBoundary;
      const isUpcoming = isActive && activity.startAt > now;
      const isOngoing =
        isActive &&
        activity.startAt <= now &&
        activity.endAt !== null &&
        activity.endAt > now;
      const recommendationGroup = isFreshOngoing
        ? 0
        : isUpcoming
          ? 1
          : isOngoing
            ? 2
            : 3;
      let proximityGroup = 0;

      if (isFreshOngoing) {
        proximityGroup =
          activity.endAt !== null && activity.endAt <= endingSoonBoundary ? 0 : 1;
      } else if (isUpcoming) {
        proximityGroup =
          activity.startAt <= upcomingSoonBoundary
            ? 0
            : activity.startAt <= upcomingWeekBoundary
              ? 1
              : activity.startAt <= upcomingMonthBoundary
                ? 2
                : 3;
      }

      return {
        id: activity.id,
        startAt: activity.startAt,
        recommendationGroup,
        proximityGroup,
        seed: createHash("md5")
          .update(`${dailySeed}:${activity.id}`)
          .digest("hex"),
      };
    })
    .sort((left, right) => {
      if (left.recommendationGroup !== right.recommendationGroup) {
        return left.recommendationGroup - right.recommendationGroup;
      }

      if (left.proximityGroup !== right.proximityGroup) {
        return left.proximityGroup - right.proximityGroup;
      }

      if (left.seed < right.seed) {
        return -1;
      }

      if (left.seed > right.seed) {
        return 1;
      }

      if (left.startAt.getTime() !== right.startAt.getTime()) {
        return left.startAt.getTime() - right.startAt.getTime();
      }

      return left.id.localeCompare(right.id);
    })
    .slice(offset, offset + pageSize)
    .map((activity) => activity.id);

  return rankedActivityIds;
}

export async function getActivityList(
  filters: ActivityFilters,
  options: { pageSize?: number; viewerProfileId?: string | null } = {},
): Promise<ActivityListResult> {
  const now = new Date();
  const pageSize = normalizeLimit(options.pageSize) ?? defaultActivityPageSize;

  if (
    filters.sort === "recommended" &&
    !hasExplicitActivityListFilters(filters)
  ) {
    return getRecommendedActivityList(
      filters,
      pageSize,
      now,
      options.viewerProfileId,
    );
  }

  return getOrderedActivityList(
    filters,
    pageSize,
    now,
    options.viewerProfileId,
  );
}

export async function getActivityFilterOptions() {
  const now = new Date();
  const cities = await prisma.activity.findMany({
    where: getVisibleActivityWhere({
      includeEnded: true,
      includePast: true,
      now,
    }),
    select: {
      city: true,
    },
    distinct: ["city"],
    orderBy: {
      city: "asc",
    },
    take: 50,
  });

  return {
    cities: cities
      .map((activity) => activity.city.trim())
      .filter(
        (city, index, cityList) => city && cityList.indexOf(city) === index,
      ),
  };
}
