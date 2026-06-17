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

const updateProfileIdentitySchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  nickname: z.string().trim().min(1).max(24),
  wechatId: z.string().trim().max(80).optional(),
  returnTo: z.string().optional(),
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
    wechatId: getString(formData, "wechatId"),
    returnTo: getString(formData, "returnTo"),
  });

  if (!result.success) {
    return {
      formError: t.nicknameError,
    };
  }

  const { locale, nickname, returnTo, wechatId } = result.data;
  const profile = await ensureCurrentUserProfile(locale);
  const trimmedWechatId = wechatId?.trim() || null;

  const updatedProfile = await prisma.userProfile.update({
    where: {
      id: profile.id,
    },
    data: {
      nickname,
      wechatId: trimmedWechatId,
      normalizedWechatId: normalizeGuestWechatId(trimmedWechatId),
    },
  });

  await linkGuestParticipationsForProfile(prisma, updatedProfile).catch(
    (error) => {
      console.error("Failed to link guest participations after profile update", error);
    },
  );

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
