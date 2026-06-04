import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { attachActivityFriendSignals } from "@/features/friends/queries/getActivityFriendSignals";
import { getViewerFriendIds } from "@/features/friends/queries/getViewerFriendIds";
import { attachActivityFavoriteStates } from "@/features/favorites/queries/getViewerActivityFavorite";
import { attachPublicEventFavoriteStates } from "@/features/favorites/queries/getViewerActivityFavorite";
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
const visibleActivityStatusSet = new Set<string>(visibleActivityStatuses);
const participantStatuses: ParticipantStatus[] = ["JOINED", "APPROVED"];
export const publicActivityVisibility: ActivityVisibility[] = ["PUBLIC"];
const coverTones: ActivityCardViewModel["coverTone"][] = [
  "moss",
  "clay",
  "sky",
];
const defaultActivityPageSize = 15;
const dailyRankingTimeZone = "Europe/Paris";
const dayInMs = 24 * 60 * 60 * 1000;
const freshOngoingWindowDays = 2;
const endingSoonWindowDays = 1;
const upcomingSoonWindowDays = 1;
const upcomingWeekWindowDays = 7;
const upcomingMonthWindowDays = 30;
const legacyPublicActivityIdPattern =
  /^(playinparis|sortiraparis|paris-opendata|paris_open_data|feverup)_/i;
const legacyPublicActivitySources = [
  "playinparis",
  "playinparis.com",
  "sortiraparis",
  "sortiraparis.com",
  "paris-opendata",
  "paris-opendata:que-faire-a-paris",
  "opendata.paris.fr",
  "feverup",
  "feverup.com",
];

function includesKnownPublicActivitySource(value: string | null | undefined) {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return false;
  }

  return legacyPublicActivitySources.some((knownSource) =>
    normalizedValue.includes(knownSource),
  );
}

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
  publicEventId: true,
  source: true,
  sourceUrl: true,
  externalSource: true,
  externalId: true,
  externalUrl: true,
  importedAt: true,
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

const publicEventCardSelect = {
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
  coverImageUrl: true,
  priceText: true,
  status: true,
  sourceUrl: true,
  externalSource: true,
  externalId: true,
  externalUrl: true,
  createdAt: true,
  _count: {
    select: {
      teams: {
        where: {
          status: {
            in: visibleArchivedActivityStatuses,
          },
          visibility: {
            in: publicActivityVisibility,
          },
          organizer: {
            status: "ACTIVE",
          },
        },
      },
    },
  },
} satisfies Prisma.PublicEventSelect;

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

type PublicEventQueryResult = Prisma.PublicEventGetPayload<{
  select: typeof publicEventCardSelect;
}>;

type RankedActivityCard = {
  card: ActivityCardViewModel;
  createdAt: Date;
};

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

function getVisiblePublicEventWhere(
  options: VisibleActivityWhereOptions = {},
): Prisma.PublicEventWhereInput {
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
    status: "SCHEDULED",
    visibility: {
      in: publicActivityVisibility,
    },
  };
}

function shouldIncludePublicEvents(filters: ActivityFilters | undefined) {
  if (!filters) {
    return true;
  }

  return !filters.type && filters.relation === "ALL";
}

