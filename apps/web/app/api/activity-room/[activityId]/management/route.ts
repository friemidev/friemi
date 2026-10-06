import { NextResponse } from "next/server";
import { getActivityRoomManagementData } from "@/features/activity-room-chat/services/activityRoomChat";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(
  _request: Request,
  context: { params: Promise<{ activityId: string }> },
) {
  const viewer = await getOptionalCurrentUserProfileSnapshot();
  if (!viewer)
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401, headers },
    );
  const { activityId } = await context.params;

  try {
    // The service verifies membership and limits management data by viewer role.
    const management = await getActivityRoomManagementData({
      activityId,
      viewerProfileId: viewer.id,
    });
    if (!management)
      return NextResponse.json(
        { error: "FORBIDDEN" },
        { status: 403, headers },
      );
    return NextResponse.json({ management }, { headers });
  } catch (error) {
    console.error("Failed to load activity room management", error);
    return NextResponse.json(
      { error: "UNAVAILABLE" },
      { status: 500, headers },
    );
  }
}
