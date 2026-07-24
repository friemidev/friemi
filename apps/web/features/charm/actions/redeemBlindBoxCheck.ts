"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  BlindBoxFragmentBalanceError,
  redeemBlindBoxFromFragments,
} from "@/features/charm/services/charmRewards";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

export type RedeemBlindBoxCheckState = {
  checkId?: string;
  formError?: string;
  ok?: boolean;
};

const redeemBlindBoxCheckSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
});

function getRedeemBlindBoxCopy(locale: string) {
  if (locale === "fr") {
    return {
      failed: "Échange impossible pour le moment.",
      invalidRequest: "Demande invalide.",
      notEnough: "Il faut 10 fragments pour échanger un chèque mystère.",
    };
  }

  if (locale === "en") {
    return {
      failed: "Could not redeem right now.",
      invalidRequest: "Invalid request.",
      notEnough: "You need 10 fragments to redeem a blind-box check.",
    };
  }

  return {
    failed: "暂时无法兑换，请稍后再试。",
    invalidRequest: "请求无效。",
    notEnough: "需要 10 个碎片才能兑换盲盒支票。",
  };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export async function redeemBlindBoxCheckAction(
  _previousState: RedeemBlindBoxCheckState,
  formData: FormData,
): Promise<RedeemBlindBoxCheckState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const parsed = redeemBlindBoxCheckSchema.safeParse({
    locale: fallbackLocale,
  });
  const copy = getRedeemBlindBoxCopy(fallbackLocale);

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
    const result = await redeemBlindBoxFromFragments(profile.id);

    revalidatePath(withLocale(parsed.data.locale, "/profile/bag"));

    return {
      checkId: result.check.id,
      ok: true,
    };
  } catch (error) {
    if (error instanceof BlindBoxFragmentBalanceError) {
      return {
        formError: copy.notEnough,
      };
    }

    console.error("Failed to redeem blind-box check", error);

    return {
      formError: copy.failed,
    };
  }
}
