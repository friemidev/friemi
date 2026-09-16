import { prisma } from "@/lib/prisma";
import { createCouponToken } from "./couponDefaults";

export type AdminCouponTemplate = {
  accentColor: string;
  backgroundColor: string;
  description: string;
  expiresAt: string | null;
  foregroundColor: string;
  id: string;
  isActive: boolean;
  merchantId: string;
  terms: string | null;
  title: string;
};

export type AdminCouponTemplateInput = {
  accentColor: string;
  backgroundColor: string;
  description: string;
  expiresAt?: string | null;
  foregroundColor: string;
  terms?: string | null;
  title: string;
};

function slugifyCouponTitle(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function serializeCouponTemplate(coupon: {
  accentColor: string;
  backgroundColor: string;
  description: string;
  expiresAt: Date | null;
  foregroundColor: string;
  id: string;
  isActive: boolean;
  merchantId: string;
  terms: string | null;
  title: string;
}): AdminCouponTemplate {
  return {
    ...coupon,
    expiresAt: coupon.expiresAt?.toISOString() ?? null,
  };
}

const couponSelect = {
  accentColor: true,
  backgroundColor: true,
  description: true,
  expiresAt: true,
  foregroundColor: true,
  id: true,
  isActive: true,
  merchantId: true,
  terms: true,
  title: true,
} as const;

export async function getAdminCouponTemplates() {
  const coupons = await prisma.coupon.findMany({
    orderBy: [{ merchantId: "asc" }, { createdAt: "asc" }],
    select: couponSelect,
  });

  return coupons.map(serializeCouponTemplate);
}

export async function createAdminCouponTemplate(
  merchantId: string,
  input: AdminCouponTemplateInput,
) {
  const merchant = await prisma.merchant.findFirst({
    where: { id: merchantId, isActive: true },
    select: { id: true },
  });

  if (!merchant) throw new Error("MERCHANT_NOT_FOUND");

  const title = input.title.trim();
  const baseSlug = slugifyCouponTitle(title) || "coupon";
  const coupon = await prisma.coupon.create({
    data: {
      accentColor: input.accentColor,
      backgroundColor: input.backgroundColor,
      description: input.description.trim(),
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      foregroundColor: input.foregroundColor,
      merchantId,
      slug: `${baseSlug}-${createCouponToken().slice(0, 8)}`.slice(0, 64),
      terms: input.terms?.trim() || null,
      title,
    },
    select: couponSelect,
  });

  return serializeCouponTemplate(coupon);
}
