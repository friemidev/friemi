import { NextResponse } from "next/server";
import {
  getActivityLobbySection,
  type ActivityLobbySectionId,
} from "@/features/activities/queries/getActivityLobby";
import { getOptionalAuthenticatedProfileId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const supportedSections = new Set<ActivityLobbySectionId>([
  "open",
  "created",
  "joined",
  "favorites",
  "friendHosted",
  "friendJoined",
]);

function parseLobbySection(value: string | null): ActivityLobbySectionId | null {
  if (!value || !supportedSections.has(value as ActivityLobbySectionId)) {
    return null;
  }

  return value as ActivityLobbySectionId;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const section = parseLobbySection(url.searchParams.get("section"));

    if (!section) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid lobby section.",
        },
        { status: 400 },
      );
    }

    const viewerProfileId = await getOptionalAuthenticatedProfileId();

    if (!viewerProfileId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required.",
        },
        { status: 401 },
      );
    }

    const activities = await getActivityLobbySection(viewerProfileId, section);

    return NextResponse.json({
      ok: true,
      activities,
      section,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to load lobby section", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load lobby section.",
      },
      { status: 500 },
    );
  }
}
