import { NextResponse, type NextRequest } from "next/server";
import {
  syncActivityNoShowTrustScoreEvents,
  syncCleanHalfYearTrustScoreEvents,
} from "@/features/trust/trustScoreEvents";

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
    const [noShow, cleanHalfYear] = await Promise.all([
      syncActivityNoShowTrustScoreEvents(),
      syncCleanHalfYearTrustScoreEvents(),
    ]);

    return NextResponse.json({
      ok: true,
      summary: {
        cleanHalfYear,
        noShow,
      },
    });
  } catch (error) {
    console.error("Failed to sync trust score events", error);

    return NextResponse.json(
      {
        error: "SYNC_TRUST_SCORE_FAILED",
      },
      {
        status: 500,
      },
    );
  }
}
