import {
  normalizeAnalyticsLocale,
  type AnalyticsEntityType,
  type AnalyticsLocale,
  type AnalyticsProperties,
  type AnalyticsSourceSurface,
} from "./events";
import { queueAnalyticsEvent } from "./server";

type LatencyStatus = "failed" | "success";

type LatencyStep = {
  durationMs: number;
  label: string;
};

type LatencyMetadata = Record<
  string,
  string | number | boolean | null | undefined
>;

function nowMs() {
  return performance.now();
}

function roundDurationMs(value: number) {
  return Math.max(0, Math.round(value));
}

function toSnakeCaseKey(key: string) {
  return key
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase()
    .slice(0, 64);
}

function normalizeMetadata(metadata: LatencyMetadata = {}) {
  const properties: AnalyticsProperties = {};

  for (const [rawKey, value] of Object.entries(metadata)) {
    const key = toSnakeCaseKey(rawKey);

    if (!key || value === undefined) continue;

    properties[key] = value ?? null;
  }

  return properties;
}

function getSlowestStep(steps: LatencyStep[]) {
  return [...steps].sort(
    (left, right) => right.durationMs - left.durationMs,
  )[0];
}

export function createLatencyTimer() {
  const startedAt = nowMs();

  return () => roundDurationMs(nowMs() - startedAt);
}

export function recordOperationLatency({
  durationMs,
  entityId,
  entityType,
  locale,
  operationKey,
  properties,
  route,
  sourceSurface,
  status,
  statusReason,
  userProfileId,
}: {
  durationMs: number;
  entityId?: string | null;
  entityType?: AnalyticsEntityType | null;
  locale: string;
  operationKey: string;
  properties?: LatencyMetadata;
  route: string;
  sourceSurface?: AnalyticsSourceSurface | null;
  status: LatencyStatus;
  statusReason?: string | null;
  userProfileId?: string | null;
}) {
  queueAnalyticsEvent(
    {
      locale: normalizeAnalyticsLocale(locale),
      name: "operation_latency_recorded",
      route,
      entityId: entityId ?? undefined,
      entityType: entityType ?? undefined,
      sourceSurface,
      properties: {
        ...normalizeMetadata(properties),
        duration_ms: roundDurationMs(durationMs),
        operation_key: operationKey,
        status,
        status_reason: statusReason ?? null,
      },
    },
    {
      userProfileId,
    },
  );
}

export function recordPageLoadLatency({
  durationMs,
  locale,
  metadata,
  referrer,
  route,
  routeKey,
  sourceSurface,
  steps,
  userAgent,
  userProfileId,
}: {
  durationMs: number;
  locale?: string;
  metadata?: LatencyMetadata;
  referrer?: string | null;
  route: string;
  routeKey: string;
  sourceSurface?: AnalyticsSourceSurface | null;
  steps: LatencyStep[];
  userAgent?: string | null;
  userProfileId?: string | null;
}) {
  const slowestStep = getSlowestStep(steps);
  const safeLocale: AnalyticsLocale = normalizeAnalyticsLocale(locale ?? "zh-CN");

  queueAnalyticsEvent(
    {
      locale: safeLocale,
      name: "page_load_timed",
      route,
      sourceSurface,
      properties: {
        ...normalizeMetadata(metadata),
        duration_ms: roundDurationMs(durationMs),
        route_key: routeKey,
        slowest_step_label: slowestStep?.label ?? "unknown",
        slowest_step_ms: slowestStep?.durationMs ?? 0,
        step_count: steps.length,
      },
    },
    {
      referrer,
      userAgent,
      userProfileId,
    },
  );
}
