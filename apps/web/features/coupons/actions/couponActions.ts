"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redeemCouponByToken } from "@/features/coupons/services/couponService";
import { getCurrentUserProfileForMutation } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

export type UpdateMerchantStoreState = {
  error?: "INVALID" | "NOT_MERCHANT";
  success?: boolean;
};

export type RedeemCouponState = {
  status?:
    | "REDEEMED"
    | "ALREADY_REDEEMED"
    | "FORBIDDEN"
    | "INVALID"
    | "UNAVAILABLE";
};

const updateStoreSchema = z.object({
  description: z.string().trim().min(1).max(1200),
  locale: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function updateMerchantStoreAction(
  _previousState: UpdateMerchantStoreState,
  formData: FormData,
): Promise<UpdateMerchantStoreState> {
  const locale = getString(formData, "locale") || "zh-CN";
  const parsed = updateStoreSchema.safeParse({
    description: getString(formData, "description"),
    locale,
    name: getString(formData, "name"),
  });

  if (!parsed.success) return { error: "INVALID" };

  const profile = await getCurrentUserProfileForMutation(
    locale,
    "/profile/store",
  );
  const result = await prisma.merchant.updateMany({
    where: {
      isActive: true,
      ownerProfileId: profile.id,
    },
    data: {
      description: parsed.data.description,
      name: parsed.data.name,
    },
  });

  if (result.count === 0) return { error: "NOT_MERCHANT" };

  revalidatePath(withLocale(locale, "/profile"));
  revalidatePath(withLocale(locale, "/profile/store"));
  return { success: true };
}

export async function redeemCouponAction(
  _previousState: RedeemCouponState,
  formData: FormData,
): Promise<RedeemCouponState> {
  const locale = getString(formData, "locale") || "zh-CN";
  const redemptionToken = getString(formData, "redemptionToken");
  const profile = await getCurrentUserProfileForMutation(
    locale,
    `/coupons/redeem/${redemptionToken}`,
  );
  const result = await redeemCouponByToken({
    profileId: profile.id,
    redemptionToken,
  });

  revalidatePath(withLocale(locale, "/profile/store"));
  revalidatePath(withLocale(locale, "/profile/bag"));
  revalidatePath(withLocale(locale, "/notifications"));
  return { status: result.status };
}
