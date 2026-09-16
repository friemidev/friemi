import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminCouponTemplate } from "@/features/coupons/adminCoupons";
import { requireAdminApiAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const colorSchema = z.string().regex(/^#[0-9A-F]{6}$/i);
const couponSchema = z.object({
  accentColor: colorSchema,
  backgroundColor: colorSchema,
  description: z.string().trim().min(1).max(1200),
  expiresAt: z.string().datetime().nullable().optional(),
  foregroundColor: colorSchema,
  terms: z.string().trim().max(1200).nullable().optional(),
  title: z.string().trim().min(1).max(120),
});

type AdminMerchantCouponRouteProps = {
  params: Promise<{ merchantId: string }>;
};

export async function POST(
  request: Request,
  { params }: AdminMerchantCouponRouteProps,
) {
  const authError = await requireAdminApiAccess();
  if (authError) return authError;

  const { merchantId } = await params;
  const parsed = couponSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid coupon" }, { status: 400 });
  }

  try {
    const coupon = await createAdminCouponTemplate(merchantId, parsed.data);
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    const status =
      error instanceof Error && error.message === "MERCHANT_NOT_FOUND"
        ? 404
        : 400;
    return NextResponse.json({ error: "Failed to create coupon" }, { status });
  }
}
