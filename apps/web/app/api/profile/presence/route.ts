import { NextResponse } from "next/server";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const profile = await getOptionalCurrentUserProfileSnapshot();

    if (!profile || profile.status !== "ACTIVE") {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const updatedAt = new Date();

    await prisma.userProfile.update({
      where: {
        id: profile.id,
      },
      data: {
        lastActiveAt: updatedAt,
      },
    });

    return NextResponse.json({
      ok: true,
      updatedAt: updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to update profile presence", error);

    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
