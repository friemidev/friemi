"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { normalizeFriendRequestSearchTerm } from "@/features/friends/queries/findFriendRequestTarget";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import {
  areProfilesFriends,
  maxActivityCoManagers,
} from "../utils/activityManagement";
import { getActivityDetailPath } from "../utils/activityRoutes";

const coManagerActionSchema = z.object({
  activityId: z.string().min(1),
  locale: z.string().min(1).default("zh-CN"),
});

const addCoManagerSchema = coManagerActionSchema.extend({
  managerFriendCode: z.string().trim().optional(),
  managerProfileId: z.string().trim().optional(),
}).refine((data) => data.managerProfileId || data.managerFriendCode, {
  path: ["managerProfileId"],
});

const removeCoManagerSchema = coManagerActionSchema.extend({
  coManagerId: z.string().min(1),
});

export type ManageActivityCoManagersState = {
  formError?: string;
  successMessage?: string;
};

type Copy = {
  alreadyManager: string;
  addFailed: string;
  addSuccess: string;
  friendCodeInvalid: string;
  friendCodeNotFound: string;
  friendshipRequired: string;
  limitReached: string;
  missing: string;
  noPermission: string;
  refreshError: string;
  removeFailed: string;
  removeSuccess: string;
  selfError: string;
};

