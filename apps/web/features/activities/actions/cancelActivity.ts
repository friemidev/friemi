"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActivityStatus, ParticipantStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { createNotifications } from "@/features/notifications/utils/createNotification";

const cancellableActivityStatuses: ActivityStatus[] = [
  "OPEN",
  "FULL",
  "RECRUITING",
  "CONFIRMED",
];
const notifiableParticipantStatuses: ParticipantStatus[] = [
  "JOINED",
  "PENDING",
  "APPROVED",
];

const cancelActivitySchema = z.object({
  activityId: z.string().min(1, "活动不存在"),
  locale: z.string().min(1).default("zh-CN"),
});

export type CancelActivityState = {
  formError?: string;
};

type CancelActivityResult =
  | {
      ok: true;
      activityId: string;
    }
  | {
      ok: false;
      error: string;
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
  revalidatePath(withLocale(locale, "/profile"));
  revalidatePath(withLocale(locale, "/notifications"));
  revalidatePath(withLocale(locale, "/"), "layout");

  return activityPath;
}

function isPrismaTransactionConflictError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function cancelActivityAction(
  _previousState: CancelActivityState,
  formData: FormData,
): Promise<CancelActivityState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
  };
  const result = cancelActivitySchema.safeParse(rawInput);
  const t = getCopy(rawInput.locale).activityOwner;

  if (!result.success) {
    return {
      formError: t.refreshError,
    };
  }

  const actionCopy = getCopy(result.data.locale).activityOwner;
  const profile = await ensureCurrentUserProfile(result.data.locale);
  let cancelledActivityId: string;

  try {
    const cancelResult = await prisma.$transaction(
      async (tx): Promise<CancelActivityResult> => {
        const activity = await tx.activity.findFirst({
          where: {
            id: result.data.activityId,
            organizerId: profile.id,
          },
          select: {
            id: true,
            endAt: true,
            startAt: true,
            status: true,
            participants: {
              where: {
                status: {
                  in: notifiableParticipantStatuses,
                },
              },
              select: {
                userProfileId: true,
              },
            },
          },
        });

        if (!activity) {
          return {
            ok: false,
            error: actionCopy.permissionError,
          };
        }

        if (activity.status === "CANCELLED") {
          return {
            ok: true,
            activityId: activity.id,
          };
        }

        if (!cancellableActivityStatuses.includes(activity.status)) {
          return {
            ok: false,
            error: actionCopy.statusError,
          };
        }

        if ((activity.endAt ?? activity.startAt) <= new Date()) {
          return {
            ok: false,
            error: actionCopy.endedError,
          };
        }

        await tx.activity.update({
          where: {
            id: activity.id,
          },
          data: {
            status: "CANCELLED",
          },
        });

        await createNotifications(
          tx,
          activity.participants.map((participant) => ({
            actorId: profile.id,
            activityId: activity.id,
            recipientId: participant.userProfileId,
            type: "ACTIVITY_CANCELLED",
          })),
        );

        return {
          ok: true,
          activityId: activity.id,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!cancelResult.ok) {
      return {
        formError: cancelResult.error,
      };
    }

    cancelledActivityId = cancelResult.activityId;
  } catch (error) {
    if (isPrismaTransactionConflictError(error)) {
      return {
        formError: actionCopy.conflictError,
      };
    }

    console.error("Failed to cancel activity", error);

    return {
      formError: actionCopy.failedError,
    };
  }

  redirect(refreshActivityViews(result.data.locale, cancelledActivityId));
}
