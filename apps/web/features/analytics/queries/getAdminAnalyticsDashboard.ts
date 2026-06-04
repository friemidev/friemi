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

const dashboardWindowDays = 30;
const intentWindowDays = 7;

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

function createEmptyDashboard(
  operations: AdminOperationsAnalytics,
): AdminAnalyticsDashboard {
  return {
    environment: getAnalyticsEnvironment(),
    windowDays: dashboardWindowDays,
    intentWindowDays,
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

export async function getAdminAnalyticsDashboard(): Promise<AdminAnalyticsDashboard> {
  const environment = getAnalyticsEnvironment();
  const since = new Date(Date.now() - dashboardWindowDays * 24 * 60 * 60 * 1000);
  const intentSince = new Date(
    Date.now() - intentWindowDays * 24 * 60 * 60 * 1000,
  );
  const operations = await getAdminOperationsAnalytics();

  try {
    const [
      eventGroups,
      intentEvents,
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
      windowDays: dashboardWindowDays,
      intentWindowDays,
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

    return createEmptyDashboard(operations);
  }
}
