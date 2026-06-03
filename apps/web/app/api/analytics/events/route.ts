import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { hasClerkKeys } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import {
  analyticsEventInputSchema,
  assertAnalyticsEventRequirements,
  normalizeAnalyticsProperties,
} from "@/features/analytics/events";
import { trackAnalyticsEvent } from "@/features/analytics/server";

async function getViewerProfileId() {
  if (!hasClerkKeys()) {
    return null;
  }

  try {
    const { userId } = await auth();

    if (!userId) {
      return null;
    }

    const profile = await prisma.userProfile.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        id: true,
      },
    });

    return profile?.id ?? null;
  } catch (error) {
    console.error("Failed to resolve analytics viewer", error);

    return null;
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const parsed = analyticsEventInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "INVALID_ANALYTICS_EVENT" },
      { status: 400 },
    );
  }

  const properties = normalizeAnalyticsProperties(parsed.data.properties);

  try {
    assertAnalyticsEventRequirements({
      name: parsed.data.name,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      sourceSurface: parsed.data.sourceSurface,
      properties,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "MISSING_REQUIRED_ANALYTICS_FIELDS" },
      { status: 400 },
    );
  }

  const viewerProfileId = await getViewerProfileId();
  const result = await trackAnalyticsEvent(
    {
      ...parsed.data,
      properties,
    },
    {
      userProfileId: viewerProfileId,
      referrer: request.headers.get("referer"),
      userAgent: request.headers.get("user-agent"),
    },
  );

  return NextResponse.json(
    {
      ok: result.ok,
      accepted: result.ok,
    },
    { status: 202 },
  );
}
