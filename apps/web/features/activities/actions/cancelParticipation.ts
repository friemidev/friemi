"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ParticipantStatus } from "@prisma/client";
import { z } from "zod";
import { createNotification } from "@/features/notifications/utils/createNotification";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
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
  revalidatePath(withLocale(locale, "/lobby"));
  revalidatePath(withLocale(locale, "/notifications"));
  revalidatePath(withLocale(locale, "/profile"));
  revalidatePath(withLocale(locale, "/"));
  revalidatePath(withLocale(locale, "/"), "layout");

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
  const fallbackCopy = getCopy(rawInput.locale).join;

  if (!result.success) {
    return {
      formError: fallbackCopy.refreshError,
    };
  }

  const actionCopy = getCopy(result.data.locale).join;
  const profile = await ensureCurrentUserProfile(result.data.locale);
  let cancelled = false;
  let alreadyCancelled = false;

  try {
    await prisma.$transaction(async (tx) => {
      const participation = await tx.activityParticipant.findUnique({
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
      });

      if (!participation) {
        throw new Error("PARTICIPATION_NOT_FOUND");
      }

      if (!cancellableParticipantStatuses.includes(participation.status)) {
        if (participation.status === "CANCELLED") {
          alreadyCancelled = true;
          return;
        }

        throw new Error("PARTICIPATION_NOT_CANCELLABLE");
      }

      await tx.activityParticipant.update({
        where: {
          id: participation.id,
        },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      });

      if (participation.activity.organizerId !== profile.id) {
        await createNotification(tx, {
          actorId: profile.id,
          activityId: participation.activity.id,
          recipientId: participation.activity.organizerId,
          type: "PARTICIPATION_CANCELLED",
        });
      }

      cancelled = true;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PARTICIPATION_NOT_FOUND") {
      return {
        formError: actionCopy.missingError,
      };
    }

    if (
      error instanceof Error &&
      error.message === "PARTICIPATION_NOT_CANCELLABLE"
    ) {
      return {
        formError: actionCopy.statusError,
      };
    }

    if (alreadyCancelled) {
      return {
        formError: undefined,
      };
    }

    console.error("Failed to cancel participation", error);

    return {
      formError: actionCopy.failedError,
    };
  }

  if (alreadyCancelled) {
    redirect(refreshActivityViews(result.data.locale, result.data.activityId));
  }

  if (!cancelled) {
    return {
      formError: actionCopy.failedError,
    };
  }

  redirect(refreshActivityViews(result.data.locale, result.data.activityId));
}
