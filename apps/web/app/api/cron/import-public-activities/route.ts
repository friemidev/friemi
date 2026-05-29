import { NextResponse, type NextRequest } from "next/server";
import { importParisOpenDataActivities } from "@/features/public-activities/importParisOpenDataActivities";

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

async function handleImport(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const limitValue = request.nextUrl.searchParams.get("limit");
  const limit = limitValue ? Number(limitValue) : undefined;
  const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";

  try {
    const summary = await importParisOpenDataActivities({ dryRun, limit });

    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (error) {
    console.error("Failed to import public activities", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to import public activities",
      },
      {
        status: 502,
      },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleImport(request);
}

export async function POST(request: NextRequest) {
  return handleImport(request);
}
