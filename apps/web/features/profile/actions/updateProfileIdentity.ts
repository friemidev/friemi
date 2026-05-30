"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

export type UpdateProfileIdentityState = {
  formError?: string;
};

const updateProfileIdentitySchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  nickname: z.string().trim().min(1).max(24),
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
