"use server";

import { z } from "zod";
import {
  ensureCurrentUserProfile,
  getCurrentUserProfileForMutation,
} from "@/lib/auth";
import {
  buildReferralLink,
  consumeReferralCodeOnProfileCreate,
} from "../services/referrals";

export type ReferralActionState = {
  ok?: boolean;
  formError?: string;
  referralLink?: string | null;
};

const buildReferralLinkSchema = z.object({
  locale: z.string().min(1).max(16).default("zh-CN"),
});

const consumeReferralCodeSchema = z.object({
  locale: z.string().min(1).max(16).default("zh-CN"),
  ref: z.string().trim().min(1).max(240),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export async function buildReferralLinkAction(
  _previousState: ReferralActionState,
  formData: FormData,
): Promise<ReferralActionState> {
  const result = buildReferralLinkSchema.safeParse({
    locale: getString(formData, "locale") || "zh-CN",
  });

  if (!result.success) {
    return {
      formError: "INVALID_REQUEST",
    };
  }

  const profile = await ensureCurrentUserProfile(
    result.data.locale,
    "/profile/invite",
  );

  return {
    ok: true,
    referralLink: profile.friendCode
      ? buildReferralLink(result.data.locale, profile.friendCode)
      : null,
  };
}

export async function consumeReferralCodeAction(
  _previousState: ReferralActionState,
  formData: FormData,
): Promise<ReferralActionState> {
  const result = consumeReferralCodeSchema.safeParse({
    locale: getString(formData, "locale") || "zh-CN",
    ref: getString(formData, "ref"),
  });

  if (!result.success) {
    return {
      formError: "INVALID_REQUEST",
    };
  }

  const profile = await getCurrentUserProfileForMutation(
    result.data.locale,
    "/profile",
  );
  const consumeResult = await consumeReferralCodeOnProfileCreate(
    profile.id,
    result.data.ref,
  );

  return consumeResult.consumed
    ? {
        ok: true,
      }
    : {
        formError: consumeResult.reason,
      };
}
