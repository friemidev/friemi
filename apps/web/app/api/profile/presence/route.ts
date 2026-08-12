import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { withApiRequestMetrics } from "@/lib/apiRequestMetrics";
import { getOptionalAuthenticatedProfileId } from "@/lib/auth";
import { hasClerkKeys } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import {
  buildProfilePresenceUpdate,
  type ProfilePresenceIdentity,
} from "@/features/profile/services/profilePresenceWrite";

export const dynamic = "force-dynamic";

async function getPresenceEvent(request: Request) {
  try {
    const payload = (await request.json()) as { state?: unknown };

    return payload.state === "offline" ? "offline" : "online";
  } catch {
    return "online";
  }
}

async function getPresenceIdentity(): Promise<ProfilePresenceIdentity | null> {
  if (!hasClerkKeys()) {
    const profileId = await getOptionalAuthenticatedProfileId();

    return profileId ? { profileId } : null;
  }

  const { userId } = await auth();

  return userId ? { clerkUserId: userId } : null;
}

async function updateProfilePresence(request: Request) {
  try {
    const identity = await getPresenceIdentity();

    if (!identity) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const presenceEvent = await getPresenceEvent(request);
    const updatedAt = new Date();

    const result = await prisma.userProfile.updateMany(
      buildProfilePresenceUpdate({
        event: presenceEvent,
        identity,
        now: updatedAt,
      }),
    );

    if (result.count === 0) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      state: presenceEvent,
      updatedAt: presenceEvent === "offline" ? null : updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to update profile presence", error);

    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return withApiRequestMetrics(request, "/api/profile/presence", async () =>
    updateProfilePresence(request),
  );
}
