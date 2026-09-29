"use server";

import { z } from "zod";
import { ensureCurrentUserProfileSnapshot } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  applyStandardTrustScoreEvent,
  removeTrustScoreEvent,
} from "@/features/trust/trustScoreEvents";
import { isActivityEndedForTrustSettlement } from "@/features/trust/trustScore";
import { createNotifications } from "@/features/notifications/utils/createNotification";
import { syncActivitySocialRewards } from "@/features/social-rewards/services/socialRewardTriggers";
import { getActivityDetailPath } from "../utils/activityRoutes";
import { partitionActivityAttendance } from "../utils/attendancePolicy";

const saveActivityAttendanceSchema = z.object({
  absentParticipationIds: z.array(z.string().min(1)).default([]),
  activityId: z.string().min(1),
  locale: z.string().min(1).default("zh-CN"),
});

export type SaveActivityAttendanceState = {
  success?: boolean;
  absentCount?: number;
  presentCount?: number;
  formError?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getStrings(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string");
}

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      cancelled: "La presence ne peut pas etre enregistree pour ce groupe.",
      failed: "Impossible d'enregistrer les presences.",
      forbidden: "Seuls les organisateurs et managers peuvent le faire.",
      invalid: "Demande invalide.",
      notStarted: "La presence peut etre enregistree apres le debut du groupe.",
    };
  }

  if (locale === "en") {
    return {
      cancelled: "Attendance cannot be recorded for this plan.",
      failed: "Could not save attendance.",
      forbidden: "Only organizers and managers can record attendance.",
      invalid: "Invalid request.",
      notStarted: "Attendance can be recorded after the plan starts.",
    };
  }

  return {
    cancelled: "已取消的聚吧不能记录到场情况。",
    failed: "暂时无法保存到场情况，请稍后再试。",
    forbidden: "只有聚吧发起人和管理人员可以记录到场情况。",
    invalid: "请求无效。",
    notStarted: "聚吧开始后才能记录未到场人员。",
  };
}

export async function saveActivityAttendanceAction(
  _previousState: SaveActivityAttendanceState,
  formData: FormData,
): Promise<SaveActivityAttendanceState> {
  const rawInput = {
    absentParticipationIds: getStrings(formData, "absentParticipationIds"),
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
  };
  const result = saveActivityAttendanceSchema.safeParse(rawInput);
  const copy = getCopy(rawInput.locale);

  if (!result.success) {
    return { formError: copy.invalid };
  }

  let manager: Awaited<ReturnType<typeof ensureCurrentUserProfileSnapshot>>;

  try {
    manager = await ensureCurrentUserProfileSnapshot(
      result.data.locale,
      getActivityDetailPath(result.data.activityId),
    );
  } catch (error) {
    console.error("Failed to resolve attendance manager", error);
    return { formError: copy.failed };
  }

  try {
    const now = new Date();
    const attendanceResult = await prisma.$transaction(async (tx) => {
      const activity = await tx.activity.findUnique({
        where: {
          id: result.data.activityId,
        },
        select: {
          coManagers: {
            select: {
              managerProfileId: true,
            },
          },
          endAt: true,
          organizerId: true,
          startAt: true,
          status: true,
        },
      });

      if (!activity) {
        return { ok: false as const, reason: "invalid" as const };
      }

      const operatorProfileIds = [
        activity.organizerId,
        ...activity.coManagers.map((coManager) => coManager.managerProfileId),
      ];

      if (!operatorProfileIds.includes(manager.id)) {
        return { ok: false as const, reason: "forbidden" as const };
      }

      if (activity.status === "CANCELLED") {
        return { ok: false as const, reason: "cancelled" as const };
      }

      if (activity.startAt.getTime() > now.getTime()) {
        return { ok: false as const, reason: "notStarted" as const };
      }

      const participants = await tx.activityParticipant.findMany({
        where: {
          activityId: result.data.activityId,
          status: {
            in: ["JOINED", "APPROVED"],
          },
          userProfileId: {
            notIn: operatorProfileIds,
          },
        },
        select: {
          checkedInAt: true,
          id: true,
          userProfileId: true,
        },
      });
      const attendance = partitionActivityAttendance({
        absentParticipationIds: result.data.absentParticipationIds,
        participantIds: participants.map((participant) => participant.id),
      });
      const presentParticipants = participants.filter((participant) =>
        attendance.presentIds.includes(participant.id),
      );
      const absentParticipants = participants.filter((participant) =>
        attendance.absentIds.includes(participant.id),
      );

      if (presentParticipants.length > 0) {
        await tx.activityParticipant.updateMany({
          where: {
            id: {
              in: attendance.presentIds,
            },
          },
          data: {
            checkInCancelledAt: null,
            checkInRequestedAt: null,
            checkedInAt: now,
            checkInReviewedById: manager.id,
          },
        });

        await Promise.all(
          presentParticipants.map(async (participant) => {
            await applyStandardTrustScoreEvent(tx, {
              activityId: result.data.activityId,
              note: "Attendance confirmed by organizer or manager",
              profileId: participant.userProfileId,
              type: "ACTIVITY_CHECK_IN",
            });
            await removeTrustScoreEvent(tx, {
              activityId: result.data.activityId,
              profileId: participant.userProfileId,
              type: "NO_SHOW",
            });
          }),
        );

        await createNotifications(
          tx,
          presentParticipants
            .filter((participant) => !participant.checkedInAt)
            .map((participant) => ({
              activityId: result.data.activityId,
              dedupeIncludingRead: true,
              occurrenceId: `attendance-present:${participant.id}`,
              recipientId: participant.userProfileId,
              type: "ACTIVITY_CHECK_IN" as const,
            })),
        );
      }

      if (absentParticipants.length > 0) {
        await tx.activityParticipant.updateMany({
          where: {
            id: {
              in: attendance.absentIds,
            },
          },
          data: {
            checkInCancelledAt: now,
            checkInRequestedAt: null,
            checkedInAt: null,
            checkInReviewedById: manager.id,
          },
        });

        await Promise.all(
          absentParticipants.map(async (participant) => {
            await removeTrustScoreEvent(tx, {
              activityId: result.data.activityId,
              profileId: participant.userProfileId,
              type: "ACTIVITY_CHECK_IN",
            });

            if (isActivityEndedForTrustSettlement(activity, now)) {
              await applyStandardTrustScoreEvent(tx, {
                activityId: result.data.activityId,
                note: "Participant explicitly marked absent by organizer or manager",
                profileId: participant.userProfileId,
                type: "NO_SHOW",
              });
            }
          }),
        );
      }

      return {
        absentCount: absentParticipants.length,
        ok: true as const,
        presentCount: presentParticipants.length,
      };
    });

    if (!attendanceResult.ok) {
      return {
        formError:
          attendanceResult.reason === "forbidden"
            ? copy.forbidden
            : attendanceResult.reason === "notStarted"
              ? copy.notStarted
              : attendanceResult.reason === "cancelled"
                ? copy.cancelled
                : copy.invalid,
      };
    }

    if (attendanceResult.presentCount > 0) {
      await syncActivitySocialRewards({
        activityId: result.data.activityId,
      }).catch((error) => {
        console.error("Failed to sync rewards after attendance update", error);
      });
    }

    return {
      absentCount: attendanceResult.absentCount,
      presentCount: attendanceResult.presentCount,
      success: true,
    };
  } catch (error) {
    console.error("Failed to save activity attendance", error);
    return { formError: copy.failed };
  }
}
