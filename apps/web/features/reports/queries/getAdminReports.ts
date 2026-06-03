import type {
  Prisma,
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminReportViewModel = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  targetHref: string | null;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  reporter: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
  };
  reviewer: {
    id: string;
    nickname: string;
  } | null;
};

const reportSelect = {
  id: true,
  targetType: true,
  targetId: true,
  reason: true,
  description: true,
  status: true,
  reviewNote: true,
  reviewedAt: true,
  createdAt: true,
  reporter: {
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
    },
  },
  reviewer: {
    select: {
      id: true,
      nickname: true,
    },
  },
} satisfies Prisma.ReportSelect;

type ReportQueryResult = Prisma.ReportGetPayload<{
  select: typeof reportSelect;
}>;

type AdminReportQueryOptions = {
  status?: ReportStatus | "ALL";
};

function uniqueIds(reports: ReportQueryResult[], targetType: ReportTargetType) {
  return Array.from(
    new Set(
      reports
        .filter((report) => report.targetType === targetType)
        .map((report) => report.targetId),
    ),
  );
}

export async function getAdminReportSummary() {
  const [total, pending] = await Promise.all([
    prisma.report.count(),
    prisma.report.count({
      where: {
        status: "PENDING",
      },
    }),
  ]);

  return {
    total,
    pending,
  };
}

export async function getAdminReports(
  options: AdminReportQueryOptions = {},
): Promise<AdminReportViewModel[]> {
  const reports = await prisma.report.findMany({
    where:
      options.status && options.status !== "ALL"
        ? {
            status: options.status,
          }
        : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: reportSelect,
  });

  const userIds = uniqueIds(reports, "USER_PROFILE");
  const publicEventIds = uniqueIds(reports, "PUBLIC_EVENT");
  const activityIds = uniqueIds(reports, "ACTIVITY");
  const commentIds = uniqueIds(reports, "COMMENT");

  const [users, publicEvents, activities, comments] = await Promise.all([
    userIds.length
      ? prisma.userProfile.findMany({
          where: { id: { in: userIds } },
          select: { id: true, nickname: true },
        })
      : [],
    publicEventIds.length
      ? prisma.publicEvent.findMany({
          where: { id: { in: publicEventIds } },
          select: { id: true, title: true },
        })
      : [],
    activityIds.length
      ? prisma.activity.findMany({
          where: { id: { in: activityIds } },
          select: { id: true, title: true },
        })
      : [],
    commentIds.length
      ? prisma.comment.findMany({
          where: { id: { in: commentIds } },
          select: {
            id: true,
            content: true,
            activityId: true,
            deletedAt: true,
          },
        })
      : [],
  ]);

  const userMap = new Map(users.map((user) => [user.id, user]));
  const publicEventMap = new Map(publicEvents.map((event) => [event.id, event]));
  const activityMap = new Map(activities.map((activity) => [activity.id, activity]));
  const commentMap = new Map(comments.map((comment) => [comment.id, comment]));

  return reports.map((report) => {
    if (report.targetType === "USER_PROFILE") {
      const user = userMap.get(report.targetId);

      return {
        ...report,
        targetLabel: user?.nickname ?? "",
        targetHref: user ? `/profile/${user.id}` : null,
        createdAt: report.createdAt.toISOString(),
        reviewedAt: report.reviewedAt?.toISOString() ?? null,
      };
    }

    if (report.targetType === "PUBLIC_EVENT") {
      const event = publicEventMap.get(report.targetId);

      return {
        ...report,
        targetLabel: event?.title ?? "",
        targetHref: event ? `/public-events/${event.id}` : null,
        createdAt: report.createdAt.toISOString(),
        reviewedAt: report.reviewedAt?.toISOString() ?? null,
      };
    }

    if (report.targetType === "ACTIVITY") {
      const activity = activityMap.get(report.targetId);

      return {
        ...report,
        targetLabel: activity?.title ?? "",
        targetHref: activity ? `/activities/${activity.id}` : null,
        createdAt: report.createdAt.toISOString(),
        reviewedAt: report.reviewedAt?.toISOString() ?? null,
      };
    }

    const comment = commentMap.get(report.targetId);
    const commentPreview = comment?.deletedAt
      ? ""
      : comment?.content.trim().slice(0, 80);

    return {
      ...report,
      targetLabel: commentPreview ?? "",
      targetHref: comment ? `/activities/${comment.activityId}` : null,
      createdAt: report.createdAt.toISOString(),
      reviewedAt: report.reviewedAt?.toISOString() ?? null,
    };
  });
}
