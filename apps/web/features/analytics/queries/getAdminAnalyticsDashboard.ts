import { prisma } from "@/lib/prisma";
import {
  getAnalyticsEnvironment,
  type AnalyticsEventName,
  type AnalyticsSourceSurface,
} from "../events";
import {
  getAdminOperationsAnalytics,
  type AdminOperationsAnalytics,
} from "./getAdminOperationsAnalytics";

export const adminAnalyticsWindowOptions = [7, 30, 90] as const;

export type AdminAnalyticsWindowDays =
  (typeof adminAnalyticsWindowOptions)[number];

const defaultDashboardWindowDays = 30 satisfies AdminAnalyticsWindowDays;

export function getAdminAnalyticsWindowDays(
  value: unknown,
): AdminAnalyticsWindowDays {
  const parsed = typeof value === "string" ? Number(value) : value;

  return adminAnalyticsWindowOptions.includes(parsed as AdminAnalyticsWindowDays)
    ? (parsed as AdminAnalyticsWindowDays)
    : defaultDashboardWindowDays;
}

const dashboardEventNames = [
  "activity_list_viewed",
  "activity_card_clicked",
  "public_event_detail_viewed",
  "activity_detail_viewed",
  "team_create_started",
  "team_created",
  "join_started",
  "join_submitted",
  "comment_created",
  "comment_reply_created",
  "organizer_contact_clicked",
  "conversation_opened",
  "message_sent",
  "friend_request_sent",
  "friend_request_accepted",
  "link_copied",
  "field_copied",
  "poster_downloaded",
  "qr_code_shared",
  "public_event_source_clicked",
  "public_event_converted_to_team",
] as const satisfies readonly AnalyticsEventName[];

const realIntentEventNames = [
  "team_created",
  "join_submitted",
  "comment_created",
  "comment_reply_created",
  "organizer_contact_clicked",
  "message_sent",
] as const satisfies readonly AnalyticsEventName[];

type EventCountName = (typeof dashboardEventNames)[number];

const trendEventCategories = {
  communication: new Set<AnalyticsEventName>([
    "comment_created",
    "comment_reply_created",
    "organizer_contact_clicked",
    "conversation_opened",
    "message_sent",
    "friend_request_sent",
    "friend_request_accepted",
  ]),
  discovery: new Set<AnalyticsEventName>([
    "activity_list_viewed",
    "activity_card_clicked",
    "activity_detail_viewed",
    "public_event_detail_viewed",
  ]),
  join: new Set<AnalyticsEventName>(["join_started", "join_submitted"]),
  team: new Set<AnalyticsEventName>([
    "team_create_started",
    "team_created",
    "public_event_converted_to_team",
  ]),
};

const popularViewEventNames = new Set<AnalyticsEventName>([
  "activity_card_clicked",
  "activity_detail_viewed",
  "public_event_detail_viewed",
]);

const popularActionEventNames = new Set<AnalyticsEventName>([
  "team_create_started",
  "team_created",
  "public_event_converted_to_team",
  "join_started",
  "join_submitted",
  "comment_created",
  "comment_reply_created",
  "organizer_contact_clicked",
  "link_copied",
  "poster_downloaded",
  "qr_code_shared",
]);

type ChartAnalyticsEvent = {
  createdAt: Date;
  entityId: string | null;
  entityType: string | null;
  id: string;
  name: string;
};

export type AdminAnalyticsDashboard = {
  environment: string;
  windowDays: number;
  intentWindowDays: number;
  northStar: {
    activeIntentUsers: number;
    intentActionCount: number;
  };
  discovery: {
    listViews: number;
    cardClicks: number;
    clickRate: number;
  };
  publicEventConversion: {
    detailViews: number;
    createdTeams: number;
    conversionRate: number;
  };
  teamJoin: {
    detailViews: number;
    joinClicks: number;
    joinSubmitted: number;
    joinRate: number;
  };
  communication: {
    comments: number;
    contactClicks: number;
    conversationsOpened: number;
    messagesSent: number;
    total: number;
  };
  friends: {
    accepted: number;
    acceptanceRate: number;
    sent: number;
  };
  sharing: {
    fieldsCopied: number;
    linksCopied: number;
    postersDownloaded: number;
    qrShared: number;
    total: number;
  };
  sourceSurfaces: Array<{
    count: number;
    sourceSurface: string;
  }>;
  trend: Array<{
    communication: number;
    dateKey: string;
    discovery: number;
    join: number;
    label: string;
    team: number;
    total: number;
  }>;
  popularItems: Array<{
    actionCount: number;
    city: string;
    id: string;
    score: number;
    title: string;
    type: "activity" | "public_event" | "team";
    viewCount: number;
  }>;
  publicEventSources: Array<{
    convertedToTeamCount: number;
    importedCount: number;
    source: string;
    sourceClickCount: number;
  }>;
  operations: AdminOperationsAnalytics;
};

