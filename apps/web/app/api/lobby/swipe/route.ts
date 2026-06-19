import { NextResponse } from "next/server";
import { getLobbySwipePublicEventActivities } from "@/features/activities/queries/getActivityLobby";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewerProfile = await getOptionalCurrentUserProfileSnapshot();
    const activities = await getLobbySwipePublicEventActivities(
      viewerProfile?.id ?? null,
    );

    return NextResponse.json({
      ok: true,
      activities,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to load lobby swipe activities", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load lobby swipe activities.",
      },
      { status: 500 },
    );
  }
}
