import { NextResponse } from "next/server";
import {
  getAdminActivityPriorityItems,
  updateActivityPriorityOverride,
} from "@/features/activities/priority/adminActivityPriority";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAdminApiAccess();
  if (authError) return authError;

  const items = await getAdminActivityPriorityItems();
  return NextResponse.json({ items });
}

export async function PUT(request: Request) {
  const authError = await requireAdminApiAccess();
  if (authError) return authError;

  const [body, actorProfile] = await Promise.all([
    request.json(),
    getOptionalCurrentUserProfileSnapshot(),
  ]);
  const result = await updateActivityPriorityOverride(body, actorProfile?.id);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ item: result.item });
}
