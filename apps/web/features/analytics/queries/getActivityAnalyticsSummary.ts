import { prisma } from "@/lib/prisma";

const activityAnalyticsWindowDays = 30;

export type ActivityAnalyticsSummary = {
  commentCount: number;
  contactCount: number;
  conversionRate: number;
  joinStartedCount: number;
  joinSubmittedCount: number;
  shareActionCount: number;
  topSourceSurface: string | null;
  uniqueViewCount: number;
  viewCount: number;
  windowDays: number;
};

function getViewerKey(event: {
  anonymousId: string | null;
  id: string;
  userProfileId: string | null;
}) {
  return event.userProfileId ?? event.anonymousId ?? event.id;
}

export async function getActivityAnalyticsSummary(
  activityId: string,
): Promise<ActivityAnalyticsSummary | null> {
  const since = new Date(
    Date.now() - activityAnalyticsWindowDays * 24 * 60 * 60 * 1000,
  );

  try {
    const baseWhere = {
      createdAt: {
        gte: since,
      },
      entityId: activityId,
      entityType: "team",
    };
    const [
      viewCount,
      joinStartedCount,
      joinSubmittedCount,
      commentCount,
      contactCount,
      shareActionCount,
      viewEvents,
    ] = await Promise.all([
      prisma.analyticsEvent.count({
        where: {
          ...baseWhere,
          name: "activity_detail_viewed",
        },
      }),
      prisma.analyticsEvent.count({
        where: {
          ...baseWhere,
          name: "join_started",
        },
      }),
      prisma.analyticsEvent.count({
        where: {
          ...baseWhere,
          name: "join_submitted",
        },
      }),
      prisma.analyticsEvent.count({
        where: {
          ...baseWhere,
          name: {
            in: ["comment_created", "comment_reply_created"],
          },
        },
      }),
      prisma.analyticsEvent.count({
        where: {
          ...baseWhere,
          name: "organizer_contact_clicked",
        },
      }),
      prisma.analyticsEvent.count({
        where: {
          ...baseWhere,
          name: {
            in: [
              "field_copied",
              "link_copied",
              "poster_downloaded",
              "qr_code_shared",
            ],
          },
        },
      }),
      prisma.analyticsEvent.findMany({
        where: {
          ...baseWhere,
          name: "activity_detail_viewed",
        },
        select: {
          anonymousId: true,
          id: true,
          sourceSurface: true,
          userProfileId: true,
        },
      }),
    ]);
    const sourceCounts = new Map<string, number>();

    for (const event of viewEvents) {
      if (!event.sourceSurface) continue;

      sourceCounts.set(
        event.sourceSurface,
        (sourceCounts.get(event.sourceSurface) ?? 0) + 1,
      );
    }

    const topSourceSurface =
      [...sourceCounts.entries()].sort((left, right) => right[1] - left[1])[0]
        ?.[0] ?? null;
    const uniqueViewCount = new Set(viewEvents.map(getViewerKey)).size;

    return {
      commentCount,
      contactCount,
      conversionRate:
        uniqueViewCount > 0
          ? Math.round((joinSubmittedCount / uniqueViewCount) * 100)
          : 0,
      joinStartedCount,
      joinSubmittedCount,
      shareActionCount,
      topSourceSurface,
      uniqueViewCount,
      viewCount,
      windowDays: activityAnalyticsWindowDays,
    };
  } catch (error) {
    console.error("Failed to load activity analytics summary", error);

    return null;
  }
}
