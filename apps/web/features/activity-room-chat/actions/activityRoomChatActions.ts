"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserProfileForMutation } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { getActivityRoomChatCopy } from "../copy";
import {
  ActivityRoomChatDomainError,
  activityRoomMessageMaxLength,
  deleteActivityRoomMessage,
  sendActivityRoomMessage,
} from "../services/activityRoomChat";

export type ActivityRoomChatActionState = {
  ok?: boolean;
  formError?: string;
  fieldErrors?: Record<string, string[]>;
  messageId?: string;
  values?: {
    body?: string;
  };
};

export type ActivityRoomMemberActionState = {
  ok?: boolean;
  formError?: string;
  participantId?: string;
};

const sendActivityRoomMessageSchema = z.object({
  activityId: z.string().min(1).max(80),
  body: z.string().trim().min(1).max(activityRoomMessageMaxLength),
  locale: z.string().min(1).max(16).default("zh-CN"),
});

const deleteActivityRoomMessageSchema = z.object({
  activityId: z.string().min(1).max(80),
  locale: z.string().min(1).max(16).default("zh-CN"),
  messageId: z.string().min(1).max(80),
});

const removeActivityRoomParticipantSchema = z.object({
  activityId: z.string().min(1).max(80),
  locale: z.string().min(1).max(16).default("zh-CN"),
  participantId: z.string().min(1).max(80),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getActionErrorMessage(locale: string, error: unknown) {
  const t = getActivityRoomChatCopy(locale);

  if (error instanceof ActivityRoomChatDomainError) {
    return t.errors[error.code];
  }

  return t.sendFailed;
}

function getMemberActionCopy(locale: string) {
  if (locale === "fr") {
    return {
      failed: "Impossible de retirer cette personne.",
      forbidden: "Vous ne pouvez pas retirer cette personne.",
      invalid: "Réessayez.",
      missing: "Cette personne n'est plus dans le groupe.",
      self: "Vous ne pouvez pas vous retirer ici.",
    };
  }

  if (locale === "en") {
    return {
      failed: "Could not remove this member.",
      forbidden: "You cannot remove this member.",
      invalid: "Try again.",
      missing: "This member is no longer in the group.",
      self: "You cannot remove yourself here.",
    };
  }

  return {
    failed: "暂时无法移出这位成员。",
    forbidden: "你不能移出这位成员。",
    invalid: "请稍后再试。",
    missing: "这位成员已不在聚吧里。",
    self: "不能在这里移出自己。",
  };
}

function revalidateActivityRoom(locale: string, activityId: string) {
  revalidatePath(withLocale(locale, "/footprints"));
  revalidatePath(withLocale(locale, `/lobby/${activityId}`));
  revalidatePath(withLocale(locale, `/lobby/${activityId}/room`));
}

export async function sendActivityRoomMessageAction(
  _previousState: ActivityRoomChatActionState,
  formData: FormData,
): Promise<ActivityRoomChatActionState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    body: getString(formData, "body"),
    locale: getString(formData, "locale") || "zh-CN",
  };
  const result = sendActivityRoomMessageSchema.safeParse(rawInput);
  const t = getActivityRoomChatCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
      values: {
        body: rawInput.body,
      },
    };
  }

  try {
    const profile = await getCurrentUserProfileForMutation(
      result.data.locale,
      `/lobby/${result.data.activityId}/room`,
    );
    const message = await sendActivityRoomMessage({
      activityId: result.data.activityId,
      body: result.data.body,
      senderId: profile.id,
    });

    revalidateActivityRoom(result.data.locale, result.data.activityId);

    return {
      ok: true,
      messageId: message.id,
    };
  } catch (error) {
    console.error("Failed to send activity room message", error);

    return {
      formError: getActionErrorMessage(result.data.locale, error),
      values: {
        body: result.data.body,
      },
    };
  }
}

