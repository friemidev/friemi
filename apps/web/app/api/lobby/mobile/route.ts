import { NextResponse } from "next/server";
import {
  getMobileActivityLobbyPage,
  type MobileActivityLobbyTabId,
} from "@/features/activities/queries/getActivityLobby";
import { getOptionalAuthenticatedProfileId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const supportedTabs = new Set<MobileActivityLobbyTabId>([
  "nearby",
  "mine",
  "friends",
  "today",
  "popular",
]);

function parseTab(value: string | null): MobileActivityLobbyTabId | null {
  return value && supportedTabs.has(value as MobileActivityLobbyTabId)
    ? (value as MobileActivityLobbyTabId)
    : null;
}

function parsePage(value: string | null) {
  const page = Number(value);

  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const tab = parseTab(url.searchParams.get("tab"));

    if (!tab) {
      return NextResponse.json(
        { error: "Invalid mobile lobby tab.", ok: false },
        { status: 400 },
      );
    }

    const viewerProfileId = await getOptionalAuthenticatedProfileId();

    if (!viewerProfileId && (tab === "mine" || tab === "friends")) {
      return NextResponse.json(
        { error: "Authentication required.", ok: false },
        { status: 401 },
      );
    }

    const page = await getMobileActivityLobbyPage({
      page: parsePage(url.searchParams.get("page")),
      tab,
      viewerProfileId,
    });

    return NextResponse.json({ ok: true, page });
  } catch (error) {
    console.error("Failed to load mobile lobby tab", error);

    return NextResponse.json(
      { error: "Failed to load mobile lobby tab.", ok: false },
      { status: 500 },
    );
  }
}
