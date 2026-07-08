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

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      failed: "Impossible d'envoyer l'annonce pour le moment.",
      forbidden: "Seul l'organisateur peut envoyer une annonce.",
      locked: "Cette activite est terminee ou annulee.",
      invalid: "Verifiez le contenu de l'annonce.",
    };
  }

  if (locale === "en") {
    return {
      failed: "The announcement could not be sent right now.",
      forbidden: "Only the organizer can send an announcement.",
      locked: "This activity has ended or was cancelled.",
      invalid: "Check the announcement content and try again.",
    };
  }

  return {
    failed: "公告暂时发送失败，请稍后重试。",
    forbidden: "只有发起人可以发送群公告。",
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
        organizerId: profile.id,
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
