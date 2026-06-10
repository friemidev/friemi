import { NextResponse } from "next/server";
import { getPendingIncomingFriendRequests } from "@/features/friends/queries/getFriendsDashboard";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewerProfile = await getOptionalCurrentUserProfileSnapshot();

  if (!viewerProfile) {
    return NextResponse.json({
      incomingRequests: [],
      updatedAt: new Date().toISOString(),
    });
  }

  const incomingRequests = await getPendingIncomingFriendRequests(viewerProfile.id);

  return NextResponse.json({
    incomingRequests,
    updatedAt: new Date().toISOString(),
  });
}
