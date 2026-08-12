"use server";

import { revalidatePath } from "next/cache";
import type {
  ActivityStatus,
  ActivityVisibility,
  ParticipantStatus,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUserProfileForMutation } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { getActivityRoomChatCopy } from "../copy";
import {
  ActivityRoomChatDomainError,
  activityRoomMessageMaxLength,
  canViewActivityRoomChat,
  deleteActivityRoomMessage,
  deleteActivityRoomMessages,
  sendActivityRoomMessage,
} from "../services/activityRoomChat";

export type ActivityRoomChatActionState = {
  ok?: boolean;
  formError?: string;
  fieldErrors?: Record<string, string[]>;
  messageId?: string;
  messageIds?: string[];
  values?: {
    body?: string;
  };
};

export type ActivityRoomMemberActionState = {
  ok?: boolean;
  formError?: string;
  participantId?: string;
};

export type ActivityRoomInviteActionState = {
  ok?: boolean;
  formError?: string;
  invitedProfileId?: string;
  successMessage?: string;
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

const deleteActivityRoomMessagesSchema = z.object({
  activityId: z.string().min(1).max(80),
  locale: z.string().min(1).max(16).default("zh-CN"),
  messageIds: z.array(z.string().min(1).max(80)).min(1).max(50),
});

const removeActivityRoomParticipantSchema = z.object({
  activityId: z.string().min(1).max(80),
  locale: z.string().min(1).max(16).default("zh-CN"),
  participantId: z.string().min(1).max(80),
});

const inviteActivityRoomParticipantSchema = z.object({
  activityId: z.string().min(1).max(80),
  inviteeProfileId: z.string().min(1).max(80),
  locale: z.string().min(1).max(16).default("zh-CN"),
});

const toggleActivityRoomMuteSchema = z.object({
  activityId: z.string().min(1).max(80),
  locale: z.string().min(1).max(16).default("zh-CN"),
  muted: z.enum(["0", "1", "false", "true"]).default("1"),
});

const toggleActivityRoomPinSchema = z.object({
  activityId: z.string().min(1).max(80),
  locale: z.string().min(1).max(16).default("zh-CN"),
  pinned: z.enum(["0", "1", "false", "true"]).default("1"),
});

const acknowledgeActivityAnnouncementSchema = z.object({
  activityId: z.string().min(1).max(80),
  announcementId: z.string().min(1).max(80),
  locale: z.string().min(1).max(16).default("zh-CN"),
});

const activeParticipantStatuses: ParticipantStatus[] = ["JOINED", "APPROVED"];
const existingParticipantStatuses: ParticipantStatus[] = [
  "JOINED",
  "APPROVED",
  "PENDING",
];
const inviteableActivityStatuses: ActivityStatus[] = [
  "RECRUITING",
  "CONFIRMED",
];
const inviteableActivityVisibility: ActivityVisibility[] = [
  "PUBLIC",
  "PRIVATE",
];

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
      inviteAlready: "Cette personne est déjà dans le groupe.",
      inviteEmpty: "Aucune personne à inviter pour le moment.",
      inviteFailed: "Impossible d'inviter cette personne.",
      inviteFull: "Le groupe est complet.",
      inviteMissing: "Cette personne n'est plus disponible.",
      inviteNonMutual:
        "Vous pouvez inviter une personne qui vous suit aussi.",
      inviteSelf: "Cette personne est déjà dans le groupe.",
      inviteSuccess: "Invitation envoyée.",
      inviteUnavailable: "Ce groupe n'accepte plus d'invitations.",
      invalid: "Réessayez.",
      missing: "Cette personne n'est plus dans le groupe.",
      self: "Vous ne pouvez pas vous retirer ici.",
    };
  }

  if (locale === "en") {
    return {
      failed: "Could not remove this member.",
      forbidden: "You cannot remove this member.",
      inviteAlready: "This person is already in the group.",
      inviteEmpty: "No one to invite right now.",
      inviteFailed: "Could not invite this person.",
      inviteFull: "This group is full.",
      inviteMissing: "This person is no longer available.",
      inviteNonMutual: "You can invite someone who follows you back.",
      inviteSelf: "This person is already in the group.",
      inviteSuccess: "Invited.",
      inviteUnavailable: "This group is no longer accepting invites.",
      invalid: "Try again.",
      missing: "This member is no longer in the group.",
      self: "You cannot remove yourself here.",
    };
  }

  return {
    failed: "暂时无法移出这位成员。",
    forbidden: "你不能移出这位成员。",
    inviteAlready: "这位用户已经在聚吧里。",
    inviteEmpty: "暂时没有可邀请的人。",
    inviteFailed: "暂时无法邀请这位用户。",
    inviteFull: "聚吧人数已满。",
    inviteMissing: "这位用户暂时不可邀请。",
    inviteNonMutual: "只能邀请与你互相关注的人。",
    inviteSelf: "这位用户已经在聚吧里。",
    inviteSuccess: "已邀请。",
    inviteUnavailable: "这个聚吧暂时不能邀请新成员。",
    invalid: "请稍后再试。",
    missing: "这位成员已不在聚吧里。",
    self: "不能在这里移出自己。",
  };
}

