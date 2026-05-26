import { NextResponse } from "next/server";
import { importScraperActivities } from "@/lib/admin-scraper";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const imported = await importScraperActivities(body.items ?? []);
  return NextResponse.json({ imported });
}

