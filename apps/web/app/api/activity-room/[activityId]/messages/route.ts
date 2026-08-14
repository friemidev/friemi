import { NextRequest, NextResponse } from "next/server";
import { getActivityRoomMessageChanges } from "@/features/activity-room-chat/services/activityRoomChat";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";

export const dynamic = "force-dynamic";

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ activityId: string }> },
) {
  const profile = await getOptionalCurrentUserProfileSnapshot();

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { activityId } = await context.params;
  const serverTime = new Date();

  try {
    const messages = await getActivityRoomMessageChanges({
      activityId,
      afterCreatedAt: parseDate(
        request.nextUrl.searchParams.get("afterCreatedAt"),
      ),
      afterId: request.nextUrl.searchParams.get("afterId"),
      changedAfter:
        parseDate(request.nextUrl.searchParams.get("since")) ?? serverTime,
      viewerProfileId: profile.id,
    });

    return NextResponse.json(
      { messages, serverTime: serverTime.toISOString() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Failed to load activity room message changes", error);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
