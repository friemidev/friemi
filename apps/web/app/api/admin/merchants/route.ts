import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { createAdminMerchant } from "@/lib/admin-scraper";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = await requireAdminApiAccess();
  if (authError) return authError;

  const body = await request.json();

  try {
    const merchant = await createAdminMerchant(body);
    return NextResponse.json({ merchant }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Merchant slug already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create merchant" },
      { status: 400 },
    );
  }
}
