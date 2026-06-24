import { NextResponse } from "next/server";
import { getLobbySwipePublicEventActivities } from "@/features/activities/queries/getActivityLobby";
import { getOptionalAuthenticatedProfileId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewerProfileId = await getOptionalAuthenticatedProfileId();
    const activities = await getLobbySwipePublicEventActivities(
      viewerProfileId,
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
