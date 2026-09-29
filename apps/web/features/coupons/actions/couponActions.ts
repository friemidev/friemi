"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createCouponCampaign,
  generateCouponClaimCode,
  generateCouponRedemptionToken,
  grantFollowUpCoupon,
  redeemCouponByToken,
  unlistCouponCampaign,
} from "@/features/coupons/services/couponService";
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

export type GenerateCouponClaimCodeState = {
  couponId?: string;
  path?: string;
  status?: "FORBIDDEN" | "GENERATED" | "INVALID" | "UNAVAILABLE";
};

export type GenerateCouponRedemptionTokenState = {
  expiresAt?: string;
  path?: string;
  status?: "FORBIDDEN" | "GENERATED" | "INVALID" | "UNAVAILABLE";
};

export type CreateCouponCampaignState = {
  couponId?: string;
  path?: string;
  status?: "CREATED" | "FORBIDDEN" | "INVALID";
};

export type UnlistCouponCampaignState = {
  couponId?: string;
  status?: "FORBIDDEN" | "INVALID" | "UNLISTED";
};

export type GrantFollowUpCouponState = {
  itemId?: string;
  status?:
    | "ALREADY_GRANTED"
    | "FORBIDDEN"
    | "GRANTED"
    | "INVALID"
    | "UNAVAILABLE";
};

const updateStoreSchema = z.object({
  description: z.string().trim().min(1).max(1200),
  locale: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80),
});

const createCampaignSchema = z
  .object({
    description: z.string().trim().min(1).max(1200),
    expiresAt: z.coerce.date(),
    quantityLimit: z.coerce.number().int().min(1).max(100000),
    templateId: z.string().trim().min(1),
    terms: z.string().trim().max(1200).optional(),
    title: z.string().trim().min(1).max(120),
    validFrom: z.coerce.date().optional(),
  })
  .refine(
    (value) =>
      !value.validFrom || value.validFrom.getTime() < value.expiresAt.getTime(),
    { path: ["expiresAt"] },
  );

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createCouponCampaignAction(
  _previousState: CreateCouponCampaignState,
  formData: FormData,
): Promise<CreateCouponCampaignState> {
  const locale = getString(formData, "locale") || "zh-CN";
  const parsed = createCampaignSchema.safeParse({
    description: getString(formData, "description"),
    expiresAt: getString(formData, "expiresAt"),
    quantityLimit: getString(formData, "quantityLimit"),
    templateId: getString(formData, "templateId"),
    terms: getString(formData, "terms"),
    title: getString(formData, "title"),
    validFrom: getString(formData, "validFrom") || undefined,
  });
  if (!parsed.success) return { status: "INVALID" };

  const profile = await getCurrentUserProfileForMutation(
    locale,
    "/profile/store/coupons/new",
  );
  const result = await createCouponCampaign({
    input: {
      ...parsed.data,
      terms: parsed.data.terms || null,
      validFrom: parsed.data.validFrom ?? null,
    },
    profileId: profile.id,
  });
  if (result.status !== "CREATED") return { status: result.status };

  revalidatePath(withLocale(locale, "/profile/store"));
  revalidatePath(withLocale(locale, "/profile/store/coupons/new"));
  return {
    couponId: result.couponId,
    path: withLocale(locale, `/coupons/claim/${result.token}`),
    status: "CREATED",
  };
}

export async function unlistCouponCampaignAction(
  _previousState: UnlistCouponCampaignState,
  formData: FormData,
): Promise<UnlistCouponCampaignState> {
  const locale = getString(formData, "locale") || "zh-CN";
  const couponId = getString(formData, "couponId");
  const profile = await getCurrentUserProfileForMutation(
    locale,
    "/profile/store",
  );
  const result = await unlistCouponCampaign({
    couponId,
    profileId: profile.id,
  });
  revalidatePath(withLocale(locale, "/profile/store"));
  return result;
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

export async function generateCouponClaimCodeAction(
  _previousState: GenerateCouponClaimCodeState,
  formData: FormData,
): Promise<GenerateCouponClaimCodeState> {
  const locale = getString(formData, "locale") || "zh-CN";
  const couponId = getString(formData, "couponId");
  const profile = await getCurrentUserProfileForMutation(
    locale,
    "/profile/store",
  );
  const result = await generateCouponClaimCode({
    couponId,
    profileId: profile.id,
  });

  if (result.status !== "GENERATED") return { status: result.status };

  revalidatePath(withLocale(locale, "/profile/store"));
  return {
    couponId: result.couponId,
    path: withLocale(locale, `/coupons/claim/${result.token}`),
    status: result.status,
  };
}

export async function generateCouponRedemptionTokenAction(
  _previousState: GenerateCouponRedemptionTokenState,
  formData: FormData,
): Promise<GenerateCouponRedemptionTokenState> {
  const locale = getString(formData, "locale") || "zh-CN";
  const itemId = getString(formData, "itemId");
  const profile = await getCurrentUserProfileForMutation(
    locale,
    `/profile/bag/coupons/${itemId}`,
  );
  const result = await generateCouponRedemptionToken({
    itemId,
    profileId: profile.id,
  });

  if (result.status !== "GENERATED") return { status: result.status };

  return {
    expiresAt: result.expiresAt.toISOString(),
    path: withLocale(locale, `/coupons/redeem/${result.token}`),
    status: result.status,
  };
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

export async function grantFollowUpCouponAction(
  _previousState: GrantFollowUpCouponState,
  formData: FormData,
): Promise<GrantFollowUpCouponState> {
  const locale = getString(formData, "locale") || "zh-CN";
  const redemptionItemId = getString(formData, "redemptionItemId");
  const redemptionToken = getString(formData, "redemptionToken");
  const profile = await getCurrentUserProfileForMutation(
    locale,
    `/coupons/redeem/${redemptionToken}`,
  );
  const result = await grantFollowUpCoupon({
    profileId: profile.id,
    redemptionItemId,
  });

  revalidatePath(withLocale(locale, "/profile/store"));
  revalidatePath(withLocale(locale, "/profile/bag"));
  revalidatePath(withLocale(locale, "/notifications"));
  return result;
}
