import { NextResponse } from "next/server";
import { previewScraperActivities } from "@/lib/admin-scraper";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const items = await previewScraperActivities(body);
  return NextResponse.json({ items });
}

