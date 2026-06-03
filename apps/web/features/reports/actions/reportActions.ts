"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type ReportReason, type ReportStatus } from "@prisma/client";
import { z } from "zod";
import { createNotifications } from "@/features/notifications/utils/createNotification";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { hasClerkKeys } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { getReportCopy } from "../copy";

const reportTargetTypes = [
  "USER_PROFILE",
  "PUBLIC_EVENT",
  "ACTIVITY",
  "COMMENT",
] as const;

const reportReasons = [
  "SPAM",
  "HARASSMENT",
  "INAPPROPRIATE_CONTENT",
  "MISLEADING_INFORMATION",
  "SAFETY_CONCERN",
  "OTHER",
] as const;

const reportStatuses = [
  "PENDING",
  "REVIEWING",
  "RESOLVED",
  "DISMISSED",
] as const;

const createReportSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  redirectPath: z.string().trim().optional(),
  targetType: z.enum(reportTargetTypes),
  targetId: z.string().trim().min(1),
  reason: z.enum(reportReasons),
  description: z.string().trim().max(500).optional(),
});

const reviewReportSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  reportId: z.string().trim().min(1),
  status: z.enum(reportStatuses),
  reviewNote: z.string().trim().max(500).optional(),
});

export type CreateReportState = {
  ok?: boolean;
  formError?: string;
  fieldErrors?: Record<string, string[]>;
  values?: {
    reason?: ReportReason;
    description?: string;
  };
};

export type ReviewReportState = {
  ok?: boolean;
  formError?: string;
};

const emptyCreateReportState: CreateReportState = {};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function revalidateReportTarget(
  locale: string,
  redirectPath: string | undefined,
) {
  if (redirectPath?.startsWith("/")) {
    revalidatePath(withLocale(locale, redirectPath));
  }

  revalidatePath(withLocale(locale, "/admin/reports"));
  revalidatePath(withLocale(locale, "/notifications"));
  revalidatePath(withLocale(locale, "/"), "layout");
}

async function canReportTarget({
  reporterId,
  targetId,
  targetType,
}: {
  reporterId: string;
  targetId: string;
  targetType: (typeof reportTargetTypes)[number];
}) {
  if (targetType === "USER_PROFILE") {
    if (targetId === reporterId) {
      return "self";
    }

    const user = await prisma.userProfile.findFirst({
      where: {
        id: targetId,
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    return user ? "ok" : "missing";
  }

  if (targetType === "PUBLIC_EVENT") {
    const event = await prisma.publicEvent.findFirst({
      where: {
        id: targetId,
        visibility: "PUBLIC",
      },
      select: {
        id: true,
      },
    });

    return event ? "ok" : "missing";
  }

  if (targetType === "ACTIVITY") {
    const activity = await prisma.activity.findFirst({
      where: {
        id: targetId,
        visibility: {
          in: ["PUBLIC", "LINK_ONLY"],
        },
        organizer: {
          status: "ACTIVE",
        },
      },
      select: {
        id: true,
        organizerId: true,
      },
    });

    if (!activity) {
      return "missing";
    }

    return activity.organizerId === reporterId ? "self" : "ok";
  }

  const comment = await prisma.comment.findFirst({
    where: {
      id: targetId,
      deletedAt: null,
      author: {
        status: "ACTIVE",
      },
      activity: {
        visibility: {
          in: ["PUBLIC", "LINK_ONLY"],
        },
        organizer: {
          status: "ACTIVE",
        },
      },
    },
    select: {
      id: true,
      authorId: true,
    },
  });

  if (!comment) {
    return "missing";
  }

  return comment.authorId === reporterId ? "self" : "ok";
}

export async function createReportAction(
  _previousState: CreateReportState = emptyCreateReportState,
  formData: FormData,
): Promise<CreateReportState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    redirectPath: getString(formData, "redirectPath") || undefined,
    targetType: getString(formData, "targetType"),
    targetId: getString(formData, "targetId"),
    reason: getString(formData, "reason"),
    description: getString(formData, "description") || undefined,
  };
  const result = createReportSchema.safeParse(rawInput);
  const t = getReportCopy(rawInput.locale);

  if (!result.success) {
    return {
      formError: t.formError,
      fieldErrors: result.error.flatten().fieldErrors,
      values: {
        reason: rawInput.reason as ReportReason,
        description: rawInput.description,
      },
    };
  }

  const { locale, redirectPath } = result.data;

  try {
    const reporter = await ensureCurrentUserProfile(locale);
    const targetState = await canReportTarget({
      reporterId: reporter.id,
      targetId: result.data.targetId,
      targetType: result.data.targetType,
    });

    if (targetState === "self") {
      return {
        formError: t.selfError,
        values: {
          reason: result.data.reason,
          description: result.data.description,
        },
      };
    }

    if (targetState !== "ok") {
      return {
        formError: t.targetUnavailable,
        values: {
          reason: result.data.reason,
          description: result.data.description,
        },
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.report.create({
        data: {
          reporterId: reporter.id,
          targetType: result.data.targetType,
          targetId: result.data.targetId,
          reason: result.data.reason,
          description: result.data.description || null,
        },
      });

      const admins = await tx.userProfile.findMany({
        where: {
          id: {
            not: reporter.id,
          },
          role: "ADMIN",
          status: "ACTIVE",
        },
        select: {
          id: true,
        },
      });

      await createNotifications(
        tx,
        admins.map((admin) => ({
          actorId: reporter.id,
          dedupe: false,
          recipientId: admin.id,
          type: "REPORT_CREATED",
        })),
      );
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        formError: t.duplicate,
        values: {
          reason: result.data.reason,
          description: result.data.description,
        },
      };
    }

    console.error("Failed to create report", error);

    return {
      formError: t.failedError,
      values: {
        reason: result.data.reason,
        description: result.data.description,
      },
    };
  }

  revalidateReportTarget(locale, redirectPath);

  return {
    ok: true,
  };
}

export async function reviewReportAction(
  _previousState: ReviewReportState,
  formData: FormData,
): Promise<ReviewReportState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    reportId: getString(formData, "reportId"),
    status: getString(formData, "status"),
    reviewNote: getString(formData, "reviewNote") || undefined,
  };
  const result = reviewReportSchema.safeParse(rawInput);
  const t = getReportCopy(rawInput.locale).admin;

  if (!result.success) {
    return {
      formError: t.reviewFailed,
    };
  }

  try {
    const hasAuthProvider = hasClerkKeys();
    const [isAdmin, reviewer] = await Promise.all([
      hasAuthProvider ? isCurrentUserAdmin() : Promise.resolve(true),
      ensureCurrentUserProfile(result.data.locale),
    ]);

    if (!isAdmin) {
      return {
        formError: t.reviewFailed,
      };
    }

    const isFinalStatus = ["RESOLVED", "DISMISSED"].includes(
      result.data.status,
    );

    await prisma.report.update({
      where: {
        id: result.data.reportId,
      },
      data: {
        status: result.data.status as ReportStatus,
        reviewerId: result.data.status === "PENDING" ? null : reviewer.id,
        reviewNote: result.data.reviewNote || null,
        reviewedAt: isFinalStatus ? new Date() : null,
      },
    });
  } catch (error) {
    console.error("Failed to review report", error);

    return {
      formError: t.reviewFailed,
    };
  }

  revalidatePath(withLocale(result.data.locale, "/admin/reports"));

  return {
    ok: true,
  };
}