function getCopy(locale: string): Copy {
  if (locale === "fr") {
    return {
      alreadyManager: "Cette personne est déjà gestionnaire.",
      addFailed: "Impossible d'ajouter ce gestionnaire. Réessayez plus tard.",
      addSuccess: "Gestionnaire ajouté.",
      friendCodeInvalid: "Entrez un code ami à 6 chiffres.",
      friendCodeNotFound: "Aucun ami actif trouvé avec ce code.",
      friendshipRequired:
        "Vous ne pouvez choisir qu'une personne déjà dans vos amis.",
      limitReached: "Chaque plan peut avoir au maximum 3 gestionnaires.",
      missing: "Ce plan n'existe plus.",
      noPermission: "Seul l'organisateur peut modifier les gestionnaires.",
      refreshError: "Réessayez plus tard.",
      removeFailed: "Impossible de retirer ce gestionnaire. Réessayez plus tard.",
      removeSuccess: "Gestionnaire retiré.",
      selfError: "L'organisateur n'a pas besoin d'être ajouté.",
    };
  }

  if (locale === "en") {
    return {
      alreadyManager: "This person is already a manager.",
      addFailed: "Could not add this manager. Try again later.",
      addSuccess: "Manager added.",
      friendCodeInvalid: "Enter a 6-digit friend code.",
      friendCodeNotFound: "No active friend found with that code.",
      friendshipRequired: "You can only choose one of your friends.",
      limitReached: "Each plan can have up to 3 managers.",
      missing: "This plan no longer exists.",
      noPermission: "Only the organizer can edit managers.",
      refreshError: "Try again later.",
      removeFailed: "Could not remove this manager. Try again later.",
      removeSuccess: "Manager removed.",
      selfError: "The organizer does not need to be added.",
    };
  }

  return {
    alreadyManager: "这个好友已经是管理人了。",
    addFailed: "添加管理人失败，请稍后重试。",
    addSuccess: "管理人已添加。",
    friendCodeInvalid: "请输入 6 位好友号。",
    friendCodeNotFound: "没有找到这个好友号对应的活跃好友。",
    friendshipRequired: "只能从你的好友中选择管理人。",
    limitReached: "每个组局最多只能设置 3 位管理人。",
    missing: "组局不存在或已更新。",
    noPermission: "只有发起人可以修改管理人。",
    refreshError: "请稍后再试。",
    removeFailed: "移除管理人失败，请稍后重试。",
    removeSuccess: "管理人已移除。",
    selfError: "发起人不需要添加为管理人。",
  };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function refreshActivityViews(locale: string, activityId: string) {
  revalidatePath(withLocale(locale, getActivityDetailPath(activityId)));
  revalidatePath(withLocale(locale, `/activities/${activityId}/edit`));
  revalidatePath(withLocale(locale, "/lobby"));
  revalidatePath(withLocale(locale, "/profile"));
  revalidatePath(withLocale(locale, "/notifications"));
  revalidatePath(withLocale(locale, "/"), "layout");
}

function isUniqueConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function addActivityCoManagerAction(
  _previousState: ManageActivityCoManagersState,
  formData: FormData,
): Promise<ManageActivityCoManagersState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
    managerFriendCode: getString(formData, "managerFriendCode"),
    managerProfileId: getString(formData, "managerProfileId"),
  };
  const copy = getCopy(rawInput.locale);
  const result = addCoManagerSchema.safeParse(rawInput);

  if (!result.success) {
    return {
      formError: copy.refreshError,
    };
  }

  const profile = await ensureCurrentUserProfile(
    result.data.locale,
    getActivityDetailPath(result.data.activityId),
  );

  const requestedManagerId = result.data.managerProfileId?.trim() ?? "";
  const rawFriendCode = result.data.managerFriendCode?.trim() ?? "";
  const normalizedFriendCode = requestedManagerId
    ? null
    : normalizeFriendRequestSearchTerm(rawFriendCode).friendCode;

  if (!requestedManagerId && rawFriendCode && !normalizedFriendCode) {
    return {
      formError: copy.friendCodeInvalid,
    };
  }

  try {
    const addResult = await prisma.$transaction(
      async (tx) => {
        const activity = await tx.activity.findUnique({
          where: {
            id: result.data.activityId,
          },
          select: {
            id: true,
            organizerId: true,
            coManagers: {
              select: {
                managerProfileId: true,
              },
            },
          },
        });

        if (!activity) {
          return {
            ok: false,
            error: copy.missing,
          };
        }

        if (activity.organizerId !== profile.id) {
          return {
            ok: false,
            error: copy.noPermission,
          };
        }

        if (activity.coManagers.length >= maxActivityCoManagers) {
          return {
            ok: false,
            error: copy.limitReached,
          };
        }

        const manager = await tx.userProfile.findFirst({
          where: {
            ...(requestedManagerId
              ? { id: requestedManagerId }
              : { friendCode: normalizedFriendCode ?? "" }),
            status: "ACTIVE",
          },
          select: {
            id: true,
          },
        });

        if (!manager) {
          return {
            ok: false,
            error: requestedManagerId ? copy.missing : copy.friendCodeNotFound,
          };
        }

        if (manager.id === profile.id) {
          return {
            ok: false,
            error: copy.selfError,
          };
        }

        if (
          activity.coManagers.some(
            (coManager) => coManager.managerProfileId === manager.id,
          )
        ) {
          return {
            ok: false,
            error: copy.alreadyManager,
          };
        }

        const isFriend = await areProfilesFriends(
          profile.id,
          manager.id,
          tx,
        );

        if (!isFriend) {
          return {
            ok: false,
            error: copy.friendshipRequired,
          };
        }

        await tx.activityCoManager.create({
          data: {
            activityId: activity.id,
            managerProfileId: manager.id,
            addedByProfileId: profile.id,
          },
        });

        await tx.activityManagementLog.create({
          data: {
            activityId: activity.id,
            actorId: profile.id,
            action: "CO_MANAGER_ADDED",
            metadata: {
              managerProfileId: manager.id,
            },
          },
        });

        return {
          ok: true,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!addResult.ok) {
      return {
        formError: addResult.error,
      };
    }
  } catch (error) {
    if (isUniqueConflict(error)) {
      return {
        formError: copy.alreadyManager,
      };
    }

    console.error("Failed to add activity co-manager", error);

    return {
      formError: copy.addFailed,
    };
  }

  refreshActivityViews(result.data.locale, result.data.activityId);

  return {
    successMessage: copy.addSuccess,
  };
}

export async function removeActivityCoManagerAction(
  _previousState: ManageActivityCoManagersState,
  formData: FormData,
): Promise<ManageActivityCoManagersState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
    coManagerId: getString(formData, "coManagerId"),
  };
  const copy = getCopy(rawInput.locale);
  const result = removeCoManagerSchema.safeParse(rawInput);

  if (!result.success) {
    return {
      formError: copy.refreshError,
    };
  }

  const profile = await ensureCurrentUserProfile(
    result.data.locale,
    getActivityDetailPath(result.data.activityId),
  );

  try {
    const removeResult = await prisma.$transaction(async (tx) => {
      const coManager = await tx.activityCoManager.findUnique({
        where: {
          id: result.data.coManagerId,
        },
        select: {
          id: true,
          activityId: true,
          managerProfileId: true,
          activity: {
            select: {
              organizerId: true,
            },
          },
        },
      });

      if (!coManager || coManager.activityId !== result.data.activityId) {
        return {
          ok: false,
          error: copy.missing,
        };
      }

      if (coManager.activity.organizerId !== profile.id) {
        return {
          ok: false,
          error: copy.noPermission,
        };
      }

      await tx.activityCoManager.delete({
        where: {
          id: coManager.id,
        },
      });

      await tx.activityManagementLog.create({
        data: {
          activityId: coManager.activityId,
          actorId: profile.id,
          action: "CO_MANAGER_REMOVED",
          metadata: {
            managerProfileId: coManager.managerProfileId,
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
  } catch (error) {
    console.error("Failed to remove activity co-manager", error);

    return {
      formError: copy.removeFailed,
    };
  }

  refreshActivityViews(result.data.locale, result.data.activityId);

  return {
    successMessage: copy.removeSuccess,
  };
}
