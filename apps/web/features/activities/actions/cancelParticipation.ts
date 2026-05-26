"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ParticipantStatus } from "@prisma/client";
import { z } from "zod";
import { ensureCurrentUserProfile } from "@/lib/auth";
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
  formError?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function refreshActivityViews(locale: string, activityId: string) {
  const activityPath = withLocale(locale, `/activities/${activityId}`);

  revalidatePath(activityPath);
  revalidatePath(withLocale(locale, "/activities"));
  revalidatePath(withLocale(locale, "/"));

  return activityPath;
}

export async function cancelParticipationAction(
  _previousState: CancelParticipationState,
  formData: FormData,
): Promise<CancelParticipationState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
  };
  const result = cancelParticipationSchema.safeParse(rawInput);

  if (!result.success) {
    return {
      formError: "请刷新页面后重试。",
    };
  }

  const profile = await ensureCurrentUserProfile(result.data.locale);
  let cancelled = false;
  let alreadyCancelled = false;

  try {
    const participation = await prisma.activityParticipant.findUnique({
      where: {
        activityId_userProfileId: {
          activityId: result.data.activityId,
          userProfileId: profile.id,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!participation) {
      return {
        formError: "你还没有报名这个活动。",
      };
    }

    if (!cancellableParticipantStatuses.includes(participation.status)) {
      if (participation.status === "CANCELLED") {
        alreadyCancelled = true;
        return;
      }

      return {
        formError: "当前报名状态不能取消。",
      };
    }

    await prisma.activityParticipant.update({
      where: {
        id: participation.id,
      },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });
    cancelled = true;
  } catch (error) {
    console.error("Failed to cancel participation", error);

    return {
      formError: "取消报名失败，请稍后重试。",
    };
  }

  if (alreadyCancelled) {
    redirect(refreshActivityViews(result.data.locale, result.data.activityId));
  }

  if (!cancelled) {
    return {
      formError: "取消报名失败，请稍后重试。",
    };
  }

  redirect(refreshActivityViews(result.data.locale, result.data.activityId));
}
