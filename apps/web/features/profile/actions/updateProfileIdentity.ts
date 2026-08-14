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
import { runScheduledGuestLink } from "@/features/guest-participants/services/guestLinkScheduler";
import { applyPhoneVerifiedTrustScore } from "@/features/trust/trustScoreEvents";
import { syncProfileAchievements } from "@/features/achievements/services/achievements";
import { isDefaultProfileAvatarSrc } from "@/features/profile/defaultAvatars";
import {
  canChangeNickname,
  getNicknameChangeAvailableAt,
  NICKNAME_CHANGE_COOLDOWN_MS,
} from "@/features/profile/nicknameChangePolicy";
import { isUploadedProfileAvatarUrl } from "@/lib/activity-cover-storage";
import {
  normalizeGuestEmail,
  normalizeGuestPhone,
  normalizeGuestWechatId,
} from "@/features/guest-participants/utils/contactIdentity";

export type UpdateProfileIdentityState = {
  avatarUrl?: string | null;
  bio?: string | null;
  formError?: string;
  homeCity?: string | null;
  nickname?: string;
  nicknameChangedAt?: string | null;
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
  avatarUrl: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) =>
        !value ||
        isDefaultProfileAvatarSrc(value) ||
        isUploadedProfileAvatarUrl(value),
      {
        message: "invalid-avatar",
      },
    ),
  bio: z.string().trim().max(160).optional(),
  homeCity: z.string().trim().max(80).optional(),
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

function getNicknameCooldownError(locale: string, availableAt: Date) {
  const formatted = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(availableAt);

  if (locale === "fr") {
    return `Le pseudo peut être modifié une fois toutes les 24 heures. Réessayez après ${formatted}.`;
  }

  if (locale === "en") {
    return `You can change your nickname once every 24 hours. Try again after ${formatted}.`;
  }

  return `昵称每24小时只能修改一次，请在 ${formatted} 后重试。`;
}

export async function updateProfileIdentityAction(
  _previousState: UpdateProfileIdentityState,
  formData: FormData,
): Promise<UpdateProfileIdentityState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const t = getCopy(fallbackLocale).profile;
  const result = updateProfileIdentitySchema.safeParse({
    afterSave: getString(formData, "afterSave") || "redirect",
    avatarUrl: formData.has("avatarUrl")
      ? getString(formData, "avatarUrl")
      : undefined,
    bio: formData.has("bio") ? getString(formData, "bio") : undefined,
    homeCity: formData.has("homeCity")
      ? getString(formData, "homeCity")
      : undefined,
    locale: fallbackLocale,
    nickname: getString(formData, "nickname"),
    returnTo: getString(formData, "returnTo"),
  });

  if (!result.success) {
    return {
      formError: t.nicknameError,
    };
  }

  const { afterSave, avatarUrl, bio, homeCity, locale, nickname, returnTo } =
    result.data;
  const perf = createActionPerformanceTracker({
    action: "updateProfileIdentity",
  });
  const redirectPath = returnTo ?? "/profile";
  const profile = await perf.measure("viewer.profile", () =>
    getCurrentUserProfileForMutation(locale, redirectPath),
  );
  const nicknameChanged = profile.nickname !== nickname;
  const now = new Date();
  const profileData = {
    ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
    ...(bio !== undefined ? { bio: bio || null } : {}),
    ...(homeCity !== undefined ? { homeCity: homeCity || null } : {}),
  };

  if (nicknameChanged && !canChangeNickname(profile.nicknameChangedAt, now)) {
    const availableAt = getNicknameChangeAvailableAt(
      profile.nicknameChangedAt,
    )!;
    perf.finish({ afterSave, nicknameChanged, outcome: "cooldown" });

    return {
      formError: getNicknameCooldownError(locale, availableAt),
      nicknameChangedAt: profile.nicknameChangedAt?.toISOString() ?? null,
    };
  }

  const updatedNicknameChangedAt = nicknameChanged
    ? now
    : profile.nicknameChangedAt;

  const updateSucceeded = await perf.measure("profile.update", async () => {
    if (!nicknameChanged) {
      await prisma.userProfile.update({
        where: { id: profile.id },
        data: profileData,
      });

      return true;
    }

    const cooldownCutoff = new Date(
      now.getTime() - NICKNAME_CHANGE_COOLDOWN_MS,
    );
    const result = await prisma.userProfile.updateMany({
      where: {
        id: profile.id,
        OR: [
          { nicknameChangedAt: null },
          { nicknameChangedAt: { lte: cooldownCutoff } },
        ],
      },
      data: {
        ...profileData,
        nickname,
        nicknameChangedAt: now,
      },
    });

    return result.count === 1;
  });

  if (!updateSucceeded) {
    const latestProfile = await prisma.userProfile.findUnique({
      where: { id: profile.id },
      select: { nicknameChangedAt: true },
    });
    const availableAt =
      getNicknameChangeAvailableAt(latestProfile?.nicknameChangedAt) ??
      new Date(now.getTime() + NICKNAME_CHANGE_COOLDOWN_MS);
    perf.finish({ afterSave, nicknameChanged, outcome: "cooldown-race" });

    return {
      formError: getNicknameCooldownError(locale, availableAt),
      nicknameChangedAt:
        latestProfile?.nicknameChangedAt?.toISOString() ?? null,
    };
  }

  if (afterSave === "refresh") {
    perf.finish({
      afterSave,
    });

    return {
      avatarUrl: avatarUrl !== undefined ? avatarUrl || null : undefined,
      bio: bio !== undefined ? bio || null : undefined,
      homeCity: homeCity !== undefined ? homeCity || null : undefined,
      nickname,
      nicknameChangedAt: updatedNicknameChangedAt?.toISOString() ?? null,
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

  const linkResult = await runScheduledGuestLink({
    force: true,
    prisma,
    profile: updateResult.updatedProfile,
    trigger: "contact_binding",
  }).catch((error) => {
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
  const shouldAwardPhoneTrustScore = Boolean(
    normalizedPhone && !profile.normalizedPhone,
  );

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

  const linkResult = await runScheduledGuestLink({
    force: true,
    prisma,
    profile: updateResult.updatedProfile,
    trigger: "contact_binding",
  }).catch((error) => {
    console.error(
      "Failed to link guest participations after contact binding update",
      error,
    );
    return { linked: 0 };
  });

  if (shouldAwardPhoneTrustScore) {
    await applyPhoneVerifiedTrustScore(profile.id).catch((error) => {
      console.error("Failed to award phone trust score", error);
    });
  }

  await syncProfileAchievements(profile.id).catch((error) => {
    console.error("Failed to sync profile achievements after binding", error);
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
