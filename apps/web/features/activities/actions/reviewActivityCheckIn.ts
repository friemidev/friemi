"use server";

import { z } from "zod";
import { ensureCurrentUserProfileSnapshot } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  applyStandardTrustScoreEvent,
  removeTrustScoreEvent,
} from "@/features/trust/trustScoreEvents";
import { getActivityDetailPath } from "../utils/activityRoutes";

const reviewActivityCheckInSchema = z.object({
  activityId: z.string().min(1),
  decision: z.enum(["confirm", "cancel"]),
  locale: z.string().min(1).default("zh-CN"),
  participationId: z.string().min(1),
});

const confirmAllActivityCheckInsSchema = z.object({
  activityId: z.string().min(1),
  locale: z.string().min(1).default("zh-CN"),
});

const confirmSelectedActivityCheckInsSchema = z.object({
  activityId: z.string().min(1),
  locale: z.string().min(1).default("zh-CN"),
  selectedParticipationIds: z.array(z.string().min(1)).default([]),
});

export type ReviewActivityCheckInState = {
  success?: boolean;
  confirmedCount?: number;
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
      failed: "Impossible de mettre a jour ce pointage.",
      forbidden: "Seuls les organisateurs et managers peuvent confirmer.",
      invalid: "Demande invalide.",
      missing: "Ce pointage est introuvable.",
      none: "Aucun pointage en attente.",
    };
  }

  if (locale === "en") {
    return {
      failed: "Could not update this check-in.",
      forbidden: "Only organizers and managers can confirm check-ins.",
      invalid: "Invalid request.",
      missing: "This check-in was not found.",
      none: "No pending check-ins.",
    };
  }

  return {
    failed: "暂时无法更新这个签到。",
    forbidden: "只有组局发起人和管理人员可以确认签到。",
    invalid: "请求无效。",
    missing: "没有找到这个签到记录。",
    none: "暂无待确认签到。",
  };
}

