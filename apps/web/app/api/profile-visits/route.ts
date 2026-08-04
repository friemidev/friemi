import { NextResponse } from "next/server";
import { z } from "zod";
import { recordProfileVisit } from "@/features/profile-visits/services/profileVisits";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";

export const dynamic = "force-dynamic";

const profileVisitSchema = z.object({
  profileId: z.string().trim().min(1).max(80),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const result = profileVisitSchema.safeParse(body);

    if (!result.success) {
      return new NextResponse(null, { status: 204 });
    }

    const visitorProfile = await getOptionalCurrentUserProfileSnapshot();

    await recordProfileVisit({
      profileId: result.data.profileId,
      visitorId: visitorProfile?.id,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to record profile visit", error);

    return new NextResponse(null, { status: 204 });
  }
}
