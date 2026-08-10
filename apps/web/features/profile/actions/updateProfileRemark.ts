"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserProfileForMutation } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import {
  maxProfileRemarkNameLength,
  normalizeProfileRemarkName,
} from "../services/profileRemarks";

export type UpdateProfileRemarkState = {
  formError?: string;
  ok?: boolean;
  remarkName?: string | null;
};

const updateProfileRemarkSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  redirectPath: z.string().min(1).default("/profile"),
  remarkName: z.string().max(maxProfileRemarkNameLength),
  targetProfileId: z.string().min(1),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getProfileRemarkActionCopy(locale: string) {
  if (locale === "fr") {
    return {
      cannotRemarkSelf: "Vous ne pouvez pas vous renommer vous-meme.",
      invalidRequest: "Impossible d'enregistrer cette note.",
      targetUnavailable: "Ce profil n'est plus disponible.",
    };
  }

  if (locale === "en") {
    return {
      cannotRemarkSelf: "You cannot add a remark for yourself.",
      invalidRequest: "Could not save this remark.",
      targetUnavailable: "This profile is no longer available.",
    };
  }

  return {
    cannotRemarkSelf: "不能给自己添加备注。",
    invalidRequest: "暂时无法保存备注。",
    targetUnavailable: "这个用户暂时不可用。",
  };
}

function revalidateProfileRemarkPaths(locale: string, targetProfileId: string) {
  revalidatePath(withLocale(locale, `/profile/${targetProfileId}`));
  revalidatePath(withLocale(locale, "/profile"));
  revalidatePath(withLocale(locale, "/profile/network"));
  revalidatePath(withLocale(locale, "/messages"));
  revalidatePath(withLocale(locale, "/search"));
}

export async function updateProfileRemarkAction(
  _previousState: UpdateProfileRemarkState,
  formData: FormData,
): Promise<UpdateProfileRemarkState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const copy = getProfileRemarkActionCopy(fallbackLocale);
  const remarkName = normalizeProfileRemarkName(formData.get("remarkName"));
  const result = updateProfileRemarkSchema.safeParse({
    locale: fallbackLocale,
    redirectPath: getString(formData, "redirectPath") || "/profile",
    remarkName,
    targetProfileId: getString(formData, "targetProfileId"),
  });

  if (!result.success) {
    return {
      formError: copy.invalidRequest,
      remarkName,
    };
  }

  const { locale, redirectPath, targetProfileId } = result.data;
  const viewerProfile = await getCurrentUserProfileForMutation(
    locale,
    redirectPath,
  );

  if (viewerProfile.id === targetProfileId) {
    return {
      formError: getProfileRemarkActionCopy(locale).cannotRemarkSelf,
      remarkName,
    };
  }

  const targetProfile = await prisma.userProfile.findUnique({
    where: {
      id: targetProfileId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!targetProfile || targetProfile.status !== "ACTIVE") {
    return {
      formError: getProfileRemarkActionCopy(locale).targetUnavailable,
      remarkName,
    };
  }

  if (!remarkName) {
    await prisma.userProfileRemark
      .delete({
        where: {
          ownerId_targetId: {
            ownerId: viewerProfile.id,
            targetId: targetProfileId,
          },
        },
      })
      .catch((error: unknown) => {
        if (
          typeof error === "object" &&
          error &&
          "code" in error &&
          error.code === "P2025"
        ) {
          return null;
        }

        throw error;
      });

    revalidateProfileRemarkPaths(locale, targetProfileId);

    return {
      ok: true,
      remarkName: null,
    };
  }

  await prisma.userProfileRemark.upsert({
    where: {
      ownerId_targetId: {
        ownerId: viewerProfile.id,
        targetId: targetProfileId,
      },
    },
    create: {
      ownerId: viewerProfile.id,
      remarkName,
      targetId: targetProfileId,
    },
    update: {
      remarkName,
    },
  });

  revalidateProfileRemarkPaths(locale, targetProfileId);

  return {
    ok: true,
    remarkName,
  };
}
