"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUserProfileForMutation } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { createActionPerformanceTracker } from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { linkGuestParticipationsForProfile } from "@/features/guest-participants/services/linkGuestParticipations";
import { normalizeGuestWechatId } from "@/features/guest-participants/utils/contactIdentity";

export type UpdateProfileIdentityState = {
  formError?: string;
  nickname?: string;
  success?: boolean;
};

export type UpdateProfileWechatState = {
  formError?: string;
  linkedCount?: number;
  success?: boolean;
  wechatId?: string | null;
};

const updateProfileIdentitySchema = z.object({
  afterSave: z.enum(["refresh", "redirect"]).default("redirect"),
  locale: z.string().min(1).default("zh-CN"),
  nickname: z.string().trim().min(1).max(24),
  returnTo: z.string().optional(),
});

const updateProfileWechatSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  wechatId: z.string().trim().max(80).optional(),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function revalidateNicknamePaths(locale: string) {
  revalidatePath(withLocale(locale, "/profile"));
  revalidatePath(withLocale(locale, "/"), "layout");
}

export async function updateProfileIdentityAction(
  _previousState: UpdateProfileIdentityState,
  formData: FormData,
): Promise<UpdateProfileIdentityState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const t = getCopy(fallbackLocale).profile;
  const result = updateProfileIdentitySchema.safeParse({
    afterSave: getString(formData, "afterSave") || "redirect",
    locale: fallbackLocale,
    nickname: getString(formData, "nickname"),
    returnTo: getString(formData, "returnTo"),
  });

  if (!result.success) {
    return {
      formError: t.nicknameError,
    };
  }

  const { afterSave, locale, nickname, returnTo } = result.data;
  const perf = createActionPerformanceTracker({
    action: "updateProfileIdentity",
  });
  const redirectPath = returnTo ?? "/profile";
  const profile = await perf.measure("viewer.profile", () =>
    getCurrentUserProfileForMutation(locale, redirectPath),
  );

  await perf.measure("profile.update", () =>
    prisma.userProfile.update({
      where: {
        id: profile.id,
      },
      data: {
        nickname,
      },
    }),
  );

  if (afterSave === "refresh") {
    perf.finish({
      afterSave,
    });

    return {
      nickname,
      success: true,
    };
  }

  await perf.measure("revalidate", async () => {
    revalidateNicknamePaths(locale);
  });

  perf.finish({
    afterSave,
  });

  const safeReturnTo =
    returnTo?.startsWith(`/${locale}`) && !returnTo.startsWith(`//`)
      ? returnTo
      : withLocale(locale, "/profile");

  redirect(safeReturnTo);
}

export async function updateProfileWechatAction(
  _previousState: UpdateProfileWechatState,
  formData: FormData,
): Promise<UpdateProfileWechatState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const t = getCopy(fallbackLocale).profile;
  const result = updateProfileWechatSchema.safeParse({
    locale: fallbackLocale,
    wechatId: getString(formData, "wechatId"),
  });

  if (!result.success) {
    return {
      formError: t.wechatError,
    };
  }

  const { locale, wechatId } = result.data;
  const profile = await getCurrentUserProfileForMutation(locale, "/profile");
  const trimmedWechatId = wechatId?.trim() || null;
  const normalizedWechatId = normalizeGuestWechatId(trimmedWechatId);

  if (trimmedWechatId && !normalizedWechatId) {
    return {
      formError: t.wechatError,
    };
  }

  const updatedProfile = await prisma.userProfile.update({
    where: {
      id: profile.id,
    },
    data: {
      wechatId: trimmedWechatId,
      normalizedWechatId,
    },
  });

  const linkResult = await linkGuestParticipationsForProfile(
    prisma,
    updatedProfile,
  ).catch((error) => {
    console.error("Failed to link guest participations after wechat update", error);
    return { linked: 0 };
  });

  revalidateNicknamePaths(locale);

  return {
    linkedCount: linkResult.linked,
    success: true,
    wechatId: trimmedWechatId,
  };
}
