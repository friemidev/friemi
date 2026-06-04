import type { ReportStatus, ReportTargetType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAnalyticsEnvironment } from "../events";

const adminAnalyticsWindowDays = 30;

const reportStatuses = [
  "PENDING",
  "REVIEWING",
  "RESOLVED",
  "DISMISSED",
] as const satisfies readonly ReportStatus[];

const reportTargetTypes = [
  "USER_PROFILE",
  "PUBLIC_EVENT",
  "ACTIVITY",
  "COMMENT",
] as const satisfies readonly ReportTargetType[];

export type AdminOperationsAnalytics = {
  windowDays: number;
  reports: {
    averageReviewHours: number | null;
    byStatus: Record<ReportStatus, number>;
    byTargetType: Record<ReportTargetType, number>;
    newCount: number;
    pendingCount: number;
    reviewedCount: number;
  };
  publicEvents: {
    conversionRate: number;
    sourceClickCount: number;
    convertedToTeamCount: number;
  };
};

function createReportStatusCounts() {
  return Object.fromEntries(
    reportStatuses.map((status) => [status, 0]),
  ) as Record<ReportStatus, number>;
}

function createReportTargetTypeCounts() {
  return Object.fromEntries(
    reportTargetTypes.map((targetType) => [targetType, 0]),
  ) as Record<ReportTargetType, number>;
}

function createEmptyAdminOperationsAnalytics(): AdminOperationsAnalytics {
  return {
    windowDays: adminAnalyticsWindowDays,
    reports: {
      averageReviewHours: null,
      byStatus: createReportStatusCounts(),
      byTargetType: createReportTargetTypeCounts(),
      newCount: 0,
      pendingCount: 0,
      reviewedCount: 0,
    },
    publicEvents: {
      conversionRate: 0,
      convertedToTeamCount: 0,
      sourceClickCount: 0,
    },
  };
}

function calculateAverageReviewHours(
  reports: Array<{ createdAt: Date; reviewedAt: Date | null }>,
) {
  const durations = reports
    .map((report) =>
      report.reviewedAt
        ? report.reviewedAt.getTime() - report.createdAt.getTime()
        : null,
    )
    .filter((duration): duration is number => duration !== null && duration >= 0);

  if (durations.length === 0) {
    return null;
  }

  const averageMs =
    durations.reduce((total, duration) => total + duration, 0) /
    durations.length;

  return Math.max(0, Math.round(averageMs / 1000 / 60 / 60));
}

export async function getAdminOperationsAnalytics(): Promise<AdminOperationsAnalytics> {
  const since = new Date(
    Date.now() - adminAnalyticsWindowDays * 24 * 60 * 60 * 1000,
  );
  const environment = getAnalyticsEnvironment();

  try {
    const [
      newCount,
      pendingCount,
      statusGroups,
      targetTypeGroups,
      reviewedReports,
      sourceClickCount,
      convertedToTeamCount,
    ] = await Promise.all([
      prisma.report.count({
        where: {
          createdAt: {
            gte: since,
          },
        },
      }),
      prisma.report.count({
        where: {
          status: "PENDING",
        },
      }),
      prisma.report.groupBy({
        by: ["status"],
        where: {
          createdAt: {
            gte: since,
          },
        },
        _count: {
          _all: true,
        },
      }),
      prisma.report.groupBy({
        by: ["targetType"],
        where: {
          createdAt: {
            gte: since,
          },
        },
        _count: {
          _all: true,
        },
      }),
      prisma.report.findMany({
        where: {
          reviewedAt: {
            gte: since,
          },
          status: {
            in: ["RESOLVED", "DISMISSED"],
          },
        },
        select: {
          createdAt: true,
          reviewedAt: true,
        },
        take: 5000,
      }),
      prisma.analyticsEvent.count({
        where: {
          createdAt: {
            gte: since,
          },
          environment,
          name: "public_event_source_clicked",
        },
      }),
      prisma.analyticsEvent.count({
        where: {
          createdAt: {
            gte: since,
          },
          environment,
          name: "public_event_converted_to_team",
        },
      }),
    ]);
    const byStatus = createReportStatusCounts();
    const byTargetType = createReportTargetTypeCounts();

    for (const group of statusGroups) {
      byStatus[group.status] = group._count._all;
    }

    for (const group of targetTypeGroups) {
      byTargetType[group.targetType] = group._count._all;
    }

    return {
      windowDays: adminAnalyticsWindowDays,
      reports: {
        averageReviewHours: calculateAverageReviewHours(reviewedReports),
        byStatus,
        byTargetType,
        newCount,
        pendingCount,
        reviewedCount: reviewedReports.length,
      },
      publicEvents: {
        conversionRate:
          sourceClickCount > 0
            ? Math.round((convertedToTeamCount / sourceClickCount) * 100)
            : 0,
        convertedToTeamCount,
        sourceClickCount,
      },
    };
  } catch (error) {
    console.error("Failed to load admin operations analytics", error);

    return createEmptyAdminOperationsAnalytics();
  }
}
