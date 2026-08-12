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
import {
  getAnalyticsQueueLimits,
  isSampleableAnalyticsEvent,
  sampleAnalyticsEvent,
} from "./policy";

type TrackAnalyticsEventOptions = {
  userProfileId?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
};

let analyticsWriteQueue = Promise.resolve();
let analyticsQueueDepth = 0;
let lastAnalyticsDropWarningAt = 0;

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

function warnAnalyticsDrop(reason: "pool_busy" | "queue_full") {
  const now = Date.now();

  if (now - lastAnalyticsDropWarningAt < 60_000) {
    return;
  }

  lastAnalyticsDropWarningAt = now;
  console.warn("Skipped analytics events", {
    queueDepth: analyticsQueueDepth,
    reason,
  });
}

function getAnalyticsEventData(
  input: AnalyticsEventInput,
  options: TrackAnalyticsEventOptions,
) {
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

  return {
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
  } satisfies Prisma.AnalyticsEventCreateManyInput;
}

export async function trackAnalyticsEvents(
  inputs: AnalyticsEventInput[],
  options: TrackAnalyticsEventOptions = {},
) {
  if (inputs.length === 0) {
    return { ok: true as const, stored: 0 };
  }

  try {
    const events = inputs.map((input) => getAnalyticsEventData(input, options));
    const result = await prisma.analyticsEvent.createMany({ data: events });

    return { ok: true as const, stored: result.count };
  } catch (error) {
    if (isConnectionPoolTimeout(error)) {
      warnAnalyticsDrop("pool_busy");

      return { ok: false as const, stored: 0 };
    }

    console.error("Failed to track analytics events", error);

    return { ok: false as const, stored: 0 };
  }
}

export async function trackAnalyticsEvent(
  input: AnalyticsEventInput,
  options: TrackAnalyticsEventOptions = {},
) {
  const result = await trackAnalyticsEvents([input], options);

  return { ok: result.ok };
}

export function queueAnalyticsEvent(
  input: AnalyticsEventInput,
  options: TrackAnalyticsEventOptions = {},
) {
  const environment = getAnalyticsEnvironment();
  const sampledInput = sampleAnalyticsEvent(input, environment);

  if (!sampledInput) {
    return false;
  }

  const { hardMaxDepth, maxDepth } = getAnalyticsQueueLimits();
  const queueLimit = isSampleableAnalyticsEvent(input.name)
    ? maxDepth
    : hardMaxDepth;

  if (analyticsQueueDepth >= queueLimit) {
    warnAnalyticsDrop("queue_full");

    return false;
  }

  analyticsQueueDepth += 1;
  analyticsWriteQueue = analyticsWriteQueue
    .catch(() => undefined)
    .then(async () => {
      try {
        await trackAnalyticsEvent(sampledInput, options);
      } finally {
        analyticsQueueDepth = Math.max(0, analyticsQueueDepth - 1);
      }
    });

  return true;
}
