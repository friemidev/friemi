import { NextResponse } from "next/server";
import {
  getGlobalSearchMainActivityResults,
  type GlobalSearchMainActivityResultMode,
} from "@/features/search/queries/getGlobalSearchResults";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const offset = parsePositiveInteger(url.searchParams.get("offset"), 0);
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 18);
  const modeParam = url.searchParams.get("mode");
  const mode: GlobalSearchMainActivityResultMode =
    modeParam === "related" ? "related" : "strict";
  const includeEnded = url.searchParams.get("ended") === "1";

  if (!query.trim()) {
    return NextResponse.json({
      ok: true,
      items: [],
      includeEnded,
      mode,
      totalCount: 0,
      hasMore: false,
      nextOffset: offset,
    });
  }

  const viewerProfile = await getOptionalCurrentUserProfileSnapshot().catch(
    (error: unknown) => {
      console.error("Failed to load viewer profile for search API", error);

      return null;
    },
  );
  const result = await getGlobalSearchMainActivityResults(
    query,
    viewerProfile?.id,
    {
      includeEnded,
      limit,
      mode,
      offset,
    },
  );

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
