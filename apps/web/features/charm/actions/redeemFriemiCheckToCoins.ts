"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  FriemiCheckRedeemError,
  redeemFriemiCheckToCoins,
} from "@/features/charm/services/charmRewards";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

export type RedeemFriemiCheckToCoinsState = {
  balance?: number;
  checkId?: string;
  coinValue?: number;
  formError?: string;
  ok?: boolean;
};

const redeemFriemiCheckToCoinsSchema = z.object({
  checkId: z.string().min(1),
  locale: z.string().min(1).default("zh-CN"),
});

function getRedeemCheckCopy(locale: string) {
  if (locale === "fr") {
    return {
      expired: "Ce chèque a expiré.",
      failed: "Échange impossible pour le moment.",
      invalidRequest: "Demande invalide.",
      notRedeemable: "Ce chèque ne peut pas encore être échangé.",
      unavailable: "Ce chèque a déjà été utilisé.",
    };
  }

  if (locale === "en") {
    return {
      expired: "This check has expired.",
      failed: "Could not redeem right now.",
      invalidRequest: "Invalid request.",
      notRedeemable: "This check cannot be redeemed yet.",
      unavailable: "This check has already been used.",
    };
  }

  return {
    expired: "这张支票已过期。",
    failed: "暂时无法兑换，请稍后再试。",
    invalidRequest: "请求无效。",
    notRedeemable: "这张支票暂不可兑换。",
    unavailable: "这张支票已经使用过。",
  };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export async function redeemFriemiCheckToCoinsAction(
  _previousState: RedeemFriemiCheckToCoinsState,
  formData: FormData,
): Promise<RedeemFriemiCheckToCoinsState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const parsed = redeemFriemiCheckToCoinsSchema.safeParse({
    checkId: getString(formData, "checkId"),
    locale: fallbackLocale,
  });
  const copy = getRedeemCheckCopy(fallbackLocale);

  if (!parsed.success) {
    return {
      formError: copy.invalidRequest,
    };
  }

  const profile = await ensureCurrentUserProfile(
    parsed.data.locale,
    "/profile/bag",
  );

  try {
    const result = await redeemFriemiCheckToCoins({
      checkId: parsed.data.checkId,
      profileId: profile.id,
    });

    revalidatePath(withLocale(parsed.data.locale, "/profile/bag"));
    revalidatePath(withLocale(parsed.data.locale, "/profile/shop"));

    return {
      balance: result.balance.balance,
      checkId: parsed.data.checkId,
      coinValue: result.coinValue,
      ok: true,
    };
  } catch (error) {
    if (error instanceof FriemiCheckRedeemError) {
      return {
        checkId: parsed.data.checkId,
        formError:
          error.code === "EXPIRED"
            ? copy.expired
            : error.code === "NOT_REDEEMABLE"
              ? copy.notRedeemable
              : copy.unavailable,
      };
    }

    console.error("Failed to redeem Friemi check to coins", error);

    return {
      checkId: parsed.data.checkId,
      formError: copy.failed,
    };
  }
}
