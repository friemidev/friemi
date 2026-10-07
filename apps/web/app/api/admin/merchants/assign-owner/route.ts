import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  bindProfileToExistingMerchant,
  promoteProfileToMerchant,
} from "@/features/coupons/services/couponService";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { serializeAdminMerchantListItem } from "@/lib/admin-scraper";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = await requireAdminApiAccess();
  if (authError) return authError;

  const rawBody: unknown = await request.json().catch(() => null);
  const body = (rawBody && typeof rawBody === "object" ? rawBody : {}) as {
    merchantId?: unknown;
    profileId?: unknown;
  };
  const profileId =
    typeof body.profileId === "string" ? body.profileId.trim() : "";
  const merchantId =
    typeof body.merchantId === "string" ? body.merchantId.trim() : "";

  if (!profileId) {
    return NextResponse.json({ error: "Profile is required" }, { status: 400 });
  }
  if (body.merchantId !== undefined && !merchantId) {
    return NextResponse.json(
      { error: "Merchant is required" },
      { status: 400 },
    );
  }

  try {
    const merchant = merchantId
      ? await bindProfileToExistingMerchant(profileId, merchantId)
      : await promoteProfileToMerchant(profileId);
    return NextResponse.json(
      { merchant: serializeAdminMerchantListItem(merchant) },
      { status: 201 },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status =
      code === "PROFILE_NOT_FOUND" || code === "MERCHANT_NOT_FOUND"
        ? 404
        : code === "PROFILE_ALREADY_OWNS_MERCHANT" ||
            code === "MERCHANT_ALREADY_OWNED" ||
            (error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === "P2002")
          ? 409
          : 400;
    return NextResponse.json(
      {
        error:
          status === 409
            ? "Merchant assignment conflict"
            : status === 404
              ? "Profile or merchant not found"
              : "Failed to assign merchant",
      },
      { status },
    );
  }
}
