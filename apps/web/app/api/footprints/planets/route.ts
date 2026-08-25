import { NextResponse } from "next/server";
import { getPlanetSquarePage } from "@/features/planets/queries/planetQueries";
import { getOptionalAuthenticatedProfileId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const viewerProfileId = await getOptionalAuthenticatedProfileId();
    const page = await getPlanetSquarePage(viewerProfileId, {
      cursor: url.searchParams.get("cursor"),
      limit: 12,
    });

    return NextResponse.json({ ok: true, page });
  } catch (error) {
    console.error("Failed to load the next planet page", error);

    return NextResponse.json(
      { error: "Failed to load planets.", ok: false },
      { status: 500 },
    );
  }
}
