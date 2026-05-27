"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { getFollowCopy } from "../copy";

const toggleFollowSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  targetUserProfileId: z.string().min(1),
  redirectPath: z.string().min(1),
});

export type ToggleFollowState = {
  formError?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function toggleFollowUserAction(
  _previousState: ToggleFollowState,
  formData: FormData,
): Promise<ToggleFollowState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const fallbackCopy = getFollowCopy(fallbackLocale);
  const result = toggleFollowSchema.safeParse({
    locale: fallbackLocale,
    targetUserProfileId: getString(formData, "targetUserProfileId"),
    redirectPath: getString(formData, "redirectPath"),
  });

  if (!result.success) {
    return {
      formError: fallbackCopy.invalidRequest,
    };
  }

  const { locale, targetUserProfileId, redirectPath } = result.data;
  const t = getFollowCopy(locale);
  const viewerProfile = await ensureCurrentUserProfile(locale);

  if (viewerProfile.id === targetUserProfileId) {
    return {
      formError: t.cannotFollowSelf,
    };
  }

  const targetUser = await prisma.userProfile.findUnique({
    where: {
      id: targetUserProfileId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!targetUser || targetUser.status !== "ACTIVE") {
    return {
      formError: t.targetUnavailable,
    };
  }

  const existingFollow = await prisma.userFollow.findUnique({
    where: {
      followerId_followingId: {
        followerId: viewerProfile.id,
        followingId: targetUserProfileId,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingFollow) {
    await prisma.userFollow.delete({
      where: {
        id: existingFollow.id,
      },
    });
  } else {
    await prisma.userFollow.create({
      data: {
        followerId: viewerProfile.id,
        followingId: targetUserProfileId,
      },
    });
  }

  const localizedPath = withLocale(locale, redirectPath);
  revalidatePath(localizedPath);
  revalidatePath(withLocale(locale, "/profile"));
  redirect(localizedPath);
}
