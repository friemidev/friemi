import { NextResponse } from "next/server";
import { deleteAdminActivity, updateAdminActivity } from "@/lib/admin-scraper";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ activityId: string }> }) {
  const { activityId } = await params;
  const body = await request.json();
  const updated = await updateAdminActivity(activityId, body);
  return NextResponse.json({ activity: updated });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ activityId: string }> }) {
  const { activityId } = await params;
  await deleteAdminActivity(activityId);
  return NextResponse.json({ ok: true });
}



