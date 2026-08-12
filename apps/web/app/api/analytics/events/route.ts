import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { withApiRequestMetrics } from "@/lib/apiRequestMetrics";
import { hasClerkKeys } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import {
  analyticsEventInputSchema,
  assertAnalyticsEventRequirements,
  getAnalyticsEnvironment,
  normalizeAnalyticsProperties,
} from "@/features/analytics/events";
import { sampleAnalyticsEvent } from "@/features/analytics/policy";
import { trackAnalyticsEvents } from "@/features/analytics/server";

const maxAnalyticsBatchSize = 25;

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

async function acceptAnalyticsEvents(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const rawEvents = Array.isArray(body) ? body : [body];

  if (rawEvents.length === 0 || rawEvents.length > maxAnalyticsBatchSize) {
    return NextResponse.json(
      { ok: false, error: "INVALID_ANALYTICS_BATCH" },
      { status: 400 },
    );
  }

  const parsedEvents = [];

  for (const rawEvent of rawEvents) {
    const parsed = analyticsEventInputSchema.safeParse(rawEvent);

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

    parsedEvents.push({
      ...parsed.data,
      properties,
    });
  }

  const environment = getAnalyticsEnvironment();
  const sampledEvents = parsedEvents.flatMap((event) => {
    const sampledEvent = sampleAnalyticsEvent(event, environment);

    return sampledEvent ? [sampledEvent] : [];
  });

  if (sampledEvents.length === 0) {
    return NextResponse.json(
      {
        ok: true,
        accepted: true,
        received: rawEvents.length,
        stored: 0,
      },
      { status: 202 },
    );
  }

  const viewerProfileId = await getViewerProfileId();
  const result = await trackAnalyticsEvents(
    sampledEvents,
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
      received: rawEvents.length,
      stored: result.stored,
    },
    { status: 202 },
  );
}

export async function POST(request: Request) {
  return withApiRequestMetrics(request, "/api/analytics/events", async () =>
    acceptAnalyticsEvents(request),
  );
}
