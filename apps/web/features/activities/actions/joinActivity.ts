"use server";

import type {
  ActivityStatus,
  ActivityVisibility,
  ParticipantStatus,
  UserProfileStatus,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { normalizeAnalyticsLocale } from "@/features/analytics/events";
import {
  createLatencyTimer,
  recordOperationLatency,
} from "@/features/analytics/latency";
import { queueAnalyticsEvent } from "@/features/analytics/server";
import { ensureCurrentUserProfileSnapshot } from "@/lib/auth";
import { createActionPerformanceTracker } from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/features/notifications/utils/createNotification";
import {
  normalizeGuestEmail,
  normalizeGuestWechatId,
} from "@/features/guest-participants/utils/contactIdentity";

const activeParticipantStatuses: ParticipantStatus[] = ["JOINED", "APPROVED"];
const existingGuestStatuses: ParticipantStatus[] = ["JOINED", "APPROVED", "PENDING"];
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
  accessToken: z.string().trim().optional(),
  message: z.string().trim().max(300, "留言最多 300 个字").optional(),
});

export type JoinActivityState = {
  activityId?: string;
  formError?: string;
  fieldErrors?: Record<string, string[]>;
  participantStatus?:
    | "JOINED"
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED"
    | null;
  success?: boolean;
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
  queueAnalyticsEvent(
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
    { userProfileId: profileId },
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
  const getDurationMs = createLatencyTimer();
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
    accessToken: getString(formData, "accessToken") || undefined,
    message: getString(formData, "message"),
  };
  const recordLatency = ({
    properties,
    status,
    statusReason,
    userProfileId,
  }: {
    properties?: Record<string, string | number | boolean | null | undefined>;
    status: "failed" | "success";
    statusReason?: string | null;
    userProfileId?: string | null;
  }) => {
    recordOperationLatency({
      durationMs: getDurationMs(),
      entityId: rawInput.activityId || undefined,
      entityType: rawInput.activityId ? "team" : undefined,
      locale: rawInput.locale,
      operationKey: "join_activity",
      route: rawInput.activityId
        ? `/${rawInput.locale}/activities/${rawInput.activityId}`
        : `/${rawInput.locale}/activities`,
      sourceSurface: "activity_detail",
      status,
      statusReason,
      userProfileId,
      properties,
    });
  };
  const result = joinActivitySchema.safeParse(rawInput);
  const perf = createActionPerformanceTracker({
    action: "join_activity",
    metadata: {
      locale: rawInput.locale,
      targetId: rawInput.activityId || undefined,
    },
  });

  if (!result.success) {
    recordLatency({
      status: "failed",
      statusReason: "required_field_missing",
    });

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

  let profile: Awaited<ReturnType<typeof ensureCurrentUserProfileSnapshot>>;
  try {
    profile = await perf.measure("viewer_profile", () =>
      ensureCurrentUserProfileSnapshot(
        result.data.locale,
        `/activities/${result.data.activityId}`,
      ),
    );
  } catch (error) {
    console.error("Failed to resolve viewer profile for join", error);
    recordLatency({
      status: "failed",
      statusReason: "submit_failed",
    });

    return {
      formError: "报名暂时不可用，请稍后重试。",
      values: {
        message: rawInput.message,
      },
    };
  }
  const message = result.data.message?.trim() || null;
  let successfulParticipantStatus: ParticipantStatus | null = null;

  try {
    const joinResult = await perf.measure("transaction", () =>
      prisma.$transaction(
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
            shareEnabled: true,
            shareToken: true,
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
                guestParticipants: {
                  where: {
                    linkedParticipantId: null,
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

        let hasFriendshipAccess = false;
        let hasSharedLinkAccess = false;

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

          hasFriendshipAccess = Boolean(friendship);
          hasSharedLinkAccess =
            Boolean(result.data.accessToken) &&
            activity.shareEnabled &&
            activity.shareToken === result.data.accessToken;

          if (!hasFriendshipAccess && !hasSharedLinkAccess) {
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

        const profileNormalizedWechatId = normalizeGuestWechatId(profile.normalizedWechatId);
        const profileNormalizedEmail = normalizeGuestEmail(
          profile.emailVerifiedAt ? profile.email : null,
        );
        const guestDuplicateConditions: Prisma.GuestActivityParticipantWhereInput[] =
          [];

        if (profileNormalizedWechatId) {
          guestDuplicateConditions.push({
            normalizedWechatId: profileNormalizedWechatId,
          });
        }

        if (profileNormalizedEmail) {
          guestDuplicateConditions.push({
            normalizedEmail: profileNormalizedEmail,
          });
        }

        if (guestDuplicateConditions.length > 0) {
          const existingGuestRecord = await tx.guestActivityParticipant.findFirst({
            where: {
              activityId: activity.id,
              linkedParticipantId: null,
              status: { in: existingGuestStatuses },
              OR: guestDuplicateConditions,
            },
            select: { id: true },
          });

          if (existingGuestRecord) {
            return getJoinFailure(
              "你已以游客身份报名过，请在个人页面绑定邮箱或微信号来关联记录。",
              "already_joined",
            );
          }
        }

        if (
          activity.capacity > 0 &&
          activity._count.participants + activity._count.guestParticipants >=
            activity.capacity
        ) {
          return getJoinFailure("活动名额已满，不能继续报名。", "activity_full");
        }

        const nextStatus: ParticipantStatus =
          activity.visibility === "PRIVATE" &&
          !hasFriendshipAccess &&
          hasSharedLinkAccess
            ? "PENDING"
            : activity.requiresApproval
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

        return {
          ok: true as const,
          activityId: activity.id,
          organizerId: activity.organizerId,
          participantStatus: nextStatus,
          requiresApproval: activity.requiresApproval,
        };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      ),
    );

    if (!joinResult.ok) {
      recordLatency({
        status: "failed",
        statusReason: joinResult.reasonCode,
        userProfileId: profile.id,
      });

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

    void createNotification(prisma, {
      activityId: joinResult.activityId,
      recipientId: profile.id,
      type:
        joinResult.participantStatus === "PENDING"
          ? "PARTICIPATION_PENDING"
          : "PARTICIPATION_CONFIRMED",
    }).catch((error) => {
      console.error("Failed to create participant notification", error);
    });

    if (joinResult.participantStatus === "PENDING") {
      void createNotification(prisma, {
        actorId: profile.id,
        activityId: joinResult.activityId,
        recipientId: joinResult.organizerId,
        type: "PARTICIPATION_PENDING",
      }).catch((error) => {
        console.error("Failed to create organizer notification", error);
      });
    }

    const analyticsStartedAt = performance.now();
    queueAnalyticsEvent(
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
    perf.mark("analytics", performance.now() - analyticsStartedAt);
    recordLatency({
      properties: {
        participant_status: joinResult.participantStatus,
        requires_approval: joinResult.requiresApproval,
      },
      status: "success",
      userProfileId: profile.id,
    });
    successfulParticipantStatus = joinResult.participantStatus;
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      recordLatency({
        status: "failed",
        statusReason: "already_joined",
        userProfileId: profile.id,
      });

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
      recordLatency({
        status: "failed",
        statusReason: "concurrency_conflict",
        userProfileId: profile.id,
      });

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
    recordLatency({
      status: "failed",
      statusReason: "submit_failed",
      userProfileId: profile.id,
    });

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

  perf.finish({
    result: "success",
    userProfileId: profile.id,
  });
  return {
    activityId: result.data.activityId,
    participantStatus: successfulParticipantStatus,
    success: true,
    values: {
      message: "",
    },
  };
}