export async function deleteActivityRoomMessageAction(
  _previousState: ActivityRoomChatActionState,
  formData: FormData,
): Promise<ActivityRoomChatActionState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
    messageId: getString(formData, "messageId"),
  };
  const result = deleteActivityRoomMessageSchema.safeParse(rawInput);
  const t = getActivityRoomChatCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  try {
    const profile = await getCurrentUserProfileForMutation(
      result.data.locale,
      `/lobby/${result.data.activityId}/room`,
    );

    await deleteActivityRoomMessage({
      activityId: result.data.activityId,
      actorId: profile.id,
      messageId: result.data.messageId,
    });
    revalidateActivityRoom(result.data.locale, result.data.activityId);

    return {
      ok: true,
      messageId: result.data.messageId,
    };
  } catch (error) {
    console.error("Failed to delete activity room message", error);

    return {
      formError:
        error instanceof ActivityRoomChatDomainError
          ? t.errors[error.code]
          : t.deleteFailed,
    };
  }
}

export async function removeActivityRoomParticipantAction(
  _previousState: ActivityRoomMemberActionState,
  formData: FormData,
): Promise<ActivityRoomMemberActionState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
    participantId: getString(formData, "participantId"),
  };
  const result = removeActivityRoomParticipantSchema.safeParse(rawInput);
  const copy = getMemberActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      formError: copy.invalid,
    };
  }

  try {
    const profile = await getCurrentUserProfileForMutation(
      result.data.locale,
      `/lobby/${result.data.activityId}/room`,
    );

    const removeResult = await prisma.$transaction(async (tx) => {
      const participation = await tx.activityParticipant.findUnique({
        where: {
          id: result.data.participantId,
        },
        select: {
          id: true,
          activityId: true,
          status: true,
          userProfileId: true,
          activity: {
            select: {
              organizerId: true,
              coManagers: {
                select: {
                  managerProfileId: true,
                },
              },
            },
          },
        },
      });

      if (!participation || participation.activityId !== result.data.activityId) {
        return {
          ok: false,
          error: copy.missing,
        };
      }

      const managerIds = new Set(
        participation.activity.coManagers.map(
          (coManager) => coManager.managerProfileId,
        ),
      );
      const isOrganizer = participation.activity.organizerId === profile.id;
      const isCoManager = managerIds.has(profile.id);
      const isTargetOrganizer =
        participation.activity.organizerId === participation.userProfileId;
      const isTargetCoManager = managerIds.has(participation.userProfileId);

      if (!isOrganizer && !isCoManager) {
        return {
          ok: false,
          error: copy.forbidden,
        };
      }

      if (participation.userProfileId === profile.id) {
        return {
          ok: false,
          error: copy.self,
        };
      }

      if (isTargetOrganizer || (isTargetCoManager && !isOrganizer)) {
        return {
          ok: false,
          error: copy.forbidden,
        };
      }

      if (participation.status === "CANCELLED") {
        return {
          ok: true,
        };
      }

      if (
        participation.status !== "JOINED" &&
        participation.status !== "APPROVED" &&
        participation.status !== "PENDING"
      ) {
        return {
          ok: false,
          error: copy.missing,
        };
      }

      await tx.activityParticipant.update({
        where: {
          id: participation.id,
        },
        data: {
          cancelledAt: new Date(),
          status: "CANCELLED",
        },
      });

      await tx.activityManagementLog.create({
        data: {
          activityId: participation.activityId,
          actorId: profile.id,
          action: "PARTICIPANT_REMOVED",
          metadata: {
            participantId: participation.id,
            userProfileId: participation.userProfileId,
          },
        },
      });

      return {
        ok: true,
      };
    });

    if (!removeResult.ok) {
      return {
        formError: removeResult.error,
      };
    }

    revalidateActivityRoom(result.data.locale, result.data.activityId);

    return {
      ok: true,
      participantId: result.data.participantId,
    };
  } catch (error) {
    console.error("Failed to remove activity room participant", error);

    return {
      formError: copy.failed,
    };
  }
}
