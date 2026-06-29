"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUserProfileForMutation } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { createActionPerformanceTracker } from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { linkGuestParticipationsForProfile } from "@/features/guest-participants/services/linkGuestParticipations";
import {
  normalizeGuestEmail,
  normalizeGuestPhone,
  normalizeGuestWechatId,
} from "@/features/guest-participants/utils/contactIdentity";

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

export type UpdateProfileContactBindingsState = {
  contactEmail?: string | null;
  formError?: string;
  linkedCount?: number;
  phone?: string | null;
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

const updateProfileContactBindingsSchema = z.object({
  contactEmail: z
    .string()
    .trim()
    .max(120)
    .optional()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: "invalid-email",
    }),
  locale: z.string().min(1).default("zh-CN"),
  phone: z.string().trim().max(40).optional(),
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

  const updateResult = await prisma.$transaction(
    async (tx) => {
      const conflict = await findContactBindingConflict(tx, {
        normalizedContactEmail: null,
        normalizedPhone: null,
        normalizedWechatId,
        profileId: profile.id,
      });

      if (conflict) {
        return { conflict, updatedProfile: null };
      }

      const updatedProfile = await tx.userProfile.update({
        where: {
          id: profile.id,
        },
        data: {
          wechatId: trimmedWechatId,
          normalizedWechatId,
        },
      });

      return { conflict: null, updatedProfile };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  if (updateResult.conflict === "wechat") {
    return {
      formError: t.contactBindingWechatTaken,
    };
  }

  if (!updateResult.updatedProfile) {
    return {
      formError: t.wechatError,
    };
  }

  const linkResult = await linkGuestParticipationsForProfile(
    prisma,
    updateResult.updatedProfile,
  ).catch((error) => {
    console.error(
      "Failed to link guest participations after wechat update",
      error,
    );
    return { linked: 0 };
  });

  revalidateNicknamePaths(locale);

  return {
    linkedCount: linkResult.linked,
    success: true,
    wechatId: trimmedWechatId,
  };
}

async function findContactBindingConflict(
  tx: Prisma.TransactionClient,
  {
    normalizedContactEmail,
    normalizedPhone,
    normalizedWechatId,
    profileId,
  }: {
    normalizedContactEmail: string | null;
    normalizedPhone: string | null;
    normalizedWechatId: string | null;
    profileId: string;
  },
) {
  if (normalizedWechatId) {
    const conflict = await tx.userProfile.findFirst({
      where: {
        id: { not: profileId },
        normalizedWechatId,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (conflict) {
      return "wechat" as const;
    }
  }

  if (normalizedContactEmail) {
    const conflict = await tx.userProfile.findFirst({
      where: {
        id: { not: profileId },
        status: "ACTIVE",
        OR: [
          { normalizedContactEmail },
          {
            email: {
              equals: normalizedContactEmail,
              mode: "insensitive",
            },
            emailVerifiedAt: { not: null },
          },
        ],
      },
      select: { id: true },
    });

    if (conflict) {
      return "email" as const;
    }
  }

  if (normalizedPhone) {
    const conflict = await tx.userProfile.findFirst({
      where: {
        id: { not: profileId },
        normalizedPhone,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (conflict) {
      return "phone" as const;
    }
  }

  return null;
}

export async function updateProfileContactBindingsAction(
  _previousState: UpdateProfileContactBindingsState,
  formData: FormData,
): Promise<UpdateProfileContactBindingsState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const t = getCopy(fallbackLocale).profile;
  const result = updateProfileContactBindingsSchema.safeParse({
    contactEmail: getString(formData, "contactEmail"),
    locale: fallbackLocale,
    phone: getString(formData, "phone"),
    wechatId: getString(formData, "wechatId"),
  });

  if (!result.success) {
    return {
      formError: t.contactBindingEmailError,
    };
  }

  const { contactEmail, locale, phone, wechatId } = result.data;
  const profile = await getCurrentUserProfileForMutation(locale, "/profile");
  const trimmedContactEmail = contactEmail?.trim() || null;
  const trimmedPhone = phone?.trim() || null;
  const trimmedWechatId = wechatId?.trim() || null;
  const normalizedContactEmail = normalizeGuestEmail(trimmedContactEmail);
  const normalizedPhone = normalizeGuestPhone(trimmedPhone);
  const normalizedWechatId = normalizeGuestWechatId(trimmedWechatId);

  if (trimmedContactEmail && !normalizedContactEmail) {
    return {
      formError: t.contactBindingEmailError,
    };
  }

  if (trimmedPhone && !normalizedPhone) {
    return {
      formError: t.contactBindingPhoneError,
    };
  }

  if (trimmedWechatId && !normalizedWechatId) {
    return {
      formError: t.contactBindingWechatError,
    };
  }

  const updateResult = await prisma.$transaction(
    async (tx) => {
      const conflict = await findContactBindingConflict(tx, {
        normalizedContactEmail,
        normalizedPhone,
        normalizedWechatId,
        profileId: profile.id,
      });

      if (conflict) {
        return { conflict, updatedProfile: null };
      }

      const updatedProfile = await tx.userProfile.update({
        where: {
          id: profile.id,
        },
        data: {
          contactEmail: trimmedContactEmail,
          normalizedContactEmail,
          normalizedPhone,
          normalizedWechatId,
          phone: trimmedPhone,
          wechatId: trimmedWechatId,
        },
      });

      return { conflict: null, updatedProfile };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  if (updateResult.conflict === "email") {
    return {
      formError: t.contactBindingEmailTaken,
    };
  }

  if (updateResult.conflict === "phone") {
    return {
      formError: t.contactBindingPhoneTaken,
    };
  }

  if (updateResult.conflict === "wechat") {
    return {
      formError: t.contactBindingWechatTaken,
    };
  }

  if (!updateResult.updatedProfile) {
    return {
      formError: t.contactBindingWechatError,
    };
  }

  const linkResult = await linkGuestParticipationsForProfile(
    prisma,
    updateResult.updatedProfile,
  ).catch((error) => {
    console.error(
      "Failed to link guest participations after contact binding update",
      error,
    );
    return { linked: 0 };
  });

  revalidateNicknamePaths(locale);

  return {
    contactEmail: trimmedContactEmail,
    linkedCount: linkResult.linked,
    phone: trimmedPhone,
    success: true,
    wechatId: trimmedWechatId,
  };
}