function getRate(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function getViewerKey(event: {
  anonymousId: string | null;
  id: string;
  userProfileId: string | null;
}) {
  return event.userProfileId ?? event.anonymousId ?? event.id;
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDateLabel(date: Date) {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function createTrendBuckets(windowDays: number) {
  const today = new Date();
  const buckets = new Map<
    string,
    {
      communication: number;
      dateKey: string;
      discovery: number;
      join: number;
      label: string;
      team: number;
      total: number;
    }
  >();

  for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - offset);
    const dateKey = getDateKey(date);

    buckets.set(dateKey, {
      communication: 0,
      dateKey,
      discovery: 0,
      join: 0,
      label: getDateLabel(date),
      team: 0,
      total: 0,
    });
  }

  return buckets;
}

function buildTrend(windowDays: number, events: ChartAnalyticsEvent[]) {
  const buckets = createTrendBuckets(windowDays);

  for (const event of events) {
    const bucket = buckets.get(getDateKey(event.createdAt));
    const name = event.name as AnalyticsEventName;

    if (!bucket) continue;

    if (trendEventCategories.discovery.has(name)) {
      bucket.discovery += 1;
    }

    if (trendEventCategories.team.has(name)) {
      bucket.team += 1;
    }

    if (trendEventCategories.join.has(name)) {
      bucket.join += 1;
    }

    if (trendEventCategories.communication.has(name)) {
      bucket.communication += 1;
    }

    bucket.total =
      bucket.discovery + bucket.team + bucket.join + bucket.communication;
  }

  return [...buckets.values()];
}

function createPopularRows(events: ChartAnalyticsEvent[]) {
  const rows = new Map<
    string,
    {
      actionCount: number;
      id: string;
      type: "activity" | "public_event" | "team";
      viewCount: number;
    }
  >();

  for (const event of events) {
    if (!event.entityId || !event.entityType) continue;

    const name = event.name as AnalyticsEventName;
    const normalizedType =
      event.entityType === "public_event"
        ? "public_event"
        : event.entityType === "team"
          ? "team"
          : event.entityType === "activity"
            ? "activity"
            : null;

    if (!normalizedType) continue;

    const isView = popularViewEventNames.has(name);
    const isAction = popularActionEventNames.has(name);

    if (!isView && !isAction) continue;

    const key = `${normalizedType}:${event.entityId}`;
    const row =
      rows.get(key) ??
      {
        actionCount: 0,
        id: event.entityId,
        type: normalizedType,
        viewCount: 0,
      };

    if (isView) {
      row.viewCount += 1;
    }

    if (isAction) {
      row.actionCount += 1;
    }

    rows.set(key, row);
  }

  return [...rows.values()];
}

function createEmptyDashboard(
  operations: AdminOperationsAnalytics,
  windowDays = defaultDashboardWindowDays,
): AdminAnalyticsDashboard {
  return {
    environment: getAnalyticsEnvironment(),
    windowDays,
    intentWindowDays: windowDays,
    northStar: {
      activeIntentUsers: 0,
      intentActionCount: 0,
    },
    discovery: {
      cardClicks: 0,
      clickRate: 0,
      listViews: 0,
    },
    publicEventConversion: {
      conversionRate: 0,
      createdTeams: 0,
      detailViews: 0,
    },
    teamJoin: {
      detailViews: 0,
      joinClicks: 0,
      joinRate: 0,
      joinSubmitted: 0,
    },
    communication: {
      comments: 0,
      contactClicks: 0,
      conversationsOpened: 0,
      messagesSent: 0,
      total: 0,
    },
    friends: {
      acceptanceRate: 0,
      accepted: 0,
      sent: 0,
    },
    sharing: {
      fieldsCopied: 0,
      linksCopied: 0,
      postersDownloaded: 0,
      qrShared: 0,
      total: 0,
    },
    sourceSurfaces: [],
    trend: buildTrend(windowDays, []),
    popularItems: [],
    publicEventSources: [],
    operations,
  };
}

function getPublicEventSourceLabel(event: {
  externalSource: string | null;
  source: string | null;
}) {
  return event.externalSource?.trim() || event.source?.trim() || "manual";
}

export async function getAdminAnalyticsDashboard(
  windowDays: AdminAnalyticsWindowDays = defaultDashboardWindowDays,
): Promise<AdminAnalyticsDashboard> {
  const environment = getAnalyticsEnvironment();
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const intentSince = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const operations = await getAdminOperationsAnalytics(windowDays);

  try {
    const [
      eventGroups,
      intentEvents,
      dashboardEventsForCharts,
      sourceSurfaceGroups,
      recentPublicEvents,
      sourceValueEvents,
    ] = await Promise.all([
      prisma.analyticsEvent.groupBy({
        by: ["name"],
        where: {
          createdAt: {
            gte: since,
          },
          environment,
          name: {
            in: [...dashboardEventNames],
          },
        },
        _count: {
          _all: true,
        },
      }),
      prisma.analyticsEvent.findMany({
        where: {
          createdAt: {
            gte: intentSince,
          },
          environment,
          name: {
            in: [...realIntentEventNames],
          },
        },
        select: {
          anonymousId: true,
          id: true,
          userProfileId: true,
        },
        take: 10000,
      }),
      prisma.analyticsEvent.findMany({
        where: {
          createdAt: {
            gte: since,
          },
          environment,
          name: {
            in: [...dashboardEventNames],
          },
        },
        select: {
          createdAt: true,
          entityId: true,
          entityType: true,
          id: true,
          name: true,
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 20000,
      }),
      prisma.analyticsEvent.groupBy({
        by: ["sourceSurface"],
        where: {
          createdAt: {
            gte: since,
          },
          environment,
          name: "activity_detail_viewed",
          sourceSurface: {
            not: null,
          },
        },
        _count: {
          _all: true,
        },
      }),
      prisma.publicEvent.findMany({
        where: {
          OR: [
            {
              importedAt: {
                gte: since,
              },
            },
            {
              createdAt: {
                gte: since,
              },
              source: {
                not: null,
              },
            },
          ],
        },
        select: {
          externalSource: true,
          id: true,
          source: true,
        },
        take: 10000,
      }),
      prisma.analyticsEvent.findMany({
        where: {
          createdAt: {
            gte: since,
          },
          entityType: "public_event",
          environment,
          name: {
            in: ["public_event_source_clicked", "public_event_converted_to_team"],
          },
        },
        select: {
          entityId: true,
          name: true,
        },
        take: 10000,
      }),
    ]);
    const eventCounts = new Map<EventCountName, number>();

    for (const group of eventGroups) {
      eventCounts.set(group.name as EventCountName, group._count._all);
    }

    const count = (name: EventCountName) => eventCounts.get(name) ?? 0;
    const activityListViews = count("activity_list_viewed");
    const activityCardClicks = count("activity_card_clicked");
    const publicEventDetailViews = count("public_event_detail_viewed");
    const publicEventTeams = count("public_event_converted_to_team");
    const activityDetailViews = count("activity_detail_viewed");
    const joinClicks = count("join_started");
    const joinSubmitted = count("join_submitted");
    const comments = count("comment_created") + count("comment_reply_created");
    const contactClicks = count("organizer_contact_clicked");
    const conversationsOpened = count("conversation_opened");
    const messagesSent = count("message_sent");
    const friendRequestsSent = count("friend_request_sent");
    const friendRequestsAccepted = count("friend_request_accepted");
    const linksCopied = count("link_copied");
    const fieldsCopied = count("field_copied");
    const postersDownloaded = count("poster_downloaded");
    const qrShared = count("qr_code_shared");
    const publicEventIds = Array.from(
      new Set(
        sourceValueEvents
          .map((event) => event.entityId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const popularRows = createPopularRows(dashboardEventsForCharts);
    const popularActivityIds = popularRows
      .filter((row) => row.type === "activity" || row.type === "team")
      .map((row) => row.id);
    const popularPublicEventIds = popularRows
      .filter((row) => row.type === "public_event")
      .map((row) => row.id);
    const sourcePublicEvents = publicEventIds.length
      ? await prisma.publicEvent.findMany({
          where: {
            id: {
              in: publicEventIds,
            },
          },
          select: {
            externalSource: true,
            id: true,
            source: true,
          },
        })
      : [];
    const [popularActivities, popularPublicEvents] = await Promise.all([
      popularActivityIds.length
        ? prisma.activity.findMany({
            where: {
              id: {
                in: popularActivityIds,
              },
            },
            select: {
              city: true,
              id: true,
              title: true,
            },
          })
        : [],
      popularPublicEventIds.length
        ? prisma.publicEvent.findMany({
            where: {
              id: {
                in: popularPublicEventIds,
              },
            },
            select: {
              city: true,
              id: true,
              title: true,
            },
          })
        : [],
    ]);
    const popularActivityById = new Map(
      popularActivities.map((activity) => [activity.id, activity]),
    );
    const popularPublicEventById = new Map(
      popularPublicEvents.map((publicEvent) => [publicEvent.id, publicEvent]),
    );
    const popularItems = popularRows
      .map((row) => {
        const item =
          row.type === "public_event"
            ? popularPublicEventById.get(row.id)
            : popularActivityById.get(row.id);

        if (!item) {
          return null;
        }

        return {
          ...row,
          city: item.city,
          score: row.viewCount + row.actionCount * 3,
          title: item.title,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort(
        (left, right) =>
          right.score - left.score ||
          right.actionCount - left.actionCount ||
          right.viewCount - left.viewCount,
      )
      .slice(0, 8);
    const publicEventSourceById = new Map<string, string>();
    const sourceRows = new Map<
      string,
      {
        convertedToTeamCount: number;
        importedCount: number;
        source: string;
        sourceClickCount: number;
      }
    >();

    for (const event of [...recentPublicEvents, ...sourcePublicEvents]) {
      publicEventSourceById.set(event.id, getPublicEventSourceLabel(event));
    }

    for (const event of recentPublicEvents) {
      const source = getPublicEventSourceLabel(event);
      const row =
        sourceRows.get(source) ??
        {
          convertedToTeamCount: 0,
          importedCount: 0,
          source,
          sourceClickCount: 0,
        };

      row.importedCount += 1;
      sourceRows.set(source, row);
    }

    for (const event of sourceValueEvents) {
      if (!event.entityId) continue;

      const source = publicEventSourceById.get(event.entityId) ?? "unknown";
      const row =
        sourceRows.get(source) ??
        {
          convertedToTeamCount: 0,
          importedCount: 0,
          source,
          sourceClickCount: 0,
        };

      if (event.name === "public_event_source_clicked") {
        row.sourceClickCount += 1;
      }

      if (event.name === "public_event_converted_to_team") {
        row.convertedToTeamCount += 1;
      }

      sourceRows.set(source, row);
    }

    return {
      environment,
      windowDays,
      intentWindowDays: windowDays,
      northStar: {
        activeIntentUsers: new Set(intentEvents.map(getViewerKey)).size,
        intentActionCount: intentEvents.length,
      },
      discovery: {
        cardClicks: activityCardClicks,
        clickRate: getRate(activityCardClicks, activityListViews),
        listViews: activityListViews,
      },
      publicEventConversion: {
        conversionRate: getRate(publicEventTeams, publicEventDetailViews),
        createdTeams: publicEventTeams,
        detailViews: publicEventDetailViews,
      },
      teamJoin: {
        detailViews: activityDetailViews,
        joinClicks,
        joinRate: getRate(joinSubmitted, activityDetailViews),
        joinSubmitted,
      },
      communication: {
        comments,
        contactClicks,
        conversationsOpened,
        messagesSent,
        total: comments + contactClicks + conversationsOpened + messagesSent,
      },
      friends: {
        acceptanceRate: getRate(friendRequestsAccepted, friendRequestsSent),
        accepted: friendRequestsAccepted,
        sent: friendRequestsSent,
      },
      sharing: {
        fieldsCopied,
        linksCopied,
        postersDownloaded,
        qrShared,
        total: linksCopied + fieldsCopied + postersDownloaded + qrShared,
      },
      sourceSurfaces: sourceSurfaceGroups
        .map((group) => ({
          count: group._count._all,
          sourceSurface: group.sourceSurface as AnalyticsSourceSurface,
        }))
        .sort((left, right) => right.count - left.count)
        .slice(0, 6),
      trend: buildTrend(windowDays, dashboardEventsForCharts),
      popularItems,
      publicEventSources: [...sourceRows.values()]
        .sort(
          (left, right) =>
            right.convertedToTeamCount - left.convertedToTeamCount ||
            right.sourceClickCount - left.sourceClickCount ||
            right.importedCount - left.importedCount,
        )
        .slice(0, 8),
      operations,
    };
  } catch (error) {
    console.error("Failed to load admin analytics dashboard", error);

    return createEmptyDashboard(operations, windowDays);
  }
}
