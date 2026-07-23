"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCharmGiftDefinition } from "@/features/charm/charm";
import {
  CharmGiftUnavailableError,
  recordReceivedCharmGift,
} from "@/features/charm/services/charmRewards";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

const sendCharmGiftSchema = z.object({
  attemptId: z.string().min(1),
  giftId: z.string().min(1),
  locale: z.string().min(1).default("zh-CN"),
  recipientProfileId: z.string().min(1),
  redirectPath: z.string().min(1),
});

export type SendCharmGiftState = {
  attemptId?: string;
  eventId?: string;
  formError?: string;
  ok?: boolean;
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
      invalidRequest: "Demande invalide.",
      targetUnavailable: "Ce profil n'est pas disponible.",
      unavailableGift: "Ce cadeau n'est pas disponible.",
    };
  }

  if (locale === "en") {
    return {
      cannotGiftSelf: "You cannot send a gift to yourself.",
      failed: "Could not send the gift.",
      invalidRequest: "Invalid request.",
      targetUnavailable: "This profile is unavailable.",
      unavailableGift: "This gift is unavailable.",
    };
  }

  return {
    cannotGiftSelf: "不能给自己送礼物。",
    failed: "礼物没有送出。",
    invalidRequest: "请求无效。",
    targetUnavailable: "这个用户暂不可用。",
    unavailableGift: "这个礼物暂不可用。",
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
    recipientProfileId: getString(formData, "recipientProfileId"),
    redirectPath: getString(formData, "redirectPath"),
  });

  if (!result.success) {
    return {
      attemptId: getString(formData, "attemptId"),
      formError: fallbackCopy.invalidRequest,
    };
  }

  const { attemptId, giftId, locale, recipientProfileId, redirectPath } =
    result.data;
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

  try {
    const result = await recordReceivedCharmGift({
      giftId,
      locale,
      recipientProfileId,
      senderProfileId: senderProfile.id,
      sourceContextId: recipientProfileId,
      sourceSurface: "PROFILE",
    });

    eventId = result.event.id;
  } catch (error) {
    if (error instanceof CharmGiftUnavailableError) {
      return {
        attemptId,
        formError: copy.unavailableGift,
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

  return {
    attemptId,
    eventId,
    ok: true,
  };
}
