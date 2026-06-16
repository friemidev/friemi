import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  analyticsEventInputSchema,
  assertAnalyticsEventRequirements,
  getAnalyticsEnvironment,
  inferAnalyticsDeviceType,
  normalizeAnalyticsProperties,
  sanitizeAnalyticsReferrer,
  sanitizeAnalyticsRoute,
  type AnalyticsEventInput,
} from "./events";

type TrackAnalyticsEventOptions = {
  userProfileId?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
};

let analyticsWriteQueue = Promise.resolve();

function toNullableString(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function isConnectionPoolTimeout(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2024"
  );
}

export async function trackAnalyticsEvent(
  input: AnalyticsEventInput,
  options: TrackAnalyticsEventOptions = {},
) {
  try {
    const parsed = analyticsEventInputSchema.parse(input);
    const userAgent = toNullableString(parsed.userAgent ?? options.userAgent);
    const referrer = sanitizeAnalyticsReferrer(
      parsed.referrer ?? options.referrer,
    );
    const properties = normalizeAnalyticsProperties(parsed.properties);
    const event = {
      ...parsed,
      environment: getAnalyticsEnvironment(),
      userProfileId: toNullableString(options.userProfileId),
      referrer,
      route: sanitizeAnalyticsRoute(parsed.route),
      userAgent,
      deviceType:
        parsed.deviceType ?? inferAnalyticsDeviceType(userAgent ?? undefined),
      anonymousId: toNullableString(parsed.anonymousId),
      sessionId: toNullableString(parsed.sessionId),
      sourceSurface: parsed.sourceSurface ?? null,
      entityType: parsed.entityType ?? null,
      entityId: toNullableString(parsed.entityId),
      appVersion: toNullableString(parsed.appVersion),
      properties,
    };

    assertAnalyticsEventRequirements(event);

    await prisma.analyticsEvent.create({
      data: {
        name: event.name,
        environment: event.environment,
        userProfileId: event.userProfileId,
        anonymousId: event.anonymousId,
        sessionId: event.sessionId,
        locale: event.locale,
        route: event.route,
        referrer: event.referrer,
        userAgent: event.userAgent,
        deviceType: event.deviceType,
        sourceSurface: event.sourceSurface,
        entityType: event.entityType,
        entityId: event.entityId,
        appVersion: event.appVersion,
        properties: event.properties as Prisma.InputJsonValue | undefined,
      },
    });

    return { ok: true as const };
  } catch (error) {
    if (isConnectionPoolTimeout(error)) {
      console.warn("Skipped analytics event because the database pool is busy");

      return { ok: false as const };
    }

    console.error("Failed to track analytics event", error);

    return { ok: false as const };
  }
}

export function queueAnalyticsEvent(
  input: AnalyticsEventInput,
  options: TrackAnalyticsEventOptions = {},
) {
  analyticsWriteQueue = analyticsWriteQueue
    .catch(() => undefined)
    .then(() => trackAnalyticsEvent(input, options))
    .then(() => undefined);
}