function revalidateActivityRoom(locale: string, activityId: string) {
  revalidatePath(withLocale(locale, "/footprints"));
  revalidatePath(withLocale(locale, `/lobby/${activityId}`));
  revalidatePath(withLocale(locale, `/lobby/${activityId}/room`));
  revalidatePath(withLocale(locale, `/lobby/${activityId}/room/manage`));
}

function isUniqueConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function getActivityEndTime(activity: { endAt: Date | null; startAt: Date }) {
  return activity.endAt ?? activity.startAt;
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

export async function deleteActivityRoomMessagesAction(
  _previousState: ActivityRoomChatActionState,
  formData: FormData,
): Promise<ActivityRoomChatActionState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
    messageIds: formData
      .getAll("messageId")
      .filter((value): value is string => typeof value === "string"),
  };
  const result = deleteActivityRoomMessagesSchema.safeParse(rawInput);
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
    const messageIds = [...new Set(result.data.messageIds)];

    await deleteActivityRoomMessages({
      activityId: result.data.activityId,
      actorId: profile.id,
      messageIds,
    });
    revalidateActivityRoom(result.data.locale, result.data.activityId);

    return {
      ok: true,
      messageIds,
    };
  } catch (error) {
    console.error("Failed to delete activity room messages", error);

    return {
      formError:
        error instanceof ActivityRoomChatDomainError
          ? t.errors[error.code]
          : t.deleteFailed,
    };
  }
}

export async function toggleActivityRoomMuteAction(
  formData: FormData,
): Promise<void> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
    muted: getString(formData, "muted") || "1",
  };
  const result = toggleActivityRoomMuteSchema.safeParse(rawInput);

  if (!result.success) {
    return;
  }

  const profile = await getCurrentUserProfileForMutation(
    result.data.locale,
    `/lobby/${result.data.activityId}/room`,
  );
  const canView = await canViewActivityRoomChat(
    profile.id,
    result.data.activityId,
  );

  if (!canView) {
    return;
  }

  const nextMuted = result.data.muted === "1" || result.data.muted === "true";

  if (nextMuted) {
    await prisma.activityRoomReadState.upsert({
      where: {
        activityId_profileId: {
          activityId: result.data.activityId,
          profileId: profile.id,
        },
      },
      create: {
        activityId: result.data.activityId,
        lastReadAt: new Date(0),
        mutedAt: new Date(),
        profileId: profile.id,
      },
      update: {
        mutedAt: new Date(),
      },
    });
  } else {
    await prisma.activityRoomReadState.updateMany({
      where: {
        activityId: result.data.activityId,
        profileId: profile.id,
      },
      data: {
        mutedAt: null,
      },
    });
  }

  revalidateActivityRoom(result.data.locale, result.data.activityId);
}

