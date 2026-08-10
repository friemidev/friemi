import { NextResponse } from "next/server";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getPresenceEvent(request: Request) {
  try {
    const payload = (await request.json()) as { state?: unknown };

    return payload.state === "offline" ? "offline" : "online";
  } catch {
    return "online";
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getOptionalCurrentUserProfileSnapshot();

    if (!profile || profile.status !== "ACTIVE") {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const presenceEvent = await getPresenceEvent(request);
    const updatedAt = new Date();

    await prisma.userProfile.update({
      where: {
        id: profile.id,
      },
      data: {
        lastActiveAt: presenceEvent === "offline" ? null : updatedAt,
      },
    });

    return NextResponse.json({
      ok: true,
      state: presenceEvent,
      updatedAt:
        presenceEvent === "offline" ? null : updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to update profile presence", error);

    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
