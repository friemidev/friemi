import { NextRequest, NextResponse } from "next/server";
import { getActivityRoomMessageChanges } from "@/features/activity-room-chat/services/activityRoomChat";
import { canUseLocalGroupAssistantPreview } from "../../guard";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ role: string }> },
) {
  const { role } = await params;
  if (
    !canUseLocalGroupAssistantPreview() ||
    !["host", "admin", "member"].includes(role)
  ) {
    return new NextResponse(null, { status: 404 });
  }
  const query = request.nextUrl.searchParams;
  const serverTime = new Date();
  const parseDate = (value: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const messages = await getActivityRoomMessageChanges({
    activityId: "welcome-preview-group",
    viewerProfileId: `welcome-preview-${role}`,
    afterCreatedAt: parseDate(query.get("afterCreatedAt")),
    afterId: query.get("afterId"),
    changedAfter: parseDate(query.get("since")) ?? serverTime,
  });
  return NextResponse.json(
    { messages, serverTime: serverTime.toISOString(), hasMore: false },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