export async function toggleActivityRoomPinAction(
  formData: FormData,
): Promise<void> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
    pinned: getString(formData, "pinned") || "1",
  };
  const result = toggleActivityRoomPinSchema.safeParse(rawInput);

  if (!result.success) {
    return;
  }

  const profile = await getCurrentUserProfileForMutation(
    result.data.locale,
    `/lobby/${result.data.activityId}/room`,
  );
  const canView = await canViewActivityRoomChat(
    profile.id,
    result.data.activityId,
  );

  if (!canView) {
    return;
  }

  const nextPinned =
    result.data.pinned === "1" || result.data.pinned === "true";

  if (nextPinned) {
    await prisma.activityRoomReadState.upsert({
      where: {
        activityId_profileId: {
          activityId: result.data.activityId,
          profileId: profile.id,
        },
      },
      create: {
        activityId: result.data.activityId,
        lastReadAt: new Date(),
        pinnedAt: new Date(),
        profileId: profile.id,
      },
      update: {
        pinnedAt: new Date(),
      },
    });
  } else {
    await prisma.activityRoomReadState.updateMany({
      where: {
        activityId: result.data.activityId,
        profileId: profile.id,
      },
      data: {
        pinnedAt: null,
      },
    });
  }

  revalidateActivityRoom(result.data.locale, result.data.activityId);
}

export async function acknowledgeActivityAnnouncementAction(
  formData: FormData,
): Promise<void> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    announcementId: getString(formData, "announcementId"),
    locale: getString(formData, "locale") || "zh-CN",
  };
  const result = acknowledgeActivityAnnouncementSchema.safeParse(rawInput);

  if (!result.success) {
    return;
  }

  const profile = await getCurrentUserProfileForMutation(
    result.data.locale,
    `/lobby/${result.data.activityId}/room`,
  );
  const canView = await canViewActivityRoomChat(
    profile.id,
    result.data.activityId,
  );

  if (!canView) {
    return;
  }

  const announcement = await prisma.activityAnnouncement.findFirst({
    where: {
      activityId: result.data.activityId,
      id: result.data.announcementId,
    },
    select: {
      createdAt: true,
    },
  });

  if (!announcement) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.activityRoomReadState.findUnique({
      where: {
        activityId_profileId: {
          activityId: result.data.activityId,
          profileId: profile.id,
        },
      },
      select: {
        announcementReadAt: true,
      },
    });
    const announcementReadAt =
      existing?.announcementReadAt &&
      existing.announcementReadAt.getTime() > announcement.createdAt.getTime()
        ? existing.announcementReadAt
        : announcement.createdAt;

    await tx.activityRoomReadState.upsert({
      where: {
        activityId_profileId: {
          activityId: result.data.activityId,
          profileId: profile.id,
        },
      },
      create: {
        activityId: result.data.activityId,
        announcementReadAt,
        lastReadAt: new Date(0),
        profileId: profile.id,
      },
      update: {
        announcementReadAt,
      },
    });
  });

  revalidateActivityRoom(result.data.locale, result.data.activityId);
}

