"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  ActivityStatus,
  ActivityVisibility,
  ParticipantStatus,
  UserProfileStatus,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

const activeParticipantStatuses: ParticipantStatus[] = ["JOINED", "APPROVED"];
const existingParticipantStatuses: ParticipantStatus[] = [
  "JOINED",
  "APPROVED",
  "PENDING",
];
const joinableActivityStatuses: ActivityStatus[] = ["RECRUITING", "CONFIRMED"];
const joinableActivityVisibility: ActivityVisibility[] = ["PUBLIC"];
const activeOrganizerStatuses: UserProfileStatus[] = ["ACTIVE"];

const joinActivitySchema = z.object({
  activityId: z.string().min(1, "活动不存在"),
  locale: z.string().min(1).default("zh-CN"),
  message: z.string().trim().max(300, "留言最多 300 个字").optional(),
});

export type JoinActivityState = {
  formError?: string;
  fieldErrors?: Record<string, string[]>;
  values?: {
    message: string;
  };
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getActivityEndBoundary(activity: {
  startAt: Date;
  endAt: Date | null;
}) {
  return activity.endAt ?? activity.startAt;
}

function isPrismaUniqueError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isPrismaTransactionConflictError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function joinActivityAction(
  _previousState: JoinActivityState,
  formData: FormData,
): Promise<JoinActivityState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
    message: getString(formData, "message"),
  };
  const result = joinActivitySchema.safeParse(rawInput);

  if (!result.success) {
    return {
      formError: "请检查报名信息后再提交。",
      fieldErrors: result.error.flatten().fieldErrors,
      values: {
        message: rawInput.message,
      },
    };
  }

  const profile = await ensureCurrentUserProfile(result.data.locale);
  const message = result.data.message?.trim() || null;

  try {
    const joinResult = await prisma.$transaction(
      async (tx) => {
        const activity = await tx.activity.findUnique({
          where: {
            id: result.data.activityId,
          },
          select: {
            id: true,
            organizerId: true,
            status: true,
            visibility: true,
            startAt: true,
            endAt: true,
            capacity: true,
            requiresApproval: true,
            organizer: {
              select: {
                status: true,
              },
            },
            _count: {
              select: {
                participants: {
                  where: {
                    status: {
                      in: activeParticipantStatuses,
                    },
                  },
                },
              },
            },
          },
        });

        if (!activity) {
          return { ok: false, error: "活动不存在或已不可见。" };
        }

        if (
          !joinableActivityVisibility.includes(activity.visibility) ||
          !activeOrganizerStatuses.includes(activity.organizer.status)
        ) {
          return { ok: false, error: "活动不存在或已不可见。" };
        }

        if (activity.organizerId === profile.id) {
          return {
            ok: false,
            error: "你是活动发起人，不需要报名自己的活动。",
          };
        }

        if (activity.status === "CANCELLED") {
          return { ok: false, error: "活动已取消，不能继续报名。" };
        }

        if (activity.status === "ENDED") {
          return { ok: false, error: "活动已结束，不能继续报名。" };
        }

        if (!joinableActivityStatuses.includes(activity.status)) {
          return { ok: false, error: "当前活动暂不可报名。" };
        }

        if (getActivityEndBoundary(activity) <= new Date()) {
          return { ok: false, error: "活动已结束，不能继续报名。" };
        }

        const existingParticipation = await tx.activityParticipant.findUnique({
          where: {
            activityId_userProfileId: {
              activityId: activity.id,
              userProfileId: profile.id,
            },
          },
          select: {
            id: true,
            status: true,
          },
        });

        if (
          existingParticipation &&
          existingParticipantStatuses.includes(existingParticipation.status)
        ) {
          return { ok: false, error: "你已经报名过这个活动。" };
        }

        if (activity._count.participants >= activity.capacity) {
          return { ok: false, error: "活动名额已满，不能继续报名。" };
        }

        const nextStatus: ParticipantStatus = activity.requiresApproval
          ? "PENDING"
          : "APPROVED";

        if (existingParticipation) {
          await tx.activityParticipant.update({
            where: {
              id: existingParticipation.id,
            },
            data: {
              status: nextStatus,
              message,
              joinedAt: new Date(),
              cancelledAt: null,
            },
          });
        } else {
          await tx.activityParticipant.create({
            data: {
              activityId: activity.id,
              userProfileId: profile.id,
              status: nextStatus,
              message,
            },
          });
        }

        return { ok: true };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!joinResult.ok) {
      return {
        formError: joinResult.error,
        values: {
          message: rawInput.message,
        },
      };
    }
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return {
        formError: "你已经报名过这个活动。",
        values: {
          message: rawInput.message,
        },
      };
    }

    if (isPrismaTransactionConflictError(error)) {
      return {
        formError: "报名人数刚刚发生变化，请刷新后重试。",
        values: {
          message: rawInput.message,
        },
      };
    }

    console.error("Failed to join activity", error);

    return {
      formError: "报名失败，请稍后重试。",
      values: {
        message: rawInput.message,
      },
    };
  }

  const activityPath = withLocale(
    result.data.locale,
    `/activities/${result.data.activityId}`,
  );
  revalidatePath(activityPath);
  redirect(activityPath);
}
