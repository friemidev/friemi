"use server";

import { z } from "zod";
import { ensureCurrentUserProfileSnapshot } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActivityDetailPath } from "../utils/activityRoutes";

const checkInWindowBeforeMs = 6 * 60 * 60 * 1000;
const checkInWindowAfterMs = 24 * 60 * 60 * 1000;

const checkInActivitySchema = z.object({
  activityId: z.string().min(1),
  locale: z.string().min(1).default("zh-CN"),
});

export type CheckInActivityState = {
  success?: boolean;
  checkInRequestedAt?: string;
  formError?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      already: "Votre pointage est deja envoye.",
      closed: "Ce groupe ne peut pas etre pointe.",
      failed: "Impossible de pointer pour l'instant.",
      setup:
        "Le pointage est en cours d'installation. Reessayez apres la mise a jour.",
      forbidden: "Seuls les participants approuves peuvent pointer.",
      invalid: "Ce groupe est introuvable.",
      window: "Le pointage ouvre 6 h avant le debut et ferme 24 h apres la fin.",
    };
  }

  if (locale === "en") {
    return {
      already: "Your check-in has already been sent.",
      closed: "This hangout cannot be checked in.",
      failed: "Could not check in right now.",
      setup: "Check-in is still being set up. Try again after the database update.",
      forbidden: "Only approved participants can check in.",
      invalid: "This hangout was not found.",
      window: "Check-in opens 6 hours before start and closes 24 hours after the end.",
    };
  }

  return {
    already: "你已经提交过签到，等待组局管理人员确认。",
    closed: "这个组局当前不能签到。",
    failed: "暂时无法签到，请稍后再试。",
    setup: "签到功能正在同步数据库，请更新数据库后再试。",
    forbidden: "只有已通过的参与者可以签到。",
    invalid: "没有找到这个组局。",
    window: "签到会在开始前 6 小时开放，并在结束后 24 小时关闭。",
  };
}

export async function checkInActivityAction(
  _previousState: CheckInActivityState,
  formData: FormData,
): Promise<CheckInActivityState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
  };
  const result = checkInActivitySchema.safeParse(rawInput);
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
    console.error("Failed to resolve viewer profile for check-in", error);
    return { formError: copy.failed };
  }

  const now = new Date();

  try {
    const checkInResult = await prisma.$transaction(async (tx) => {
      const participation = await tx.activityParticipant.findFirst({
        where: {
          activityId: result.data.activityId,
          userProfileId: profile.id,
        },
        select: {
          id: true,
          checkInRequestedAt: true,
          checkedInAt: true,
          status: true,
          activity: {
            select: {
              endAt: true,
              id: true,
              startAt: true,
              status: true,
            },
          },
        },
      });

      if (!participation) {
        return { ok: false as const, reason: "forbidden" as const };
      }

      if (participation.checkInRequestedAt || participation.checkedInAt) {
        return {
          checkInRequestedAt:
            participation.checkInRequestedAt ?? participation.checkedInAt,
          ok: true as const,
        };
      }

      if (!["JOINED", "APPROVED"].includes(participation.status)) {
        return { ok: false as const, reason: "forbidden" as const };
      }

      if (participation.activity.status === "CANCELLED") {
        return { ok: false as const, reason: "closed" as const };
      }

      const checkInOpenAt = new Date(
        participation.activity.startAt.getTime() - checkInWindowBeforeMs,
      );
      const activityEndAt =
        participation.activity.endAt ?? participation.activity.startAt;
      const checkInCloseAt = new Date(
        activityEndAt.getTime() + checkInWindowAfterMs,
      );

      if (now < checkInOpenAt || now > checkInCloseAt) {
        return { ok: false as const, reason: "window" as const };
      }

      await tx.activityParticipant.update({
        where: {
          id: participation.id,
        },
        data: {
          checkInCancelledAt: null,
          checkInRequestedAt: now,
          checkInReviewedById: null,
        },
      });

      return {
        checkInRequestedAt: now,
        ok: true as const,
      };
    });

    if (!checkInResult.ok) {
      return {
        formError:
          checkInResult.reason === "window"
            ? copy.window
            : checkInResult.reason === "closed"
              ? copy.closed
              : copy.forbidden,
      };
    }

    return {
      checkInRequestedAt: checkInResult.checkInRequestedAt?.toISOString(),
      success: true,
    };
  } catch (error) {
    console.error("Failed to check in activity", error);
    const message = error instanceof Error ? error.message : "";

    return {
      formError:
        message.includes("checkInRequestedAt") ||
        message.includes("checkedInAt") ||
        message.includes("checkInCancelledAt")
          ? copy.setup
          : copy.failed,
    };
  }
}