export async function inviteActivityRoomParticipantAction(
  _previousState: ActivityRoomInviteActionState,
  formData: FormData,
): Promise<ActivityRoomInviteActionState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    inviteeProfileId: getString(formData, "inviteeProfileId"),
    locale: getString(formData, "locale") || "zh-CN",
  };
  const result = inviteActivityRoomParticipantSchema.safeParse(rawInput);
  const copy = getMemberActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      formError: copy.invalid,
    };
  }

  try {
    const profile = await getCurrentUserProfileForMutation(
      result.data.locale,
      `/lobby/${result.data.activityId}/room/manage`,
    );

    const inviteResult = await prisma.$transaction(async (tx) => {
      const activity = await tx.activity.findUnique({
        where: {
          id: result.data.activityId,
        },
        select: {
          id: true,
          capacity: true,
          endAt: true,
          organizerId: true,
          startAt: true,
          status: true,
          visibility: true,
          coManagers: {
            select: {
              managerProfileId: true,
            },
          },
          _count: {
            select: {
              participants: {
                where: {
                  status: {
                    in: activeParticipantStatuses,
                  },
                },
              },
              guestParticipants: {
                where: {
                  linkedParticipantId: null,
                  status: {
                    in: activeParticipantStatuses,
                  },
                },
              },
            },
          },
        },
      });

      if (!activity) {
        return {
          ok: false,
          error: copy.inviteUnavailable,
        };
      }

      const isOrganizer = activity.organizerId === profile.id;
      const isCoManager = activity.coManagers.some(
        (coManager) => coManager.managerProfileId === profile.id,
      );

      if (!isOrganizer && !isCoManager) {
        return {
          ok: false,
          error: copy.forbidden,
        };
      }

      if (
        !inviteableActivityStatuses.includes(activity.status) ||
        !inviteableActivityVisibility.includes(activity.visibility) ||
        getActivityEndTime(activity).getTime() <= Date.now()
      ) {
        return {
          ok: false,
          error: copy.inviteUnavailable,
        };
      }

      if (
        result.data.inviteeProfileId === profile.id ||
        result.data.inviteeProfileId === activity.organizerId
      ) {
        return {
          ok: false,
          error: copy.inviteSelf,
        };
      }

      const invitee = await tx.userProfile.findFirst({
        where: {
          id: result.data.inviteeProfileId,
          status: "ACTIVE",
        },
        select: {
          id: true,
        },
      });

      if (!invitee) {
        return {
          ok: false,
          error: copy.inviteMissing,
        };
      }

      const follows = await tx.userFollow.findMany({
        where: {
          OR: [
            {
              followerId: profile.id,
              followingId: invitee.id,
            },
            {
              followerId: invitee.id,
              followingId: profile.id,
            },
          ],
        },
        select: {
          followerId: true,
          followingId: true,
        },
      });
      const isMutualFollow =
        follows.some(
          (follow) =>
            follow.followerId === profile.id &&
            follow.followingId === invitee.id,
        ) &&
        follows.some(
          (follow) =>
            follow.followerId === invitee.id &&
            follow.followingId === profile.id,
        );

      if (!isMutualFollow) {
        return {
          ok: false,
          error: copy.inviteNonMutual,
        };
      }

      const existingParticipation = await tx.activityParticipant.findUnique({
        where: {
          activityId_userProfileId: {
            activityId: activity.id,
            userProfileId: invitee.id,
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (
        existingParticipation &&
        existingParticipantStatuses.includes(existingParticipation.status)
      ) {
        return {
          ok: false,
          error: copy.inviteAlready,
        };
      }

      if (
        activity.capacity > 0 &&
        activity._count.participants + activity._count.guestParticipants >=
          activity.capacity
      ) {
        return {
          ok: false,
          error: copy.inviteFull,
        };
      }

      if (existingParticipation) {
        await tx.activityParticipant.update({
          where: {
            id: existingParticipation.id,
          },
          data: {
            cancelledAt: null,
            joinedAt: new Date(),
            message: null,
            status: "APPROVED",
          },
        });
      } else {
        await tx.activityParticipant.create({
          data: {
            activityId: activity.id,
            message: null,
            status: "APPROVED",
            userProfileId: invitee.id,
          },
        });
      }

      await tx.activityManagementLog.create({
        data: {
          activityId: activity.id,
          actorId: profile.id,
          action: "PARTICIPANT_INVITED",
          metadata: {
            userProfileId: invitee.id,
          },
        },
      });

      return {
        ok: true,
      };
    });

    if (!inviteResult.ok) {
      return {
        formError: inviteResult.error,
      };
    }

    revalidateActivityRoom(result.data.locale, result.data.activityId);

    return {
      invitedProfileId: result.data.inviteeProfileId,
      ok: true,
      successMessage: copy.inviteSuccess,
    };
  } catch (error) {
    if (isUniqueConflict(error)) {
      return {
        formError: copy.inviteAlready,
      };
    }

    console.error("Failed to invite activity room participant", error);

    return {
      formError: copy.inviteFailed,
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