function getPublicEventFilterWhere(
  filters: ActivityFilters | undefined,
): Prisma.PublicEventWhereInput {
  if (!filters || !shouldIncludePublicEvents(filters)) {
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
              {
                address: {
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
  };
}

function getPublicEventTimeStateWhere(
  timeState: ActivityTimeState,
  now = new Date(),
): Prisma.PublicEventWhereInput {
  if (timeState === "UPCOMING") {
    return {
      startAt: {
        gt: now,
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
    };
  }

  return {
    OR: [
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

export function isLegacyActivityInfoSource(activity: {
  id?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  externalSource?: string | null;
  externalId?: string | null;
  externalUrl?: string | null;
  importedAt?: Date | string | null;
  sourcePayload?: unknown;
}) {
  const sourceLooksPublic =
    Boolean(activity.id && legacyPublicActivityIdPattern.test(activity.id)) ||
    includesKnownPublicActivitySource(activity.source) ||
    includesKnownPublicActivitySource(activity.sourceUrl) ||
    includesKnownPublicActivitySource(activity.externalUrl);

  return Boolean(
    sourceLooksPublic ||
    activity.externalSource ||
    activity.externalId ||
    activity.externalUrl ||
    activity.importedAt ||
    activity.sourcePayload,
  );
}

function getActivityInfoDedupeKeys(item: {
  title: string;
  city: string;
  address: string;
  startAt: Date;
  sourceUrl?: string | null;
  externalSource?: string | null;
  externalId?: string | null;
  externalUrl?: string | null;
}) {
  const keys: string[] = [];

  if (item.externalSource && item.externalId) {
    keys.push(`external:${item.externalSource}:${item.externalId}`);
  }

  if (item.externalUrl) {
    keys.push(`url:${item.externalUrl}`);
  }

  if (item.sourceUrl) {
    keys.push(`url:${item.sourceUrl}`);
  }

  keys.push(
    `semantic:${item.title.trim().toLowerCase()}:${item.city
      .trim()
      .toLowerCase()}:${item.address.trim().toLowerCase()}:${item.startAt.toISOString()}`,
  );

  return keys;
}

function filterDuplicateLegacyActivityInfoRows(
  activities: ActivityQueryResult[],
  publicEvents: PublicEventQueryResult[],
) {
  if (activities.length === 0 || publicEvents.length === 0) {
    return activities;
  }

  const publicEventKeys = new Set(
    publicEvents.flatMap((publicEvent) =>
      getActivityInfoDedupeKeys(publicEvent),
    ),
  );

  return activities.filter((activity) => {
    if (!isLegacyActivityInfoSource(activity)) {
      return true;
    }

    return !getActivityInfoDedupeKeys(activity).some((key) =>
      publicEventKeys.has(key),
    );
  });
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
  const isActivityInfo = isLegacyActivityInfoSource(activity);

  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    type: isActivityInfo ? "PUBLIC_EVENT" : activity.type,
    category: activity.category,
    city: activity.city,
    address: activity.address,
    latitude: activity.latitude,
    longitude: activity.longitude,
    startAt: activity.startAt.toISOString(),
    endAt: activity.endAt?.toISOString() ?? null,
    capacity: isActivityInfo ? 0 : activity.capacity,
    coverImageUrl: activity.coverImageUrl,
    participantCount: isActivityInfo ? 0 : activity._count.participants,
    priceText: activity.priceText,
    status: activity.status,
    coverTone: getActivityCoverTone(activity.id),
    isActivityInfo,
    officialUrl: activity.externalUrl ?? activity.sourceUrl,
    publicEventId: activity.publicEventId,
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

function getActivityRankedCardViewModel(
  activity: ActivityQueryResult,
): RankedActivityCard {
  return {
    card: getActivityCardViewModel(activity),
    createdAt: activity.createdAt,
  };
}

function getPublicEventActivityCardViewModel(
  publicEvent: PublicEventQueryResult,
): RankedActivityCard {
  return {
    card: {
      id: publicEvent.id,
      publicEventId: publicEvent.id,
      title: publicEvent.title,
      description: publicEvent.description,
      type: "PUBLIC_EVENT",
      category: publicEvent.category,
      city: publicEvent.city,
      address: publicEvent.address,
      latitude: publicEvent.latitude,
      longitude: publicEvent.longitude,
      startAt: publicEvent.startAt.toISOString(),
      endAt: publicEvent.endAt?.toISOString() ?? null,
      capacity: 0,
      coverImageUrl: publicEvent.coverImageUrl,
      participantCount: publicEvent._count.teams,
      priceText: publicEvent.priceText ?? "",
      status: "RECRUITING",
      coverTone: getActivityCoverTone(publicEvent.id),
      merchant: null,
      friendSignal: null,
      isFavorited: false,
    },
    createdAt: publicEvent.createdAt,
  };
}

async function attachJoinableActivityStates(
  rankedActivities: RankedActivityCard[],
  viewerProfileId: string | null | undefined,
): Promise<ActivityCardViewModel[]> {
  const cards = rankedActivities.map((rankedActivity) => rankedActivity.card);
  const publicEventActivities = cards.filter(
    (activity) => activity.type === "PUBLIC_EVENT" && Boolean(activity.publicEventId),
  );
  const teamActivities = cards.filter(
    (activity) => activity.type !== "PUBLIC_EVENT",
  );
  const [publicEventActivitiesWithState, teamActivitiesWithState] =
    await Promise.all([
      attachPublicEventFavoriteStates(
        publicEventActivities.map((activity) => ({
          id: activity.publicEventId ?? activity.id,
          title: activity.title,
          description: activity.description,
          category: activity.category,
          city: activity.city,
          address: activity.address,
          latitude: activity.latitude,
          longitude: activity.longitude,
          startAt: activity.startAt,
          endAt: activity.endAt,
          priceType: "FREE",
          priceText: activity.priceText,
          coverImageUrl: activity.coverImageUrl,
          officialUrl: activity.officialUrl ?? null,
          status: "SCHEDULED",
          teamCount: activity.participantCount,
          isFavorited: activity.isFavorited,
        })),
        viewerProfileId,
      ),
      attachActivityFavoriteStates(
        await attachActivityFriendSignals(teamActivities, viewerProfileId),
        viewerProfileId,
      ),
    ]);
  const teamActivityById = new Map(
    teamActivitiesWithState.map((activity) => [activity.id, activity]),
  );
  const publicEventActivityById = new Map(
    publicEventActivitiesWithState.map((activity) => [activity.id, activity]),
  );

  return rankedActivities.map((rankedActivity) => {
    if (
      rankedActivity.card.type === "PUBLIC_EVENT" &&
      rankedActivity.card.publicEventId
    ) {
      const publicEventId = rankedActivity.card.publicEventId;

      return {
        ...rankedActivity.card,
        isFavorited: publicEventActivityById.get(publicEventId)?.isFavorited,
      };
    }

    return teamActivityById.get(rankedActivity.card.id) ?? rankedActivity.card;
  });
}

function compareRankedActivitiesByStartAt(
  left: RankedActivityCard,
  right: RankedActivityCard,
  direction: "asc" | "desc",
) {
  const leftStartAt = new Date(left.card.startAt).getTime();
  const rightStartAt = new Date(right.card.startAt).getTime();
  const timeDiff =
    direction === "asc"
      ? leftStartAt - rightStartAt
      : rightStartAt - leftStartAt;

  return timeDiff || left.card.id.localeCompare(right.card.id);
}

function compareRankedActivities(
  filters: Pick<ActivityFilters, "sort" | "timeState"> | undefined,
  left: RankedActivityCard,
  right: RankedActivityCard,
) {
  if (filters?.sort === "recentlyAdded") {
    return (
      right.createdAt.getTime() - left.createdAt.getTime() ||
      left.card.id.localeCompare(right.card.id)
    );
  }

  if (filters?.sort === "latest" || filters?.timeState === "ENDED") {
    return compareRankedActivitiesByStartAt(left, right, "desc");
  }

  return compareRankedActivitiesByStartAt(left, right, "asc");
}

export async function getActivities(
  options: GetActivitiesOptions = {},
): Promise<ActivityCardViewModel[]> {
  const now = new Date();
  const limit = normalizeLimit(options.limit);
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
    take: limit,
    select: activityCardSelect,
  });
  const publicEvents = shouldIncludePublicEvents(options.filters)
    ? await prisma.publicEvent.findMany({
        where: {
          AND: [
            getVisiblePublicEventWhere({
              includePast: options.includePast,
              now,
            }),
            getPublicEventFilterWhere(options.filters),
          ],
        },
        orderBy:
          options.filters?.sort === "recentlyAdded"
            ? [{ createdAt: "desc" }, { id: "asc" }]
            : [
                {
                  startAt: options.filters?.sort === "latest" ? "desc" : "asc",
                },
                { id: "asc" },
              ],
        take: limit,
        select: publicEventCardSelect,
      })
    : [];
  const rankedActivities = [
    ...filterDuplicateLegacyActivityInfoRows(activities, publicEvents).map(
      getActivityRankedCardViewModel,
    ),
    ...publicEvents.map(getPublicEventActivityCardViewModel),
  ]
    .sort((left, right) =>
      compareRankedActivities(options.filters, left, right),
    )
    .slice(0, limit);

  return attachJoinableActivityStates(
    rankedActivities,
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

function getPublicEventListOrderBy(
  filters: ActivityFilters,
  timeState?: ActivityTimeState,
): Prisma.PublicEventOrderByWithRelationInput[] {
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

function getPublicEventListWhere(
  filters: ActivityFilters,
  now: Date,
): Prisma.PublicEventWhereInput | null {
  if (!shouldIncludePublicEvents(filters)) {
    return null;
  }

  return {
    AND: [
      getVisiblePublicEventWhere({
        includeEnded: true,
        includePast: true,
        now,
      }),
      getPublicEventFilterWhere(filters),
      ...(filters.timeState
        ? [getPublicEventTimeStateWhere(filters.timeState, now)]
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
  const publicEventWhere = getPublicEventListWhere(filters, now);
  const [activityTotalCount, publicEventTotalCount] = await Promise.all([
    prisma.activity.count({ where }),
    publicEventWhere
      ? prisma.publicEvent.count({ where: publicEventWhere })
      : 0,
  ]);
  const totalCount = activityTotalCount + publicEventTotalCount;
  const totalPages = getActivityTotalPages(totalCount, pageSize);
  const page = getActivityPage(filters.page, totalPages);
  const readLimit = page * pageSize;
  const [activities, publicEvents] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: getActivityListOrderBy(filters, filters.timeState),
      take: readLimit,
      select: activityCardSelect,
    }),
    publicEventWhere
      ? prisma.publicEvent.findMany({
          where: publicEventWhere,
          orderBy: getPublicEventListOrderBy(filters, filters.timeState),
          take: readLimit,
          select: publicEventCardSelect,
        })
      : [],
  ]);
  const rankedActivities = [
    ...filterDuplicateLegacyActivityInfoRows(activities, publicEvents).map(
      getActivityRankedCardViewModel,
    ),
    ...publicEvents.map(getPublicEventActivityCardViewModel),
  ]
    .sort((left, right) => compareRankedActivities(filters, left, right))
    .slice((page - 1) * pageSize, page * pageSize);

  return {
    activities: await attachJoinableActivityStates(
      rankedActivities,
      viewerProfileId,
    ),
    page,
    pageSize,
    totalCount,
    totalPages,
  };
}

function getRecommendedActivityRank(
  rankedActivity: RankedActivityCard,
  now: Date,
  dailySeed: string,
) {
  const startAt = new Date(rankedActivity.card.startAt);
  const endAt = rankedActivity.card.endAt
    ? new Date(rankedActivity.card.endAt)
    : null;
  const isActive = visibleActivityStatusSet.has(rankedActivity.card.status);
  const freshOngoingBoundary = addDays(now, -freshOngoingWindowDays);
  const endingSoonBoundary = addDays(now, endingSoonWindowDays);
  const upcomingSoonBoundary = addDays(now, upcomingSoonWindowDays);
  const upcomingWeekBoundary = addDays(now, upcomingWeekWindowDays);
  const upcomingMonthBoundary = addDays(now, upcomingMonthWindowDays);
  const isFreshOngoing =
    isActive &&
    startAt <= now &&
    endAt !== null &&
    endAt > now &&
    startAt >= freshOngoingBoundary;
  const isUpcoming = isActive && startAt > now;
  const isOngoing = isActive && startAt <= now && endAt !== null && endAt > now;
  const recommendationGroup = isFreshOngoing
    ? 0
    : isUpcoming
      ? 1
      : isOngoing
        ? 2
        : 3;
  let proximityGroup = 0;

  if (isFreshOngoing) {
    proximityGroup = endAt !== null && endAt <= endingSoonBoundary ? 0 : 1;
  } else if (isUpcoming) {
    proximityGroup =
      startAt <= upcomingSoonBoundary
        ? 0
        : startAt <= upcomingWeekBoundary
          ? 1
          : startAt <= upcomingMonthBoundary
            ? 2
            : 3;
  }

  return {
    id: rankedActivity.card.id,
    proximityGroup,
    recommendationGroup,
    seed: createHash("md5")
      .update(
        `${dailySeed}:${rankedActivity.card.type}:${rankedActivity.card.id}`,
      )
      .digest("hex"),
    startAt,
  };
}

function compareRecommendedRankedActivities(
  now: Date,
  dailySeed: string,
  left: RankedActivityCard,
  right: RankedActivityCard,
) {
  const leftRank = getRecommendedActivityRank(left, now, dailySeed);
  const rightRank = getRecommendedActivityRank(right, now, dailySeed);

  if (leftRank.recommendationGroup !== rightRank.recommendationGroup) {
    return leftRank.recommendationGroup - rightRank.recommendationGroup;
  }

  if (leftRank.proximityGroup !== rightRank.proximityGroup) {
    return leftRank.proximityGroup - rightRank.proximityGroup;
  }

  if (leftRank.seed < rightRank.seed) {
    return -1;
  }

  if (leftRank.seed > rightRank.seed) {
    return 1;
  }

  if (leftRank.startAt.getTime() !== rightRank.startAt.getTime()) {
    return leftRank.startAt.getTime() - rightRank.startAt.getTime();
  }

  return leftRank.id.localeCompare(rightRank.id);
}

async function getRecommendedActivityList(
  filters: ActivityFilters,
  pageSize: number,
  now: Date,
  viewerProfileId: string | null | undefined,
): Promise<ActivityListResult> {
  const where = await getActivityListWhere(filters, now, viewerProfileId);
  const publicEventWhere = getPublicEventListWhere(filters, now);
  const [activityTotalCount, publicEventTotalCount] = await Promise.all([
    prisma.activity.count({ where }),
    publicEventWhere
      ? prisma.publicEvent.count({ where: publicEventWhere })
      : 0,
  ]);
  const totalCount = activityTotalCount + publicEventTotalCount;
  const totalPages = getActivityTotalPages(totalCount, pageSize);
  const page = getActivityPage(filters.page, totalPages);

  if (totalCount === 0) {
    return {
      activities: [],
      page,
      pageSize,
      totalCount,
      totalPages,
    };
  }

  const [activities, publicEvents] = await Promise.all([
    prisma.activity.findMany({
      where,
      select: activityCardSelect,
    }),
    publicEventWhere
      ? prisma.publicEvent.findMany({
          where: publicEventWhere,
          select: publicEventCardSelect,
        })
      : [],
  ]);
  const dailySeed = getDailyRankingSeed(now);
  const rankedActivities = [
    ...filterDuplicateLegacyActivityInfoRows(activities, publicEvents).map(
      getActivityRankedCardViewModel,
    ),
    ...publicEvents.map(getPublicEventActivityCardViewModel),
  ]
    .sort((left, right) =>
      compareRecommendedRankedActivities(now, dailySeed, left, right),
    )
    .slice((page - 1) * pageSize, page * pageSize);

  return {
    activities: await attachJoinableActivityStates(
      rankedActivities,
      viewerProfileId,
    ),
    page,
    pageSize,
    totalCount,
    totalPages,
  };
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
  const [activityCities, publicEventCities] = await Promise.all([
    prisma.activity.findMany({
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
    }),
    prisma.publicEvent.findMany({
      where: getVisiblePublicEventWhere({
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
    }),
  ]);

  return {
    cities: [...activityCities, ...publicEventCities]
      .map((item) => item.city.trim())
      .filter(
        (city, index, cityList) => city && cityList.indexOf(city) === index,
      ),
  };
}
