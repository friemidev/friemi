"use server";

import {
  isPersistentBookingActivity,
  getPersistentBookingCopy,
} from "../utils/persistentBookingActivity";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { ActivityStatus, ParticipantStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { createNotifications } from "@/features/notifications/utils/createNotification";
import { OPEN_LOBBY_ACTIVITIES_TAG } from "@/features/activities/queries/getActivityLobby";
import { isLegacyActivityInfoSource } from "@/features/activities/queries/getActivities";
import { assertCanManageActivity } from "../utils/activityManagement";
import { getActivityDetailPath } from "../utils/activityRoutes";

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

export type DeleteActivityState = {
  formError?: string;
};

type CancelActivityResult =
  | {
      ok: true;
      activityId: string;
      residencySlot?: { id: string; merchantId: string } | null;
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
  const activityPath = withLocale(locale, getActivityDetailPath(activityId));

  revalidateTag(OPEN_LOBBY_ACTIVITIES_TAG);
  revalidatePath(activityPath);
  revalidatePath(withLocale(locale, "/activities"));
  revalidatePath(withLocale(locale, "/lobby"));
  revalidatePath(withLocale(locale, "/"));
  revalidatePath(withLocale(locale, "/profile"));
  revalidatePath(withLocale(locale, "/notifications"));
  revalidatePath(withLocale(locale, "/"), "layout");

  return activityPath;
}

function refreshDeletedActivityViews(locale: string, activityId: string) {
  const activityPath = withLocale(locale, getActivityDetailPath(activityId));

  revalidateTag(OPEN_LOBBY_ACTIVITIES_TAG);
  revalidatePath(activityPath);
  revalidatePath(withLocale(locale, `/lobby/${activityId}`));
  revalidatePath(withLocale(locale, `/lobby/${activityId}/room`));
  revalidatePath(withLocale(locale, `/lobby/${activityId}/room/manage`));
  revalidatePath(withLocale(locale, "/activities"));
  revalidatePath(withLocale(locale, "/lobby"));
  revalidatePath(withLocale(locale, "/"));
  revalidatePath(withLocale(locale, "/profile"));
  revalidatePath(withLocale(locale, "/notifications"));
  revalidatePath(withLocale(locale, "/"), "layout");

  return withLocale(locale, "/lobby");
}

function isPrismaTransactionConflictError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function getResidencyActivityError(locale: string) {
  if (locale === "fr") {
    return "Cette activité est liée à une réservation de boutique. Annulez-la pour conserver l'historique ; elle ne peut pas être supprimée.";
  }
  if (locale === "en") {
    return "This activity is linked to a store booking. Cancel it to preserve the booking history; it cannot be deleted.";
  }
  return "此聚吧关联店铺预约，请取消聚吧以保留预约记录，不能直接删除。";
}

function getResidencyConflictError(locale: string) {
  if (locale === "fr")
    return "L'état de la réservation a changé. Actualisez et réessayez.";
  if (locale === "en")
    return "The booking status changed. Refresh and try again.";
  return "店铺预约状态已变化，请刷新后重试。";
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
  const adminBookingSlotId = getString(formData, "adminBookingSlotId");
  if (adminBookingSlotId && !(await isCurrentUserAdmin())) {
    return { formError: actionCopy.permissionError };
  }
  const profile = await ensureCurrentUserProfile(
    result.data.locale,
    getActivityDetailPath(result.data.activityId),
  );
  if (adminBookingSlotId && profile.status !== "ACTIVE") {
    return { formError: actionCopy.permissionError };
  }
  let cancelledActivityId: string;
  let cancelledResidencySlot: { id: string; merchantId: string } | null = null;

  try {
    const cancelResult = await prisma.$transaction(
      async (tx): Promise<CancelActivityResult> => {
        const activity = await tx.activity.findUnique({
          where: {
            id: result.data.activityId,
          },
          select: {
            id: true,
            isPersistent: true,
            source: true,
            endAt: true,
            startAt: true,
            status: true,
            residencySlot: {
              select: { id: true, merchantId: true, status: true },
            },
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

        if (isPersistentBookingActivity(activity)) {
          return {
            ok: false,
            error: getPersistentBookingCopy(result.data.locale).settings,
          };
        }

        // A site administrator may cancel a published booking activity from
        // its booking detail. The slot identifier must match the activity;
        // the ordinary activity cancellation path keeps its existing role check.
        const permission = adminBookingSlotId
          ? {
              ok:
                activity.residencySlot?.id === adminBookingSlotId &&
                (activity.residencySlot.status === "PUBLISHED" ||
                  (activity.status === "CANCELLED" &&
                    activity.residencySlot.status === "CANCELLED")),
              role: "ADMIN" as const,
            }
          : await assertCanManageActivity(activity.id, profile.id, tx);

        if (!permission.ok) {
          return {
            ok: false,
            error: actionCopy.permissionError,
          };
        }

        if (activity.status === "CANCELLED") {
          return {
            ok: true,
            activityId: activity.id,
            residencySlot: activity.residencySlot,
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

        if (
          activity.residencySlot &&
          activity.residencySlot.status !== "PUBLISHED"
        ) {
          return {
            ok: false,
            error: getResidencyConflictError(result.data.locale),
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

        if (activity.residencySlot) {
          const cancelledAt = new Date();
          const slotUpdate = await tx.merchantResidencySlot.updateMany({
            where: {
              id: activity.residencySlot.id,
              activityId: activity.id,
              status: "PUBLISHED",
            },
            data: { status: "CANCELLED", cancelledAt },
          });
          if (slotUpdate.count !== 1) {
            throw new Error("Residency changed during activity cancellation");
          }
          await tx.merchantResidencySignup.updateMany({
            where: { slotId: activity.residencySlot.id, status: "ACTIVE" },
            data: { status: "CANCELLED", cancelledAt },
          });
        }

        const cancellationLog = await tx.activityManagementLog.create({
          data: {
            activityId: activity.id,
            actorId: profile.id,
            action: "ACTIVITY_CANCELLED",
            metadata: {
              role: permission.role,
            },
          },
          select: {
            id: true,
          },
        });

        await createNotifications(
          tx,
          activity.participants.map((participant) => ({
            actorId: profile.id,
            activityId: activity.id,
            occurrenceId: `activity-cancel:${cancellationLog.id}`,
            recipientId: participant.userProfileId,
            type: "ACTIVITY_CANCELLED",
          })),
        );

        return {
          ok: true,
          activityId: activity.id,
          residencySlot: activity.residencySlot,
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
    cancelledResidencySlot = cancelResult.residencySlot ?? null;
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

  const activityPath = refreshActivityViews(
    result.data.locale,
    cancelledActivityId,
  );
  if (cancelledResidencySlot) {
    for (const path of [
      "/profile/bookings",
      "/profile/store/bookings",
      `/profile/store/bookings/${cancelledResidencySlot.id}`,
      "/admin/merchants/bookings",
      `/admin/merchants/bookings/${cancelledResidencySlot.id}`,
      `/merchants/${cancelledResidencySlot.merchantId}`,
      `/merchants/${cancelledResidencySlot.merchantId}/bookings`,
      `/merchants/${cancelledResidencySlot.merchantId}/bookings/${cancelledResidencySlot.id}`,
    ]) {
      revalidatePath(withLocale(result.data.locale, path), "layout");
    }
  }
  redirect(
    adminBookingSlotId
      ? withLocale(
          result.data.locale,
          `/admin/merchants/bookings/${adminBookingSlotId}`,
        )
      : activityPath,
  );
}

export async function deleteActivityAction(
  _previousState: DeleteActivityState,
  formData: FormData,
): Promise<DeleteActivityState> {
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
  const profile = await ensureCurrentUserProfile(
    result.data.locale,
    getActivityDetailPath(result.data.activityId),
  );
  let deletedActivityId: string;

  try {
    const deleteResult = await prisma.$transaction(
      async (tx): Promise<CancelActivityResult> => {
        const activity = await tx.activity.findUnique({
          where: {
            id: result.data.activityId,
          },
          select: {
            id: true,
            externalId: true,
            externalSource: true,
            externalUrl: true,
            importedAt: true,
            isPersistent: true,
            organizerId: true,
            publicEventId: true,
            source: true,
            sourcePayload: true,
            sourceUrl: true,
            type: true,
            residencySlot: { select: { id: true } },
          },
        });

        if (!activity) {
          return {
            ok: false,
            error: actionCopy.deletePermissionError,
          };
        }

        if (activity.organizerId !== profile.id) {
          return {
            ok: false,
            error: actionCopy.deletePermissionError,
          };
        }

        if (isPersistentBookingActivity(activity)) {
          return {
            ok: false,
            error: getPersistentBookingCopy(result.data.locale).settings,
          };
        }

        if (activity.residencySlot) {
          return {
            ok: false,
            error: getResidencyActivityError(result.data.locale),
          };
        }

        if (
          activity.type === "PUBLIC_EVENT" ||
          isLegacyActivityInfoSource(activity)
        ) {
          return {
            ok: false,
            error: actionCopy.deleteStatusError,
          };
        }

        await tx.activity.delete({
          where: {
            id: activity.id,
          },
        });

        return {
          ok: true,
          activityId: activity.id,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!deleteResult.ok) {
      return {
        formError: deleteResult.error,
      };
    }

    deletedActivityId = deleteResult.activityId;
  } catch (error) {
    if (isPrismaTransactionConflictError(error)) {
      return {
        formError: actionCopy.conflictError,
      };
    }

    console.error("Failed to delete activity", error);

    return {
      formError: actionCopy.deleteFailedError,
    };
  }

  redirect(refreshDeletedActivityViews(result.data.locale, deletedActivityId));
}
