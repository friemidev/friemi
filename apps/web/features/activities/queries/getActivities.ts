import { prisma } from "@/lib/prisma";
import type {
  ActivityStatus,
  ActivityVisibility,
  ParticipantStatus,
  Prisma,
} from "@prisma/client";
import type { ActivityCardViewModel } from "../types";
import type {
  ActivityFilters,
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
  const activities = await prisma.activity.findMany({
    where: {
      AND: [baseWhere, filterWhere],
    },
    orderBy: [
      { startAt: options.filters?.sort === "latest" ? "desc" : "asc" },
      { id: "asc" },
    ],
    take: normalizeLimit(options.limit),
    select: activityCardSelect,
  });

  return activities.map(getActivityCardViewModel);
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
      filters.type ||
      filters.timeState,
  );
}

function getActivityListWhere(
  filters: ActivityFilters,
  now: Date,
): Prisma.ActivityWhereInput {
  return {
    AND: [
      getVisibleActivityWhere({
        includeEnded: true,
        includePast: true,
        now,
      }),
      getActivityFilterWhere(filters),
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
): Promise<ActivityListResult> {
  const where = getActivityListWhere(filters, now);
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
    activities: activities.map(getActivityCardViewModel),
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
): Promise<ActivityListResult> {
  const baseWhere: Prisma.ActivityWhereInput = {
    AND: [
      getVisibleActivityWhere({
        includeEnded: true,
        includePast: true,
        now,
      }),
      getActivityFilterWhere(filters),
    ],
  };
  const bucketDefinitions: Array<{
    orderBy: Prisma.ActivityOrderByWithRelationInput[];
    timeState: ActivityTimeState;
  }> = [
    {
      timeState: "ONGOING",
      orderBy: [{ endAt: "asc" }, { startAt: "asc" }, { id: "asc" }],
    },
    {
      timeState: "UPCOMING",
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
    },
    {
      timeState: "ENDED",
      orderBy: [{ startAt: "desc" }, { id: "asc" }],
    },
  ];
  const bucketWheres = bucketDefinitions.map(({ timeState }) => ({
    AND: [baseWhere, getActivityTimeStateWhere(timeState, now)],
  }));
  const bucketCounts = await Promise.all(
    bucketWheres.map((where) => prisma.activity.count({ where })),
  );
  const totalCount = bucketCounts.reduce((total, count) => total + count, 0);
  const totalPages = getActivityTotalPages(totalCount, pageSize);
  const page = getActivityPage(filters.page, totalPages);
  let skipRemaining = (page - 1) * pageSize;
  let takeRemaining = pageSize;
  const activityChunks: ActivityQueryResult[][] = [];

  for (const [index, count] of bucketCounts.entries()) {
    if (takeRemaining <= 0) {
      break;
    }

    if (skipRemaining >= count) {
      skipRemaining -= count;
      continue;
    }

    const take = Math.min(takeRemaining, count - skipRemaining);
    const activities = await prisma.activity.findMany({
      where: bucketWheres[index],
      orderBy: bucketDefinitions[index].orderBy,
      skip: skipRemaining,
      take,
      select: activityCardSelect,
    });

    activityChunks.push(activities);
    takeRemaining -= take;
    skipRemaining = 0;
  }

  return {
    activities: activityChunks.flat().map(getActivityCardViewModel),
    page,
    pageSize,
    totalCount,
    totalPages,
  };
}

export async function getActivityList(
  filters: ActivityFilters,
  options: { pageSize?: number } = {},
): Promise<ActivityListResult> {
  const now = new Date();
  const pageSize = normalizeLimit(options.pageSize) ?? defaultActivityPageSize;

  if (filters.sort === "recommended" && !hasExplicitActivityListFilters(filters)) {
    return getRecommendedActivityList(filters, pageSize, now);
  }

  return getOrderedActivityList(filters, pageSize, now);
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
