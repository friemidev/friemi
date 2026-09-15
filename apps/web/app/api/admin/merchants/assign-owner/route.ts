import { NextResponse } from "next/server";
import { promoteProfileToMerchant } from "@/features/coupons/services/couponService";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { serializeAdminMerchantListItem } from "@/lib/admin-scraper";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = await requireAdminApiAccess();
  if (authError) return authError;

  const body = (await request.json()) as { profileId?: unknown };
  const profileId =
    typeof body.profileId === "string" ? body.profileId.trim() : "";

  if (!profileId) {
    return NextResponse.json({ error: "Profile is required" }, { status: 400 });
  }

  try {
    const merchant = await promoteProfileToMerchant(profileId);
    return NextResponse.json(
      { merchant: serializeAdminMerchantListItem(merchant) },
      { status: 201 },
    );
  } catch (error) {
    const status =
      error instanceof Error && error.message === "PROFILE_NOT_FOUND"
        ? 404
        : 400;
    return NextResponse.json(
      { error: "Failed to assign merchant" },
      { status },
    );
  }
}