async function ensureCanManageActivityCheckIns({
  activityId,
  managerProfileId,
}: {
  activityId: string;
  managerProfileId: string;
}) {
  const activity = await prisma.activity.findUnique({
    where: {
      id: activityId,
    },
    select: {
      organizerId: true,
      coManagers: {
        where: {
          managerProfileId,
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  return Boolean(
    activity &&
      (activity.organizerId === managerProfileId ||
        activity.coManagers.length > 0),
  );
}

export async function reviewActivityCheckInAction(
  _previousState: ReviewActivityCheckInState,
  formData: FormData,
): Promise<ReviewActivityCheckInState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    decision: getString(formData, "decision"),
    locale: getString(formData, "locale") || "zh-CN",
    participationId: getString(formData, "participationId"),
  };
  const result = reviewActivityCheckInSchema.safeParse(rawInput);
  const copy = getCopy(rawInput.locale);

  if (!result.success) {
    return { formError: copy.invalid };
  }

  let profile: Awaited<ReturnType<typeof ensureCurrentUserProfileSnapshot>>;

  try {
    profile = await ensureCurrentUserProfileSnapshot(
      result.data.locale,
      getActivityDetailPath(result.data.activityId),
    );
  } catch (error) {
    console.error("Failed to resolve viewer profile for check-in review", error);
    return { formError: copy.failed };
  }

  try {
    const reviewResult = await prisma.$transaction(async (tx) => {
      const participation = await tx.activityParticipant.findUnique({
        where: {
          id: result.data.participationId,
        },
        select: {
          activityId: true,
          checkInRequestedAt: true,
          checkedInAt: true,
          status: true,
          userProfileId: true,
          activity: {
            select: {
              organizerId: true,
              coManagers: {
                where: {
                  managerProfileId: profile.id,
                },
                select: {
                  id: true,
                },
                take: 1,
              },
            },
          },
        },
      });

      if (
        !participation ||
        participation.activityId !== result.data.activityId
      ) {
        return { ok: false as const, reason: "missing" as const };
      }

      const canManage =
        participation.activity.organizerId === profile.id ||
        participation.activity.coManagers.length > 0;

      if (!canManage) {
        return { ok: false as const, reason: "forbidden" as const };
      }

      if (!["JOINED", "APPROVED"].includes(participation.status)) {
        return { ok: false as const, reason: "missing" as const };
      }

      if (result.data.decision === "confirm") {
        if (!participation.checkInRequestedAt && !participation.checkedInAt) {
          return { ok: false as const, reason: "missing" as const };
        }

        await tx.activityParticipant.update({
          where: {
            id: result.data.participationId,
          },
          data: {
            checkedInAt: participation.checkedInAt ?? new Date(),
            checkInCancelledAt: null,
            checkInReviewedById: profile.id,
          },
        });

        await applyStandardTrustScoreEvent(tx, {
          activityId: result.data.activityId,
          note: "Hangout check-in confirmed by organizer or manager",
          profileId: participation.userProfileId,
          type: "ACTIVITY_CHECK_IN",
        });
        await removeTrustScoreEvent(tx, {
          activityId: result.data.activityId,
          profileId: participation.userProfileId,
          type: "NO_SHOW",
        });

        return { ok: true as const };
      }

      await tx.activityParticipant.update({
        where: {
          id: result.data.participationId,
        },
        data: {
          checkInRequestedAt: null,
          checkedInAt: null,
          checkInCancelledAt: new Date(),
          checkInReviewedById: profile.id,
        },
      });

      await removeTrustScoreEvent(tx, {
        activityId: result.data.activityId,
        profileId: participation.userProfileId,
        type: "ACTIVITY_CHECK_IN",
      });

      return { ok: true as const };
    });

    if (!reviewResult.ok) {
      return {
        formError:
          reviewResult.reason === "forbidden" ? copy.forbidden : copy.missing,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to review activity check-in", error);
    return { formError: copy.failed };
  }
}

export async function confirmAllPendingActivityCheckInsAction(
  _previousState: ReviewActivityCheckInState,
  formData: FormData,
): Promise<ReviewActivityCheckInState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
  };
  const result = confirmAllActivityCheckInsSchema.safeParse(rawInput);
  const copy = getCopy(rawInput.locale);

  if (!result.success) {
    return { formError: copy.invalid };
  }

  let profile: Awaited<ReturnType<typeof ensureCurrentUserProfileSnapshot>>;

  try {
    profile = await ensureCurrentUserProfileSnapshot(
      result.data.locale,
      getActivityDetailPath(result.data.activityId),
    );
  } catch (error) {
    console.error("Failed to resolve viewer profile for batch check-in", error);
    return { formError: copy.failed };
  }

  try {
    const canManage = await ensureCanManageActivityCheckIns({
      activityId: result.data.activityId,
      managerProfileId: profile.id,
    });

    if (!canManage) {
      return { formError: copy.forbidden };
    }

    const now = new Date();
    const confirmResult = await prisma.$transaction(async (tx) => {
      const pendingParticipants = await tx.activityParticipant.findMany({
        where: {
          activityId: result.data.activityId,
          checkInRequestedAt: {
            not: null,
          },
          checkedInAt: null,
          status: {
            in: ["JOINED", "APPROVED"],
          },
        },
        select: {
          id: true,
          userProfileId: true,
        },
      });

      if (pendingParticipants.length === 0) {
        return { confirmedCount: 0 };
      }

      await tx.activityParticipant.updateMany({
        where: {
          id: {
            in: pendingParticipants.map((participant) => participant.id),
          },
        },
        data: {
          checkedInAt: now,
          checkInCancelledAt: null,
          checkInReviewedById: profile.id,
        },
      });

      await Promise.all(
        pendingParticipants.map((participant) =>
          applyStandardTrustScoreEvent(tx, {
            activityId: result.data.activityId,
            note: "Hangout check-in confirmed in batch",
            profileId: participant.userProfileId,
            type: "ACTIVITY_CHECK_IN",
          }).then(() =>
            removeTrustScoreEvent(tx, {
              activityId: result.data.activityId,
              profileId: participant.userProfileId,
              type: "NO_SHOW",
            }),
          ),
        ),
      );

      return { confirmedCount: pendingParticipants.length };
    });

    if (confirmResult.confirmedCount === 0) {
      return { formError: copy.none };
    }

    return {
      confirmedCount: confirmResult.confirmedCount,
      success: true,
    };
  } catch (error) {
    console.error("Failed to confirm all activity check-ins", error);
    return { formError: copy.failed };
  }
}

export async function confirmSelectedActivityCheckInsAction(
  _previousState: ReviewActivityCheckInState,
  formData: FormData,
): Promise<ReviewActivityCheckInState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
    selectedParticipationIds: getStrings(formData, "selectedParticipationIds"),
  };
  const result = confirmSelectedActivityCheckInsSchema.safeParse(rawInput);
  const copy = getCopy(rawInput.locale);

  if (!result.success) {
    return { formError: copy.invalid };
  }

  let profile: Awaited<ReturnType<typeof ensureCurrentUserProfileSnapshot>>;

  try {
    profile = await ensureCurrentUserProfileSnapshot(
      result.data.locale,
      getActivityDetailPath(result.data.activityId),
    );
  } catch (error) {
    console.error("Failed to resolve viewer profile for selected check-ins", error);
    return { formError: copy.failed };
  }

  try {
    const canManage = await ensureCanManageActivityCheckIns({
      activityId: result.data.activityId,
      managerProfileId: profile.id,
    });

    if (!canManage) {
      return { formError: copy.forbidden };
    }

    const selectedIds = Array.from(new Set(result.data.selectedParticipationIds));
    const now = new Date();
    const reviewResult = await prisma.$transaction(async (tx) => {
      const participants = await tx.activityParticipant.findMany({
        where: {
          activityId: result.data.activityId,
          status: {
            in: ["JOINED", "APPROVED"],
          },
        },
        select: {
          id: true,
          userProfileId: true,
        },
      });
      const participantIds = participants.map((participant) => participant.id);
      const selectedParticipants = participants.filter((participant) =>
        selectedIds.includes(participant.id),
      );
      const cancelledParticipants = participants.filter(
        (participant) => !selectedIds.includes(participant.id),
      );

      if (selectedParticipants.length > 0) {
        await tx.activityParticipant.updateMany({
          where: {
            id: {
              in: selectedParticipants.map((participant) => participant.id),
            },
          },
          data: {
            checkedInAt: now,
            checkInCancelledAt: null,
            checkInReviewedById: profile.id,
          },
        });

        await Promise.all(
          selectedParticipants.map((participant) =>
            applyStandardTrustScoreEvent(tx, {
              activityId: result.data.activityId,
              note: "Hangout check-in confirmed from roster",
              profileId: participant.userProfileId,
              type: "ACTIVITY_CHECK_IN",
            }).then(() =>
              removeTrustScoreEvent(tx, {
                activityId: result.data.activityId,
                profileId: participant.userProfileId,
                type: "NO_SHOW",
              }),
            ),
          ),
        );
      }

      if (cancelledParticipants.length > 0) {
        await tx.activityParticipant.updateMany({
          where: {
            id: {
              in: cancelledParticipants.map((participant) => participant.id),
            },
            OR: [
              {
                checkInRequestedAt: {
                  not: null,
                },
              },
              {
                checkedInAt: {
                  not: null,
                },
              },
            ],
          },
          data: {
            checkInRequestedAt: null,
            checkedInAt: null,
            checkInCancelledAt: now,
            checkInReviewedById: profile.id,
          },
        });

        await Promise.all(
          cancelledParticipants.map((participant) =>
            removeTrustScoreEvent(tx, {
              activityId: result.data.activityId,
              profileId: participant.userProfileId,
              type: "ACTIVITY_CHECK_IN",
            }),
          ),
        );
      }

      return {
        confirmedCount: selectedParticipants.length,
        reviewedCount: participantIds.length,
      };
    });

    return {
      confirmedCount: reviewResult.confirmedCount,
      success: true,
    };
  } catch (error) {
    console.error("Failed to confirm selected activity check-ins", error);
    return { formError: copy.failed };
  }
}
