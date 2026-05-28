import { NextResponse } from "next/server";
import { importScraperActivities, type ScraperImportMode } from "@/lib/admin-scraper";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const mode = (body.mode ?? "create_only") as ScraperImportMode;
  const mergeDuplicates = Boolean(body.mergeDuplicates);
  const result = await importScraperActivities(body.items ?? [], { mode, mergeDuplicates });
  return NextResponse.json(result);
}

