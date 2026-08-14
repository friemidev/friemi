"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCharmGiftDefinition } from "@/features/charm/charm";
import { getFriemiCoinBalance } from "@/features/charm/queries/getFriemiCoinBalance";
import {
  CharmGiftUnavailableError,
  InsufficientFriemiCoinBalanceError,
  recordReceivedCharmGift,
} from "@/features/charm/services/charmRewards";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

const sendCharmGiftSchema = z.object({
  attemptId: z.string().min(1),
  giftId: z.string().min(1),
  locale: z.string().min(1).default("zh-CN"),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
  recipientProfileId: z.string().min(1),
  redirectPath: z.string().min(1),
  sourceContextId: z.string().min(1).optional(),
  sourceSurface: z
    .enum([
      "PROFILE",
      "ACTIVITY",
      "MOMENT",
      "PLANET",
      "DIRECT_MESSAGE",
      "OTHER",
    ])
    .default("PROFILE"),
});

export type SendCharmGiftState = {
  attemptId?: string;
  balance?: number;
  eventId?: string;
  formError?: string;
  ok?: boolean;
  required?: number;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getSendGiftCopy(locale: string) {
  if (locale === "fr") {
    return {
      cannotGiftSelf: "Vous ne pouvez pas vous offrir un cadeau.",
      failed: "Le cadeau n'a pas pu être envoyé.",
      insufficientCoins: "Solde Friemi insuffisant.",
      invalidRequest: "Demande invalide.",
      targetUnavailable: "Ce profil n'est pas disponible.",
      unavailableGift: "Ce cadeau n'est pas disponible.",
    };
  }

  if (locale === "en") {
    return {
      cannotGiftSelf: "You cannot send a gift to yourself.",
      failed: "Could not send the gift.",
      insufficientCoins: "Not enough Friemi coins.",
      invalidRequest: "Invalid request.",
      targetUnavailable: "This profile is unavailable.",
      unavailableGift: "This gift is unavailable.",
    };
  }

  return {
    cannotGiftSelf: "不能给自己送礼物。",
    failed: "礼物没有送出。",
    insufficientCoins: "Friemi 币不足。",
    invalidRequest: "请求无效。",
    targetUnavailable: "这个用户暂不可用。",
    unavailableGift: "这个礼物暂不可用。",
  };
}

export async function getViewerFriemiCoinBalanceClientAction(
  locale: string,
  redirectPath: string,
) {
  const normalizedLocale = locale || "zh-CN";
  const profile = await ensureCurrentUserProfile(
    normalizedLocale,
    redirectPath || "/profile",
  );
  const balance = await getFriemiCoinBalance(profile.id);

  return {
    balance: balance.balance,
    ok: true as const,
  };
}

export async function sendCharmGiftAction(
  _previousState: SendCharmGiftState,
  formData: FormData,
): Promise<SendCharmGiftState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const fallbackCopy = getSendGiftCopy(fallbackLocale);
  const result = sendCharmGiftSchema.safeParse({
    attemptId: getString(formData, "attemptId"),
    giftId: getString(formData, "giftId"),
    locale: fallbackLocale,
    quantity: getString(formData, "quantity") || "1",
    recipientProfileId: getString(formData, "recipientProfileId"),
    redirectPath: getString(formData, "redirectPath"),
    sourceContextId: getString(formData, "sourceContextId") || undefined,
    sourceSurface: getString(formData, "sourceSurface") || "PROFILE",
  });

  if (!result.success) {
    return {
      attemptId: getString(formData, "attemptId"),
      formError: fallbackCopy.invalidRequest,
    };
  }

  const {
    attemptId,
    giftId,
    locale,
    quantity,
    recipientProfileId,
    redirectPath,
    sourceContextId,
    sourceSurface,
  } = result.data;
  const copy = getSendGiftCopy(locale);
  const gift = getCharmGiftDefinition(giftId);

  if (
    !gift?.launchEnabled ||
    gift.charmValue <= 0 ||
    gift.availability !== "standard"
  ) {
    return {
      attemptId,
      formError: copy.unavailableGift,
    };
  }

  const senderProfile = await ensureCurrentUserProfile(locale, redirectPath);

  if (senderProfile.id === recipientProfileId) {
    return {
      attemptId,
      formError: copy.cannotGiftSelf,
    };
  }

  const recipientProfile = await prisma.userProfile.findUnique({
    where: {
      id: recipientProfileId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!recipientProfile || recipientProfile.status !== "ACTIVE") {
    return {
      attemptId,
      formError: copy.targetUnavailable,
    };
  }

  let eventId: string;
  let senderBalance: number | undefined;

  try {
    const giftResult = await recordReceivedCharmGift({
      giftId,
      locale,
      quantity,
      recipientProfileId,
      senderProfileId: senderProfile.id,
      sourceContextId: sourceContextId ?? recipientProfileId,
      sourceSurface,
    });

    eventId = giftResult.event.id;
    senderBalance = giftResult.senderBalance?.balance;
  } catch (error) {
    if (error instanceof CharmGiftUnavailableError) {
      return {
        attemptId,
        formError: copy.unavailableGift,
      };
    }

    if (error instanceof InsufficientFriemiCoinBalanceError) {
      return {
        attemptId,
        balance: error.balance,
        formError: copy.insufficientCoins,
        required: error.required,
      };
    }

    console.error("Failed to send charm gift", error);

    return {
      attemptId,
      formError: copy.failed,
    };
  }

  revalidatePath(withLocale(locale, `/profile/${recipientProfileId}`));
  revalidatePath(withLocale(locale, "/profile"));
  revalidatePath(withLocale(locale, "/notifications"));
  revalidatePath(withLocale(locale, redirectPath));

  return {
    attemptId,
    balance: senderBalance,
    eventId,
    ok: true,
  };
}
