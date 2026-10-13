import { NextResponse } from "next/server";
import { processTranslationQueue } from "@/features/translations/services/translationQueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json(await processTranslationQueue({ limit: 120 }), {
    headers: { "cache-control": "no-store" },
  });
}
