"use server";

import { revalidatePath } from "next/cache";
import type { ParticipantStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { createNotifications } from "@/features/notifications/utils/createNotification";
import { getActivityDetailPath } from "../utils/activityRoutes";

export type SendActivityAnnouncementState = {
  ok?: boolean;
  formError?: string;
  values?: {
    content?: string;
  };
};

export type DeleteActivityAnnouncementState = {
  ok?: boolean;
  deletedAnnouncementId?: string;
  formError?: string;
};

const maxAnnouncementLength = 500;
const participantStatuses: ParticipantStatus[] = [
  "JOINED",
  "PENDING",
  "APPROVED",
];

const activitySelect = {
  id: true,
  status: true,
  endAt: true,
  participants: {
    where: {
      status: {
        in: participantStatuses,
      },
    },
    select: {
      userProfileId: true,
    },
  },
} satisfies Prisma.ActivitySelect;

const schema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  activityId: z.string().min(1),
  content: z.string().trim().min(1).max(maxAnnouncementLength),
});

const deleteSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  activityId: z.string().min(1),
  announcementId: z.string().min(1),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      deleteFailed: "Impossible de supprimer cette annonce.",
      deleteForbidden:
        "Seul l'organisateur ou un gestionnaire peut supprimer une annonce.",
      deleteInvalid: "Cette annonce n'est plus disponible.",
      failed: "Impossible d'envoyer l'annonce pour le moment.",
      forbidden:
        "Seul l'organisateur ou un gestionnaire peut envoyer une annonce.",
      locked: "Cette activite est terminee ou annulee.",
      invalid: "Verifiez le contenu de l'annonce.",
    };
  }

  if (locale === "en") {
    return {
      deleteFailed: "Could not delete this announcement.",
      deleteForbidden:
        "Only the host or a manager can delete an announcement.",
      deleteInvalid: "This announcement is no longer available.",
      failed: "The announcement could not be sent right now.",
      forbidden: "Only the host or a manager can send an announcement.",
      locked: "This activity has ended or was cancelled.",
      invalid: "Check the announcement content and try again.",
    };
  }

  return {
    deleteFailed: "公告暂时删除失败，请稍后重试。",
    deleteForbidden: "只有发起人或协管可以删除群公告。",
    deleteInvalid: "这条公告已不可用。",
    failed: "公告暂时发送失败，请稍后重试。",
    forbidden: "只有发起人或协管可以发送群公告。",
    locked: "活动已结束或已取消，不能再发送群公告。",
    invalid: "请检查公告内容后再发送。",
  };
}

export async function sendActivityAnnouncementAction(
  _previousState: SendActivityAnnouncementState,
  formData: FormData,
): Promise<SendActivityAnnouncementState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    activityId: getString(formData, "activityId"),
    content: getString(formData, "content"),
  };
  const copy = getCopy(rawInput.locale);
  const result = schema.safeParse(rawInput);

  if (!result.success) {
    return {
      formError: copy.invalid,
      values: {
        content: rawInput.content,
      },
    };
  }

  try {
    const profile = await ensureCurrentUserProfile(
      result.data.locale,
      getActivityDetailPath(result.data.activityId),
    );

    const activity = await prisma.activity.findFirst({
      where: {
        id: result.data.activityId,
        OR: [
          {
            organizerId: profile.id,
          },
          {
            coManagers: {
              some: {
                managerProfileId: profile.id,
              },
            },
          },
        ],
      },
      select: activitySelect,
    });

    if (!activity) {
      return {
        formError: copy.forbidden,
        values: {
          content: result.data.content,
        },
      };
    }

    if (
      activity.status === "CANCELLED" ||
      activity.status === "ENDED" ||
      (activity.endAt && activity.endAt <= new Date())
    ) {
      return {
        formError: copy.locked,
        values: {
          content: result.data.content,
        },
      };
    }

    await prisma.$transaction(async (tx) => {
      const announcement = await tx.activityAnnouncement.create({
        data: {
          activityId: activity.id,
          authorId: profile.id,
          content: result.data.content,
        },
        select: {
          id: true,
        },
      });

      const recipientIds: string[] = Array.from(
        new Set(
          activity.participants
            .map(
              (participant: { userProfileId: string }) => participant.userProfileId,
            )
            .filter((userProfileId: string) => userProfileId !== profile.id),
        ),
      );

      await createNotifications(
        tx,
        recipientIds.map((recipientId) => ({
          actorId: profile.id,
          activityAnnouncementId: announcement.id,
          activityId: activity.id,
          dedupe: false,
          recipientId,
          type: "ACTIVITY_ANNOUNCEMENT" as const,
        })),
      );
    });

    revalidatePath(
      withLocale(result.data.locale, getActivityDetailPath(activity.id)),
    );
    revalidatePath(
      withLocale(result.data.locale, `/lobby/${activity.id}/room`),
    );
    revalidatePath(
      withLocale(result.data.locale, `/lobby/${activity.id}/room/manage`),
    );
    revalidatePath(withLocale(result.data.locale, "/notifications"));

    return {
      ok: true,
      values: {
        content: "",
      },
    };
  } catch (error) {
    console.error("Failed to send activity announcement", error);

    return {
      formError: copy.failed,
      values: {
        content: result.data.content,
      },
    };
  }
}

export async function deleteActivityAnnouncementAction(
  _previousState: DeleteActivityAnnouncementState,
  formData: FormData,
): Promise<DeleteActivityAnnouncementState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    activityId: getString(formData, "activityId"),
    announcementId: getString(formData, "announcementId"),
  };
  const copy = getCopy(rawInput.locale);
  const result = deleteSchema.safeParse(rawInput);

  if (!result.success) {
    return {
      formError: copy.deleteInvalid,
    };
  }

  try {
    const profile = await ensureCurrentUserProfile(
      result.data.locale,
      `/lobby/${result.data.activityId}/room/manage`,
    );

    const announcement = await prisma.activityAnnouncement.findFirst({
      where: {
        activityId: result.data.activityId,
        id: result.data.announcementId,
      },
      select: {
        id: true,
        activity: {
          select: {
            coManagers: {
              where: {
                managerProfileId: profile.id,
              },
              select: {
                id: true,
              },
              take: 1,
            },
            id: true,
            organizerId: true,
          },
        },
      },
    });

    if (!announcement) {
      return {
        formError: copy.deleteInvalid,
      };
    }

    const canManage =
      announcement.activity.organizerId === profile.id ||
      announcement.activity.coManagers.length > 0;

    if (!canManage) {
      return {
        formError: copy.deleteForbidden,
      };
    }

    await prisma.activityAnnouncement.delete({
      where: {
        id: announcement.id,
      },
    });

    revalidatePath(
      withLocale(result.data.locale, getActivityDetailPath(result.data.activityId)),
    );
    revalidatePath(
      withLocale(result.data.locale, `/lobby/${result.data.activityId}/room`),
    );
    revalidatePath(
      withLocale(
        result.data.locale,
        `/lobby/${result.data.activityId}/room/manage`,
      ),
    );
    revalidatePath(withLocale(result.data.locale, "/notifications"));

    return {
      ok: true,
      deletedAnnouncementId: announcement.id,
    };
  } catch (error) {
    console.error("Failed to delete activity announcement", error);

    return {
      formError: copy.deleteFailed,
    };
  }
}
