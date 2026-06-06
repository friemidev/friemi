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
import { normalizeAnalyticsLocale } from "@/features/analytics/events";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { trackAnalyticsEvent } from "@/features/analytics/server";
import { createNotification } from "@/features/notifications/utils/createNotification";

const activeParticipantStatuses: ParticipantStatus[] = ["JOINED", "APPROVED"];
const existingParticipantStatuses: ParticipantStatus[] = [
  "JOINED",
  "APPROVED",
  "PENDING",
];
const joinableActivityStatuses: ActivityStatus[] = ["RECRUITING", "CONFIRMED"];
const joinableActivityVisibility: ActivityVisibility[] = [
  "PUBLIC",
  "PRIVATE",
];
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

type JoinFailureReasonCode =
  | "activity_ended"
  | "activity_full"
  | "activity_unavailable"
  | "already_joined"
  | "concurrency_conflict"
  | "organizer_self_join"
  | "required_field_missing"
  | "submit_failed";

function getJoinFailure(
  error: string,
  reasonCode: JoinFailureReasonCode,
) {
  return {
    ok: false as const,
    error,
    reasonCode,
  };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

async function trackJoinFormFailure({
  activityId,
  locale,
  profileId,
  reasonCode,
}: {
  activityId: string;
  locale: string;
  profileId?: string | null;
  reasonCode: JoinFailureReasonCode;
}) {
  await trackAnalyticsEvent(
    {
      locale: normalizeAnalyticsLocale(locale),
      name: "form_submit_failed",
      route: activityId ? `/${locale}/activities/${activityId}` : `/${locale}/activities`,
      entityId: activityId || undefined,
      entityType: activityId ? "team" : undefined,
      sourceSurface: "activity_detail",
      properties: {
        form_name: "join_activity",
        reason_code: reasonCode,
      },
    },
    {
      userProfileId: profileId,
    },
  );
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
    await trackJoinFormFailure({
      activityId: rawInput.activityId,
      locale: rawInput.locale,
      reasonCode: "required_field_missing",
    });

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
          return getJoinFailure(
            "活动不存在或已不可见。",
            "activity_unavailable",
          );
        }

        if (
          !joinableActivityVisibility.includes(activity.visibility) ||
          !activeOrganizerStatuses.includes(activity.organizer.status)
        ) {
          return getJoinFailure(
            "活动不存在或已不可见。",
            "activity_unavailable",
          );
        }

        if (
          activity.visibility === "PRIVATE" &&
          activity.organizerId !== profile.id
        ) {
          const friendship = await tx.friendship.findFirst({
            where: {
              OR: [
                {
                  userAId: profile.id,
                  userBId: activity.organizerId,
                },
                {
                  userAId: activity.organizerId,
                  userBId: profile.id,
                },
              ],
            },
            select: {
              id: true,
            },
          });

          if (!friendship) {
            return getJoinFailure(
              "这是私人局，仅发起人的好友可以报名。",
              "activity_unavailable",
            );
          }
        }

        if (activity.organizerId === profile.id) {
          return getJoinFailure(
            "你是活动发起人，不需要报名自己的活动。",
            "organizer_self_join",
          );
        }

        if (activity.status === "CANCELLED") {
          return getJoinFailure("活动已取消，不能继续报名。", "activity_ended");
        }

        if (activity.status === "ENDED") {
          return getJoinFailure("活动已结束，不能继续报名。", "activity_ended");
        }

        if (!joinableActivityStatuses.includes(activity.status)) {
          return getJoinFailure("当前活动暂不可报名。", "activity_unavailable");
        }

        if (getActivityEndBoundary(activity) <= new Date()) {
          return getJoinFailure("活动已结束，不能继续报名。", "activity_ended");
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
          return getJoinFailure("你已经报名过这个活动。", "already_joined");
        }

        if (
          activity.capacity > 0 &&
          activity._count.participants >= activity.capacity
        ) {
          return getJoinFailure("活动名额已满，不能继续报名。", "activity_full");
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

        await createNotification(tx, {
          activityId: activity.id,
          recipientId: profile.id,
          type:
            nextStatus === "PENDING"
              ? "PARTICIPATION_PENDING"
              : "PARTICIPATION_CONFIRMED",
        });

        if (nextStatus === "PENDING") {
          await createNotification(tx, {
            actorId: profile.id,
            activityId: activity.id,
            recipientId: activity.organizerId,
            type: "PARTICIPATION_PENDING",
          });
        }

        return {
          ok: true as const,
          activityId: activity.id,
          participantStatus: nextStatus,
          requiresApproval: activity.requiresApproval,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!joinResult.ok) {
      await trackJoinFormFailure({
        activityId: result.data.activityId,
        locale: result.data.locale,
        profileId: profile.id,
        reasonCode: joinResult.reasonCode,
      });

      return {
        formError: joinResult.error,
        values: {
          message: rawInput.message,
        },
      };
    }

    await trackAnalyticsEvent(
    {
        locale: normalizeAnalyticsLocale(result.data.locale),
        name: "join_submitted",
        route: `/${result.data.locale}/activities/${joinResult.activityId}`,
        entityId: joinResult.activityId,
        entityType: "team",
        sourceSurface: "activity_detail",
        properties: {
          participant_status: joinResult.participantStatus,
          requires_approval: joinResult.requiresApproval,
        },
      },
      {
        userProfileId: profile.id,
      },
    );
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      await trackJoinFormFailure({
        activityId: result.data.activityId,
        locale: result.data.locale,
        profileId: profile.id,
        reasonCode: "already_joined",
      });

      return {
        formError: "你已经报名过这个活动。",
        values: {
          message: rawInput.message,
        },
      };
    }

    if (isPrismaTransactionConflictError(error)) {
      await trackJoinFormFailure({
        activityId: result.data.activityId,
        locale: result.data.locale,
        profileId: profile.id,
        reasonCode: "concurrency_conflict",
      });

      return {
        formError: "报名人数已更新，请稍后再试。",
        values: {
          message: rawInput.message,
        },
      };
    }

    console.error("Failed to join activity", error);
    await trackJoinFormFailure({
      activityId: result.data.activityId,
      locale: result.data.locale,
      profileId: profile.id,
      reasonCode: "submit_failed",
    });

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
  revalidatePath(withLocale(result.data.locale, "/notifications"));
  revalidatePath(withLocale(result.data.locale, "/"), "layout");
  redirect(activityPath);
}
