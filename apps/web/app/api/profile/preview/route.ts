import { NextResponse } from "next/server";
import { getUnlockedAchievementWall } from "@/features/achievements/queries/getUserAchievements";
import { getProfileHangoutPreview } from "@/features/profile/queries/getProfileDashboard";
import { getOptionalAuthenticatedProfileId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const viewerProfileId = await getOptionalAuthenticatedProfileId();

    if (!viewerProfileId) {
      return NextResponse.json(
        { error: "Authentication required.", ok: false },
        { status: 401 },
      );
    }

    const tab = new URL(request.url).searchParams.get("tab");

    if (tab === "hangouts") {
      return NextResponse.json({
        hangouts: await getProfileHangoutPreview(viewerProfileId),
        ok: true,
      });
    }

    if (tab === "badges") {
      return NextResponse.json({
        badges: await getUnlockedAchievementWall(viewerProfileId),
        ok: true,
      });
    }

    return NextResponse.json(
      { error: "Invalid profile preview tab.", ok: false },
      { status: 400 },
    );
  } catch (error) {
    console.error("Failed to load profile preview", error);

    return NextResponse.json(
      { error: "Failed to load profile preview.", ok: false },
      { status: 500 },
    );
  }
}
