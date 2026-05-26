import { NextResponse } from "next/server";
import { createAdminActivity, getAdminState } from "@/lib/admin-scraper";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getAdminState();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const body = await request.json();
  const created = await createAdminActivity(body);
  return NextResponse.json({ activity: created }, { status: 201 });
}

