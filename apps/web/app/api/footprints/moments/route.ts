import { NextResponse } from "next/server";
import { getMomentFeedPage } from "@/features/moments/queries/getMomentFeed";
import { getOptionalAuthenticatedProfileId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const viewerProfileId = await getOptionalAuthenticatedProfileId();
    const page = await getMomentFeedPage(viewerProfileId, {
      cursor: url.searchParams.get("cursor"),
      limit: 8,
    });

    return NextResponse.json({ ok: true, page });
  } catch (error) {
    console.error("Failed to load the next moment page", error);

    return NextResponse.json(
      { error: "Failed to load moments.", ok: false },
      { status: 500 },
    );
  }
}
