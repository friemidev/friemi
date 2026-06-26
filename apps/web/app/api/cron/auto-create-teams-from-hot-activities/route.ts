import { NextResponse, type NextRequest } from "next/server";
import { autoCreateTeamsFromHotActivities } from "@/features/activities/services/autoCreateTeamsFromHotActivities";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret && process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!cronSecret) {
    return false;
  }

  return (
    request.headers.get("authorization") === `Bearer ${cronSecret}` ||
    request.headers.get("x-cron-secret") === cronSecret
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const summary = await autoCreateTeamsFromHotActivities();

    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (error) {
    console.error("Failed to auto-create teams from hot activities", error);

    return NextResponse.json(
      {
        error: "AUTO_CREATE_TEAMS_FAILED",
      },
      {
        status: 500,
      },
    );
  }
}
