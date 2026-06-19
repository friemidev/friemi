"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { linkGuestParticipationsForProfile } from "@/features/guest-participants/services/linkGuestParticipations";
import { normalizeGuestWechatId } from "@/features/guest-participants/utils/contactIdentity";

export type UpdateProfileIdentityState = {
  formError?: string;
};

export type UpdateProfileWechatState = {
  formError?: string;
  linkedCount?: number;
  success?: boolean;
  wechatId?: string | null;
};

const updateProfileIdentitySchema = z.object({
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

export async function updateProfileIdentityAction(
  _previousState: UpdateProfileIdentityState,
  formData: FormData,
): Promise<UpdateProfileIdentityState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const t = getCopy(fallbackLocale).profile;
  const result = updateProfileIdentitySchema.safeParse({
    locale: fallbackLocale,
    nickname: getString(formData, "nickname"),
    returnTo: getString(formData, "returnTo"),
  });

  if (!result.success) {
    return {
      formError: t.nicknameError,
    };
  }

  const { locale, nickname, returnTo } = result.data;
  const profile = await ensureCurrentUserProfile(locale);

  await prisma.userProfile.update({
    where: {
      id: profile.id,
    },
    data: {
      nickname,
    },
  });

  revalidatePath(withLocale(locale, "/profile"));
  revalidatePath(withLocale(locale, "/friends"));
  revalidatePath(withLocale(locale, "/messages"));
  revalidatePath(withLocale(locale, "/activities"));
  revalidatePath(withLocale(locale, "/"), "layout");

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
  const profile = await ensureCurrentUserProfile(locale);
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

  revalidatePath(withLocale(locale, "/profile"));
  revalidatePath(withLocale(locale, "/friends"));
  revalidatePath(withLocale(locale, "/messages"));
  revalidatePath(withLocale(locale, "/activities"));
  revalidatePath(withLocale(locale, "/"), "layout");

  return {
    linkedCount: linkResult.linked,
    success: true,
    wechatId: trimmedWechatId,
  };
}
