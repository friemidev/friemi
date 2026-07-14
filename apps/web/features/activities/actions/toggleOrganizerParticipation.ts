"use server";

import { z } from "zod";
import { ensureCurrentUserProfileSnapshot } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActivityDetailPath } from "../utils/activityRoutes";

const toggleOrganizerParticipationSchema = z.object({
  activityId: z.string().min(1),
  locale: z.string().min(1).default("zh-CN"),
  nextState: z.enum(["participating", "not_participating"]),
});

export type ToggleOrganizerParticipationState = {
  formError?: string;
  isParticipating?: boolean;
  success?: boolean;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getToggleCopy(locale: string) {
  if (locale === "fr") {
    return {
      failed: "Impossible de mettre à jour votre participation pour l'instant.",
      forbidden: "Seul l'organisateur peut modifier cet état.",
      unavailable: "Cette activité n'est plus disponible.",
    };
  }

  if (locale === "en") {
    return {
      failed: "Could not update your participation right now.",
      forbidden: "Only the organizer can change this state.",
      unavailable: "This activity is no longer available.",
    };
  }

  return {
    failed: "暂时无法更新你的参与状态，请稍后重试。",
    forbidden: "只有发起人可以修改这个状态。",
    unavailable: "这个活动当前不可用。",
  };
}

export async function toggleOrganizerParticipationAction(
  _previousState: ToggleOrganizerParticipationState,
  formData: FormData,
): Promise<ToggleOrganizerParticipationState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
    nextState: getString(formData, "nextState"),
  };
  const result = toggleOrganizerParticipationSchema.safeParse(rawInput);
  const copy = getToggleCopy(rawInput.locale);

  if (!result.success) {
    return {
      formError: copy.failed,
    };
  }

  const profile = await ensureCurrentUserProfileSnapshot(
    result.data.locale,
    getActivityDetailPath(result.data.activityId),
  );
  const activity = await prisma.activity.findUnique({
    where: {
      id: result.data.activityId,
    },
    select: {
      id: true,
      organizerId: true,
      status: true,
    },
  });

  if (!activity) {
    return {
      formError: copy.unavailable,
    };
  }

  if (activity.organizerId !== profile.id) {
    return {
      formError: copy.forbidden,
    };
  }

  try {
    await prisma.activityParticipant.upsert({
      where: {
        activityId_userProfileId: {
          activityId: activity.id,
          userProfileId: profile.id,
        },
      },
      create: {
        activityId: activity.id,
        userProfileId: profile.id,
        status:
          result.data.nextState === "participating" ? "APPROVED" : "CANCELLED",
        cancelledAt:
          result.data.nextState === "participating" ? null : new Date(),
      },
      update: {
        status:
          result.data.nextState === "participating" ? "APPROVED" : "CANCELLED",
        cancelledAt:
          result.data.nextState === "participating" ? null : new Date(),
        joinedAt:
          result.data.nextState === "participating" ? new Date() : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to toggle organizer participation", error);

    return {
      formError: copy.failed,
    };
  }

  return {
    isParticipating: result.data.nextState === "participating",
    success: true,
  };
}
