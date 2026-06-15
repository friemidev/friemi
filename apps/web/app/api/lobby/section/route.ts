import { NextResponse } from "next/server";
import {
  getActivityLobbySection,
  type ActivityLobbySectionId,
} from "@/features/activities/queries/getActivityLobby";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";

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

  const activities = await getActivityLobbySection(viewerProfile.id, section);

  return NextResponse.json({
    ok: true,
    activities,
    section,
    updatedAt: new Date().toISOString(),
  });
}
