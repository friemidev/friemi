"use server";

import type { ParticipantStatus } from "@prisma/client";
import { z } from "zod";
import {
  createLatencyTimer,
  recordOperationLatency,
} from "@/features/analytics/latency";
import { createNotification } from "@/features/notifications/utils/createNotification";
import { ensureCurrentUserProfileSnapshot } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { createActionPerformanceTracker } from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

const cancellableParticipantStatuses: ParticipantStatus[] = [
  "JOINED",
  "APPROVED",
  "PENDING",
];

const cancelParticipationSchema = z.object({
  activityId: z.string().min(1, "活动不存在"),
  locale: z.string().min(1).default("zh-CN"),
});

export type CancelParticipationState = {
  success?: boolean;
  formError?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export async function cancelParticipationAction(
  _previousState: CancelParticipationState,
  formData: FormData,
): Promise<CancelParticipationState> {
  const getDurationMs = createLatencyTimer();
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
  };
  const recordLatency = ({
    status,
    statusReason,
    userProfileId,
  }: {
    status: "failed" | "success";
    statusReason?: string | null;
    userProfileId?: string | null;
  }) => {
    recordOperationLatency({
      durationMs: getDurationMs(),
      entityId: rawInput.activityId || undefined,
      entityType: rawInput.activityId ? "team" : undefined,
      locale: rawInput.locale,
      operationKey: "cancel_participation",
      route: rawInput.activityId
        ? `/${rawInput.locale}/activities/${rawInput.activityId}`
        : `/${rawInput.locale}/activities`,
      sourceSurface: "activity_detail",
      status,
      statusReason,
      userProfileId,
    });
  };
  const result = cancelParticipationSchema.safeParse(rawInput);
  const fallbackCopy = getCopy(rawInput.locale).join;
  const perf = createActionPerformanceTracker({
    action: "cancel_participation",
    metadata: {
      locale: rawInput.locale,
      targetId: rawInput.activityId || undefined,
    },
  });

  if (!result.success) {
    recordLatency({
      status: "failed",
      statusReason: "invalid_request",
    });

    return {
      formError: fallbackCopy.refreshError,
    };
  }

  const actionCopy = getCopy(result.data.locale).join;
  let profile: Awaited<
    ReturnType<typeof ensureCurrentUserProfileSnapshot>
  >;
  try {
    profile = await perf.measure("viewer_profile", () =>
      ensureCurrentUserProfileSnapshot(
        result.data.locale,
        `/activities/${result.data.activityId}`,
      ),
    );
  } catch (error) {
    console.error("Failed to resolve viewer profile for cancellation", error);
    recordLatency({
      status: "failed",
      statusReason: "cancel_failed",
    });

    return {
      formError: actionCopy.failedError,
    };
  }
  const participation = await perf.measure("participation_lookup", () =>
    prisma.activityParticipant.findUnique({
      where: {
        activityId_userProfileId: {
          activityId: result.data.activityId,
          userProfileId: profile.id,
        },
      },
      select: {
        id: true,
        status: true,
        activity: {
          select: {
            id: true,
            organizerId: true,
          },
        },
      },
    }),
  );

  if (!participation) {
    recordLatency({
      status: "failed",
      statusReason: "participation_not_found",
      userProfileId: profile.id,
    });

    return {
      formError: actionCopy.missingError,
    };
  }

  if (participation.status === "CANCELLED") {
    recordLatency({
      status: "success",
      statusReason: "already_cancelled",
      userProfileId: profile.id,
    });
    perf.finish({
      result: "already_cancelled",
      userProfileId: profile.id,
    });
    return {
      success: true,
    };
  }

  if (!cancellableParticipantStatuses.includes(participation.status)) {
    recordLatency({
      status: "failed",
      statusReason: "participation_not_cancellable",
      userProfileId: profile.id,
    });

    return {
      formError: actionCopy.statusError,
    };
  }

  try {
    const updateResult = await perf.measure("participation_update", () =>
      prisma.activityParticipant.updateMany({
        where: {
          id: participation.id,
          status: {
            in: cancellableParticipantStatuses,
          },
        },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      }),
    );

    if (updateResult.count === 0) {
      recordLatency({
        status: "failed",
        statusReason: "participation_not_cancellable",
        userProfileId: profile.id,
      });

      return {
        formError: actionCopy.statusError,
      };
    }
  } catch (error) {
    console.error("Failed to cancel participation", error);
    recordLatency({
      status: "failed",
      statusReason: "cancel_failed",
      userProfileId: profile.id,
    });

    return {
      formError: actionCopy.failedError,
    };
  }

  recordLatency({
    status: "success",
    userProfileId: profile.id,
  });
  if (participation.activity.organizerId !== profile.id) {
    void createNotification(prisma, {
      actorId: profile.id,
      activityId: result.data.activityId,
      recipientId: participation.activity.organizerId,
      type: "PARTICIPATION_CANCELLED",
    }).catch((error) => {
      console.error("Failed to create cancellation notification", error);
    });
  }
  perf.finish({
    result: "success",
    userProfileId: profile.id,
  });
  return {
    success: true,
  };
}
