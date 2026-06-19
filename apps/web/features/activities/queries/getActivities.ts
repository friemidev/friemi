import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createActionPerformanceTracker } from "@/lib/performance";
import { getActivityFriendSignalMap } from "@/features/friends/queries/getActivityFriendSignals";
import { getViewerFriendIds } from "@/features/friends/queries/getViewerFriendIds";
import { attachActivityFavoriteStates } from "@/features/favorites/queries/getViewerActivityFavorite";
import { attachPublicEventFavoriteStates } from "@/features/favorites/queries/getViewerActivityFavorite";
import { applyOrganizerParticipationDefaults } from "./applyOrganizerParticipationDefaults";
import { Prisma } from "@prisma/client";
import type {
  ActivityStatus,
  ActivityVisibility,
  ParticipantStatus,
} from "@prisma/client";
import type { ActivityCardViewModel } from "../types";
import type {
  ActivityDateRange,
  ActivityFilters,
  ActivityRelationFilter,
  ActivityTimeState,
} from "../utils/activityFilters";

export const visibleActivityStatuses: ActivityStatus[] = [
  "OPEN",
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
const parisTimeZone = "Europe/Paris";
const dayInMs = 24 * 60 * 60 * 1000;
const freshOngoingWindowDays = 2;
const endingSoonWindowDays = 1;
const upcomingSoonWindowDays = 1;
const upcomingWeekWindowDays = 7;
const upcomingMonthWindowDays = 30;
const legacyPublicActivityIdPattern =
  /^(playinparis|sortiraparis|paris-opendata|paris_open_data|feverup)_/i;
const legacyPublicActivityIdPrefixes = [
  "playinparis_",
  "sortiraparis_",
  "paris-opendata_",
  "paris_open_data_",
  "feverup_",
];
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

function getNullableStringContainsWhere(
  field: "source" | "sourceUrl" | "externalUrl",
  source: string,
): Prisma.ActivityWhereInput {
  return {
    AND: [
      {
        [field]: {
          not: null,
        },
      },
      {
        [field]: {
          contains: source,
          mode: "insensitive",
        },
      },
    ],
  };
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
  ticketUrl: true,
  ticketLabel: true,
  status: true,
  visibility: true,
  organizerId: true,
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
  participants: {
    where: {
      status: {
        in: participantStatuses,
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
        in: participantStatuses,
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
      favorites: true,
      participants: {
        where: {
          status: {
            in: participantStatuses,
          },
        },
      },
      guestParticipants: {
        where: {
          linkedParticipantId: null,
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
  ticketUrl: true,
  ticketLabel: true,
  status: true,
  sourceUrl: true,
  externalSource: true,
  externalId: true,
  externalUrl: true,
  createdAt: true,
  _count: {
    select: {
      favorites: true,
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

const homeActivityPreviewSelect = {
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
  coverImageUrl: true,
  priceText: true,
  ticketUrl: true,
  ticketLabel: true,
  status: true,
  visibility: true,
  publicEventId: true,
  source: true,
  sourceUrl: true,
  externalSource: true,
  externalId: true,
  externalUrl: true,
  importedAt: true,
  createdAt: true,
} satisfies Prisma.ActivitySelect;

const homePublicEventPreviewSelect = {
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
  ticketUrl: true,
  ticketLabel: true,
  status: true,
  sourceUrl: true,
  externalUrl: true,
  createdAt: true,
} satisfies Prisma.PublicEventSelect;

type GetActivitiesOptions = {
  filters?: ActivityFilters;
  includePast?: boolean;
  limit?: number;
  viewerProfileId?: string | null;
};

type GetActivityListOptions = {
  pageSize?: number;
  publicInfoOnly?: boolean;
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
  visibility?: ActivityVisibility[] | null;
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

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const offsetName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = offsetName?.match(
    /^GMT(?:(?<sign>[+-])(?<hours>\d{1,2})(?::(?<minutes>\d{2}))?)?$/,
  );

  if (!match?.groups?.sign) {
    return 0;
  }

  const sign = match.groups.sign === "+" ? 1 : -1;
  const hours = Number(match.groups.hours ?? 0);
  const minutes = Number(match.groups.minutes ?? 0);

  return sign * (hours * 60 + minutes);
}

function getDatePart(parts: Intl.DateTimeFormatPart[], type: string) {
  return parts.find((part) => part.type === type)?.value ?? "";
}

function createDateInTimeZone(
  timeZone: string,
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0,
) {
  const utcGuess = new Date(
    Date.UTC(year, monthIndex, day, hour, minute, 0, 0),
  );
  const offsetMinutes = getTimeZoneOffsetMinutes(utcGuess, timeZone);

  return new Date(utcGuess.getTime() - offsetMinutes * 60_000);
}

function getTimeZoneDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    day: Number(getDatePart(parts, "day")),
    month: Number(getDatePart(parts, "month")),
    year: Number(getDatePart(parts, "year")),
  };
}

function getTimeZoneWeekdayIndex(date: Date, timeZone: string) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);

  switch (weekday) {
    case "Mon":
      return 1;
    case "Tue":
      return 2;
    case "Wed":
      return 3;
    case "Thu":
      return 4;
    case "Fri":
      return 5;
    case "Sat":
      return 6;
    default:
      return 0;
  }
}

function addMonthsInTimeZone(
  year: number,
  monthIndex: number,
  monthOffset: number,
) {
  const totalMonths = monthIndex + monthOffset;

  return {
    monthIndex: ((totalMonths % 12) + 12) % 12,
    year: year + Math.floor(totalMonths / 12),
  };
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

type HomeActivityPreviewQueryResult = Prisma.ActivityGetPayload<{
  select: typeof homeActivityPreviewSelect;
}>;

type HomePublicEventPreviewQueryResult = Prisma.PublicEventGetPayload<{
  select: typeof homePublicEventPreviewSelect;
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
    ...(options.visibility === null
      ? {}
      : {
          visibility: {
            in: options.visibility ?? publicActivityVisibility,
          },
        }),
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

export function getLegacyPublicActivityInfoWhere(): Prisma.ActivityWhereInput {
  return {
    AND: [
      {
        publicEventId: null,
      },
      {
        OR: [
          ...legacyPublicActivityIdPrefixes.map((prefix) => ({
            id: {
              startsWith: prefix,
            },
          })),
          ...legacyPublicActivitySources.flatMap((source) => [
            getNullableStringContainsWhere("source", source),
            getNullableStringContainsWhere("sourceUrl", source),
            getNullableStringContainsWhere("externalUrl", source),
          ]),
          {
            externalSource: {
              not: null,
            },
          },
          {
            externalId: {
              not: null,
            },
          },
          {
            externalUrl: {
              not: null,
            },
          },
          {
            importedAt: {
              not: null,
            },
          },
        ],
      },
    ],
  };
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
  publicEventId?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  externalSource?: string | null;
  externalId?: string | null;
  externalUrl?: string | null;
  importedAt?: Date | string | null;
  sourcePayload?: unknown;
}) {
  if (activity.publicEventId) {
    return false;
  }

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
  startAt: Date | string;
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
      .toLowerCase()}:${item.address.trim().toLowerCase()}:${toIsoString(item.startAt)}`,
  );

  return keys;
}

function filterDuplicateLegacyActivityInfoRows<
  TActivity extends {
    id?: string | null;
    publicEventId?: string | null;
    source?: string | null;
    sourceUrl?: string | null;
    externalSource?: string | null;
    externalId?: string | null;
    externalUrl?: string | null;
    importedAt?: Date | string | null;
    title: string;
    city: string;
    address: string;
    startAt: Date | string;
  },
  TPublicEvent extends {
    sourceUrl?: string | null;
    externalSource?: string | null;
    externalId?: string | null;
    externalUrl?: string | null;
    title: string;
    city: string;
    address: string;
    startAt: Date | string;
  },
>(activities: TActivity[], publicEvents: TPublicEvent[]) {
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

function getActivityDateRangeBounds(
  dateRange: ActivityDateRange,
  now = new Date(),
) {
  const { year, month, day } = getTimeZoneDateParts(now, parisTimeZone);
  const todayStart = createDateInTimeZone(parisTimeZone, year, month - 1, day);
  const tomorrowStart = addDays(todayStart, 1);

  switch (dateRange) {
    case "TODAY":
      return { end: tomorrowStart, start: todayStart };
    case "TOMORROW":
      return { end: addDays(todayStart, 2), start: tomorrowStart };
    case "NEXT_3_DAYS":
      return { end: addDays(todayStart, 3), start: todayStart };
    case "THIS_WEEK": {
      const weekday = getTimeZoneWeekdayIndex(now, parisTimeZone);
      const daysFromWeekStart = weekday === 0 ? 6 : weekday - 1;
      const weekStart = addDays(todayStart, -daysFromWeekStart);

      return { end: addDays(weekStart, 7), start: weekStart };
    }
    case "NEXT_WEEK": {
      const weekday = getTimeZoneWeekdayIndex(now, parisTimeZone);
      const daysFromWeekStart = weekday === 0 ? 6 : weekday - 1;
      const nextWeekStart = addDays(todayStart, 7 - daysFromWeekStart);

      return { end: addDays(nextWeekStart, 7), start: nextWeekStart };
    }
    case "THIS_MONTH": {
      const monthStart = createDateInTimeZone(
        parisTimeZone,
        year,
        month - 1,
        1,
      );
      const nextMonth = addMonthsInTimeZone(year, month - 1, 1);
      const nextMonthStart = createDateInTimeZone(
        parisTimeZone,
        nextMonth.year,
        nextMonth.monthIndex,
        1,
      );

      return { end: nextMonthStart, start: monthStart };
    }
    case "NEXT_MONTH": {
      const nextMonth = addMonthsInTimeZone(year, month - 1, 1);
      const monthAfterNext = addMonthsInTimeZone(year, month - 1, 2);
      const nextMonthStart = createDateInTimeZone(
        parisTimeZone,
        nextMonth.year,
        nextMonth.monthIndex,
        1,
      );
      const monthAfterNextStart = createDateInTimeZone(
        parisTimeZone,
        monthAfterNext.year,
        monthAfterNext.monthIndex,
        1,
      );

      return { end: monthAfterNextStart, start: nextMonthStart };
    }
  }
}

function getActivityDateRangeWhere(
  dateRange: ActivityDateRange,
  now = new Date(),
): Prisma.ActivityWhereInput {
  const { end, start } = getActivityDateRangeBounds(dateRange, now);

  return {
    startAt: {
      gte: start,
      lt: end,
    },
  };
}

function getPublicEventDateRangeWhere(
  dateRange: ActivityDateRange,
  now = new Date(),
): Prisma.PublicEventWhereInput {
  const { end, start } = getActivityDateRangeBounds(dateRange, now);

  return {
    startAt: {
      gte: start,
      lt: end,
    },
  };
}

export function getActivityCardViewModel(
  activity: ActivityQueryResult,
): ActivityCardViewModel {
  const isActivityInfo = isLegacyActivityInfoSource(activity);
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
      ].slice(0, 5);

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
    startAt: toIsoString(activity.startAt) ?? new Date().toISOString(),
    endAt: toIsoString(activity.endAt),
    capacity: isActivityInfo ? 0 : activity.capacity,
    coverImageUrl: activity.coverImageUrl,
    favoriteCount: activity._count.favorites,
    participantCount,
    priceText: activity.priceText,
    ticketUrl: activity.ticketUrl,
    ticketLabel: activity.ticketLabel,
    status: activity.status,
    visibility: activity.visibility,
    coverTone: getActivityCoverTone(activity.id),
    isActivityInfo,
    officialUrl: activity.externalUrl ?? activity.sourceUrl,
    publicEventId: activity.publicEventId,
    organizerId: activity.organizerId,
    participantPreview,
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
      startAt: toIsoString(publicEvent.startAt) ?? new Date().toISOString(),
      endAt: toIsoString(publicEvent.endAt),
      capacity: 0,
      coverImageUrl: publicEvent.coverImageUrl,
      favoriteCount: publicEvent._count.favorites,
      participantCount: publicEvent._count.teams,
      priceText: publicEvent.priceText ?? "",
      ticketUrl: publicEvent.ticketUrl,
      ticketLabel: publicEvent.ticketLabel,
      status: "RECRUITING",
      visibility: "PUBLIC",
      coverTone: getActivityCoverTone(publicEvent.id),
      isActivityInfo: true,
      officialUrl: publicEvent.externalUrl ?? publicEvent.sourceUrl,
      merchant: null,
      friendSignal: null,
      isFavorited: false,
    },
    createdAt: publicEvent.createdAt,
  };
}

function getHomeActivityPreviewCardViewModel(
  activity: HomeActivityPreviewQueryResult,
): RankedActivityCard {
  return {
    card: {
      id: activity.id,
      publicEventId: activity.publicEventId,
      title: activity.title,
      description: activity.description,
      type: "PUBLIC_EVENT",
      category: activity.category,
      city: activity.city,
      address: activity.address,
      latitude: activity.latitude,
      longitude: activity.longitude,
      startAt: toIsoString(activity.startAt) ?? new Date().toISOString(),
      endAt: toIsoString(activity.endAt),
      capacity: 0,
      coverImageUrl: activity.coverImageUrl,
      favoriteCount: 0,
      participantCount: 0,
      priceText: activity.priceText,
      ticketUrl: activity.ticketUrl,
      ticketLabel: activity.ticketLabel,
      status: activity.status,
      visibility: activity.visibility,
      coverTone: getActivityCoverTone(activity.id),
      isActivityInfo: true,
      officialUrl: activity.externalUrl ?? activity.sourceUrl,
      merchant: null,
      friendSignal: null,
      isFavorited: false,
    },
    createdAt: activity.createdAt,
  };
}

function getHomePublicEventPreviewCardViewModel(
  publicEvent: HomePublicEventPreviewQueryResult,
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
      startAt: toIsoString(publicEvent.startAt) ?? new Date().toISOString(),
      endAt: toIsoString(publicEvent.endAt),
      capacity: 0,
      coverImageUrl: publicEvent.coverImageUrl,
      favoriteCount: 0,
      participantCount: 0,
      priceText: publicEvent.priceText ?? "",
      ticketUrl: publicEvent.ticketUrl,
      ticketLabel: publicEvent.ticketLabel,
      status: "RECRUITING",
      visibility: "PUBLIC",
      coverTone: getActivityCoverTone(publicEvent.id),
      isActivityInfo: true,
      officialUrl: publicEvent.externalUrl ?? publicEvent.sourceUrl,
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
    (activity) =>
      activity.type === "PUBLIC_EVENT" && Boolean(activity.publicEventId),
  );
  const legacyActivityInfoActivities = cards.filter(
    (activity) => activity.type === "PUBLIC_EVENT" && !activity.publicEventId,
  );
  const teamActivities = cards.filter(
    (activity) => activity.type !== "PUBLIC_EVENT",
  );
  const viewerFriendIds =
    viewerProfileId && teamActivities.length > 0
      ? await getViewerFriendIds(viewerProfileId)
      : [];
  const [
    publicEventActivitiesWithState,
    legacyActivityInfoActivitiesWithState,
    teamActivitiesWithState,
    teamActivitySignalMap,
    viewerParticipationByActivityId,
  ] =
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
          ticketUrl: activity.ticketUrl ?? null,
          ticketLabel: activity.ticketLabel ?? null,
          status: "SCHEDULED",
          favoriteCount: activity.favoriteCount,
          teamCount: activity.participantCount,
          isFavorited: activity.isFavorited,
        })),
        viewerProfileId,
      ),
      attachActivityFavoriteStates(
        legacyActivityInfoActivities,
        viewerProfileId,
      ),
      attachActivityFavoriteStates(teamActivities, viewerProfileId),
      getActivityFriendSignalMap(
        teamActivities.map((activity) => activity.id),
        viewerProfileId,
        viewerFriendIds,
      ),
      viewerProfileId && teamActivities.length > 0
        ? prisma.activityParticipant.findMany({
            where: {
              userProfileId: viewerProfileId,
              activityId: {
                in: teamActivities.map((activity) => activity.id),
              },
            },
            select: {
              activityId: true,
              status: true,
            },
            orderBy: [{ joinedAt: "desc" }, { id: "desc" }],
          }).then(
            (participations) =>
              new Map(
                participations.map((participation) => [
                  participation.activityId,
                  participation.status,
                ]),
              ),
          )
        : Promise.resolve(
            new Map<string, ActivityCardViewModel["viewerParticipationStatus"]>(),
          ),
    ]);
  const teamActivityById = new Map(
    teamActivitiesWithState.map((activity) => [
      activity.id,
      {
        ...activity,
        friendSignal: teamActivitySignalMap.get(activity.id) ?? null,
        viewerParticipationStatus:
          viewerParticipationByActivityId.get(activity.id) ?? null,
      },
    ]),
  );
  const publicEventActivityById = new Map(
    publicEventActivitiesWithState.map((activity) => [activity.id, activity]),
  );
  const legacyActivityInfoActivityById = new Map(
    legacyActivityInfoActivitiesWithState.map((activity) => [
      activity.id,
      activity,
    ]),
  );

  const activitiesWithViewerState = rankedActivities.map((rankedActivity) => {
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

    if (rankedActivity.card.type === "PUBLIC_EVENT") {
      return (
        legacyActivityInfoActivityById.get(rankedActivity.card.id) ??
        rankedActivity.card
      );
    }

    return teamActivityById.get(rankedActivity.card.id) ?? rankedActivity.card;
  });

  return applyOrganizerParticipationDefaults(activitiesWithViewerState);
}

export async function attachActivityCardViewerStates(
  activities: ActivityCardViewModel[],
  viewerProfileId: string | null | undefined,
) {
  return attachJoinableActivityStates(
    activities.map((activity) => ({
      card: activity,
      createdAt: new Date(activity.startAt),
    })),
    viewerProfileId,
  );
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
  const [activities, publicEvents] = await Promise.all([
    prisma.activity.findMany({
      where: {
        AND: [baseWhere, filterWhere, relationWhere],
      },
      orderBy,
      take: limit,
      select: activityCardSelect,
    }),
    shouldIncludePublicEvents(options.filters)
      ? prisma.publicEvent.findMany({
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
                    startAt:
                      options.filters?.sort === "latest" ? "desc" : "asc",
                  },
                  { id: "asc" },
                ],
          take: limit,
          select: publicEventCardSelect,
        })
      : Promise.resolve([]),
  ]);
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

export async function getUpcomingHomeActivities({
  limit = 8,
}: {
  limit?: number;
} = {}): Promise<ActivityCardViewModel[]> {
  const now = new Date();
  const safeLimit = normalizeLimit(limit) ?? 8;
  const upcomingActivityWhere: Prisma.ActivityWhereInput = {
    AND: [
      getVisibleActivityWhere({ now }),
      getActivityTimeStateWhere("UPCOMING", now),
      getLegacyPublicActivityInfoWhere(),
    ],
  };
  const upcomingPublicEventWhere: Prisma.PublicEventWhereInput = {
    AND: [
      getVisiblePublicEventWhere({ now }),
      getPublicEventTimeStateWhere("UPCOMING", now),
    ],
  };
  const [activities, publicEvents] = await Promise.all([
    prisma.activity.findMany({
      where: upcomingActivityWhere,
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
      take: safeLimit,
      select: homeActivityPreviewSelect,
    }),
    prisma.publicEvent.findMany({
      where: upcomingPublicEventWhere,
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
      take: safeLimit,
      select: homePublicEventPreviewSelect,
    }),
  ]);
  const rankedActivities = [
    ...filterDuplicateLegacyActivityInfoRows(activities, publicEvents).map(
      getHomeActivityPreviewCardViewModel,
    ),
    ...publicEvents.map(getHomePublicEventPreviewCardViewModel),
  ]
    .sort((left, right) =>
      compareRankedActivities({ sort: "recommended" }, left, right),
    )
    .slice(0, safeLimit);

  return rankedActivities.map((activity) => activity.card);
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
      filters.dateRange ||
      filters.relation !== "ALL" ||
      filters.type ||
      filters.timeState,
  );
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * dayInMs);
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
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
      ...(filters.dateRange
        ? [getActivityDateRangeWhere(filters.dateRange, now)]
        : []),
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
      ...(filters.dateRange
        ? [getPublicEventDateRangeWhere(filters.dateRange, now)]
        : []),
      ...(filters.timeState
        ? [getPublicEventTimeStateWhere(filters.timeState, now)]
        : []),
    ],
  };
}

function getPublicInfoActivityListWhere(
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
      getLegacyPublicActivityInfoWhere(),
      getActivityFilterWhere(filters),
      ...(filters.dateRange
        ? [getActivityDateRangeWhere(filters.dateRange, now)]
        : []),
      ...(filters.timeState
        ? [getActivityTimeStateWhere(filters.timeState, now)]
        : []),
    ],
  };
}

function getPublicInfoPublicEventListWhere(
  filters: ActivityFilters,
  now: Date,
): Prisma.PublicEventWhereInput {
  return {
    AND: [
      getVisiblePublicEventWhere({
        includeEnded: true,
        includePast: true,
        now,
      }),
      getPublicEventFilterWhere(filters),
      ...(filters.dateRange
        ? [getPublicEventDateRangeWhere(filters.dateRange, now)]
        : []),
      ...(filters.timeState
        ? [getPublicEventTimeStateWhere(filters.timeState, now)]
        : []),
    ],
  };
}

function getPublicInfoOnlyFilters(filters: ActivityFilters): ActivityFilters {
  return {
    ...filters,
    relation: "ALL",
    type: undefined,
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

async function getPublicInfoOnlyActivityList(
  filters: ActivityFilters,
  pageSize: number,
  now: Date,
  viewerProfileId: string | null | undefined,
): Promise<ActivityListResult> {
  const perf = createActionPerformanceTracker({
    action: "activities.publicInfoList",
    metadata: {
      hasFilters: hasExplicitActivityListFilters(filters),
      page: filters.page,
      pageSize,
      sort: filters.sort,
    },
  });
  const publicInfoFilters = getPublicInfoOnlyFilters(filters);
  const activityWhere = getPublicInfoActivityListWhere(publicInfoFilters, now);
  const publicEventWhere = getPublicInfoPublicEventListWhere(
    publicInfoFilters,
    now,
  );
  const useRecommendedSort =
    publicInfoFilters.sort === "recommended" &&
    !hasExplicitActivityListFilters(publicInfoFilters);
  const requestedPage = Math.max(filters.page, 1);
  const readLimit = useRecommendedSort
    ? undefined
    : requestedPage * pageSize + 1;
  const [activities, publicEvents] = await Promise.all([
    perf.measure("activity.list", () =>
      prisma.activity.findMany({
        where: activityWhere,
        orderBy: getActivityListOrderBy(
          publicInfoFilters,
          publicInfoFilters.timeState,
        ),
        ...(readLimit ? { take: readLimit } : {}),
        select: activityCardSelect,
      }),
    ),
    perf.measure("publicEvent.list", () =>
      prisma.publicEvent.findMany({
        where: publicEventWhere,
        orderBy: getPublicEventListOrderBy(
          publicInfoFilters,
          publicInfoFilters.timeState,
        ),
        ...(readLimit ? { take: readLimit } : {}),
        select: publicEventCardSelect,
      }),
    ),
  ]);
  const dailySeed = useRecommendedSort ? getDailyRankingSeed(now) : null;
  const allRankedActivities = await perf.measure("rank.slice", async () => {
    const ranked = [
      ...filterDuplicateLegacyActivityInfoRows(activities, publicEvents).map(
        getActivityRankedCardViewModel,
      ),
      ...publicEvents.map(getPublicEventActivityCardViewModel),
    ]
      .sort((left, right) =>
        dailySeed
          ? compareRecommendedRankedActivities(now, dailySeed, left, right)
          : compareRankedActivities(publicInfoFilters, left, right),
      );

    return ranked;
  });
  const totalCount = allRankedActivities.length;
  const totalPages = getActivityTotalPages(totalCount, pageSize);
  const page = getActivityPage(requestedPage, totalPages);
  const rankedActivities = allRankedActivities.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const rankedActivitiesWithViewerState = await perf.measure("viewerState", () =>
    attachJoinableActivityStates(rankedActivities, viewerProfileId),
  );
  perf.finish({
    activityCandidateCount: activities.length,
    publicEventCandidateCount: publicEvents.length,
    resultCount: rankedActivities.length,
    totalCount,
    usedFirstPageCandidates: false,
  });

  return {
    activities: rankedActivitiesWithViewerState,
    page,
    pageSize,
    totalCount,
    totalPages,
  };
}

export async function getActivityList(
  filters: ActivityFilters,
  options: GetActivityListOptions = {},
): Promise<ActivityListResult> {
  const now = new Date();
  const pageSize = normalizeLimit(options.pageSize) ?? defaultActivityPageSize;

  if (options.publicInfoOnly) {
    return getPublicInfoOnlyActivityList(
      filters,
      pageSize,
      now,
      options.viewerProfileId,
    );
  }

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

export async function getActivityFilterOptions(
  options: { publicInfoOnly?: boolean } = {},
) {
  const loadFilterOptions = options.publicInfoOnly
    ? getCachedPublicInfoActivityFilterOptions
    : getCachedActivityFilterOptions;

  return loadFilterOptions();
}

const getCachedActivityFilterOptions = unstable_cache(
  async () => {
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
  },
  ["activity-filter-options"],
  { revalidate: 300 },
);

const getCachedPublicInfoActivityFilterOptions = unstable_cache(
  async () => {
  const now = new Date();
  const activityWhere = {
    AND: [
      getVisibleActivityWhere({
        includeEnded: true,
        includePast: true,
        now,
      }),
      getLegacyPublicActivityInfoWhere(),
    ],
  };
  const [activityCities, publicEventCities] = await Promise.all([
    prisma.activity.findMany({
      where: activityWhere,
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
  },
  ["activity-filter-options-public-info"],
  { revalidate: 300 },
);
