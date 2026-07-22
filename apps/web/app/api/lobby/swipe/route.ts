import { NextResponse } from "next/server";
import { getLobbySwipePublicEventActivityPage } from "@/features/activities/queries/getActivityLobby";
import { getOptionalAuthenticatedProfileId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const defaultLobbySwipeLimit = 8;
const maxLobbySwipeExcludeIds = 160;

function parseLobbySwipeLimit(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return defaultLobbySwipeLimit;
  }

  return Math.min(Math.max(Math.floor(parsed), 1), 24);
}

function parseExcludedSwipeIds(searchParams: URLSearchParams) {
  return Array.from(
    new Set(
      searchParams
        .getAll("exclude")
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).slice(0, maxLobbySwipeExcludeIds);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const viewerProfileId = await getOptionalAuthenticatedProfileId();
    const page = await getLobbySwipePublicEventActivityPage(viewerProfileId, {
      excludeIds: parseExcludedSwipeIds(searchParams),
      limit: parseLobbySwipeLimit(searchParams.get("limit")),
    });

    return NextResponse.json({
      ok: true,
      activities: page.activities,
      hasMore: page.hasMore,
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
