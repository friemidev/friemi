import { NextResponse } from "next/server";
import { z } from "zod";
import { listOpenDrawGuessReports, reviewDrawGuessReport } from "@/features/game-tools/drawGuessReports";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { getOptionalCurrentUserProfile } from "@/lib/auth";

const reviewSchema = z.object({
  id: z.string().min(1),
  note: z.string().max(500).default(""),
  status: z.enum(["REVIEWED", "DISMISSED"]),
});

export async function GET() {
  const authError = await requireAdminApiAccess();
  if (authError) return authError;
  return NextResponse.json({ reports: await listOpenDrawGuessReports() }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const authError = await requireAdminApiAccess();
  if (authError) return authError;
  const profile = await getOptionalCurrentUserProfile();
  if (!profile) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const body = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const result = await reviewDrawGuessReport({ ...body.data, reviewerProfileId: profile.id });
  return NextResponse.json(result, { status: "error" in result ? 409 : 200 });
}
