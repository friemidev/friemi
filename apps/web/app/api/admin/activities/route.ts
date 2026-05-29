import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { createAdminActivity, getAdminState } from "@/lib/admin-scraper";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAdminApiAccess();
  if (authError) return authError;

  const state = await getAdminState();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const authError = await requireAdminApiAccess();
  if (authError) return authError;

  const body = await request.json();
  const created = await createAdminActivity(body);
  return NextResponse.json({ activity: created }, { status: 201 });
}
