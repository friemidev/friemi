import { NextResponse } from "next/server";
import {
  getActivityLobbyFeedPage,
  type ActivityLobbyFeedStatus,
} from "@/features/activities/queries/getActivityLobby";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";

export const dynamic = "force-dynamic";

const supportedStatuses = new Set<ActivityLobbyFeedStatus>([
  "all",
  "ongoing",
  "ended",
]);

function parseLobbyFeedStatus(
  value: string | null,
): ActivityLobbyFeedStatus | null {
  if (!value || !supportedStatuses.has(value as ActivityLobbyFeedStatus)) {
    return null;
  }

  return value as ActivityLobbyFeedStatus;
}

function parseLobbyFeedPage(value: string | null) {
  const page = Number(value);

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.floor(page);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = parseLobbyFeedStatus(url.searchParams.get("status")) ?? "all";
    const page = parseLobbyFeedPage(url.searchParams.get("page"));
    const viewerProfile = await getOptionalCurrentUserProfileSnapshot();

    if (!viewerProfile) {
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required.",
        },
        { status: 401 },
      );
    }

    const feed = await getActivityLobbyFeedPage(viewerProfile.id, {
      page,
      status,
    });

    return NextResponse.json({
      ok: true,
      feed,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to load lobby feed", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load lobby feed.",
      },
      { status: 500 },
    );
  }
}
